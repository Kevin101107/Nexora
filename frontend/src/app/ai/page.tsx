"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, BookOpen, HelpCircle, AlignLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { createApiClient } from "@/lib/api";
import { useToast } from "@/components/Toast";

type Mode = "chat" | "explain" | "quiz" | "summarize";
type Message = { role: "user" | "assistant"; content: string };

interface QuizQuestion { question: string; options: string[]; answer: number; explanation: string; }

const MODES: { id: Mode; label: string; icon: typeof Sparkles; placeholder: string }[] = [
  { id: "chat",      label: "Chat",      icon: Sparkles,   placeholder: "Ask me anything…" },
  { id: "explain",   label: "Explain",   icon: BookOpen,   placeholder: "Enter a concept to explain…" },
  { id: "quiz",      label: "Quiz",      icon: HelpCircle, placeholder: "Enter a topic to quiz you on…" },
  { id: "summarize", label: "Summarize", icon: AlignLeft,  placeholder: "Paste text to summarize…" },
];

export default function AIPage() {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setToken(session?.access_token ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading || !token) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    const api = createApiClient(token);

    try {
      if (mode === "quiz") {
        setMessages([]);
        setQuizQuestions([]);
        const res = await api.post<{ questions: string }>("/ai/quiz", { topic: text, count: 5 });
        const parsed: QuizQuestion[] = JSON.parse(res.questions);
        setQuizQuestions(parsed);
        setQuizAnswers({});
        setLoading(false);
        return;
      }

      const userMsg: Message = { role: "user", content: text };
      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages((m) => mode === "chat" ? [...m, userMsg, assistantMsg] : [userMsg, assistantMsg]);

      const path = mode === "chat" ? "/ai/chat" : mode === "explain" ? "/ai/explain" : "/ai/summarize";
      const body = mode === "chat"
        ? { message: text, history: messages }
        : mode === "explain"
        ? { concept: text }
        : { content: text };

      await api.stream(path, body, (chunk) => {
        setMessages((m) => {
          const last = m[m.length - 1];
          return [...m.slice(0, -1), { ...last, content: last.content + chunk }];
        });
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
      setMessages((m) => m.filter((x) => x.content !== ""));
    } finally {
      setLoading(false);
    }
  }

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI Tutor</h1>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/[0.05] rounded-xl w-fit">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setMessages([]); setQuizQuestions([]); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                mode === id
                  ? "bg-white dark:bg-white/[0.1] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "quiz" && quizQuestions.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {quizQuestions.map((q, qi) => (
            <div key={qi} className="card">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const answered = quizAnswers[qi] !== undefined;
                  const isSelected = quizAnswers[qi] === oi;
                  const isCorrect = oi === q.answer;
                  return (
                    <button
                      key={oi}
                      onClick={() => !answered && setQuizAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm border transition-colors duration-150 ${
                        !answered
                          ? "border-gray-100 dark:border-white/[0.07] hover:border-primary/40 hover:bg-primary/5"
                          : isSelected && isCorrect
                          ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : isSelected && !isCorrect
                          ? "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300"
                          : isCorrect
                          ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                          : "border-gray-100 dark:border-white/[0.07] opacity-50"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {quizAnswers[qi] !== undefined && (
                <p className="text-xs text-gray-500 dark:text-white/40 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-4">
                <currentMode.icon size={22} className="text-primary" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-white/60">
                {mode === "chat" && "Ask your AI tutor anything"}
                {mode === "explain" && "Enter a concept to get a clear explanation"}
                {mode === "quiz" && "Enter a topic and test your knowledge"}
                {mode === "summarize" && "Paste any text to get a concise summary"}
              </p>
              <p className="text-sm text-gray-400 dark:text-white/25 mt-1">Powered by Claude</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.06] text-gray-800 dark:text-white/85 rounded-bl-sm"
                }`}
              >
                {msg.content || (
                  <span className="flex gap-1">
                    {[0,1,2].map((j) => (
                      <span key={j} className="w-1.5 h-1.5 bg-gray-300 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={currentMode.placeholder}
          disabled={loading || !token}
          className="input-field flex-1"
        />
        <button type="submit" disabled={loading || !input.trim() || !token} className="btn-primary px-4">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
