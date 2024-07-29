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
    def __init__(self):
        self.chromadb_client = chromadb.HttpClient(host="chromaDB", port=8000, settings=Settings(allow_reset=True, anonymized_telemetry=False))
        self.embedding_function = OpenAIEmbeddings(api_key=os.getenv('FLASK_API_KEY'))

    def get_user_collection(self, user_id):
        collection_name = f'questions_{user_id}'
        return Chroma(
            client=self.chromadb_client,
            collection_name=collection_name,
            embedding_function=self.embedding_function,
        )

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

    def get_documents(self, user_id):
        collection = self.get_user_collection(user_id)
        documents = collection.get(include=["metadatas", "documents", "embeddings"])
        return documents

    def similarity_search(self, user_id, query, k):
        collection = self.get_user_collection(user_id)
        embedding_vector = self.embedding_function.embed_query(query)
        results = collection.similarity_search_by_vector(embedding_vector, k=k)
        
        return results

chroma_langchain_handler = ChromaLangChainHandler()
