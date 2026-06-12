import os
import numpy as np
from huggingface_hub import InferenceClient
from typing import List
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self.client = InferenceClient(token=os.getenv("HUGGINGFACE_API_KEY"))
        self.model = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
        self.dimension = 1024

    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        try:
            # BGE-M3 works best with a retrieval prefix
            prefixed = f"Represent this issue for retrieval: {text}"
            result = self.client.feature_extraction(prefixed, model=self.model)

            # Handle nested list output (token-level vectors) vs flat vector
            if isinstance(result, list):
                if len(result) > 0 and isinstance(result[0], list):
                    embedding = np.mean(result, axis=0).tolist()
                else:
                    embedding = list(result)
            else:
                embedding = result.tolist()

            # Normalize to unit vector for cosine similarity
            vec = np.array(embedding, dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm

            return vec.tolist()[: self.dimension]

        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return [0.0] * self.dimension

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts sequentially."""
        return [await self.embed_text(t) for t in texts]


embedding_service = EmbeddingService()
