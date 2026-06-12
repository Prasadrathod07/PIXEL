import logging
from models.schemas import AIAnalysis, AnalyzeRequest
from services.embeddings import embedding_service
from services.vector_store import vector_store
from services.llm import llm_service

logger = logging.getLogger(__name__)


class RAGPipeline:
    """
    6-step RAG pipeline:
      1. Embed issue text with BGE-M3
      2. Search pgvector for similar resolved issues
      3. Build context string from top matches
      4. Call Mimo-v2-pro with context via LiteLLM
      5. Persist embedding for future searches
      6. Return structured AIAnalysis
    """

    async def analyze(self, request: AnalyzeRequest) -> AIAnalysis:
        combined_text = f"{request.title}. {request.description}"
        logger.info(f"Analyzing: {request.title[:60]}...")

        # 1 — embed
        embedding = await embedding_service.embed_text(combined_text)
        logger.info("Embedding generated")

        # 2 — vector search
        similar_issues = await vector_store.find_similar_issues(
            embedding=embedding,
            threshold=0.60,
            limit=5,
            exclude_id=request.issue_id,
        )
        logger.info(f"Found {len(similar_issues)} similar issues")

        # 3 — build RAG context
        context = await vector_store.get_resolved_issues_context(similar_issues)

        # 4 — LLM analysis
        analysis_data = await llm_service.analyze_issue(
            title=request.title,
            description=request.description,
            similar_context=context,
            current_severity=request.current_severity,
        )
        logger.info("LLM analysis complete")

        # 5 — store embedding for future searches
        if request.issue_id:
            stored = await vector_store.store_embedding(request.issue_id, embedding)
            if stored:
                logger.info(f"Embedding stored for issue {request.issue_id}")

        # 6 — return structured result
        return AIAnalysis(
            suggested_severity=analysis_data.get("suggested_severity", "medium"),
            suggested_category=analysis_data.get("suggested_category", "bug"),
            summary=analysis_data.get("summary", ""),
            recommended_actions=analysis_data.get("recommended_actions", []),
            draft_response=analysis_data.get("draft_response", ""),
            similar_issues=similar_issues,
            confidence_score=float(analysis_data.get("confidence_score", 0.7)),
        )


rag_pipeline = RAGPipeline()
