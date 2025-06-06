from typing import List, Dict

from pydantic import BaseModel

# Class for User Input
class UserInput(BaseModel):
    message: str
    role: str = "user"
    conversation_id: str

# Class for Conversation
class Conversation:
    messages: list[dict[str, str]]

    def __init__(self):
        self.messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": "You are an useful AI assistant designed to answer questions from a document parsed by the user, the document is in markdown format and is provided to you in the conversation history"
            }
        ]
        self.active : bool = True

class HealthCheck(BaseModel):
    status: str = "OK"