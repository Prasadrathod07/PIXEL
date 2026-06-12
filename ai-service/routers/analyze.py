from fastapi import APIRouter, HTTPException
from models.schemas import AnalyzeRequest, AIAnalysis, ImproveRequest, ImproveResponse
from services.rag import rag_pipeline
from services.llm import llm_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze", response_model=AIAnalysis)
async def analyze_issue(request: AnalyzeRequest):
    """
    RAG-powered issue analysis:
    BGE-M3 embedding → pgvector similarity → Mimo-v2-pro via LiteLLM
    """
    if len(request.title.strip()) < 3:
        raise HTTPException(status_code=400, detail="Title too short")
    if len(request.description.strip()) < 10:
        raise HTTPException(status_code=400, detail="Description too short")

    try:
        return await rag_pipeline.analyze(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/improve", response_model=ImproveResponse)
async def improve_response(request: ImproveRequest):
    """Rewrite a manager's draft response to be more professional."""
    if not request.draft.strip():
        raise HTTPException(status_code=400, detail="Draft cannot be empty")
    try:
        improved = await llm_service.improve_response(
            draft=request.draft,
            issue_title=request.issue_title,
            issue_description=request.issue_description,
            issue_type=request.issue_type,
            issue_severity=request.issue_severity,
        )
        return ImproveResponse(improved=improved)
    except Exception as e:
        logger.error(f"Improve error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to improve response")


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AI Analysis"}
