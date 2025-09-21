import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { MentorXLogoIcon, GoogleIcon, UserCircleIcon } from '../components/icons/Icons';
import type { User } from '../types';

const AuthView: React.FC = () => {
  const { signIn, setGuestMode } = useAppContext();
  const [activeTab, setActiveTab] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = (response: any) => {
    signIn(response.credential);
  };
  
  useEffect(() => {
      if (googleButtonRef.current) {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: "1066611314162-24u4558sk552lj3n4pq26ie43a857bfba.apps.googleusercontent.com",
                callback: handleCredentialResponse,
            });
            window.google.accounts.id.renderButton(
                googleButtonRef.current,
                { theme: "outline", size: "large", type: "standard", text: "continue_with", width: "300" }
            );
        }
      }
  }, []);

  const handleMockAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("Please enter both email and password.");
        return;
    }
    // Simulate successful authentication
    const mockUser: User = {
        id: `mock|${email}`,
        name: email.split('@')[0],
        email: email,
        picture: `https://api.dicebear.com/8.x/initials/svg?seed=${email.split('@')[0]}`,
    };
    signIn(mockUser);
  };

  return (
    <div className="h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
            <div className="flex flex-col items-center mb-8">
                <MentorXLogoIcon className="w-20 h-20" />
                <h1 className="text-4xl font-bold text-white mt-2">Welcome to MentorX</h1>
                <p className="text-[var(--text-secondary)] mt-1">Your AI-Powered Workspace</p>
            </div>

            <div className="bg-panel p-8 rounded-2xl shadow-2xl border border-white/10">
                <div className="flex border-b border-white/10 mb-6">
                    <button 
                        onClick={() => setActiveTab('signIn')} 
                        className={`flex-1 py-2 font-semibold transition-colors ${activeTab === 'signIn' ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => setActiveTab('signUp')} 
                        className={`flex-1 py-2 font-semibold transition-colors ${activeTab === 'signUp' ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        Sign Up
                    </button>
                </div>
                
                <form onSubmit={handleMockAuth} className="space-y-4">
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
                        <input 
                          type="email" 
                          id="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full bg-black/20 border border-white/10 rounded-md p-3 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                        />
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
                        <input 
                          type="password" 
                          id="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full bg-black/20 border border-white/10 rounded-md p-3 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button type="submit" className="w-full bg-[var(--accent-primary)] text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity active:scale-95">
                        {activeTab === 'signIn' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="flex items-center my-6">
                    <hr className="flex-1 border-white/10" />
                    <span className="px-4 text-xs text-gray-500">OR</span>
                    <hr className="flex-1 border-white/10" />
                </div>
                
                <div className="flex justify-center">
                    <div ref={googleButtonRef} />
                </div>
            </div>

            <div className="text-center mt-8">
                <button onClick={() => setGuestMode(true)} className="text-sm text-[var(--text-secondary)] hover:text-white hover:underline">
                    Continue as Guest
                </button>
            </div>
        </div>
    </div>
  );
};

export default AuthView;