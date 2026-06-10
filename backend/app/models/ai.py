from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ExplainRequest(BaseModel):
    concept: str
    subject: str | None = None


class QuizRequest(BaseModel):
    topic: str
    count: int = 5
    subject: str | None = None


class SummarizeRequest(BaseModel):
    content: str
    style: str = "concise"
