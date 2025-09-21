import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { XIcon, WandSparklesIcon } from './icons/Icons';
import type { Persona } from '../types';

const PersonaModal: React.FC = () => {
  const { 
    closePersonaModal, 
    editingPersona, 
    addCustomPersona, 
    updateCustomPersona 
  } = useAppContext();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');

  useEffect(() => {
    if (editingPersona) {
      setName(editingPersona.name);
      setDescription(editingPersona.description);
      setSystemInstruction(editingPersona.systemInstruction);
    } else {
      setName('');
      setDescription('');
      setSystemInstruction('');
    }
  }, [editingPersona]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const personaData = { name, description, systemInstruction, icon: WandSparklesIcon };
    if (editingPersona) {
      updateCustomPersona({ ...editingPersona, ...personaData });
    } else {
      addCustomPersona(personaData);
    }
    closePersonaModal();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={closePersonaModal}>
      <div 
        className="bg-panel w-full max-w-lg rounded-2xl shadow-2xl border border-white/10 flex flex-col m-4" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <WandSparklesIcon className="w-6 h-6 text-[var(--accent-primary)]" />
            <h2 className="text-xl font-bold text-white">
              {editingPersona ? 'Edit Persona' : 'Create New Persona'}
            </h2>
          </div>
          <button onClick={closePersonaModal} className="p-2 rounded-full hover:bg-white/10">
            <XIcon className="w-5 h-5" />
          </button>
        </header>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Persona Name</label>
            <input 
              type="text" 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Creative Writer"
              required
              className="w-full bg-black/20 border border-white/10 rounded-md p-2 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <input 
              type="text" 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of this persona's role"
              required
              className="w-full bg-black/20 border border-white/10 rounded-md p-2 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="systemInstruction" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">System Instruction (Prompt)</label>
            <textarea 
              id="systemInstruction"
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder="e.g., You are a helpful assistant that specializes in writing poetry."
              required
              rows={5}
              className="w-full bg-black/20 border border-white/10 rounded-md p-2 focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-y"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closePersonaModal} className="px-4 py-2 rounded-md bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-md bg-[var(--accent-primary)] text-white font-semibold hover:opacity-90 transition-opacity">
              {editingPersona ? 'Save Changes' : 'Create Persona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonaModal;