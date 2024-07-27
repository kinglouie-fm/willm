# chroma_langchain.py
import os
import uuid
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import chromadb
from chromadb.config import Settings

load_dotenv()

class ChromaLangChainHandler:
    def __init__(self):
        self.chromadb_client = chromadb.HttpClient(host="chromaDB", port=8000, settings=Settings(allow_reset=True, anonymized_telemetry=False))
        self.collection = self.chromadb_client.get_or_create_collection(name='questions')
        self.embedding_function = OpenAIEmbeddings(api_key=os.getenv('FLASK_API_KEY'))
        self.db = Chroma(client=self.chromadb_client, collection_name='questions', embedding_function=self.embedding_function)

    def add_document(self, generated_question, metadata):
        embedded_question = self.embedding_function.embed_query(generated_question)
        document_id = str(uuid.uuid4())
        self.collection.add(
            documents=[generated_question],
            embeddings=[embedded_question],
            ids=[document_id],
            metadatas=[{k: (v if v is not None else "") for k, v in metadata.items()}]
        )
        return document_id

    def get_documents(self):
        return self.collection.get()

# Initialize the handler
chroma_langchain_handler = ChromaLangChainHandler()
