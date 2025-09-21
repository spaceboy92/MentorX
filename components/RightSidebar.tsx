import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { StickyNoteIcon, SparklesIcon, XIcon } from './icons/Icons';
import { GoogleGenAI } from '@google/genai';

const SmartNote: React.FC = () => {
    const { notes, setNotes } = useAppContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isOrganizing, setIsOrganizing] = useState(false);

    const handleOrganize = async (action: 'summarize' | 'list' | 'actions') => {
        setIsMenuOpen(false);
        if (!notes.trim() || isOrganizing) return;

        setIsOrganizing(true);
        const prompts = {
            summarize: "Summarize the key points from these notes concisely.",
            list: "Organize these notes into a clear, structured bulleted list.",
            actions: "Identify and list any action items or tasks from these notes."
        };

        try {
            if (!process.env.API_KEY) throw new Error("API_KEY not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const fullPrompt = `${prompts[action]}\n\n---\n${notes}`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt
            });
            setNotes(response.text);
        } catch (error) {
            console.error("Error organizing notes:", error);
            // Optionally, show an error to the user
        } finally {
            setIsOrganizing(false);
        }
    };
    
    return (
        <div className="px-2 pt-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase flex items-center gap-2">
                    <StickyNoteIcon className="w-4 h-4"/>
                    Smart Note
                </h3>
                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        disabled={!notes.trim() || isOrganizing}
                        className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
                    >
                        {isOrganizing ? <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin"></div> : <SparklesIcon className="w-4 h-4"/>}
                    </button>
                    {isMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-lg z-10">
                            <button onClick={() => handleOrganize('summarize')} className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10">Summarize</button>
                            <button onClick={() => handleOrganize('list')} className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10">Format as List</button>
                            <button onClick={() => handleOrganize('actions')} className="block w-full text-left px-3 py-2 text-sm hover:bg-white/10">Find Action Items</button>
                        </div>
                    )}
                </div>
            </div>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Jot down notes, then use the ✨ to organize them..."
                className="w-full h-48 bg-black/20 border border-white/10 rounded-md p-2 text-sm text-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
        </div>
    );
};


const RightSidebar: React.FC = () => {
  const { toggleRightSidebar } = useAppContext();
  
  return (
      <aside className="w-full bg-panel border-l border-white/10 flex-shrink-0 flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Workspace</h2>
              <button onClick={toggleRightSidebar} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                  <XIcon className="w-5 h-5" />
              </button>
          </div>
          <div className="flex-1 overflow-y-auto">
              <SmartNote />
          </div>
      </aside>
  );
};

export default RightSidebar;
