import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Header
from app.models.flashcard import DeckCreate, CardCreate, CardReview, GenerateCardsRequest
from app.core.supabase import get_supabase
from app.core.auth import get_user_id
from app.core.config import settings
import anthropic

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


def _parse_json_payload(text: str):
    payload = text.strip()
    if payload.startswith("```"):
        parts = payload.split("```")
        if len(parts) >= 3:
            payload = parts[1]
            if payload.startswith("json"):
                payload = payload[4:].strip()
    return json.loads(payload)


def _normalize_cards(raw) -> list[dict]:
    if not isinstance(raw, list):
        raise ValueError("Cards payload is not an array")
    normalized = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        front = str(item.get("front", "")).strip()
        back = str(item.get("back", "")).strip()
        if front and back:
            normalized.append({"front": front, "back": back})
    if not normalized:
        raise ValueError("No valid cards returned")
    return normalized


def _level_xp(rating: int, ease: float, interval: int) -> tuple[float, int]:
    if rating == 3:
        new_ease = min(ease + 0.1, 2.5)
        new_interval = max(round(interval * new_ease), interval + 1)
    elif rating == 2:
        new_ease = ease
        new_interval = max(round(interval * ease), interval + 1)
    else:
        new_ease = max(ease - 0.2, 1.3)
        new_interval = 1
    return new_ease, new_interval


@router.get("/decks")
async def list_decks(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    decks = supabase.table("flashcard_decks").select("*").eq("user_id", user_id).order("created_at", desc=True).execute().data
    now = datetime.now(timezone.utc).isoformat()
    for deck in decks:
        cards = supabase.table("flashcards").select("id, next_review").eq("deck_id", deck["id"]).execute().data
        deck["card_count"] = len(cards)
        deck["due_count"] = sum(1 for c in cards if c["next_review"] <= now)
    return decks


@router.post("/decks", status_code=201)
async def create_deck(deck: DeckCreate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    res = supabase.table("flashcard_decks").insert({"user_id": user_id, "title": deck.title, "subject": deck.subject}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create deck")
    return res.data[0]


@router.delete("/decks/{deck_id}", status_code=204)
async def delete_deck(deck_id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    supabase.table("flashcard_decks").delete().eq("id", deck_id).eq("user_id", user_id).execute()


@router.get("/decks/{deck_id}/cards")
async def list_cards(deck_id: str, authorization: str = Header(...)):
    await get_user_id(authorization)
    supabase = get_supabase()
    res = supabase.table("flashcards").select("*").eq("deck_id", deck_id).order("created_at").execute()
    return res.data


@router.get("/decks/{deck_id}/due")
async def due_cards(deck_id: str, authorization: str = Header(...)):
    await get_user_id(authorization)
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    res = supabase.table("flashcards").select("*").eq("deck_id", deck_id).lte("next_review", now).execute()
    return res.data


@router.post("/decks/{deck_id}/cards", status_code=201)
async def add_card(deck_id: str, card: CardCreate, authorization: str = Header(...)):
    await get_user_id(authorization)
    supabase = get_supabase()
    res = supabase.table("flashcards").insert({"deck_id": deck_id, "front": card.front, "back": card.back}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to add card")
    return res.data[0]


@router.put("/cards/{card_id}")
async def review_card(card_id: str, review: CardReview, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    card = supabase.table("flashcards").select("*").eq("id", card_id).single().execute().data
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    new_ease, new_interval = _level_xp(review.rating, card["ease_factor"], card["interval_days"])
    next_review = (datetime.now(timezone.utc) + timedelta(days=new_interval)).isoformat()
    updated = supabase.table("flashcards").update({
        "ease_factor": new_ease,
        "interval_days": new_interval,
        "next_review": next_review,
    }).eq("id", card_id).execute()
    _award_xp(user_id, 5, supabase)
    return updated.data[0] if updated.data else {}


@router.delete("/cards/{card_id}", status_code=204)
async def delete_card(card_id: str, authorization: str = Header(...)):
    await get_user_id(authorization)
    supabase = get_supabase()
    supabase.table("flashcards").delete().eq("id", card_id).execute()


@router.post("/generate")
async def generate_cards(req: GenerateCardsRequest, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = (
        f"Generate {req.count} flashcards for studying the topic: {req.topic}.\n"
        + (f"Subject area: {req.subject}.\n" if req.subject else "")
        + 'Return ONLY a JSON array of objects with "front" and "back" string fields. No markdown, no explanation.'
    )
    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250514",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        cards = _normalize_cards(_parse_json_payload(response.content[0].text))
        _award_xp(user_id, 2, get_supabase())
        return {"cards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _award_xp(user_id: str, amount: int, supabase) -> None:
    try:
        row = supabase.table("users").select("xp, level").eq("id", user_id).single().execute().data
        if not row:
            return
        new_xp = row["xp"] + amount
        new_level = (new_xp // 100) + 1
        supabase.table("users").update({"xp": new_xp, "level": new_level}).eq("id", user_id).execute()
    except Exception:
        pass
