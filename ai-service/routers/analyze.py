from fastapi import APIRouter, HTTPException
from models.schemas import AnalyzeRequest, AIAnalysis
from services.rag import rag_pipeline
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


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AI Analysis"}
