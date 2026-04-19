import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';

export default function TeacherProfilePage() {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({
    name: '',
    bio: '',
    avatar_url: '',
    country: '',
    certificate_name: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.getProfile();
        if (!cancelled) {
          const p = r.profile;
          setEmail(p.email || '');
          setForm({
            name: p.name || '',
            bio: p.bio || '',
            avatar_url: p.avatar_url || '',
            country: p.country || '',
            certificate_name: p.certificate_name || '',
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Display name is required.'); return; }
    setSaving(true); setMessage(''); setError('');
    try {
      await api.updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url.trim(),
        country: form.country.trim(),
        certificate_name: form.certificate_name.trim(),
      });
      if (form.avatar_url.trim()) localStorage.setItem('student_profile_avatar', form.avatar_url.trim());
      else localStorage.removeItem('student_profile_avatar');
      window.dispatchEvent(new Event('profile-updated'));
      await refreshUser();
      setMessage('Profile updated successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your teaching identity and settings.</p>
        </div>

        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">Loading profile...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Edit Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-5 text-lg font-bold text-slate-900">Edit Profile</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Display Name</label>
                    <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input type="email" value={email} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Bio</label>
                  <textarea value={form.bio} onChange={e => handleChange('bio', e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tell students about your teaching style..." />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Country</label>
                    <input type="text" value={form.country} onChange={e => handleChange('country', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nigeria" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Certificate Name</label>
                    <input type="text" value={form.certificate_name} onChange={e => handleChange('certificate_name', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Name on certificates" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Avatar URL</label>
                  <input type="url" value={form.avatar_url} onChange={e => handleChange('avatar_url', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="https://example.com/photo.jpg" />
                </div>

                <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Preview</h2>
                <div className="rounded-xl bg-slate-50 p-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={form.avatar_url || 'https://via.placeholder.com/80x80?text=T'}
                      alt="Avatar"
                      className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{form.name || 'Your Name'}</h3>
                      <p className="text-sm text-slate-500">{form.country || 'Country'} • {form.certificate_name || 'Certificate name'}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">{form.bio || 'Your bio will show here...'}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-slate-900">Account Info</h2>
                <div className="space-y-2">
                  <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                    <span className="text-slate-600">Email</span>
                    <span className="font-medium text-slate-900">{email}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                    <span className="text-slate-600">Role</span>
                    <span className="font-medium text-slate-900">Teacher</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
