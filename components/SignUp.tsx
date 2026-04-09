
import React, { useState } from 'react';
import { User } from '../types';
import Button from './Button';

interface SignUpProps {
  onSignUp: (user: User) => void;
  onSwitchToLogin: () => void;
  defaultRole: 'student' | 'teacher';
}

const SignUp: React.FC<SignUpProps> = ({ onSignUp, onSwitchToLogin, defaultRole }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUserId = `u${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      name,
      email,
      role: defaultRole,
      ...(defaultRole === 'teacher' && {
          status: 'active',
          earnings: { total: 0, paidOut: 0 },
          bio: 'Newly registered instructor ready to share their knowledge!',
          profileImageUrl: `https://i.pravatar.cc/150?u=${newUserId}`
      }),
      ...(defaultRole === 'student' && {
          enrolledCourses: []
      })
    };
    onSignUp(newUser);
  };

  const isTeacher = defaultRole === 'teacher';

  return (
    <div className="flex items-center justify-center py-12 bg-slate-50 min-h-[70vh] px-4">
      <div className="mx-auto w-full max-w-6xl flex bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-100">
        
        {/* Right Form Side (Moved to left on desktop if you want, but sticking to split) */}
        <div className="w-full lg:w-1/2 py-12 px-8 sm:px-12">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
              {isTeacher ? 'Instructor Application' : 'Create Student Account'}
            </h2>
            <p className="mt-3 text-slate-500 font-medium">
              {isTeacher 
                ? 'Join our elite circle of educators and start earning.' 
                : 'Already have an account? '}
              {!isTeacher && (
                <button onClick={onSwitchToLogin} className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors underline">
                  Sign in
                </button>
              )}
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
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full py-5 text-xl font-black rounded-2xl shadow-2xl shadow-indigo-200 transform active:scale-95 transition-all"
              >
                {isTeacher ? 'Submit Application' : 'Create Account'}
              </Button>
            </div>
          </form>

          {isTeacher && (
             <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500">
                  Already have an instructor account?{' '}
                  <button onClick={onSwitchToLogin} className="font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-4">
                    Sign in here
                  </button>
                </p>
             </div>
          )}
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
