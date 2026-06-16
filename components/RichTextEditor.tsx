import React, { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Lightweight, dependency-free WYSIWYG editor built on contentEditable. Outputs HTML
// that is rendered back with the `.rte-content` styles. Authors are trusted staff
// (managers / super admins), the same trust level as the popup HTML banners.
const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // Sync external value in only when it differs (avoids cursor jumps while typing).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt('Link URL', 'https://');
    if (url) exec('createLink', url);
  };

  const tools: { label: string; title: string; run: () => void }[] = [
    { label: 'H2', title: 'Heading', run: () => exec('formatBlock', 'H2') },
    { label: 'H3', title: 'Subheading', run: () => exec('formatBlock', 'H3') },
    { label: 'B', title: 'Bold', run: () => exec('bold') },
    { label: 'I', title: 'Italic', run: () => exec('italic') },
    { label: '• List', title: 'Bullet list', run: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered list', run: () => exec('insertOrderedList') },
    { label: '❝', title: 'Quote', run: () => exec('formatBlock', 'BLOCKQUOTE') },
    { label: '🔗', title: 'Link', run: addLink },
    { label: '⨯', title: 'Clear formatting', run: () => exec('removeFormat') },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            onMouseDown={(e) => { e.preventDefault(); t.run(); }}
            className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder || 'Write here…'}
        className="rte-content min-h-[140px] px-4 py-3 text-sm text-slate-900 outline-none"
      />
    </div>
  );
};

export default RichTextEditor;
