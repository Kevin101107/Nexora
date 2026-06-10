"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { createApiClient, ApiClient } from "@/lib/api";
import dynamic from "next/dynamic";
import { Plus, Search, X, Pin, PinOff, Trash2, MoreVertical, Save, FileText, Hash } from "lucide-react";
import { useToast } from "@/components/Toast";

const NoteEditor = dynamic(() => import("@/components/NoteEditor"), { ssr: false });

interface Note {
  id: string; title: string; content: string; subject: string | null;
  tags: string[] | null; created_at: string;
}
interface Form { title: string; content: string; subject: string; color: string; pinned: boolean; }

const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology", "History", "English", "Computer Science", "Other"];
const SUBJECT_PILL: Record<string, string> = {
  "Math": "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300",
  "Physics": "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300",
  "Chemistry": "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "Biology": "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-300",
  "History": "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
  "English": "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-300",
  "Computer Science": "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300",
  "Other": "bg-gray-100 dark:bg-white/[0.07] text-gray-600 dark:text-white/50",
};
const COLORS = [
  { id: "default", swatch: "bg-white dark:bg-[#1a1a2e] ring-gray-200 dark:ring-white/10", card: "" },
  { id: "purple", swatch: "bg-purple-100 dark:bg-purple-500/20 ring-purple-300", card: "bg-purple-50/80 dark:bg-purple-500/[0.06] border-purple-100 dark:border-purple-500/20" },
  { id: "blue",   swatch: "bg-blue-100 dark:bg-blue-500/20 ring-blue-300",   card: "bg-blue-50/80 dark:bg-blue-500/[0.06] border-blue-100 dark:border-blue-500/20" },
  { id: "green",  swatch: "bg-emerald-100 dark:bg-emerald-500/20 ring-emerald-300", card: "bg-emerald-50/80 dark:bg-emerald-500/[0.06] border-emerald-100 dark:border-emerald-500/20" },
  { id: "yellow", swatch: "bg-yellow-100 dark:bg-yellow-500/20 ring-yellow-300", card: "bg-yellow-50/80 dark:bg-yellow-500/[0.06] border-yellow-100 dark:border-yellow-500/20" },
  { id: "red",    swatch: "bg-red-100 dark:bg-red-500/20 ring-red-300",    card: "bg-red-50/80 dark:bg-red-500/[0.06] border-red-100 dark:border-red-500/20" },
];

