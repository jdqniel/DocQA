import os
import json
import asyncio

from typing import Dict, AsyncGenerator
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from dotenv import load_dotenv

from models.models import Conversation, UserInput, HealthCheck
from parser.pdf_parser import load_pdf
from parser.vector_store import DocumentVectorStore

load_dotenv()

# Load and parse the PDF document
try:
    md_content = load_pdf("data/document.pdf")
    if not md_content:
        raise ValueError("Failed to load PDF content")
except Exception as e:
    raise ValueError(f"Error loading PDF: {str(e)}")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not set in the .env file")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI Client
client = OpenAI(api_key=OPENAI_API_KEY)

# Initialize vector store
vector_store = DocumentVectorStore(api_key=OPENAI_API_KEY)
vector_store.create_index(md_content)

# Initialize conversation's dictionary
conversations: Dict[str, Conversation] = {}

# Get or create a conversation with the document
def get_or_create_conversation_with_doc(conversations: Dict[str, Conversation], conversation_id: str) -> Conversation:
    if conversation_id not in conversations:
        conversation = Conversation()
        # Update system message with document content
        conversation.messages[0]["content"] = "You are a helpful AI assistant designed to answer questions about the document. Use the provided relevant chunks to answer questions accurately."
        conversations[conversation_id] = conversation
    return conversations[conversation_id]

async def stream_response(conversation: Conversation, client: OpenAI) -> AsyncGenerator[str, None]:
    try:
        stream = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=conversation.messages,
            stream=True
        )
        
        collected_response_content = []
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                content_piece = chunk.choices[0].delta.content
                collected_response_content.append(content_piece)
                
                json_encoded_content_piece = json.dumps(content_piece)
                sse_message = f"data: {json_encoded_content_piece}\n\n"
                yield sse_message

                await asyncio.sleep(0.01)
               
        done_signal = json.dumps("[DONE]")
        yield f"data: {done_signal}\n\n"
        
        final_content = "".join(collected_response_content)
        if final_content:
            conversation.messages.append({
                "role": "assistant",
                "content": final_content
            })
            
    except Exception as e:
        print(f"Error during streaming: {e}")
        error_payload = json.dumps({"error": f"Stream error: {str(e)}"})
        yield f"data: {error_payload}\n\n"


# Endpoints

# Health check
@app.get("/health")
async def health():
    return HealthCheck(status="OK")

# Chat
@app.post("/chat/")
async def chat(user_input: UserInput):
    conversation = get_or_create_conversation_with_doc(conversations=conversations, conversation_id=user_input.conversation_id)

    if not conversation.active: 
        raise HTTPException(status_code=404, detail="The chat session has been closed. Please start a new session.")
        
    try:
        relevant_chunks = vector_store.query(user_input.message)
        
        conversation.messages.append({
            "role": user_input.role, # Make sure 'role' is part of UserInput or set appropriately
            "content": f"Question: {user_input.message}\n\nRelevant context from the document:\n" + "\n".join(relevant_chunks)
        })

        return StreamingResponse(
            stream_response(conversation, client), 
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no", 
            }
        )

    except HTTPException as e:
        raise e # Re-raise HTTPException
    except Exception as e:
        print(f"Error in chat endpoint: {e}") # Log error on server
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
