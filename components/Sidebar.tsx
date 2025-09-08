import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { getPersonas } from '../constants';
import { XIcon, MentorXLogoIcon, SettingsIcon, MessageSquarePlusIcon, Trash2Icon, SearchIcon, CommandIcon, PencilIcon } from './icons/Icons';
import type { Persona, Session } from '../types';

const Sidebar: React.FC = () => {
  const { 
    isLeftSidebarOpen, 
    toggleLeftSidebar,
    toggleSettings,
    sessions,
    activeSessionId,
    selectSession,
    deleteSession,
    renameSession,
    currentUser,
    toggleCommandPalette,
    customPersonas,
    deleteCustomPersona,
    uiDensity,
  } = useAppContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const personas = getPersonas(customPersonas);
  
  const densityClasses = {
      'comfortable': 'py-2',
      'compact': 'py-1.5'
  };

  const handleSessionClick = (session: Omit<Session, 'messages'>) => {
    selectSession(session.id);
  }

  // Effect to handle navigation when active session changes
  useEffect(() => {
    if (activeSessionId === null) {
      // Don't force navigation if on a non-session page like the video studio
      if (window.location.hash.endsWith('/') || window.location.hash === '#') {
         // Already on dashboard
      } else if (!window.location.hash.includes('/')) {
        // Also dashboard
      }
      else {
          const isNonChatPage = ['/code-sandbox', '/widget-factory', '/content-lab', '/video-studio'].some(path => window.location.hash.endsWith(path));
          if (!isNonChatPage) {
            navigate('/');
          }
      }
      return;
    }

    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;
    
    const persona = personas.find(p => p.id === session.personaId);
    if (!persona) return;

    let path = '/';
    switch (persona.workspace) {
      case 'chat': path = `/chat/${persona.id}`; break;
      case 'code': path = '/code-sandbox'; break;
      case 'widget': path = '/widget-factory'; break;
      case 'content': path = '/content-lab'; break;
      case 'video': path = '/video-studio'; break;
    }
    navigate(path);
    
    if (window.innerWidth < 1024 && isLeftSidebarOpen) { // Close sidebar on mobile/tablet after selection
      toggleLeftSidebar();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, navigate]);
  
  const handleNewChat = () => {
    selectSession(null);
    navigate('/'); // FIX: Explicitly navigate to dashboard to exit any workspace
    if (window.innerWidth < 1024) { // Close sidebar on mobile/tablet
        toggleLeftSidebar();
    }
  }

  const handleDeleteChat = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this chat?')) {
          deleteSession(sessionId);
      }
  }
  
  const handleRename = (sessionId: string, currentName: string) => {
      setEditingSessionId(sessionId);
      setEditingName(currentName);
  };
  
  const handleRenameSubmit = (sessionId: string) => {
      if (editingName.trim()) {
          renameSession(sessionId, editingName.trim());
      }
      setEditingSessionId(null);
      setEditingName('');
  };

  useEffect(() => {
    const input = document.getElementById(`rename-input-${editingSessionId}`);
    if (input) {
      input.focus();
    }
  }, [editingSessionId]);
  
  const filteredSessions = sessions.filter(session => 
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside 
      className={`
        bg-panel border-r border-white/10 shadow-2xl flex flex-col h-full w-full
        fixed top-0 left-0 h-full z-30 w-[85%] max-w-xs transition-transform duration-300 ease-in-out
        ${isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-full lg:max-w-none
      `}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <MentorXLogoIcon className="w-8 h-8" />
            <h1 className="text-xl font-bold text-white">MentorX</h1>
          </div>
          <button onClick={toggleLeftSidebar} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 lg:hidden">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className='p-2 flex flex-col gap-2'>
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 bg-white/5 text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transform active:scale-95"
            >
              <MessageSquarePlusIcon className="w-5 h-5" />
              <span>New Chat</span>
            </button>
            <div className='relative'>
                 <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                 <input 
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-transparent focus:border-white/20 focus:bg-black/30 rounded-md py-1.5 pl-9 pr-3 text-sm placeholder-gray-500 focus:outline-none transition-colors"
                 />
            </div>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          <h2 className="px-2 pt-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">History</h2>
          {filteredSessions.map((session) => (
             <div key={session.id} className="relative group">
                {editingSessionId === session.id ? (
                    <input
                        id={`rename-input-${session.id}`}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRenameSubmit(session.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(session.id)}
                        className={`w-full bg-white/20 border border-white/30 rounded-md px-3 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)] ${densityClasses[uiDensity]}`}
                    />
                ) : (
                    <button
                      onClick={() => handleSessionClick(session)}
                      className={`w-full text-left pr-12 px-3 text-sm font-medium rounded-md truncate transition-all duration-200 transform active:scale-95 ${activeSessionId === session.id ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'} ${densityClasses[uiDensity]}`}
                    >
                      {session.name}
                    </button>
                )}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                   <button
                        onClick={() => handleRename(session.id, session.name)}
                        className="p-1 text-gray-500 rounded-md opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-all"
                        title="Rename chat"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => handleDeleteChat(e, session.id)}
                        className="p-1 text-gray-500 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/10 transition-all"
                        title="Delete chat"
                    >
                        <Trash2Icon className="w-4 h-4" />
                    </button>
                </div>
             </div>
          ))}
        </nav>
        
        <div className="p-2 border-t border-white/10 space-y-1">
            <button onClick={toggleCommandPalette} className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium rounded-md transition-colors text-[var(--text-secondary)] hover:bg-white/10 hover:text-white">
                <div className="flex items-center gap-3">
                    <CommandIcon className="w-5 h-5" />
                    <span className="truncate">Command Palette</span>
                </div>
                <span className="text-xs border border-gray-600 rounded-md px-1.5 py-0.5">Ctrl+K</span>
            </button>
            {currentUser ? (
                 <button onClick={toggleSettings} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium rounded-md transition-colors text-[var(--text-secondary)] hover:bg-white/10 hover:text-white">
                    <img src={currentUser.picture} alt={currentUser.name} className="w-6 h-6 rounded-full" />
                    <span className="truncate">{currentUser.name}</span>
                </button>
            ) : (
                <button onClick={toggleSettings} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium rounded-md transition-colors text-[var(--text-secondary)] hover:bg-white/10 hover:text-white">
                    <SettingsIcon className="w-5 h-5" />
                    <span>Settings & Account</span>
                </button>
            )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;