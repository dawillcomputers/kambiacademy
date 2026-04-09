
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Button from './Button';

const SignUp: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>((searchParams.get('role') === 'teacher' ? 'teacher' : 'student'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(password),
  };

  const allValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!allValid) {
      setError('Password does not meet all requirements.');
      return;
    }
    setLoading(true);
    try {
      const u = await signup(name, email, password, role);
      if (u?.role === 'teacher') {
        navigate('/tutor', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`text-xs flex items-center gap-1 ${ok ? 'text-green-600' : 'text-slate-400'}`}>
      {ok ? '✓' : '○'} {label}
    </span>
  );

  return (
    <div className="flex items-center justify-center py-12 bg-slate-50 min-h-[70vh] px-4">
      <div className="mx-auto w-full max-w-6xl flex bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-100">
        
        <div className="w-full lg:w-1/2 py-12 px-8 sm:px-12">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
              Create Your Account
            </h2>
            <p className="mt-3 text-slate-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors underline">
                Sign in
              </Link>
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">
                Full Name
              </label>
              <div className="mt-1">
                <input 
                  id="name" 
                  name="name" 
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="appearance-none block w-full px-6 py-4 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-blue-700 font-bold text-lg" 
                  placeholder="e.g. Johnathan Smith"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">
                Email Address
              </label>
              <div className="mt-1">
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="appearance-none block w-full px-6 py-4 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-blue-700 font-bold text-lg" 
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">
                Create Password
              </label>
              <div className="mt-1 relative">
                <input 
                  id="password" 
                  name="password" 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="appearance-none block w-full px-6 py-4 pr-16 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-blue-700 font-bold text-lg" 
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700 font-medium">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <Check ok={checks.length} label="8+ chars" />
                  <Check ok={checks.upper} label="Uppercase" />
                  <Check ok={checks.lower} label="Lowercase" />
                  <Check ok={checks.digit} label="Number" />
                  <Check ok={checks.special} label="Symbol" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 ml-1 uppercase tracking-widest">
                I want to
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setRole('student')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${role === 'student' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  Learn (Student)
                </button>
                <button type="button" onClick={() => setRole('teacher')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${role === 'teacher' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  Teach (Tutor)
                </button>
              </div>
              {role === 'teacher' && (
                <p className="text-xs text-amber-600 mt-1">Tutor accounts require admin approval.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-600 font-bold">{error}</p>}

            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full py-5 text-xl font-black rounded-2xl shadow-2xl shadow-indigo-200 transform active:scale-95 transition-all"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Image Side */}
        <div className="hidden lg:block lg:w-1/2">
            <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" 
                alt="Students Collaborating" 
                className="w-full h-full object-cover"
            />
        </div>
      </div>
    </div>
  );
};

export default SignUp;
