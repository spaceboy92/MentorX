


import React from 'react';
// FIX: Using namespace import for react-router-dom to resolve module export errors.
import * as ReactRouterDom from 'react-router-dom';
const { useNavigate } = ReactRouterDom;
import { useAppContext } from '../contexts/AppContext';
import { XIcon, MessageSquarePlusIcon } from './icons/Icons';

const ChatTabs: React.FC = () => {
    const { sessions, activeSessionId, selectSession, deleteSession } = useAppContext();
    const navigate = useNavigate();

    // Show up to 5 most recent chat sessions as tabs
    const chatSessions = sessions.filter(s => s.personaId !== 'code-sandbox' && s.personaId !== 'hacking').slice(0, 5);

    const handleTabClick = (sessionId: string) => {
        if (sessionId !== activeSessionId) {
            selectSession(sessionId); // This will trigger navigation via RouterSync
        }
    };

    const handleCloseTab = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const { nextSessionId, wasActiveSessionDeleted } = deleteSession(sessionId);

        if (wasActiveSessionDeleted) {
            selectSession(nextSessionId);
        }
    };
    
    const handleNewChat = () => {
       selectSession(null); // Navigate to dashboard
    }

    return (
        <div className="flex items-center bg-panel-no-blur border-b border-white/10 shrink-0">
            <div className="flex-1 flex items-center gap-1 px-2 pt-2 overflow-x-auto min-w-0">
                 {chatSessions.map(session => (
                    <div
                        key={session.id}
                        onClick={() => handleTabClick(session.id)}
                        className={`flex items-center shrink-0 gap-2 pl-4 pr-2 py-2 rounded-t-lg cursor-pointer border-b-2 transition-colors ${
                            activeSessionId === session.id
                                ? 'bg-panel text-white border-[var(--accent-primary)]'
                                : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-white border-transparent'
                        }`}
                    >
                        <span className="text-sm font-medium truncate max-w-[150px]">{session.name}</span>
                        <button 
                            onClick={(e) => handleCloseTab(e, session.id)}
                            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/20"
                            aria-label={`Close ${session.name}`}
                        >
                            <XIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="px-2 pt-2">
                <button
                    onClick={handleNewChat}
                    className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="New Chat"
                >
                    <MessageSquarePlusIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ChatTabs;