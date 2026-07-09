"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Undo, Redo,
} from "lucide-react";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

function TB({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-all duration-100 ${
        active
          ? "bg-primary/10 dark:bg-primary/20 text-primary"
          : "text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

export default function NoteEditor({ content, onChange }: Props) {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate({ editor }) {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: { class: "ProseMirror min-h-[300px] text-sm text-gray-800 dark:text-white/80 px-4 py-3 focus:outline-none" },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return <div className="min-h-[300px] animate-pulse bg-gray-50 dark:bg-white/[0.03] rounded-xl" />;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] flex-wrap shrink-0">
        <TB active={editor.isActive("bold")} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={13} />
        </TB>
        <TB active={editor.isActive("italic")} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={13} />
        </TB>
        <TB active={editor.isActive("heading", { level: 2 })} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={13} />
        </TB>
        <TB active={editor.isActive("heading", { level: 3 })} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={13} />
        </TB>
        <div className="w-px h-3.5 bg-gray-200 dark:bg-white/[0.07] mx-1 shrink-0" />
        <TB active={editor.isActive("bulletList")} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={13} />
        </TB>
        <TB active={editor.isActive("orderedList")} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={13} />
        </TB>
        <div className="w-px h-3.5 bg-gray-200 dark:bg-white/[0.07] mx-1 shrink-0" />
        <TB active={editor.isActive("blockquote")} title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={13} />
        </TB>
        <TB active={editor.isActive("code")} title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={13} />
        </TB>
        <div className="flex-1" />
        <TB title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={13} />
        </TB>
        <TB title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={13} />
        </TB>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
