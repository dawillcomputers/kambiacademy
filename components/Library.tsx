import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  category: string;
  price: number;
  isFree: boolean;
  access_type: 'read' | 'download';
  file_type?: string;
  cover_url: string | null;
  owned: boolean;
}

const formatPrice = (b: Book) => (b.isFree ? 'Free' : `$${b.price.toFixed(2)}`);

const Library: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reader, setReader] = useState<{ book: Book; url: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = tab === 'mine' && user ? await api.listMyBooks() : await api.listBooks();
      setBooks(res.books || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the library.');
    } finally {
      setLoading(false);
    }
  }, [tab, user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Handle Flutterwave return for a book purchase.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bookTx = params.get('book_tx');
    if (!bookTx) return;
    void (async () => {
      try {
        const res = await api.verifyBookPurchase({
          transaction_ref: bookTx,
          flutterwaveTransactionId: params.get('transaction_id') || undefined,
          status: params.get('status') || undefined,
        });
        setNotice(res.message || (res.status === 'success' ? 'Purchase confirmed.' : 'Payment not completed.'));
        if (res.status === 'success') setTab('mine');
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not verify the purchase.');
      } finally {
        navigate('/library', { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openBook = async (book: Book) => {
    if (!user) { navigate('/login'); return; }
    setBusyId(book.id);
    setError('');
    try {
      const url = await api.fetchBookBlobUrl(book.id);
      if (book.access_type === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${book.title}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        setReader({ book, url });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the book.');
    } finally {
      setBusyId(null);
    }
  };

  const buy = async (book: Book) => {
    if (!user) { navigate('/login'); return; }
    setBusyId(book.id);
    setError('');
    try {
      const res = await api.startBookPurchase(book.id);
      if (res.payment_url) { window.location.href = res.payment_url; return; }
      setError('Could not start checkout.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
    } finally {
      setBusyId(null);
    }
  };

  const closeReader = () => {
    if (reader) URL.revokeObjectURL(reader.url);
    setReader(null);
  };

  return (
    <div>
      <header className="text-center mb-12 relative py-12 px-4 rounded-3xl bg-indigo-900 text-white overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Kambi Library</h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto">Read and collect books — free titles, plus premium reads you can buy and keep.</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => setTab('browse')}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === 'browse' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Browse
          </button>
          {user && (
            <button
              onClick={() => setTab('mine')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === 'mine' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              My Library
            </button>
          )}
        </div>

        {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading…</div>
        ) : books.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
            {tab === 'mine' ? 'Your library is empty. Browse to add free or purchased books.' : 'No books available yet.'}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <div key={book.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
                <div className="h-48 w-full bg-gradient-to-br from-indigo-100 to-slate-100 bg-cover bg-center" style={book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : undefined}>
                  {!book.cover_url && <div className="flex h-full items-center justify-center text-5xl">📚</div>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between gap-2">
                    {book.category && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">{book.category}</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${book.isFree ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{formatPrice(book)}</span>
                  </div>
                  <h3 className="mt-2 font-bold text-slate-900">{book.title}</h3>
                  {book.author && <p className="text-sm text-indigo-600">by {book.author}</p>}
                  {book.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{book.description}</p>}
                  <div className="mt-auto pt-4">
                    {book.owned || book.isFree ? (
                      <button
                        onClick={() => openBook(book)}
                        disabled={busyId === book.id}
                        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {busyId === book.id ? 'Opening…' : book.access_type === 'download' ? 'Download' : 'Read'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buy(book)}
                        disabled={busyId === book.id}
                        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {busyId === book.id ? 'Starting…' : `Buy ${formatPrice(book)}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reader && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95">
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white">
            <p className="truncate font-semibold">{reader.book.title}</p>
            <button onClick={closeReader} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Close</button>
          </div>
          <div className="flex-1 bg-white">
            {(reader.book.file_type || '').includes('pdf') ? (
              <iframe title={reader.book.title} src={reader.url} className="h-full w-full" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-slate-600">This format can't be previewed inline.</p>
                <a href={reader.url} target="_blank" rel="noreferrer" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Open in new tab</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
