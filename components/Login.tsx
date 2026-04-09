
import React, { useState } from 'react';
import { User } from '../types';
import { MOCK_USERS } from '../constants';
import Button from './Button';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToSignUp: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = MOCK_USERS.find(u => u.email === email);
    if (user) { // In a real app, you'd check the password
      onLogin(user);
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="mx-auto w-full max-w-5xl flex bg-white shadow-2xl rounded-3xl overflow-hidden">
        {/* Left Image Side */}
        <div className="hidden lg:block lg:w-1/2">
            <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop" 
                alt="Digital Learning" 
                className="w-full h-full object-cover"
            />
        </div>

        {/* Right Form Side */}
        <div className="w-full lg:w-1/2 py-16 px-8 sm:px-12">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{' '}
              <button onClick={onSwitchToSignUp} className="font-medium text-indigo-600 hover:text-indigo-500 underline">
                create a new account
              </button>
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
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
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password"className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
            <div>
              <Button type="submit" className="w-full py-4 text-lg">
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
