
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Button from './Button';

const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate('/courses', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

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
              <div className="mt-1">
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="appearance-none block w-full px-6 py-4 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-blue-700 font-bold text-lg" 
                  placeholder="Min. 6 characters"
                />
              </div>
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
