import os
import logging
from typing import List, Optional
from supabase import create_client, Client
from models.schemas import SimilarIssue

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Supabase-backed vector store.
    The Supabase client is created lazily on first use so this module
    can be imported before environment variables are loaded.
    """

    def __init__(self):
        self._client: Optional[Client] = None

    @property
    def supabase(self) -> Client:
        if self._client is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_KEY")
            if not url or not key:
                raise RuntimeError(
                    "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set before using VectorStore"
                )
            self._client = create_client(url, key)
        return self._client

    async def store_embedding(self, issue_id: str, embedding: List[float]) -> bool:
        """Persist the embedding vector on the issues row for future similarity search."""
        try:
            self.supabase.table("issues").update({"embedding": embedding}).eq("id", issue_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to store embedding for {issue_id}: {e}")
            return False

    async def find_similar_issues(
        self,
        embedding: List[float],
        threshold: float = 0.65,
        limit: int = 5,
        exclude_id: Optional[str] = None,
    ) -> List[SimilarIssue]:
        """Call the match_issues pgvector RPC and return structured results."""
        try:
            result = self.supabase.rpc(
                "match_issues",
                {
                    "query_embedding": embedding,
                    "match_threshold": threshold,
                    "match_count": limit,
                    "exclude_issue_id": exclude_id,
                },
            ).execute()

            similar: List[SimilarIssue] = []
            for row in result.data or []:
                similar.append(
                    SimilarIssue(
                        id=str(row["id"]),
                        title=row["title"],
                        severity=row["severity"],
                        status=row["status"],
                        similarity_score=round(float(row["similarity"]), 3),
                        resolution=row.get("ai_summary"),
                    )
                )
            return similar

        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return []

    async def get_resolved_issues_context(self, similar_issues: List[SimilarIssue]) -> str:
        """Build a RAG context string from the top similar resolved issues."""
        if not similar_issues:
            return "No similar resolved issues found."

        parts = []
        for i, issue in enumerate(similar_issues[:3], 1):
            parts.append(
                f"Similar Issue {i} (Similarity: {issue.similarity_score:.1%}):\n"
                f"Title: {issue.title}\n"
                f"Severity: {issue.severity}\n"
                f"Status: {issue.status}\n"
                f"Resolution summary: {issue.resolution or 'No summary available'}\n"
                "---"
            )
        return "\n".join(parts)


vector_store = VectorStore()
