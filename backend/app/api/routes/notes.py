from fastapi import APIRouter, HTTPException, Header
from app.models.note import NoteCreate, NoteUpdate
from app.core.supabase import get_supabase
from app.core.auth import get_user_id

router = APIRouter(prefix="/notes", tags=["notes"])


def _award_xp(user_id: str, supabase) -> None:
    try:
        row = supabase.table("users").select("xp, level, badges").eq("id", user_id).single().execute().data
        if not row:
            return
        xp = row.get("xp", 0) or 0
        new_xp = xp + 10
        new_level = (new_xp // 100) + 1
        badges = list(row.get("badges") or [])
        if "first_note" not in badges:
            badges.append("first_note")
        supabase.table("users").update({"xp": new_xp, "level": new_level, "badges": badges}).eq("id", user_id).execute()
    except Exception:
        pass


@router.get("/")
async def list_notes(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    res = supabase.table("notes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data


@router.post("/", status_code=201)
async def create_note(note: NoteCreate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    payload = {"user_id": user_id, **note.model_dump(exclude_none=True)}
    res = supabase.table("notes").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create note")
    _award_xp(user_id, supabase)
    return res.data[0]


@router.put("/{note_id}")
async def update_note(note_id: str, note: NoteUpdate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    body = note.model_dump(exclude_none=True)
    if not body:
        raise HTTPException(status_code=422, detail="No fields to update")
    supabase = get_supabase()
    res = (
        supabase.table("notes")
        .update(body)
        .eq("id", note_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Note not found")
    return res.data[0]


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    supabase.table("notes").delete().eq("id", note_id).eq("user_id", user_id).execute()
