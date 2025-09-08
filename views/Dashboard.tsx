import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPersonas } from '../constants';
import type { Persona, Widget } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { XIcon, PencilIcon, Trash2Icon } from '../components/icons/Icons';

const PersonaCard: React.FC<{ persona: Persona }> = ({ persona }) => {
  const navigate = useNavigate();
  const { createNewSession, openPersonaModal, deleteCustomPersona, sessions, selectSession } = useAppContext();

  const handleClick = () => {
    if (persona.id === 'custom-persona') {
      openPersonaModal();
      return;
    }

    // Special handling for the video editor to ensure it gets a session
    if (persona.workspace === 'video') {
      const existingVideoSession = sessions.find(s => s.personaId === 'video-studio');
      if (existingVideoSession) {
        selectSession(existingVideoSession.id);
      } else {
        createNewSession('video-studio');
      }
      // The sidebar's useEffect will handle navigation
      return;
    }
    
    const newSessionId = createNewSession(persona.id);
    selectSession(newSessionId);

    if (persona.workspace === 'chat') {
      navigate(`/chat/${persona.id}`);
    } else if (persona.workspace === 'code') {
      navigate('/code-sandbox');
    } else if (persona.workspace === 'widget') {
      navigate('/widget-factory');
    } else if (persona.workspace === 'content') {
      navigate('/content-lab');
    }
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
      className="bg-[var(--bg-secondary)]/60 p-6 rounded-xl border border-white/10 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-secondary)] transition-all duration-300 cursor-pointer group shadow-lg hover:shadow-[var(--accent-primary)]/10 transform hover:-translate-y-1 relative"
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

const PinnedWidgetCard: React.FC<{ widget: Widget, onUnpin: (id: string) => void }> = ({ widget, onUnpin }) => {
    return (
        <div className="bg-[var(--bg-secondary)]/60 rounded-xl border border-white/10 relative group">
            <div className="p-4 border-b border-white/10">
                <h4 className="text-white font-semibold truncate">{widget.name}</h4>
                 <button onClick={() => onUnpin(widget.id)} className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-red-500/50 transition-all">
                    <XIcon className="w-4 h-4" />
                 </button>
            </div>
            <div className="aspect-video bg-grid-pattern p-4 overflow-hidden">
                <div className="w-full h-full transform scale-[0.6] origin-top-left">
                    <div dangerouslySetInnerHTML={{ __html: widget.html }} />
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
  const { pinnedWidgets, unpinWidget, customPersonas, setCustomBackground } = useAppContext();
  
  useEffect(() => {
    setCustomBackground(null);
  }, [setCustomBackground]);

  const personas = getPersonas(customPersonas);

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="text-center my-8 md:my-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Welcome to MentorX</h1>
          <p className="mt-4 text-md md:text-lg text-[var(--text-secondary)]/80 max-w-2xl mx-auto">
            Your all-in-one AI-powered workspace. Select a persona to begin your journey of creation and discovery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {personas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} />
          ))}
        </div>

        <div>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Pinned Widgets</h2>
            {pinnedWidgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pinnedWidgets.map(widget => (
                        <PinnedWidgetCard key={widget.id} widget={widget} onUnpin={unpinWidget} />
                    ))}
                </div>
            ) : (
                 <div className="p-8 text-center bg-[var(--bg-secondary)]/60 rounded-xl border border-dashed border-white/20">
                    <p className="text-[var(--text-secondary)]/80">You have no pinned widgets. Create some in the Widget Factory!</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;