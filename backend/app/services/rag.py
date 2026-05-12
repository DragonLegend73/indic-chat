"""
RAG Service — ChromaDB + bge-small-en-v1.5 embeddings.
Dual-collection: English (primary) + optional multilingual fallback.
"""

import logging
import threading
from typing import Optional

logger = logging.getLogger("indic-chat.rag")

_rag_lock = threading.Lock()


class RAGService:
    """
    Retrieval-Augmented Generation using ChromaDB.
    - Primary: English collection with bge-small-en-v1.5
    - Fallback: empty result with disclaimer
    """

    def __init__(self):
        self._client = None
        self._english_collection = None
        self._embedding_fn = None

    def _load(self):
        """Lazy-load ChromaDB and embedding model."""
        global _rag_lock
        if self._client is not None:
            return
            
        with _rag_lock:
            if self._client is not None:
                return

            try:
                import chromadb
                from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
                from app.config import get_settings

                settings = get_settings()
                self._embedding_fn = SentenceTransformerEmbeddingFunction(
                    model_name=settings.EMBEDDING_MODEL
                )
                self._client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)

                self._english_collection = self._client.get_or_create_collection(
                    name="ncert_english",
                    embedding_function=self._embedding_fn,
                    metadata={"description": "NCERT English content for RAG"},
                )
                logger.info(
                    f"✅ RAG loaded: ncert_english ({self._english_collection.count()} chunks)"
                )
            except Exception as e:
                logger.error(f"❌ RAG init failed: {e}")
                raise

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        subject: Optional[str] = None,
    ) -> list[dict]:
        """
        Retrieve relevant NCERT chunks for a query.

        Args:
            query: English query text
            top_k: Number of results
            subject: Optional filter (math, science, english)

        Returns:
            List of { content, metadata, distance }
        """
        self._load()

        where_filter = None
        if subject:
            where_filter = {"subject": subject}

        try:
            results = self._english_collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where_filter,
            )
        except Exception:
            # If filter fails (empty collection), try without filter
            results = self._english_collection.query(
                query_texts=[query],
                n_results=top_k,
            )

        if not results or not results.get("documents") or not results["documents"][0]:
            return []

        chunks = []
        for i, doc in enumerate(results["documents"][0]):
            chunks.append({
                "content": doc,
                "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                "distance": results["distances"][0][i] if results.get("distances") else 0,
            })

        return chunks

    def add_chunks(self, chunks: list[dict]):
        """
        Add document chunks to the English collection.
        Each chunk: { id, content, metadata: { subject, chapter, page, source } }
        """
        self._load()
        if not chunks:
            return

        ids = [c["id"] for c in chunks]
        documents = [c["content"] for c in chunks]
        metadatas = [c.get("metadata", {}) for c in chunks]

        self._english_collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(f"Added {len(chunks)} chunks to ncert_english")

    @property
    def chunk_count(self) -> int:
        self._load()
        return self._english_collection.count()


# Singleton
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
