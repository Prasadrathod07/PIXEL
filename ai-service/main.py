import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env BEFORE any service singletons are instantiated
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Pixel AI Service...")
    logger.info(f"LLM model  : {os.getenv('MIMO_MODEL', 'mimo-v2-pro')}")
    logger.info(f"Embeddings : {os.getenv('EMBEDDING_MODEL', 'BAAI/bge-m3')}")
    logger.info(f"Supabase   : {os.getenv('SUPABASE_URL', '(not set)')}")
    yield
    logger.info("Shutting down AI service...")


app = FastAPI(
    title="Pixel AI Service",
    description="RAG-powered issue analysis using BGE-M3 + pgvector + Mimo-v2-pro",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])


@app.get("/")
async def root():
    return {
        "service": "Pixel AI Service",
        "status": "running",
        "endpoints": ["/api/analyze", "/api/chat", "/api/health"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
