import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const routeForRole = (role?: string): string => {
  if (role === 'bootcamp_manager') return '/manager';
  if (role === 'super_admin' || role === 'SOU') return '/superadmin';
  if (role === 'admin') return '/admin';
  if (role === 'teacher' || role === 'tutor') return '/teacher';
  return '/student/bootcamp';
};

const BootcampLogin: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.mustChangePassword ? '/change-password' : routeForRole(user.role), { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      navigate(loggedIn.mustChangePassword ? '/change-password' : routeForRole(loggedIn.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-10 text-white lg:flex">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200">Kambi × FintechNG</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight">Welcome back, fintech innovator.</h2>
          <p className="mt-4 text-sm leading-7 text-indigo-100">
            Sign in to your bootcamp dashboard to access your hub, resources, competitions, and Kambi Academy courses.
          </p>
        </div>
        <p className="text-xs text-indigo-200">New here? <Link to="/bootcamps" className="font-semibold text-white underline">Browse bootcamps</Link> and register.</p>
      </div>

      {/* Form */}
      <div className="w-full px-8 py-14 sm:px-12 lg:w-1/2">
        <h1 className="font-display text-3xl font-bold text-slate-900">Bootcamp sign in</h1>
        <p className="mt-2 text-sm text-slate-500">
          Use your registration email. First time? Your temporary password is{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700">asd@123</code>.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="name@example.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Password</label>
            <div className="relative mt-1">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 hover:text-slate-700">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in to bootcamp'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Looking for the main academy? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Kambi Academy sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default BootcampLogin;
