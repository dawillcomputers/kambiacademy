import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../../../lib/api';

interface AdminBook {
  id: number;
  title: string;
  author: string;
  description: string;
  category: string;
  price: number;
  access_type: 'read' | 'download';
  cover_url: string | null;
  published: number;
}

const emptyForm = { title: '', author: '', description: '', category: '', price: '0', access_type: 'read' as 'read' | 'download', published: true };

export default function SuperAdminLibraryPage() {
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listAdminBooks();
      setBooks(res.books || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!file) { setError('Choose a book file (PDF recommended).'); return; }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      fd.set('title', form.title);
      fd.set('author', form.author);
      fd.set('description', form.description);
      fd.set('category', form.category);
      fd.set('price', form.price || '0');
      fd.set('access_type', form.access_type);
      fd.set('published', form.published ? '1' : '0');
      fd.set('file', file);
      const cover = coverRef.current?.files?.[0];
      if (cover) fd.set('cover', cover);
      await api.createBook(fd);
      setNotice('Book added to the library.');
      setForm(emptyForm);
      if (fileRef.current) fileRef.current.value = '';
      if (coverRef.current) coverRef.current.value = '';
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add book.');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: number, changes: Record<string, any>) => {
    setBusyId(id);
    setError('');
    try {
      await api.updateBook({ id, ...changes });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update book.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (book: AdminBook) => {
    if (!window.confirm(`Delete "${book.title}"? This removes the file permanently.`)) return;
    setBusyId(book.id);
    setError('');
    try {
      await api.deleteBook(book.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete book.');
    } finally {
      setBusyId(null);
    }
  };

  // Arbitrary hex values bypass the .dash-root theme remap, so the field stays a
  // white box with black text in both light and dark dashboard themes.
  const input = 'w-full rounded-xl border border-slate-300 bg-[#ffffff] px-4 py-2.5 text-sm text-[#000000] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.24),transparent_28%),linear-gradient(135deg,#111b2e,#0b1220_60%,#111827)] px-6 py-8 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#A9B4CC]">Library</p>
        <h1 className="mt-3 text-4xl font-bold text-[#EAF0FF]">Books & reading materials</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#A9B4CC]">
          Upload books for readers. Set a price in USD (free if 0). Choose whether a paid book is read online or sold as a download. Prices are charged in Naira at checkout.
        </p>
      </section>

      {notice && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100">{notice}</div>}
      {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">{error}</div>}

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add a book</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={input} placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </div>
        <textarea className={input} rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={input} placeholder="Category (e.g. Finance)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className={input} type="number" min={0} step="0.01" placeholder="Price (USD, 0 = free)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <select className={input} value={form.access_type} onChange={(e) => setForm({ ...form, access_type: e.target.value as 'read' | 'download' })}>
            <option value="read">Read online</option>
            <option value="download">Download</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Book file (PDF) *
            <input ref={fileRef} type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" className="mt-1 block w-full text-sm text-slate-700" />
          </label>
          <label className="text-sm text-slate-700">
            Cover image (optional)
            <input ref={coverRef} type="file" accept="image/*" className="mt-1 block w-full text-sm text-slate-700" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Published (visible in the public library)
        </label>
        <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {saving ? 'Uploading…' : 'Add book'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All books ({books.length})</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : books.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No books yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {books.map((book) => (
              <div key={book.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-14 w-10 shrink-0 rounded bg-slate-100 bg-cover bg-center" style={book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : undefined} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{book.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {book.author || 'Unknown author'} · {Number(book.price) > 0 ? `$${Number(book.price).toFixed(2)}` : 'Free'} · {book.access_type === 'download' ? 'Download' : 'Read online'} · {book.published ? 'Published' : 'Hidden'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button onClick={() => patch(book.id, { published: book.published ? 0 : 1 })} disabled={busyId === book.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60">
                    {book.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => remove(book)} disabled={busyId === book.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-60">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
