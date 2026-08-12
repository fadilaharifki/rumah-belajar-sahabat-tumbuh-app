'use client';

import React, { useEffect, useReducer } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading3,
  Quote,
  Undo,
  Redo,
  RemoveFormatting
} from 'lucide-react';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tuliskan catatan detail di sini...',
  readOnly = false,
  minHeight = '120px',
  className = ''
}) => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [3]
        }
      })
    ],
    content: value || '',
    editable: !readOnly,
    onTransaction: () => {
      forceUpdate();
    },
    onSelectionUpdate: () => {
      forceUpdate();
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If editor only has empty paragraph <p></p>, pass empty string
      const cleanHtml = html === '<p></p>' ? '' : html;
      onChange(cleanHtml);
    },
    editorProps: {
      attributes: {
        class: `tiptap prose prose-sm focus:outline-none max-w-none p-3 text-slate-800 text-xs sm:text-sm leading-relaxed overflow-y-auto`,
        style: `min-height: ${minHeight}; max-height: 280px;`
      }
    }
  });

  // Sync external value updates to editor if needed
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHtml = editor.getHTML();
      const normalizedCurrent = currentHtml === '<p></p>' ? '' : currentHtml;
      if (value !== normalizedCurrent) {
        editor.commands.setContent(value || '');
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={`border border-slate-300 rounded-2xl overflow-hidden bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all ${
        readOnly ? 'bg-slate-50/70 border-slate-200' : ''
      } ${className}`}
    >
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50/90 border-b border-slate-200 text-slate-600">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              editor.isActive('bold')
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/80 text-slate-700'
            }`}
            title="Tebal (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              editor.isActive('italic')
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/80 text-slate-700'
            }`}
            title="Miring (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/80 text-slate-700'
            }`}
            title="Judul Sub-Bab (Heading)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              editor.isActive('bulletList')
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/80 text-slate-700'
            }`}
            title="Daftar Poin (Bullet List)"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              editor.isActive('orderedList')
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/80 text-slate-700'
            }`}
            title="Daftar Angka (Ordered List)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              editor.isActive('blockquote')
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-200/80 text-slate-700'
            }`}
            title="Kutipan (Quote)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5 ml-auto md:ml-0" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-1.5 rounded-lg text-xs hover:bg-slate-200/80 text-slate-500 transition cursor-pointer"
            title="Hapus Format (Clear Formatting)"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-lg text-xs hover:bg-slate-200/80 text-slate-500 disabled:opacity-30 transition cursor-pointer"
            title="Urungkan (Undo)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-lg text-xs hover:bg-slate-200/80 text-slate-500 disabled:opacity-30 transition cursor-pointer"
            title="Ulangi (Redo)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Main Canvas Content */}
      <EditorContent editor={editor} />
    </div>
  );
};
