from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class IssueSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IssueType(str, Enum):
    bug = "bug"
    feedback = "feedback"
    suggestion = "suggestion"
    improvement = "improvement"


class IssueStatus(str, Enum):
    open = "open"
    in_review = "in_review"
    in_progress = "in_progress"
    waiting_for_client = "waiting_for_client"
    resolved = "resolved"
    closed = "closed"


class SimilarIssue(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    similarity_score: float
    resolution: Optional[str] = None


class AnalyzeRequest(BaseModel):
    issue_id: Optional[str] = None
    title: str
    description: str
    current_severity: Optional[str] = None
    current_type: Optional[str] = None


class AIAnalysis(BaseModel):
    suggested_severity: IssueSeverity
    suggested_category: IssueType
    summary: str
    recommended_actions: List[str]
    draft_response: str
    similar_issues: List[SimilarIssue]
    confidence_score: float


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    issue_context: Optional[dict] = None


class ChatResponse(BaseModel):
    message: str
    role: str = "assistant"
