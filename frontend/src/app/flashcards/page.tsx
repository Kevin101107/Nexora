"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Plus, Layers, Trash2, RotateCcw, Sparkles, X, ChevronRight, CheckCircle, XCircle, MinusCircle } from "lucide-react";

interface Deck { id: string; title: string; subject: string | null; card_count: number; due_count: number; created_at: string; }
interface Card { id: string; deck_id: string; front: string; back: string; next_review: string; }

type View = "decks" | "cards" | "review";

export default function FlashcardsPage() {
  const [token, setToken] = useState("");
  const [view, setView] = useState<View>("decks");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("");
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const api = createApiClient(session.access_token);
      const data = await api.get<Deck[]>("/flashcards/decks").catch(() => []);
      setDecks(data);
      setLoading(false);
    });
  }, []);

  async function openDeck(deck: Deck) {
    setActiveDeck(deck);
    const api = createApiClient(token);
    const [all, due] = await Promise.all([
      api.get<Card[]>(`/flashcards/decks/${deck.id}/cards`).catch(() => []),
      api.get<Card[]>(`/flashcards/decks/${deck.id}/due`).catch(() => []),
    ]);
    setCards(all);
    setDueCards(due);
    setView("cards");
  }

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!deckTitle.trim()) return;
    const api = createApiClient(token);
    try {
      const deck = await api.post<Deck>("/flashcards/decks", { title: deckTitle, subject: deckSubject || null });
      setDecks((d) => [deck, ...d]);
      setDeckTitle(""); setDeckSubject(""); setShowNewDeck(false);
      toast("Deck created");
    } catch { toast("Failed to create deck", "error"); }
  }

  async function deleteDeck(id: string) {
    const api = createApiClient(token);
    await api.delete(`/flashcards/decks/${id}`).catch(() => {});
    setDecks((d) => d.filter((x) => x.id !== id));
    toast("Deck deleted");
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return;
    const api = createApiClient(token);
    try {
      const card = await api.post<Card>(`/flashcards/decks/${activeDeck.id}/cards`, { front: cardFront, back: cardBack });
      setCards((c) => [...c, card]);
      setCardFront(""); setCardBack(""); setShowNewCard(false);
      toast("Card added");
    } catch { toast("Failed to add card", "error"); }
  }

  async function generateCards(e: React.FormEvent) {
    e.preventDefault();
    if (!genTopic.trim() || !activeDeck) return;
    setGenerating(true);
    const api = createApiClient(token);
    try {
      const res = await api.post<{ cards: { front: string; back: string }[] }>("/flashcards/generate", {
        topic: genTopic, count: genCount, subject: activeDeck.subject,
      });
      for (const c of res.cards) {
        const card = await api.post<Card>(`/flashcards/decks/${activeDeck.id}/cards`, c);
        setCards((prev) => [...prev, card]);
      }
      setGenTopic(""); setShowGenerate(false);
      toast(`Generated ${res.cards.length} cards`);
    } catch { toast("Failed to generate cards", "error"); }
    setGenerating(false);
  }

  async function reviewCard(rating: 1 | 2 | 3) {
    const card = dueCards[reviewIndex];
    if (!card) return;
    const api = createApiClient(token);
    await api.put(`/flashcards/cards/${card.id}`, { rating }).catch(() => {});
    const next = reviewIndex + 1;
    if (next >= dueCards.length) {
      toast("Review complete! 🎉");
      setView("cards");
      const updated = await api.get<Deck[]>("/flashcards/decks").catch(() => decks);
      setDecks(updated);
    } else {
      setReviewIndex(next);
      setFlipped(false);
    }
  }

  if (view === "review" && dueCards.length > 0) {
    const card = dueCards[reviewIndex];
    return (
      <div className="max-w-lg mx-auto pt-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { setView("cards"); setFlipped(false); setReviewIndex(0); }} className="btn-ghost">
            <X size={16} /> Exit review
          </button>
          <span className="text-sm text-gray-400">{reviewIndex + 1} / {dueCards.length}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-white/[0.07] rounded-full mb-8">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(reviewIndex / dueCards.length) * 100}%` }} />
        </div>
        <div
          className="card cursor-pointer min-h-[220px] flex flex-col items-center justify-center text-center p-8 mb-6 select-none hover:border-primary/30 transition-colors"
          onClick={() => setFlipped((f) => !f)}
        >
          <p className="text-xs text-gray-400 dark:text-white/30 uppercase tracking-widest mb-4">{flipped ? "Answer" : "Question"}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
            {flipped ? card.back : card.front}
          </p>
          {!flipped && <p className="text-xs text-gray-400 dark:text-white/25 mt-6">Click to reveal answer</p>}
        </div>
        {flipped && (
          <div className="flex gap-3">
            <button onClick={() => reviewCard(1)} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium">
              <XCircle size={18} /> Hard
            </button>
            <button onClick={() => reviewCard(2)} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-sm font-medium">
              <MinusCircle size={18} /> Medium
            </button>
            <button onClick={() => reviewCard(3)} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors text-sm font-medium">
              <CheckCircle size={18} /> Easy
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === "cards" && activeDeck) {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => setView("decks")} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white/60 mb-1">← Decks</button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{activeDeck.title}</h1>
            <p className="text-sm text-gray-400 dark:text-white/30">{cards.length} cards · {dueCards.length} due</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGenerate(true)} className="btn-outline gap-2"><Sparkles size={14} /> AI Generate</button>
            <button onClick={() => setShowNewCard(true)} className="btn-primary gap-2"><Plus size={14} /> Add card</button>
            {dueCards.length > 0 && (
              <button onClick={() => { setReviewIndex(0); setFlipped(false); setView("review"); }} className="btn-primary gap-2">
                <RotateCcw size={14} /> Review {dueCards.length}
              </button>
            )}
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="card text-center py-16">
            <Layers size={32} className="text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-white/40">No cards yet</p>
            <p className="text-sm text-gray-400 dark:text-white/25 mt-1">Add cards manually or generate with AI</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card) => (
              <div key={card.id} className="card group hover:border-primary/20 transition-colors">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{card.front}</p>
                <p className="text-sm text-gray-500 dark:text-white/40 border-t border-gray-100 dark:border-white/[0.06] pt-2 mt-2">{card.back}</p>
              </div>
            ))}
          </div>
        )}

        {showNewCard && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#13131f] rounded-2xl w-full max-w-md p-6 border border-gray-100 dark:border-white/[0.08]">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Add card</h3>
              <form onSubmit={addCard} className="space-y-3">
                <div>
                  <label className="label">Front</label>
                  <input value={cardFront} onChange={(e) => setCardFront(e.target.value)} className="input-field" placeholder="Question or term…" autoFocus />
                </div>
                <div>
                  <label className="label">Back</label>
                  <textarea value={cardBack} onChange={(e) => setCardBack(e.target.value)} className="input-field resize-none" rows={3} placeholder="Answer or definition…" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowNewCard(false)} className="btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={!cardFront.trim() || !cardBack.trim()} className="btn-primary flex-1">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showGenerate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#13131f] rounded-2xl w-full max-w-md p-6 border border-gray-100 dark:border-white/[0.08]">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">AI Generate Cards</h3>
              <form onSubmit={generateCards} className="space-y-3">
                <div>
                  <label className="label">Topic</label>
                  <input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} className="input-field" placeholder="e.g. Photosynthesis, World War II…" autoFocus />
                </div>
                <div>
                  <label className="label">Number of cards</label>
                  <input type="number" min={3} max={20} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="input-field" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowGenerate(false)} className="btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={!genTopic.trim() || generating} className="btn-primary flex-1">
                    {generating ? "Generating…" : "Generate"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Flashcards</h1>
          <p className="text-sm text-gray-400 dark:text-white/30 mt-0.5">{decks.length} decks</p>
        </div>
        <button onClick={() => setShowNewDeck(true)} className="btn-primary gap-2"><Plus size={15} /> New deck</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : decks.length === 0 ? (
        <div className="card text-center py-16">
          <Layers size={32} className="text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <p className="font-semibold text-gray-500 dark:text-white/40">No decks yet</p>
          <p className="text-sm text-gray-400 dark:text-white/25 mt-1">Create your first deck to start studying</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="card hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer group relative"
              onClick={() => openDeck(deck)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
                  <Layers size={16} className="text-primary" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{deck.title}</h3>
              {deck.subject && <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{deck.subject}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{deck.card_count} cards</span>
                {deck.due_count > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{deck.due_count} due</span>
                )}
              </div>
              <ChevronRight size={14} className="absolute bottom-4 right-4 text-gray-300 dark:text-white/20 group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      )}

      {showNewDeck && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#13131f] rounded-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-white/[0.08]">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">New deck</h3>
            <form onSubmit={createDeck} className="space-y-3">
              <div>
                <label className="label">Title</label>
                <input value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} className="input-field" placeholder="e.g. Biology Chapter 4" autoFocus />
              </div>
              <div>
                <label className="label">Subject (optional)</label>
                <input value={deckSubject} onChange={(e) => setDeckSubject(e.target.value)} className="input-field" placeholder="e.g. Biology" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowNewDeck(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={!deckTitle.trim()} className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
