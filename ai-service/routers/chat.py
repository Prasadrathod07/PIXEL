from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.llm import llm_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint using Mimo-v2-pro for issue assistance."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    try:
        response = await llm_service.chat(
            messages=[m.model_dump() for m in request.messages],
            issue_context=request.issue_context,
        )
        return ChatResponse(message=response)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
