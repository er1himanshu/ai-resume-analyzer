import json

import httpx

from app.config import settings


class GeminiService:
    def __init__(self) -> None:
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def maybe_enhance_json(self, instruction: str, base_payload: dict) -> dict:
        if not self.enabled:
            return {"provider": "mock", "content": base_payload}

        prompt = (
            "Return STRICT JSON only. Improve this draft output while keeping exact top-level keys. "
            f"Instruction: {instruction}. Draft: {json.dumps(base_payload)}"
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        params = {"key": self.api_key}
        body = {"contents": [{"parts": [{"text": prompt}]}]}

        try:
            async with httpx.AsyncClient(timeout=18) as client:
                response = await client.post(url, params=params, json=body)
                response.raise_for_status()
                data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)
            return {"provider": "gemini", "content": parsed}
        except Exception:
            return {"provider": "mock", "content": base_payload}


gemini_service = GeminiService()
