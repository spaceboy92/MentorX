import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { THEMES, FONTS } from '../constants';
import { XIcon, PaletteIcon, UserCircleIcon, ZapIcon, SparklesIcon, BrainCircuitIcon, Trash2Icon } from './icons/Icons';
import type { Theme } from '../types';
import ToggleSwitch from './ui/ToggleSwitch';

const TabButton: React.FC<{ Icon: React.ComponentType<{ className?: string }>; label: string; isActive: boolean; onClick: () => void }> = ({ Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors w-full text-left shrink-0 ${
      isActive
        ? 'bg-white/10 text-white'
        : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);


const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, toggleSettings, 
    theme, setTheme, 
    currentUser, signOut,
    isGuest,
    customBackground, setCustomBackground,
    uiDensity, setUiDensity,
    panelOpacity, setPanelOpacity,
    isLiteMode, setLiteMode,
    isGlassmorphism, setGlassmorphism,
    isMemoryEnabled, setMemoryEnabled,
    userMemories, updateUserMemory, deleteUserMemory,
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('appearance');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMemory, setEditingMemory] = useState<{id: string, value: string} | null>(null);

  if (!isSettingsOpen) return null;

  const handleFontChange = (fontFamily: string) => {
      setTheme({ ...theme, fontFamily });
  }
  
  const handleBgUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomBackground({
          url: e.target.value,
          dimness: customBackground?.dimness || 0.7,
      });
  };

  const handleBgDimnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!customBackground) return;
      setCustomBackground({
          ...customBackground,
          dimness: parseFloat(e.target.value),
      });
  };

  const handlePanelOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPanelOpacity(parseFloat(e.target.value));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomBackground({
          url: reader.result as string,
          dimness: customBackground?.dimness || 0.7,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={toggleSettings}>
      <div className="bg-panel w-full max-w-4xl rounded-2xl shadow-2xl border border-white/10 flex flex-col md:flex-row max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-white/10 shrink-0">
            <h2 className="text-lg font-semibold mb-4 px-2 hidden md:block">Settings</h2>
            <div className='flex gap-1 overflow-x-auto md:flex-col md:space-y-1'>
                <TabButton Icon={PaletteIcon} label="Appearance" isActive={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
                <TabButton Icon={BrainCircuitIcon} label="Personalization" isActive={activeTab === 'personalization'} onClick={() => setActiveTab('personalization')} />
                <TabButton Icon={UserCircleIcon} label="Account" isActive={activeTab === 'account'} onClick={() => setActiveTab('account')} />
            </div>
        </div>

        <div className="flex-1 flex flex-col">
            <header className="flex items-center justify-between p-2 shrink-0 md:justify-end">
              <h2 className="text-lg font-semibold px-2 md:hidden">
                {activeTab === 'appearance' ? 'Appearance' : activeTab === 'personalization' ? 'Personalization' : 'Account'}
              </h2>
              <button onClick={toggleSettings} className="p-2 rounded-full hover:bg-white/10">
                <XIcon className="w-5 h-5" />
              </button>
            </header>
            
            <div className="flex-1 p-6 pt-0 overflow-y-auto">
                {activeTab === 'appearance' && (
                  <div className="space-y-8">
                    <h3 className="text-xl font-semibold text-white hidden md:block">Appearance</h3>
                    
                     {/* Performance & Visuals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-4 rounded-lg bg-black/20 border border-white/10">
                            <div className="flex items-center gap-2">
                                <ZapIcon className="w-5 h-5 text-[var(--accent-primary)]"/>
                                <h4 className="font-semibold text-[var(--text-secondary)]">Performance</h4>
                            </div>
                            <ToggleSwitch
                                label="Lite Mode"
                                checked={isLiteMode}
                                onChange={setLiteMode}
                            />
                            <p className="text-xs text-gray-500 pl-12 -mt-2">Reduces animations and effects to improve performance on older devices.</p>
                        </div>
                        <div className={`space-y-3 p-4 rounded-lg bg-black/20 border border-white/10 ${isLiteMode ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-[var(--accent-primary)]"/>
                                <h4 className="font-semibold text-[var(--text-secondary)]">Visuals</h4>
                            </div>
                            <ToggleSwitch
                                label="Glassmorphism"
                                checked={isGlassmorphism}
                                onChange={setGlassmorphism}
                            />
                             <p className="text-xs text-gray-500 pl-12 -mt-2">Enables a frosted glass effect on UI panels. {isLiteMode && "(Disabled in Lite Mode)"}</p>
                        </div>
                    </div>


                    {/* Background Settings */}
                    <div className={`space-y-3 ${isLiteMode ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h4 className="font-semibold text-[var(--text-secondary)]">Custom Background {isLiteMode && "(Disabled)"}</h4>
                        <div className="flex gap-2">
                           <input type="text" placeholder="Image URL..." value={customBackground?.url || ''} onChange={handleBgUrlChange} className="w-full bg-black/20 border border-white/10 rounded-md p-2 focus:outline-none focus:border-[var(--accent-primary)] transition-colors"/>
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                           <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-md bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors whitespace-nowrap">Upload</button>
                           <button onClick={() => setCustomBackground(null)} className="px-4 py-2 rounded-md bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">Clear</button>
                        </div>
                        <label className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                            <span>Dimness</span>
                            <input type="range" min="0" max="1" step="0.05" value={customBackground?.dimness || 0.7} onChange={handleBgDimnessChange} disabled={!customBackground} className="w-full" />
                        </label>
                    </div>

                    {/* Themes */}
                    <div>
                        <h4 className="font-semibold mb-3 text-[var(--text-secondary)]">Themes</h4>
                        <div className='grid grid-cols-2 lg:grid-cols-3 gap-2'>
                            {THEMES.map(t => (
                                <button key={t.name} onClick={() => setTheme(t)} className={`w-full p-2 rounded-lg border-2 transition-all ${theme.name === t.name ? 'border-[var(--accent-primary)]' : 'border-transparent hover:border-white/20'}`} style={{ background: t.colors['bg-primary'], color: t.colors['text-primary']}}>
                                    <span className="text-sm">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Layout & Font */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-3">
                            <h4 className="font-semibold text-[var(--text-secondary)]">Layout</h4>
                            <div className="flex gap-2 bg-black/20 p-1 rounded-lg border border-white/10">
                                <button onClick={() => setUiDensity('comfortable')} className={`w-full py-1.5 rounded-md text-sm transition-colors ${uiDensity === 'comfortable' ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-white/10'}`}>Comfortable</button>
                                <button onClick={() => setUiDensity('compact')} className={`w-full py-1.5 rounded-md text-sm transition-colors ${uiDensity === 'compact' ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-white/10'}`}>Compact</button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-semibold text-[var(--text-secondary)]">Font</h4>
                            <select onChange={(e) => handleFontChange(e.target.value)} value={theme.fontFamily} className="w-full bg-black/20 border border-white/10 rounded-md p-2 focus:outline-none focus:border-[var(--accent-primary)] transition-colors">
                               {FONTS.map(font => <option key={font.name} value={font.value}>{font.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                     <div className={`space-y-3 ${isLiteMode || !isGlassmorphism ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h4 className="font-semibold text-[var(--text-secondary)]">Effects {(isLiteMode || !isGlassmorphism) && "(Disabled)"}</h4>
                         <label className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                            <span>Panel Opacity</span>
                            <input type="range" min="0.5" max="1" step="0.05" value={panelOpacity} onChange={handlePanelOpacityChange} className="w-full" />
                        </label>
                    </div>

                  </div>
                )}
                
                {activeTab === 'personalization' && (
                  <div>
                      <h3 className="text-xl font-semibold mb-4 text-white hidden md:block">Personalization</h3>
                      <div className="space-y-6">
                          <div className={`p-4 rounded-lg bg-black/20 border border-white/10 ${isGuest ? 'opacity-50' : ''}`}>
                              <ToggleSwitch
                                  label="Enable Personalized Memory"
                                  checked={isMemoryEnabled}
                                  onChange={setMemoryEnabled}
                                  disabled={isGuest}
                              />
                              <p className="text-xs text-gray-500 pl-12 -mt-2">
                                {isGuest 
                                    ? "Sign in to enable personalization." 
                                    : "Allow MentorX to remember key details from your conversations to provide a more tailored experience."}
                              </p>
                          </div>

                          <div className={`space-y-3 ${!isMemoryEnabled || isGuest ? 'opacity-50 pointer-events-none' : ''}`}>
                              <h4 className="font-semibold text-[var(--text-secondary)]">Remembered Details</h4>
                              {userMemories.length > 0 ? (
                                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                      {userMemories.map(memory => (
                                          <div key={memory.id} className="flex items-center gap-2 p-2 bg-black/20 rounded-md">
                                              <span className="font-semibold text-sm text-gray-400 capitalize w-1/4 truncate">{memory.key}:</span>
                                              <input 
                                                  type="text"
                                                  value={editingMemory?.id === memory.id ? editingMemory.value : memory.value}
                                                  onFocus={() => setEditingMemory({id: memory.id, value: memory.value})}
                                                  onChange={(e) => setEditingMemory({id: memory.id, value: e.target.value})}
                                                  onBlur={() => {
                                                      if (editingMemory) {
                                                          updateUserMemory({ ...memory, value: editingMemory.value });
                                                      }
                                                      setEditingMemory(null);
                                                  }}
                                                  onKeyDown={(e) => {
                                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                  }}
                                                  className="flex-1 bg-transparent border-b border-dashed border-transparent focus:border-white/30 focus:outline-none text-sm"
                                              />
                                              <button onClick={() => deleteUserMemory(memory.id)} className="p-1 text-gray-500 hover:text-red-400 rounded-full hover:bg-white/10">
                                                  <Trash2Icon className="w-4 h-4" />
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="text-center py-8 text-gray-500 text-sm">
                                      <p>No details remembered yet.</p>
                                      <p>Start a conversation, and MentorX will learn as you chat!</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                )}

                {activeTab === 'account' && (
                     <div>
                        <h3 className="text-xl font-semibold mb-4 text-white hidden md:block">Account</h3>
                        {currentUser ? (
                             <div className="p-6 bg-black/20 rounded-lg border border-white/10">
                                <div className='flex items-center gap-4'>
                                    <img src={currentUser.picture} alt={currentUser.name} className="w-16 h-16 rounded-full" />
                                    <div>
                                        <h4 className="text-lg font-bold text-white">{currentUser.name}</h4>
                                        <p className="text-sm text-gray-400">{currentUser.email}</p>
                                    </div>
                                </div>
                                <button onClick={signOut} className="mt-6 w-full bg-red-600/80 text-white font-semibold py-2 rounded-lg hover:bg-red-600 transition-colors active:scale-95">
                                    Sign Out
                                </button>
                             </div>
                        ) : (
                            <div className="p-8 bg-black/20 rounded-lg border border-white/10 flex flex-col items-center justify-center text-center">
                               <UserCircleIcon className="w-16 h-16 text-gray-500 mb-2" />
                               <h4 className="text-lg font-bold text-white">You are browsing as a Guest</h4>
                               <p className="text-[var(--text-secondary)] mb-4 text-sm max-w-sm">Sign up or sign in to sync your chat history, create custom personas, and unlock personalization features.</p>
                               <button onClick={signOut} className="mt-2 w-full max-w-xs bg-[var(--accent-primary)] text-white font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity active:scale-95">
                                    Sign Up / Sign In
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;