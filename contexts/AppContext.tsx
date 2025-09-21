import React, { createContext, useState, useContext, useMemo, useEffect, useCallback } from 'react';
import type { AppContextType, Theme, Session, Message, User, Persona, ImageRecord, CustomBackground, UserMemory, FileSystemItem } from '../types';
import { THEMES, DEFAULT_PERSONAS, INITIAL_FILES } from '../constants';

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

/**
 * Automatically detects if Lite Mode should be enabled by default.
 * It checks for low device memory first, and falls back to screen width
 * as a proxy for mobile devices. This only runs if the user hasn't
 * already set a preference.
 * @returns {boolean} True if Lite Mode should be on by default.
 */
const detectLiteModeDefault = (): boolean => {
  // The deviceMemory API is the most reliable indicator.
  // It returns the device RAM in gigabytes, rounded to powers of two.
  if (navigator.deviceMemory) {
    return navigator.deviceMemory <= 2;
  }

  // As a fallback for browsers without deviceMemory support (like Safari),
  // we use screen width as a proxy for a mobile device, which often has fewer resources.
  return window.innerWidth < 768;
};


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => getInitialState('mentorx-theme', THEMES[0]));
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isFocusMode, setFocusMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [hasBeenOnboarded, setHasBeenOnboarded] = useState<boolean>(() => getInitialState('mentorx-onboarded', false));

  const [sessions, setSessions] = useState<Omit<Session, 'messages' | 'fileSystem' | 'packages' | 'widgetCode'>[]>(() => 
    getInitialState<Session[]>('mentorx-sessions', []).map(({ messages, fileSystem, packages, widgetCode, ...rest }) => rest)
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => getInitialState('mentorx-active-session', null));
  const [currentUser, setCurrentUser] = useState<User | null>(() => getInitialState('mentorx-user', null));
  const [customPersonas, setCustomPersonas] = useState<Persona[]>(() => getInitialState('mentorx-custom-personas', []));
  const [generatedImages, setGeneratedImages] = useState<ImageRecord[]>(() => getInitialState('mentorx-generated-images', []));
  const [notes, setNotes] = useState<string>(() => getInitialState('mentorx-notes', ''));


  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // --- NEW: Centralized state for the active session's data ---
  const [activeSessionMessages, setActiveSessionMessages] = useState<Message[]>([]);
  const [activeSessionFileSystem, setActiveSessionFileSystem] = useState<FileSystemItem[]>([]);
  const [activeSessionPackages, setActiveSessionPackages] = useState<string[]>([]);
  const [activeSessionWidgetCode, setActiveSessionWidgetCode] = useState<{ html: string; css: string; js: string; }>({ html: '', css: '', js: ''});

  // --- Image Preview Modal State ---
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewingImage, setPreviewingImage] = useState<ImageRecord | null>(null);

  // --- Image Library Modal State ---
  const [isImageLibraryOpen, setIsImageLibraryOpen] = useState(false);

  // --- In-App Browser State ---
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  
  // --- UI Customization State ---
  const [customBackground, setCustomBackground] = useState<CustomBackground | null>(() => getInitialState('mentorx-custom-bg', null));
  const [uiDensity, setUiDensity] = useState<'compact' | 'comfortable'>(() => getInitialState('mentorx-ui-density', 'comfortable'));
  const [panelOpacity, setPanelOpacity] = useState<number>(() => getInitialState('mentorx-panel-opacity', 1));
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(() => getInitialState('mentorx-left-sidebar-width', 256));
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(() => getInitialState('mentorx-right-sidebar-width', 288));
  const [isLiteMode, setLiteMode] = useState<boolean>(() => getInitialState('mentorx-lite-mode', detectLiteModeDefault()));
  const [isGlassmorphism, setGlassmorphism] = useState<boolean>(() => getInitialState('mentorx-glassmorphism', true));
  const [isGlobalLoading, setGlobalLoading] = useState(false);

  // --- Personalization State ---
  const [isMemoryEnabled, setMemoryEnabled] = useState<boolean>(() => getInitialState('mentorx-memory-enabled', true));
  const [userMemories, setUserMemories] = useState<UserMemory[]>([]);

  // --- Guest Mode ---
  const [isGuest, setGuestMode] = useState<boolean>(() => getInitialState('mentorx-is-guest', false));


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
  useEffect(() => { localStorage.setItem('mentorx-active-session', JSON.stringify(activeSessionId)); }, [activeSessionId]);
  useEffect(() => { localStorage.setItem('mentorx-user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('mentorx-onboarded', JSON.stringify(hasBeenOnboarded)); }, [hasBeenOnboarded]);
  useEffect(() => { localStorage.setItem('mentorx-custom-personas', JSON.stringify(customPersonas)); }, [customPersonas]);
  useEffect(() => { localStorage.setItem('mentorx-generated-images', JSON.stringify(generatedImages)); }, [generatedImages]);
  useEffect(() => { localStorage.setItem('mentorx-notes', notes); }, [notes]);
  useEffect(() => { localStorage.setItem('mentorx-theme', JSON.stringify(theme)); }, [theme]);
  useEffect(() => { localStorage.setItem('mentorx-custom-bg', JSON.stringify(customBackground)); }, [customBackground]);
  useEffect(() => { localStorage.setItem('mentorx-ui-density', JSON.stringify(uiDensity)); }, [uiDensity]);
  useEffect(() => { localStorage.setItem('mentorx-panel-opacity', JSON.stringify(panelOpacity)); }, [panelOpacity]);
  useEffect(() => { localStorage.setItem('mentorx-left-sidebar-width', JSON.stringify(leftSidebarWidth)); }, [leftSidebarWidth]);
  useEffect(() => { localStorage.setItem('mentorx-right-sidebar-width', JSON.stringify(rightSidebarWidth)); }, [rightSidebarWidth]);
  useEffect(() => { localStorage.setItem('mentorx-lite-mode', JSON.stringify(isLiteMode)); }, [isLiteMode]);
  useEffect(() => { localStorage.setItem('mentorx-glassmorphism', JSON.stringify(isGlassmorphism)); }, [isGlassmorphism]);
  useEffect(() => { localStorage.setItem('mentorx-memory-enabled', JSON.stringify(isMemoryEnabled)); }, [isMemoryEnabled]);
  useEffect(() => { localStorage.setItem('mentorx-is-guest', JSON.stringify(isGuest)); }, [isGuest]);
  
  // Load/clear memories when user changes
  useEffect(() => {
    if (currentUser) {
      const memories = getInitialState<UserMemory[]>(`mentorx-memories-${currentUser.id}`, []);
      setUserMemories(memories);
    } else {
      setUserMemories([]);
    }
  }, [currentUser]);

  // Save memories when they change
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`mentorx-memories-${currentUser.id}`, JSON.stringify(userMemories));
    }
  }, [userMemories, currentUser]);


  // --- Dynamic Style Updater ---
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Theme colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    // Font
    root.style.setProperty('--font-family', theme.fontFamily);
    
    // UI Density
    root.dataset.density = uiDensity;
    
    // Glassmorphism effect
    if (isGlassmorphism && !isLiteMode) {
      body.classList.add('glass-effect');
    } else {
      body.classList.remove('glass-effect');
    }

    // Panel Opacity (forced to 1 in lite mode)
    root.style.setProperty('--panel-opacity', (isLiteMode ? 1 : panelOpacity).toString());
    
    // Custom Background (disabled in lite mode)
    if (customBackground?.url && !isLiteMode) {
      root.style.setProperty('--bg-image', `url(${customBackground.url})`);
      root.style.setProperty('--bg-image-opacity', (1 - customBackground.dimness).toString());
    } else {
      root.style.removeProperty('--bg-image');
      root.style.removeProperty('--bg-image-opacity');
    }

  }, [theme, customBackground, uiDensity, panelOpacity, isLiteMode, isGlassmorphism]);


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
    if (sessionId) {
        const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
        const sessionData = allSessions.find(s => s.id === sessionId);
        setActiveSessionMessages(sessionData?.messages || []);
        setActiveSessionFileSystem(sessionData?.fileSystem || []);
        setActiveSessionPackages(sessionData?.packages || []);
        setActiveSessionWidgetCode(sessionData?.widgetCode || { html: '', css: '', js: '' });
    } else {
        // Clear data when navigating to dashboard
        setActiveSessionMessages([]);
        setActiveSessionFileSystem([]);
        setActiveSessionPackages([]);
        setActiveSessionWidgetCode({ html: '', css: '', js: '' });
    }
  }, []);

  const createNewSession = useCallback((personaId: string, initialMessages: Message[] = []) => {
    const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
    const allPersonas = [...DEFAULT_PERSONAS, ...customPersonas];
    const persona = allPersonas.find(p => p.id === personaId);
    
    let finalInitialMessages = initialMessages;
    if (initialMessages.length === 0 && persona) {
        let welcomeText = `Hello! I am ${persona.name}. How can I assist you in the ${persona.name} workspace today?`;
        if (persona.id === 'mentorx-general') {
             welcomeText = `I am MentorX, your hyper-logical assistant. What problem can I solve for you?`;
        } else if (persona.id === 'code-sandbox') {
             welcomeText = "I am the Universal Compiler. Describe the web application you want to build or modify, and I will generate the code for you in the file system.";
        }

        finalInitialMessages = [{
            id: `welcome-${Date.now()}`,
            role: 'model',
            text: welcomeText,
        }];
    }

    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: `New ${persona?.name || 'Chat'}`,
      personaId,
      messages: finalInitialMessages,
      ...(persona?.workspace === 'code' && { fileSystem: INITIAL_FILES, packages: [] }),
      ...(persona?.workspace === 'widget' && { widgetCode: { html: '<h1>Hello!</h1>\n<p>Describe the UI you want me to build.</p>', css: 'body { \n  display: grid;\n  place-content: center;\n  min-height: 100vh;\n  background: #222;\n  color: #eee;\n  font-family: sans-serif;\n}', js: 'console.log("Widget Factory ready!");' } })
    };
    
    const updatedSessions = [newSession, ...allSessions];
    localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));

    const { messages, fileSystem, packages, widgetCode, ...metadata } = newSession;
    setSessions(prev => [metadata, ...prev]);
    
    // Set the new active session and its data
    setActiveSessionId(newSession.id);
    setActiveSessionMessages(newSession.messages);
    setActiveSessionFileSystem(newSession.fileSystem || []);
    setActiveSessionPackages(newSession.packages || []);
    setActiveSessionWidgetCode(newSession.widgetCode || { html: '', css: '', js: '' });

    return newSession.id;
  }, [customPersonas]);
  
  const deleteSession = useCallback((sessionId: string) => {
    const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
    const sessionIndex = allSessions.findIndex(s => s.id === sessionId);

    if (sessionIndex === -1) {
      return { nextSessionId: null, wasActiveSessionDeleted: false };
    }

    const updatedSessionsForStorage = allSessions.filter(s => s.id !== sessionId);
    localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessionsForStorage));

    const updatedSessionMetadatas = updatedSessionsForStorage.map(({ messages, fileSystem, packages, widgetCode, ...rest }) => rest);
    setSessions(updatedSessionMetadatas);

    let nextSessionId: string | null = null;
    const wasActiveSessionDeleted = activeSessionId === sessionId;

    if (wasActiveSessionDeleted) {
      if (updatedSessionMetadatas.length > 0) {
        const newIndex = Math.max(0, sessionIndex - 1);
        nextSessionId = updatedSessionMetadatas[newIndex].id;
      } else {
        nextSessionId = null;
      }
    }
    return { nextSessionId, wasActiveSessionDeleted };
  }, [activeSessionId]);

  
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

  const updateSessionPersona = useCallback((sessionId: string, newPersonaId: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId ? { ...session, personaId: newPersonaId } : session
    ));

    const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
    const updatedSessions = allSessions.map(s =>
      s.id === sessionId ? { ...s, personaId: newPersonaId } : s
    );
    localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));
  }, []);

  // --- New Persistence Logic to fix Race Condition ---
  const updateActiveSessionMessages = useCallback((updater: React.SetStateAction<Message[]>) => {
    setActiveSessionMessages(currentMessages => {
        const newMessages = typeof updater === 'function' ? updater(currentMessages) : updater;
        
        if (activeSessionId) {
            const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
            const updatedSessions = allSessions.map(session => 
                session.id === activeSessionId 
                    ? { ...session, messages: newMessages } 
                    : session
            );
            localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));
        }
        
        return newMessages;
    });
  }, [activeSessionId]);

  const updateActiveSessionFileSystem = useCallback((updater: React.SetStateAction<FileSystemItem[]>) => {
      setActiveSessionFileSystem(currentFileSystem => {
          const newFileSystem = typeof updater === 'function' ? updater(currentFileSystem) : updater;

          if (activeSessionId) {
              const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
              const updatedSessions = allSessions.map(session => 
                  session.id === activeSessionId 
                      ? { ...session, fileSystem: newFileSystem } 
                      : session
              );
              localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));
          }
          
          return newFileSystem;
      });
  }, [activeSessionId]);

  const updateActiveSessionPackages = useCallback((updater: React.SetStateAction<string[]>) => {
    setActiveSessionPackages(currentPackages => {
        const newPackages = typeof updater === 'function' ? updater(currentPackages) : updater;

        if (activeSessionId) {
            const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
            const updatedSessions = allSessions.map(session =>
                session.id === activeSessionId
                    ? { ...session, packages: newPackages }
                    : session
            );
            localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));
        }

        return newPackages;
    });
  }, [activeSessionId]);

  const updateActiveSessionWidgetCode = useCallback((updater: React.SetStateAction<{ html: string; css: string; js: string; }>) => {
    setActiveSessionWidgetCode(currentCode => {
        const newCode = typeof updater === 'function' ? updater(currentCode) : updater;
        
        if (activeSessionId) {
            const allSessions = getInitialState<Session[]>('mentorx-sessions', []);
            const updatedSessions = allSessions.map(session => 
                session.id === activeSessionId 
                    ? { ...session, widgetCode: newCode } 
                    : session
            );
            localStorage.setItem('mentorx-sessions', JSON.stringify(updatedSessions));
        }
        
        return newCode;
    });
  }, [activeSessionId]);


  const signIn = (userData: User | string) => {
    let userToSet: User | null = null;
    if (typeof userData === 'string') { // It's a Google JWT
        const decoded = decodeJwt(userData);
        if (decoded) {
            userToSet = {
                id: decoded.sub,
                name: decoded.name,
                email: decoded.email,
                picture: decoded.picture,
            };
        }
    } else { // It's a user object (e.g., from mock auth)
        userToSet = userData;
    }

    if (userToSet) {
        setCurrentUser(userToSet);
        setGuestMode(false); // Ensure guest mode is off
    }
  };

  const signOut = () => {
    setCurrentUser(null);
    setGuestMode(false);
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

  const addCustomPersona = (personaData: Omit<Persona, 'id' | 'custom' | 'workspace' | 'route'>) => {
    const newPersona: Persona = {
        ...personaData,
        id: `custom-${Date.now()}`,
        custom: true,
        workspace: 'chat',
        route: '/chat',
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

  const openImagePreview = (image: ImageRecord) => {
    setPreviewingImage(image);
    setIsImagePreviewOpen(true);
  };

  const closeImagePreview = () => {
    setPreviewingImage(null);
    setIsImagePreviewOpen(false);
  };

  const openImageLibrary = () => setIsImageLibraryOpen(true);
  const closeImageLibrary = () => setIsImageLibraryOpen(false);
  
  const openBrowser = (url: string) => {
    setBrowserUrl(url);
    setIsBrowserOpen(true);
  };

  const closeBrowser = () => {
    setBrowserUrl('');
    setIsBrowserOpen(false);
  };

  const addUserMemory = useCallback((memory: Omit<UserMemory, 'id'>) => {
    setUserMemories(prev => {
      const existingMemoryIndex = prev.findIndex(m => m.key.toLowerCase() === memory.key.toLowerCase());
      if (existingMemoryIndex > -1) {
        // Update existing memory
        const newMemories = [...prev];
        newMemories[existingMemoryIndex] = { ...newMemories[existingMemoryIndex], value: memory.value };
        return newMemories;
      } else {
        // Add new memory
        const newMemory: UserMemory = {
          ...memory,
          id: `mem-${Date.now()}`
        };
        return [...prev, newMemory];
      }
    });
  }, []);

  const updateUserMemory = useCallback((updatedMemory: UserMemory) => {
    setUserMemories(prev => prev.map(m => m.id === updatedMemory.id ? updatedMemory : m));
  }, []);
  
  const deleteUserMemory = useCallback((memoryId: string) => {
    setUserMemories(prev => prev.filter(m => m.id !== memoryId));
  }, []);


  const value = useMemo(() => ({
    theme, setTheme,
    isLeftSidebarOpen, toggleLeftSidebar,
    isRightSidebarOpen, toggleRightSidebar,
    isFocusMode, setFocusMode,
    notes, setNotes,
    sessions, activeSessionId, selectSession, createNewSession, deleteSession, renameSession, updateSessionPersona,
    isSettingsOpen, toggleSettings,
    currentUser, signIn, signOut,
    isCommandPaletteOpen, toggleCommandPalette,
    hasBeenOnboarded, completeOnboarding,
    customPersonas, addCustomPersona, updateCustomPersona, deleteCustomPersona,
    isPersonaModalOpen, openPersonaModal, closePersonaModal, editingPersona,
    generatedImages, addGeneratedImage,
    consumeToken, isOutOfTokens, secondsUntilTokenRegen,
    isImagePreviewOpen, previewingImage, openImagePreview, closeImagePreview,
    isImageLibraryOpen, openImageLibrary, closeImageLibrary,
    isBrowserOpen, browserUrl, openBrowser, closeBrowser,
    customBackground, setCustomBackground,
    uiDensity, setUiDensity,
    panelOpacity, setPanelOpacity,
    leftSidebarWidth, setLeftSidebarWidth,
    rightSidebarWidth, setRightSidebarWidth,
    isLiteMode, setLiteMode,
    isGlassmorphism, setGlassmorphism,
    isGlobalLoading, setGlobalLoading,
    isMemoryEnabled, setMemoryEnabled,
    userMemories, addUserMemory, updateUserMemory, deleteUserMemory,
    isGuest, setGuestMode,
    activeSessionMessages, updateActiveSessionMessages,
    activeSessionFileSystem, updateActiveSessionFileSystem,
    activeSessionPackages, updateActiveSessionPackages,
    activeSessionWidgetCode, updateActiveSessionWidgetCode,
  }), [theme, isLeftSidebarOpen, isRightSidebarOpen, isFocusMode, notes, sessions, activeSessionId, isSettingsOpen, currentUser, isCommandPaletteOpen, hasBeenOnboarded, customPersonas, isPersonaModalOpen, editingPersona, generatedImages, isOutOfTokens, secondsUntilTokenRegen, previewingImage, isImagePreviewOpen, isImageLibraryOpen, isBrowserOpen, browserUrl, customBackground, uiDensity, panelOpacity, leftSidebarWidth, rightSidebarWidth, isLiteMode, isGlassmorphism, isGlobalLoading, isMemoryEnabled, userMemories, isGuest, selectSession, createNewSession, deleteSession, renameSession, updateSessionPersona, setNotes, setLiteMode, setGlassmorphism, setGlobalLoading, completeOnboarding, addCustomPersona, updateCustomPersona, deleteCustomPersona, openPersonaModal, closePersonaModal, addGeneratedImage, consumeToken, openImagePreview, closeImagePreview, openImageLibrary, closeImageLibrary, openBrowser, closeBrowser, setCustomBackground, setUiDensity, setPanelOpacity, setLeftSidebarWidth, setRightSidebarWidth, setTheme, toggleLeftSidebar, toggleRightSidebar, setFocusMode, toggleSettings, signIn, signOut, toggleCommandPalette, setMemoryEnabled, addUserMemory, updateUserMemory, deleteUserMemory, setGuestMode, activeSessionMessages, activeSessionFileSystem, updateActiveSessionMessages, updateActiveSessionFileSystem, activeSessionPackages, updateActiveSessionPackages, activeSessionWidgetCode, updateActiveSessionWidgetCode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};