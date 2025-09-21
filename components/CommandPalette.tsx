
import React, { useState, useEffect, useCallback } from 'react';
// FIX: Using namespace import for react-router-dom to resolve module export errors.
import * as ReactRouterDom from 'react-router-dom';
const { useNavigate } = ReactRouterDom;
import { useAppContext } from '../contexts/AppContext';
// FIX: Replaced non-existent PERSONAS import with getPersonas to include custom personas.
import { getPersonas } from '../constants';
import { SearchIcon, SettingsIcon, PanelRightOpenIcon } from './icons/Icons';

interface Command {
  id: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  section: string;
}

const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    toggleCommandPalette,
    toggleSettings,
    toggleLeftSidebar,
    createNewSession,
    customPersonas, // FIX: Added customPersonas to context destructuring.
    openPersonaModal, // FIX: Added openPersonaModal for handling 'Create New' action.
  } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleAction = (action: () => void) => {
    action();
    toggleCommandPalette();
  };
  
  const personas = getPersonas(customPersonas);

  // FIX: Updated command generation to use the full list of personas and handle all workspace types and special actions.
  const commands: Command[] = [
    ...personas.map(p => ({
        id: `persona-${p.id}`,
        title: p.id === 'custom-persona' ? p.name : `Start session: ${p.name}`,
        icon: <p.icon className="w-5 h-5 text-[var(--accent-primary)]"/>,
        section: 'Workspaces',
        action: () => {
            if (p.id === 'custom-persona') {
                openPersonaModal();
                return;
            }
            const newSessionId = createNewSession(p.id);
            // Navigation is now handled by a useEffect in Sidebar, which is more robust.
            // This ensures the view switches correctly after the session is created.
        }
    })),
    { id: 'settings', title: 'Open Settings', icon: <SettingsIcon className="w-5 h-5"/>, section: 'General', action: toggleSettings },
    { id: 'toggle-left', title: 'Toggle Sidebar', icon: <PanelRightOpenIcon className="w-5 h-5 transform rotate-180"/>, section: 'General', action: toggleLeftSidebar },
  ];
  
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase())
  );
  
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    (acc[cmd.section] = acc[cmd.section] || []).push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);


  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isCommandPaletteOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleAction(filteredCommands[selectedIndex].action);
      }
    } else if (e.key === 'Escape') {
      toggleCommandPalette();
    }
  }, [isCommandPaletteOpen, selectedIndex, filteredCommands, handleAction, toggleCommandPalette]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-20" onClick={toggleCommandPalette}>
      <div 
        className="bg-[var(--bg-secondary)] w-full max-w-lg rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <SearchIcon className="w-5 h-5 text-gray-400" />
            <input 
                type="text"
                placeholder="Type a command or search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-lg"
                autoFocus
            />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
            {Object.entries(groupedCommands).map(([section, cmds]) => (
                <div key={section}>
                    <h3 className="px-2 py-1.5 text-xs font-semibold text-gray-400">{section}</h3>
                    {cmds.map((cmd, index) => {
                        const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                        return (
                             <button
                                key={cmd.id}
                                onClick={() => handleAction(cmd.action)}
                                className={`w-full text-left flex items-center gap-3 p-3 rounded-md text-sm transition-colors ${selectedIndex === globalIndex ? 'bg-[var(--accent-primary)] text-white' : 'text-gray-300 hover:bg-white/10'}`}
                            >
                                {cmd.icon}
                                <span>{cmd.title}</span>
                            </button>
                        );
                    })}
                </div>
            ))}
            {filteredCommands.length === 0 && (
                <p className="text-center p-8 text-gray-500">No results found.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
