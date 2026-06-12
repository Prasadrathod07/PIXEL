import os
import json
import logging
from litellm import completion
from typing import Optional

logger = logging.getLogger(__name__)

ANALYSIS_SYSTEM_PROMPT = """You are an expert technical support analyst for a web agency.
You analyze website issues reported by clients and provide structured analysis.

Your task is to analyze the given issue and return a JSON response with exactly these fields:
{
  "suggested_severity": "low" | "medium" | "high" | "critical",
  "suggested_category": "bug" | "feedback" | "suggestion" | "improvement",
  "summary": "2-3 sentence summary of the issue",
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "draft_response": "Professional response to send to the client",
  "confidence_score": 0.0 to 1.0
}

Severity guide:
- critical: Site completely down, data loss, security breach, major revenue impact
- high: Core feature broken, significant user impact, payment issues
- medium: Feature partially broken, workaround exists, moderate impact
- low: Minor UI issue, suggestion, enhancement request

Return ONLY valid JSON. No markdown, no explanation, just the JSON object."""

CHAT_SYSTEM_PROMPT = """You are a helpful technical support assistant for Pixel, a web agency platform.
You help managers understand and resolve client issues. Be concise, professional, and actionable.
When given issue context, use it to provide specific, relevant advice."""


class LLMService:
    def __init__(self):
        self.model = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")
        self.api_key = os.getenv("GROQ_API_KEY")
        self.max_tokens = 1000

    def _call_llm(self, messages: list, max_tokens: int = None) -> str:
        try:
            response = completion(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens or self.max_tokens,
                temperature=0.3,
                api_key=self.api_key,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM FAILED — model={self.model} — {type(e).__name__}: {e}")
            raise

    async def analyze_issue(
        self,
        title: str,
        description: str,
        similar_context: str,
        current_severity: Optional[str] = None,
    ) -> dict:
        """Run LLM analysis with RAG context and return a parsed dict."""
        user_message = (
            f"Analyze this client issue:\n\n"
            f"ISSUE TITLE: {title}\n\n"
            f"ISSUE DESCRIPTION: {description}\n\n"
            f"HISTORICAL CONTEXT (similar resolved issues):\n{similar_context}\n\n"
        )
        if current_severity:
            user_message += f"Current severity assigned by client: {current_severity}\n\n"
        user_message += "Provide your analysis as JSON."

        messages = [
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ]

        raw = ""
        try:
            raw = self._call_llm(messages)
            # Strip any accidental markdown fences
            clean = raw.strip()
            if clean.startswith("```"):
                parts = clean.split("```")
                clean = parts[1] if len(parts) > 1 else clean
                if clean.startswith("json"):
                    clean = clean[4:]
            return json.loads(clean.strip())

        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"LLM parse error: {e} | raw: {raw[:200]}")
            return {
                "suggested_severity": current_severity or "medium",
                "suggested_category": "bug",
                "summary": f"Issue reported: {title}",
                "recommended_actions": [
                    "Review the issue description carefully",
                    "Reproduce the issue in a test environment",
                    "Check recent deployments for related changes",
                ],
                "draft_response": (
                    f"Thank you for reporting this issue. We have received your report about "
                    f"'{title}' and our team will investigate it promptly."
                ),
                "confidence_score": 0.5,
            }

    async def chat(self, messages: list, issue_context: Optional[dict] = None) -> str:
        """Conversational endpoint with optional issue context injected into system prompt."""
        system_content = CHAT_SYSTEM_PROMPT
        if issue_context:
            system_content += (
                f"\n\nCurrent Issue Context:\n"
                f"Title: {issue_context.get('title')}\n"
                f"Description: {issue_context.get('description')}\n"
                f"Status: {issue_context.get('status')}\n"
                f"Severity: {issue_context.get('severity')}\n"
                f"Type: {issue_context.get('type')}"
            )

        litellm_messages = [{"role": "system", "content": system_content}]
        litellm_messages.extend({"role": m["role"], "content": m["content"]} for m in messages)

        return self._call_llm(litellm_messages, max_tokens=500)


llm_service = LLMService()
