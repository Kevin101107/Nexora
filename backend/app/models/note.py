from pydantic import BaseModel
from datetime import datetime
from typing import List


class NoteCreate(BaseModel):
    title: str
    content: str
    subject: str | None = None
    tags: List[str] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    subject: str | None = None
    tags: List[str] | None = None


class Note(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    subject: str | None = None
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime
