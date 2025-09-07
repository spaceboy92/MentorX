import React, { createContext, useState, useContext, useMemo, useEffect, useCallback } from 'react';
import type { AppContextType, Theme, Session, Message, User, Widget, Persona, ImageRecord, CustomBackground, VideoRecord } from '../types';
import { THEMES } from '../constants';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to decode JWT
const decodeJwt = (token: string) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Failed to decode JWT:", e);
        return null;
    }
};

const getInitialState = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return defaultValue;
  }
};


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => getInitialState('mentorx-theme', THEMES[0]));
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isFocusMode, setFocusMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [hasBeenOnboarded, setHasBeenOnboarded] = useState<boolean>(() => getInitialState('mentorx-onboarded', false));

  const [sessions, setSessions] = useState<Omit<Session, 'messages'>[]>(() => 
    getInitialState<Session[]>('mentorx-sessions', []).map(({ messages, ...rest }) => rest)
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => getInitialState('mentorx-active-session', null));
  const [currentUser, setCurrentUser] = useState<User | null>(() => getInitialState('mentorx-user', null));
  const [pinnedWidgets, setPinnedWidgets] = useState<Widget[]>(() => getInitialState('mentorx-pinned-widgets', []));
  const [customPersonas, setCustomPersonas] = useState<Persona[]>(() => getInitialState('mentorx-custom-personas', []));
  const [generatedImages, setGeneratedImages] = useState<ImageRecord[]>(() => getInitialState('mentorx-generated-images', []));
  const [generatedVideos, setGeneratedVideos] = useState<VideoRecord[]>(() => getInitialState('mentorx-generated-videos', []));


  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // --- Image Preview Modal State ---
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewingImage, setPreviewingImage] = useState<ImageRecord | null>(null);

  // --- In-App Browser State ---
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  
  // --- UI Customization State ---
  const [customBackground, setCustomBackground] = useState<CustomBackground | null>(() => getInitialState('mentorx-custom-bg', null));
  const [uiDensity, setUiDensity] = useState<'compact' | 'comfortable'>(() => getInitialState('mentorx-ui-density', 'comfortable'));
  const [panelOpacity, setPanelOpacity] = useState<number>(() => getInitialState('mentorx-panel-opacity', 1));
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(() => getInitialState('mentorx-left-sidebar-width', 256));
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(() => getInitialState('mentorx-right-sidebar-width', 256));

  // Invisible Token System
  const MAX_TOKENS = 5;
  const TOKEN_REGEN_INTERVAL_MS = 1000 * 60 * 60; // 1 hour
  const [tokens, setTokens] = useState<number>(() => getInitialState('mentorx-tokens', MAX_TOKENS));
  const [tokenCooldownEnd, setTokenCooldownEnd] = useState<number>(() => getInitialState('mentorx-token-cooldown', 0));
  const [secondsUntilTokenRegen, setSecondsUntilTokenRegen] = useState(0);

  const isOutOfTokens = tokens <= 0;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now > tokenCooldownEnd) {
        if (tokens < MAX_TOKENS) {
            setTokens(MAX_TOKENS);
        }
        setTokenCooldownEnd(0);
        setSecondsUntilTokenRegen(0);
      } else {
        setSecondsUntilTokenRegen(Math.ceil((tokenCooldownEnd - now) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tokenCooldownEnd, tokens]);

  const consumeToken = () => {
    if (tokens > 0) {
        const newTokens = tokens - 1;
        setTokens(newTokens);
        if (newTokens === 0) {
            setTokenCooldownEnd(Date.now() + TOKEN_REGEN_INTERVAL_MS);
        }
    }
  };

  // --- LocalStorage Persistence ---
  useEffect(() => { localStorage.setItem('mentorx-tokens', JSON.stringify(tokens)); }, [tokens]);
  useEffect(() => { localStorage.setItem('mentorx-token-cooldown', JSON.stringify(tokenCooldownEnd)); }, [tokenCooldownEnd]);
  // Note: 'mentorx-sessions' is now managed by the session functions directly for performance.
  useEffect(() => { localStorage.setItem('mentorx-active-session', JSON.stringify(activeSessionId)); }, [activeSessionId]);
  useEffect(() => { localStorage.setItem('mentorx-user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('mentorx-onboarded', JSON.stringify(hasBeenOnboarded)); }, [hasBeenOnboarded]);
  useEffect(() => { localStorage.setItem('mentorx-pinned-widgets', JSON.stringify(pinnedWidgets)); }, [pinnedWidgets]);
  useEffect(() => { localStorage.setItem('mentorx-custom-personas', JSON.stringify(customPersonas)); }, [customPersonas]);
  useEffect(() => { localStorage.setItem('mentorx-generated-images', JSON.stringify(generatedImages)); }, [generatedImages]);
  useEffect(() => { localStorage.setItem('mentorx-generated-videos', JSON.stringify(generatedVideos)); }, [generatedVideos]);
  useEffect(() => { localStorage.setItem('mentorx-theme', JSON.stringify(theme)); }, [theme]);
  useEffect(() => { localStorage.setItem('mentorx-custom-bg', JSON.stringify(customBackground)); }, [customBackground]);
  useEffect(() => { localStorage.setItem('mentorx-ui-density', JSON.stringify(uiDensity)); }, [uiDensity]);
  useEffect(() => { localStorage.setItem('mentorx-panel-opacity', JSON.stringify(panelOpacity)); }, [panelOpacity]);
  useEffect(() => { localStorage.setItem('mentorx-left-sidebar-width', JSON.stringify(leftSidebarWidth)); }, [leftSidebarWidth]);
  useEffect(() => { localStorage.setItem('mentorx-right-sidebar-width', JSON.stringify(rightSidebarWidth)); }, [rightSidebarWidth]);

  // --- Dynamic Style Updater ---
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    // Font
    root.style.setProperty('--font-family', theme.fontFamily);
    
    // UI Density
    root.dataset.density = uiDensity;
    
    // Panel Opacity
    root.style.setProperty('--panel-opacity', panelOpacity.toString());
    
    // Custom Background
    if (customBackground?.url) {
      root.style.setProperty('--bg-image', `url(${customBackground.url})`);
      root.style.setProperty('--bg-image-opacity', (1 - customBackground.dimness).toString());
    } else {
      root.style.removeProperty('--bg-image');
      root.style.removeProperty('--bg-image-opacity');
    }

  }, [theme, customBackground, uiDensity, panelOpacity]);


  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };
  
  const toggleLeftSidebar = () => setIsLeftSidebarOpen(prev => !prev);
  const toggleRightSidebar = () => setIsRightSidebarOpen(prev => !prev);
  const toggleSettings = () => setIsSettingsOpen(prev => !prev);
  const toggleCommandPalette = () => setIsCommandPaletteOpen(prev => !prev);
  const completeOnboarding = () => setHasBeenOnboarded(true);

  const selectSession = useCallback((sessionId: string | null) => {
    setActiveSessionId(sessionId);
  }, []);

  const createNewSession = useCallback((personaId: string, initialMessages: Message[] = []) => {
    const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: `New Chat ${allSessions.length + 1}`.trim(),
      personaId,
      messages: initialMessages,
    };
    
    const updatedSessions = [newSession, ...allSessions];
    localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));

    const { messages, ...metadata } = newSession;
    setSessions(prev => [metadata, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);
  
  const updateMessagesForActiveSession = useCallback((messages: Message[]) => {
      if(!activeSessionId) return;
      const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
      const updatedSessions = allSessions.map(session => 
          session.id === activeSessionId ? {...session, messages} : session
      );
      localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));
  }, [activeSessionId]);
  
  // FIX: Refactored deleteSession to use the `sessions` state, removing the problematic line that caused a type error.
  const deleteSession = useCallback((sessionId: string) => {
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
    const updatedSessionsForStorage = allSessions.filter(s => s.id !== sessionId);
    localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessionsForStorage));

    const updatedSessionMetadatas = sessions.filter(s => s.id !== sessionId);

    if (activeSessionId === sessionId) {
      let nextActiveSessionId: string | null = null;
      if (updatedSessionMetadatas.length > 0) {
        const newIndex = Math.min(sessionIndex, updatedSessionMetadatas.length - 1);
        nextActiveSessionId = updatedSessionMetadatas[newIndex].id;
      }
      setSessions(updatedSessionMetadatas);
      setActiveSessionId(nextActiveSessionId);
    } else {
      setSessions(updatedSessionMetadatas);
    }
  }, [activeSessionId, sessions]);
  
  const renameSession = useCallback((sessionId: string, newName: string) => {
    setSessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, name: newName } : session
    ));

    const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
    const updatedSessions = allSessions.map(s => 
        s.id === sessionId ? { ...s, name: newName } : s
    );
    localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));
  }, []);

  const pinWidget = (widget: Widget) => {
    setPinnedWidgets(prev => [...prev.filter(w => w.id !== widget.id), widget]);
  };

  const unpinWidget = (widgetId: string) => {
    setPinnedWidgets(prev => prev.filter(w => w.id !== widgetId));
  };
  
  const signIn = (token: string) => {
    const decoded = decodeJwt(token);
    if (decoded) {
        const user: User = {
            id: decoded.sub,
            name: decoded.name,
            email: decoded.email,
            picture: decoded.picture,
        };
        setCurrentUser(user);
    }
  };

  const signOut = () => {
    setCurrentUser(null);
    if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
    }
  };

  const openPersonaModal = (persona: Persona | null = null) => {
    setEditingPersona(persona);
    setIsPersonaModalOpen(true);
  };
  const closePersonaModal = () => {
    setEditingPersona(null);
    setIsPersonaModalOpen(false);
  };

  const addCustomPersona = (personaData: Omit<Persona, 'id' | 'custom' | 'workspace'>) => {
    const newPersona: Persona = {
        ...personaData,
        id: `custom-${Date.now()}`,
        custom: true,
        workspace: 'chat',
    };
    setCustomPersonas(prev => [...prev, newPersona]);
  };

  const updateCustomPersona = (updatedPersona: Persona) => {
    setCustomPersonas(prev => prev.map(p => p.id === updatedPersona.id ? updatedPersona : p));
  };

  const deleteCustomPersona = (personaId: string) => {
    setCustomPersonas(prev => prev.filter(p => p.id !== personaId));
  };

  const addGeneratedImage = (image: Omit<ImageRecord, 'id' | 'timestamp'>) => {
    const newImage: ImageRecord = {
      ...image,
      id: `img-${Date.now()}`,
      timestamp: Date.now(),
    };
    setGeneratedImages(prev => [newImage, ...prev]);
  }

  const addGeneratedVideo = (video: Omit<VideoRecord, 'id' | 'timestamp'>) => {
    const newVideo: VideoRecord = {
      ...video,
      id: `vid-${Date.now()}`,
      timestamp: Date.now(),
    };
    setGeneratedVideos(prev => [newVideo, ...prev]);
  }

  const openImagePreview = (image: ImageRecord) => {
    setPreviewingImage(image);
    setIsImagePreviewOpen(true);
  };

  const closeImagePreview = () => {
    setPreviewingImage(null);
    setIsImagePreviewOpen(false);
  };
  
  const openBrowser = (url: string) => {
    setBrowserUrl(url);
    setIsBrowserOpen(true);
  };

  const closeBrowser = () => {
    setBrowserUrl('');
    setIsBrowserOpen(false);
  };


  const value = useMemo(() => ({
    theme, setTheme,
    isLeftSidebarOpen, toggleLeftSidebar,
    isRightSidebarOpen, toggleRightSidebar,
    isFocusMode, setFocusMode,
    sessions, activeSessionId, selectSession, createNewSession, updateMessagesForActiveSession, deleteSession, renameSession,
    isSettingsOpen, toggleSettings,
    currentUser, signIn, signOut,
    pinnedWidgets, pinWidget, unpinWidget,
    isCommandPaletteOpen, toggleCommandPalette,
    hasBeenOnboarded, completeOnboarding,
    customPersonas, addCustomPersona, updateCustomPersona, deleteCustomPersona,
    isPersonaModalOpen, openPersonaModal, closePersonaModal, editingPersona,
    generatedImages, addGeneratedImage,
    generatedVideos, addGeneratedVideo,
    consumeToken, isOutOfTokens, secondsUntilTokenRegen,
    isImagePreviewOpen, previewingImage, openImagePreview, closeImagePreview,
    isBrowserOpen, browserUrl, openBrowser, closeBrowser,
    customBackground, setCustomBackground,
    uiDensity, setUiDensity,
    panelOpacity, setPanelOpacity,
    leftSidebarWidth, setLeftSidebarWidth,
    rightSidebarWidth, setRightSidebarWidth,
  }), [theme, isLeftSidebarOpen, isRightSidebarOpen, isFocusMode, sessions, activeSessionId, isSettingsOpen, currentUser, pinnedWidgets, selectSession, createNewSession, updateMessagesForActiveSession, deleteSession, renameSession, isCommandPaletteOpen, hasBeenOnboarded, customPersonas, isPersonaModalOpen, editingPersona, generatedImages, generatedVideos, isOutOfTokens, secondsUntilTokenRegen, previewingImage, isImagePreviewOpen, isBrowserOpen, browserUrl, customBackground, uiDensity, panelOpacity, leftSidebarWidth, rightSidebarWidth]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};