from pydantic import BaseModel
from datetime import datetime


class DeckCreate(BaseModel):
    title: str
    subject: str | None = None


class Deck(BaseModel):
    id: str
    user_id: str
    title: str
    subject: str | None = None
    created_at: datetime
    card_count: int = 0
    due_count: int = 0


class CardCreate(BaseModel):
    front: str
    back: str


class CardReview(BaseModel):
    rating: int


class Card(BaseModel):
    id: str
    deck_id: str
    front: str
    back: str
    next_review: datetime
    ease_factor: float
    interval_days: int
    created_at: datetime


class GenerateCardsRequest(BaseModel):
    topic: str
    count: int = 10
    subject: str | None = None
