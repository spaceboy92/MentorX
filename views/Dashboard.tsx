

import React, { useEffect, useState } from 'react';
// FIX: Using namespace import for react-router-dom to resolve module export errors.
import * as ReactRouterDom from 'react-router-dom';
const { useNavigate } = ReactRouterDom;
import { getPersonas } from '../constants';
import type { Persona, Message } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { PencilIcon, Trash2Icon, SendIcon } from '../components/icons/Icons';

const DashboardPromptInput: React.FC<{ onSubmit: (prompt: string) => void; isLoading: boolean; }> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="rgb-border-glow">
        <div className="relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask MentorX anything..."
            className="w-full p-4 pr-16 bg-[var(--bg-secondary)] border-2 border-white/10 rounded-full shadow-lg text-lg text-[var(--text-primary)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={!prompt.trim() || isLoading}
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </form>
  );
};


const PersonaCard: React.FC<{ persona: Persona }> = ({ persona }) => {
  const navigate = useNavigate();
  const { createNewSession, openPersonaModal, deleteCustomPersona, selectSession, setGlobalLoading } = useAppContext();

  const handleClick = () => {
    if (persona.id === 'custom-persona') {
      openPersonaModal();
      return;
    }
    
    setGlobalLoading(true);
    const newSessionId = createNewSession(persona.id);
    selectSession(newSessionId);
    // RouterSync will handle navigation based on the persona's route.
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPersonaModal(persona);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm(`Are you sure you want to delete "${persona.name}"?`)) {
        deleteCustomPersona(persona.id);
    }
  }

  return (
    <div
      onClick={handleClick}
      className="bg-panel p-6 rounded-xl hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-secondary)] transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-[var(--accent-primary)]/10 transform hover:-translate-y-1 relative"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="p-2 bg-white/10 rounded-lg">
          <persona.icon className="w-8 h-8 text-[var(--accent-primary)] transition-transform duration-300 group-hover:scale-110" />
        </div>
        <h3 className="text-xl font-bold text-white">{persona.name}</h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)]/80">{persona.description}</p>
      {persona.custom && (
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleEdit} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"><PencilIcon className="w-4 h-4" /></button>
              <button onClick={handleDelete} className="p-2 rounded-full bg-white/10 hover:bg-red-500/50 text-white"><Trash2Icon className="w-4 h-4" /></button>
          </div>
      )}
    </div>
  );
};


const Dashboard: React.FC = () => {
  const { customPersonas, createNewSession, selectSession, setGlobalLoading } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const personas = getPersonas(customPersonas);

  // When loading is finished, the app context will navigate away.
  // This just ensures the loading indicator doesn't get stuck if something fails.
  useEffect(() => {
    setIsLoading(false);
    const timer = setTimeout(() => setGlobalLoading(false), 2000); // safety timeout
    return () => clearTimeout(timer);
  }, [setGlobalLoading]);

  const handlePromptSubmit = (prompt: string) => {
    setIsLoading(true);
    setGlobalLoading(true);
    const initialMessages: Message[] = [{
      id: `init-${Date.now()}`,
      role: 'user',
      text: prompt,
    }];
    const newSessionId = createNewSession('mentorx-general', initialMessages);
    selectSession(newSessionId);
    // Let RouterSync handle navigation, but pass state to indicate a response should be fetched
    navigate(`/chat/${newSessionId}`, { state: { fetchResponse: true } });
  };


  return (
    <div className="flex-1 flex flex-col justify-start items-center p-4 md:p-8 overflow-y-auto pt-16 md:pt-24">
      <main className="w-full max-w-5xl mx-auto text-center">
        <div className="mb-8">
           <h1 className="text-5xl md:text-6xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-pink-400 mb-4 animate-fade-in-down">
                MentorX Workspace
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto animate-fade-in-up">
                Your intelligent partner for development, creativity, and analysis. Choose a specialized tool or start a conversation below.
            </p>
        </div>
        
        <div className="mb-12">
            <DashboardPromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {personas.map(persona => (
                <PersonaCard key={persona.id} persona={persona} />
            ))}
        </div>

      </main>
    </div>
  );
};

export default Dashboard;