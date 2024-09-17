import os
import uuid
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import chromadb
from chromadb.config import Settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class ChromaLangChainHandler:
    # Initialize the class with Chroma DB client and embedding function
    def __init__(self):
        self.chromadb_client = chromadb.HttpClient(host="chromaDB", port=8031, settings=Settings(allow_reset=True, anonymized_telemetry=False))
        self.embedding_function = OpenAIEmbeddings(api_key=os.getenv('FLASK_API_KEY'))

    # Retrieve or create a Chroma collection for a specific user
    def get_user_collection(self, user_id):
        collection_name = f'questions_{user_id}'
        return Chroma(
            client=self.chromadb_client,
            collection_name=collection_name,
            embedding_function=self.embedding_function,
        )

     # Add a document (e.g. question) to the Chroma collection for a user
    def add_document(self, user_id, generated_question, metadata):
        collection = self.chromadb_client.get_or_create_collection(f'questions_{user_id}')
        embedded_question = self.embedding_function.embed_query(generated_question)
        document_id = str(uuid.uuid4())
        metadata["document_id"] = document_id
        collection.add(
            documents=[generated_question],
            embeddings=[embedded_question],
            ids=[document_id],
            metadatas=[{k: (v if v is not None else "") for k, v in metadata.items()}]
        )
        return document_id

    # Retrieve all documents in the user's collection, including metadata and embeddings
    def get_documents(self, user_id):
        collection = self.get_user_collection(user_id)
        documents = collection.get(include=["metadatas", "documents", "embeddings"])
        return documents

    # Retrieve specific documents from the user's collection based on document IDs
    def get_documents_by_ids(self, user_id, document_ids):
        collection = self.get_user_collection(user_id)
        documents = collection.get(ids=document_ids, include=["metadatas", "documents"])
        return documents

    # Perform a similarity search to find documents similar to a query
    def similarity_search(self, user_id, query, k):
        collection = self.get_user_collection(user_id)
        embedding_vector = self.embedding_function.embed_query(query)
        results = collection.similarity_search_by_vector(embedding_vector, k=k)
        
        return results

# Instantiate the ChromaLangChainHandler class for use in the Flask API
chroma_langchain_handler = ChromaLangChainHandler()
