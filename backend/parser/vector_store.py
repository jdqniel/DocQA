from typing import List, Optional
from llama_index.core import VectorStoreIndex, Document, Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

class DocumentVectorStore:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.index: Optional[VectorStoreIndex] = None
        self._setup_llama_index()

    def _setup_llama_index(self):
        """Initialize LlamaIndex settings with OpenAI models."""
        Settings.llm = OpenAI(api_key=self.api_key)
        Settings.embed_model = OpenAIEmbedding(api_key=self.api_key)
        Settings.node_parser = SentenceSplitter(
            chunk_size=512,
            chunk_overlap=50
        )

    def create_index(self, document_text: str) -> None:
        """Create a vector index from the document text."""
        # Create a document from the text
        document = Document(text=document_text)
        
        # Create the vector index
        self.index = VectorStoreIndex.from_documents([document])

    def query(self, query_text: str, similarity_top_k: int = 3) -> List[str]:
        """Query the vector index for relevant chunks."""
        if not self.index:
            raise ValueError("Index not created. Call create_index first.")

        # Create a query engine
        query_engine = self.index.as_query_engine(
            similarity_top_k=similarity_top_k
        )

        # Get the response
        response = query_engine.query(query_text)
        
        # Extract the source nodes (chunks) from the response
        source_nodes = response.source_nodes
        relevant_chunks = [node.node.text for node in source_nodes]
        
        return relevant_chunks 