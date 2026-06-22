import asyncio
import json
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from app.models.ai import ChatRequest, ExplainRequest, QuizRequest, SummarizeRequest
from app.core.config import settings
from app.core.auth import get_user_id
from app.core.supabase import get_supabase
import anthropic

router = APIRouter(prefix="/ai", tags=["ai"])

MODEL = "claude-sonnet-4-5-20250514"

PROMPTS = {
    "tutor": (
        "You are Nexora's AI Tutor — knowledgeable, friendly, built for students. "
        "Help understand concepts, solve problems, summarize content, and study effectively. "
        "Be concise, clear, and use examples when helpful."
    ),
    "explain": (
        "You are a patient teacher explaining academic concepts. "
        "Break things down clearly with examples and analogies. "
        "Use structured formatting with key points highlighted."
    ),
    "quiz": (
        "You generate quiz questions for students. "
        "Return ONLY a JSON array of objects with fields: "
        '"question" (string), "options" (array of 4 strings), "answer" (index 0-3), "explanation" (string). '
        "No markdown, no extra text — raw JSON only."
    ),
    "summarize": (
        "You summarize academic content for students. "
        "Produce a clear, structured summary with key points as bullet points. "
        "Be concise but comprehensive."
    ),
}


def _parse_json_payload(text: str):
    payload = text.strip()
    if payload.startswith("```"):
        parts = payload.split("```")
        if len(parts) >= 3:
            payload = parts[1]
            if payload.startswith("json"):
                payload = payload[4:].strip()
    return json.loads(payload)


def _normalize_quiz_questions(raw) -> list[dict]:
    if not isinstance(raw, list):
        raise ValueError("Quiz payload is not an array")
    normalized = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "")).strip()
        options = item.get("options", [])
        answer = item.get("answer", -1)
        explanation = str(item.get("explanation", "")).strip()
        if not question or not isinstance(options, list) or len(options) != 4:
            continue
        clean_options = [str(opt).strip() for opt in options]
        if any(not opt for opt in clean_options):
            continue
        try:
            answer_idx = int(answer)
        except (TypeError, ValueError):
            continue
        if answer_idx < 0 or answer_idx > 3:
            continue
        normalized.append(
            {
                "question": question,
                "options": clean_options,
                "answer": answer_idx,
                "explanation": explanation,
            }
        )
    if not normalized:
        raise ValueError("No valid quiz questions returned")
    return normalized


def _award_xp(user_id: str) -> None:
    try:
        supabase = get_supabase()
        row = supabase.table("users").select("xp, level").eq("id", user_id).single().execute().data
        if row:
            new_xp = row["xp"] + 2
            supabase.table("users").update({"xp": new_xp, "level": (new_xp // 100) + 1}).eq("id", user_id).execute()
    except Exception:
        pass


async def _stream(user_id: str, system: str, messages: list):
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        with client.messages.stream(model=MODEL, max_tokens=2048, system=system, messages=messages) as stream:
            for text in stream.text_stream:
                yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"
        await asyncio.to_thread(_award_xp, user_id)
    except Exception as e:
        yield f"data: [ERROR] {str(e)}\n\n"


@router.post("/chat")
async def chat(request: ChatRequest, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})
    return StreamingResponse(
        _stream(user_id, PROMPTS["tutor"], messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/explain")
async def explain(request: ExplainRequest, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    content = f"Explain this concept clearly: {request.concept}"
    if request.subject:
        content += f"\nSubject area: {request.subject}"
    return StreamingResponse(
        _stream(user_id, PROMPTS["explain"], [{"role": "user", "content": content}]),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/quiz")
async def quiz(request: QuizRequest, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    content = f"Generate {request.count} multiple-choice quiz questions on: {request.topic}"
    if request.subject:
        content += f"\nSubject: {request.subject}"
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = await asyncio.to_thread(
            client.messages.create,
            model=MODEL,
            max_tokens=2048,
            system=PROMPTS["quiz"],
            messages=[{"role": "user", "content": content}],
        )
        raw_questions = _parse_json_payload(response.content[0].text)
        questions = _normalize_quiz_questions(raw_questions)
        _award_xp(user_id)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize")
async def summarize(request: SummarizeRequest, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    style_hint = "in 3-5 bullet points" if request.style == "concise" else "in detail"
    content = f"Summarize the following content {style_hint}:\n\n{request.content}"
    return StreamingResponse(
        _stream(user_id, PROMPTS["summarize"], [{"role": "user", "content": content}]),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