function isPinned(n: Note) { return n.tags?.includes("pinned") ?? false; }
function getColor(n: Note) { return n.tags?.find((x) => x.startsWith("color:"))?.slice(6) ?? "default"; }
function buildTags(pinned: boolean, color: string) {
  const t: string[] = [];
  if (pinned) t.push("pinned");
  if (color !== "default") t.push(`color:${color}`);
  return t;
}
function stripHtml(h: string) { return h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function wordCount(h: string) { return stripHtml(h).split(/\s+/).filter(Boolean).length; }
function timeAgo(raw: string) {
  const diff = (Date.now() - new Date(raw).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(raw).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotesPage() {
  const [token, setToken] = useState("");
  const [api, setApi] = useState<ApiClient | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [form, setForm] = useState<Form>({ title: "", content: "", subject: "", color: "default", pinned: false });
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const a = createApiClient(session.access_token);
      setApi(a);
      const data = await a.get<Note[]>("/notes/").catch(() => []);
      setNotes(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const autoSave = useCallback(() => {
    if (!api || !form.title.trim() || !editingId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const body = { title: form.title.trim(), content: form.content, subject: form.subject || null, tags: buildTags(form.pinned, form.color) };
      try {
        const updated = await api.put<Note>(`/notes/${editingId}`, body);
        setNotes((p) => p.map((n) => n.id === editingId ? updated : n));
        setLastSaved(new Date());
      } catch { toast("Could not save", "error"); }
      setSaving(false);
    }, 1000);
  }, [api, form, editingId, toast]);

  function openCreate() {
    setEditingId(null); setLastSaved(null);
    setForm({ title: "", content: "", subject: "", color: "default", pinned: false });
    setPanelOpen(true);
  }

  function openEdit(note: Note) {
    setEditingId(note.id); setLastSaved(null);
    setForm({ title: note.title ?? "", content: note.content ?? "", subject: note.subject ?? "", color: getColor(note), pinned: isPinned(note) });
    setPanelOpen(true); setMenuId(null);
  }

  function closePanel() { setPanelOpen(false); setEditingId(null); clearTimeout(saveTimer.current); }

  async function handleCreate() {
    if (!api || !form.title.trim()) return;
    setSaving(true);
    const body = { title: form.title.trim(), content: form.content, subject: form.subject || null, tags: buildTags(form.pinned, form.color) };
    try {
      const note = await api.post<Note>("/notes/", body);
      setNotes((p) => [note, ...p]);
      setEditingId(note.id);
      setLastSaved(new Date());
      toast("Note created");
    } catch { toast("Could not create note", "error"); }
    setSaving(false);
  }

  async function handleTogglePin(note: Note) {
    if (!api) return;
    const tags = buildTags(!isPinned(note), getColor(note));
    try {
      const updated = await api.put<Note>(`/notes/${note.id}`, { tags });
      setNotes((p) => p.map((n) => n.id === note.id ? updated : n));
    } catch { toast("Could not update note", "error"); }
    setMenuId(null);
  }

  async function handleDelete(id: string) {
    if (!api) return;
    try {
      await api.delete(`/notes/${id}`);
      setNotes((p) => p.filter((n) => n.id !== id));
      if (editingId === id) closePanel();
      toast("Note deleted");
    } catch { toast("Could not delete", "error"); }
    setDeleteId(null);
  }

  const lower = search.toLowerCase();
  const filtered = notes.filter((n) =>
    (n.title.toLowerCase().includes(lower) || stripHtml(n.content).toLowerCase().includes(lower)) &&
    (subjectFilter ? n.subject === subjectFilter : true)
  );
  const pinnedNotes = filtered.filter(isPinned);
  const otherNotes = filtered.filter((n) => !isPinned(n));

  const NoteCard = ({ note }: { note: Note }) => {
    const cardColor = COLORS.find((c) => c.id === getColor(note))?.card ?? "";
    const pill = note.subject ? SUBJECT_PILL[note.subject] ?? SUBJECT_PILL["Other"] : null;
    const isOpen = menuId === note.id;
    return (
      <div
        className={`relative group rounded-2xl border p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 ${cardColor || "bg-white dark:bg-[#16162a] border-gray-100 dark:border-white/[0.06]"}`}
        onClick={() => openEdit(note)}
      >
        {isPinned(note) && <Pin size={11} className="absolute top-3 right-10 text-primary/50 fill-primary/20" />}
        <div className="absolute top-2.5 right-2.5" ref={isOpen ? menuRef : undefined}>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setMenuId(isOpen ? null : note.id); }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300 dark:text-white/20 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all"
          >
            <MoreVertical size={13} />
          </button>
          {isOpen && (
            <div className="absolute right-0 top-8 w-40 bg-white dark:bg-[#16162a] border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-lg z-50 py-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => openEdit(note)} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.05]">Edit</button>
              <button onClick={() => handleTogglePin(note)} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                {isPinned(note) ? <><PinOff size={12} /> Unpin</> : <><Pin size={12} /> Pin</>}
              </button>
              <div className="h-px bg-gray-100 dark:bg-white/[0.06] my-1" />
              <button onClick={() => { setDeleteId(note.id); setMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug mb-1.5 pr-6 line-clamp-2">{note.title || "Untitled"}</h3>
        {stripHtml(note.content) && (
          <p className="text-xs text-gray-400 dark:text-white/35 line-clamp-3 leading-relaxed mb-3">{stripHtml(note.content)}</p>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {pill ? (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill}`}>
              <Hash size={8} />{note.subject}
            </span>
          ) : <span />}
          <span className="text-[10px] text-gray-300 dark:text-white/20">{timeAgo(note.created_at)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-sm text-gray-400 dark:text-white/30 mt-0.5">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2"><Plus size={15} /> New note</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-7">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…" className="input-field pl-9" />
        </div>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="input-field sm:w-44">
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className={`break-inside-avoid mb-4 rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse ${i % 3 === 0 ? "h-40" : i % 3 === 1 ? "h-28" : "h-52"}`} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
            <FileText size={22} className="text-gray-300 dark:text-white/20" />
          </div>
          <p className="font-semibold text-gray-500 dark:text-white/40">{notes.length === 0 ? "No notes yet" : "Nothing matches"}</p>
          <p className="text-sm text-gray-400 dark:text-white/25 mt-1 mb-6">
            {notes.length === 0 ? "Capture your first study note" : "Try adjusting your search"}
          </p>
          {notes.length === 0 && <button onClick={openCreate} className="btn-primary gap-2"><Plus size={14} /> Create first note</button>}
        </div>
      ) : (
        <div className="space-y-7">
          {pinnedNotes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pin size={11} className="text-primary" />
                <span className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">Pinned</span>
              </div>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                {pinnedNotes.map((n) => <div key={n.id} className="break-inside-avoid mb-4"><NoteCard note={n} /></div>)}
              </div>
            </section>
          )}
          <section>
            {pinnedNotes.length > 0 && otherNotes.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest">Other</span>
              </div>
            )}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {otherNotes.map((n) => <div key={n.id} className="break-inside-avoid mb-4"><NoteCard note={n} /></div>)}
            </div>
          </section>
        </div>
      )}

      {/* Backdrop */}
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200 ${panelOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={closePanel} />

      {/* Side panel */}
      <aside className={`fixed top-0 right-0 h-full w-full max-w-[46%] min-w-[380px] bg-white dark:bg-[#0f0f17] border-l border-gray-100 dark:border-white/[0.06] z-50 flex flex-col transition-transform duration-300 ease-in-out ${panelOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            {lastSaved && <span className="text-xs text-emerald-500 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">Saved</span>}
            {saving && <span className="text-xs text-gray-400">Saving…</span>}
          </div>
          <div className="flex items-center gap-2">
            {!editingId && (
              <button onClick={handleCreate} disabled={saving || !form.title.trim()} className="btn-primary gap-1.5 text-xs px-3 py-2">
                <Save size={12} /> Create
              </button>
            )}
            <button onClick={closePanel} className="btn-ghost p-2"><X size={16} /></button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-2 shrink-0">
          <input
            autoFocus={panelOpen}
            value={form.title}
            onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); if (editingId) autoSave(); }}
            placeholder="Note title…"
            className="w-full text-xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-200 dark:placeholder:text-white/10"
          />
        </div>

        <div className="px-5 pb-3 flex items-center gap-3 flex-wrap shrink-0">
          <select value={form.subject} onChange={(e) => { setForm((f) => ({ ...f, subject: e.target.value })); if (editingId) autoSave(); }} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-600 dark:text-white/50 focus:outline-none">
            <option value="">No subject</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button key={c.id} type="button" onClick={() => { setForm((f) => ({ ...f, color: c.id })); if (editingId) autoSave(); }}
                className={`w-4.5 h-4.5 rounded-full border-2 transition-all ${c.swatch} ${form.color === c.id ? "ring-2 ring-offset-1 ring-primary scale-110" : "hover:scale-105"}`}
                style={{ width: 18, height: 18 }}
              />
            ))}
          </div>
          <button type="button" onClick={() => { setForm((f) => ({ ...f, pinned: !f.pinned })); if (editingId) autoSave(); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${form.pinned ? "bg-primary/10 border-primary/20 text-primary" : "border-gray-200 dark:border-white/[0.08] text-gray-400"}`}>
            <Pin size={10} /> {form.pinned ? "Pinned" : "Pin"}
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.05] shrink-0" />

        <div className="flex-1 overflow-hidden flex flex-col">
          <NoteEditor
            content={form.content}
            onChange={(html) => { setForm((f) => ({ ...f, content: html })); if (editingId) autoSave(); }}
          />
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400 dark:text-white/20">{wordCount(form.content)} words</span>
          {lastSaved ? (
            <span className="text-[11px] text-gray-400 dark:text-white/20">Saved {timeAgo(lastSaved.toISOString())}</span>
          ) : editingId ? (
            <span className="text-[11px] text-gray-400 dark:text-white/20">Unsaved</span>
          ) : null}
        </div>
      </aside>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#13131f] rounded-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-white/[0.08]">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Delete note?</h3>
            <p className="text-sm text-gray-400 dark:text-white/35 mb-6">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
