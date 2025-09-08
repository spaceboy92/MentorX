import React, { useEffect, useState, useRef } from 'react';
import { Resizable } from 're-resizable';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import SettingsModal from './SettingsModal';
import OnboardingModal from './OnboardingModal';
import CommandPalette from './CommandPalette';
import PersonaModal from './PersonaModal';
import ImagePreviewModal from './ImagePreviewModal';
import InAppBrowserModal from './InAppBrowserModal';
import BrandingFooter from './BrandingFooter';
import { useAppContext } from '../contexts/AppContext';
import { useWindowSize } from '../hooks/useWindowSize';
import { THEMES } from '../constants';
import { ZapIcon } from './icons/Icons';


const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    isLeftSidebarOpen, toggleLeftSidebar, 
    isRightSidebarOpen, toggleRightSidebar, 
    isFocusMode, 
    hasBeenOnboarded, 
    toggleCommandPalette,
    isPersonaModalOpen,
    isImagePreviewOpen,
    isBrowserOpen,
    customBackground,
    leftSidebarWidth, setLeftSidebarWidth,
    rightSidebarWidth, setRightSidebarWidth,
    setTheme,
  } = useAppContext();

  const { width } = useWindowSize();
  const isMobile = width < 1024; // Use lg breakpoint for mobile layout
  const [konamiCode, setKonamiCode] = useState<string[]>([]);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const barrelRollRef = useRef('');
  const [barrelRoll, setBarrelRoll] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      
      // Easter Egg: Konami Code
      const targetKonamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      const updatedKonamiCode = [...konamiCode, e.key].slice(-targetKonamiCode.length);
      setKonamiCode(updatedKonamiCode);

      if (JSON.stringify(updatedKonamiCode) === JSON.stringify(targetKonamiCode)) {
        const cyberpunkTheme = THEMES.find(t => t.name === 'Cyberpunk');
        if (cyberpunkTheme) {
          setTheme(cyberpunkTheme);
          setShowEasterEgg(true);
          setTimeout(() => setShowEasterEgg(false), 3000);
        }
      }
      
      // Easter Egg: Barrel Roll
      const targetPhrase = 'do a barrel roll';
      // Ignore if an input, textarea, or contentEditable element is focused
      const activeEl = document.activeElement;
      // FIX: Check if activeEl is an HTMLElement before accessing isContentEditable to prevent type error.
      const isInputFocused = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      if (!isInputFocused && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        barrelRollRef.current = (barrelRollRef.current + e.key.toLowerCase()).slice(-targetPhrase.length);
        if (barrelRollRef.current === targetPhrase) {
          setBarrelRoll(true);
          setTimeout(() => setBarrelRoll(false), 1000); // Animation duration
          barrelRollRef.current = '';
        }
      } else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        // Reset on non-character, non-modifier keys to avoid interference
        barrelRollRef.current = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, konamiCode, setTheme]);

  const desktopLayout = (
    <>
      {!isFocusMode && (
        <Resizable
          size={{ width: isLeftSidebarOpen ? leftSidebarWidth : 0, height: '100vh' }}
          minWidth={isLeftSidebarOpen ? 200 : 0}
          maxWidth={isLeftSidebarOpen ? 500 : 0}
          enable={{ right: isLeftSidebarOpen }}
          handleClasses={{ right: "w-1.5 h-full right-0 top-0 cursor-col-resize hover:bg-[var(--accent-primary)]/50 transition-colors" }}
          onResizeStop={(e, direction, ref, d) => {
            setLeftSidebarWidth(leftSidebarWidth + d.width);
          }}
          className={!isLeftSidebarOpen ? 'w-0' : ''}
        >
         {isLeftSidebarOpen && <Sidebar />}
        </Resizable>
      )}

      <main className="flex-1 flex flex-col min-w-0">{children}</main>

      {!isFocusMode && (
         <Resizable
          size={{ width: isRightSidebarOpen ? rightSidebarWidth : 0, height: '100vh' }}
          minWidth={isRightSidebarOpen ? 200 : 0}
          maxWidth={isRightSidebarOpen ? 500 : 0}
          enable={{ left: isRightSidebarOpen }}
          handleClasses={{ left: "w-1.5 h-full left-0 top-0 cursor-col-resize hover:bg-[var(--accent-primary)]/50 transition-colors" }}
          onResizeStop={(e, direction, ref, d) => {
            setRightSidebarWidth(rightSidebarWidth + d.width);
          }}
          className={!isRightSidebarOpen ? 'w-0' : ''}
        >
          {isRightSidebarOpen && <RightSidebar />}
        </Resizable>
      )}
    </>
  );

  const mobileLayout = (
    <>
      {!isFocusMode && <Sidebar />}
      <main className="flex-1 flex flex-col">{children}</main>
      {!isFocusMode && <RightSidebar />}

      {isLeftSidebarOpen && !isFocusMode && (
         <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={toggleLeftSidebar}></div>
      )}
       {isRightSidebarOpen && !isFocusMode && (
         <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={toggleRightSidebar}></div>
      )}
    </>
  );

  return (
    <div className={`h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased overflow-hidden relative ${barrelRoll ? 'animate-barrel-roll' : ''}`}>
        <div 
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{ backgroundImage: `var(--bg-image)`, opacity: `var(--bg-image-opacity, 0)` }}
        />
        <div className="absolute inset-0 bg-[var(--bg-primary)]" style={{ opacity: customBackground ? customBackground.dimness : 1 }}/>

        <div className="relative h-full w-full flex">
          {!hasBeenOnboarded && <OnboardingModal />}
          <CommandPalette />
          {isPersonaModalOpen && <PersonaModal />}
          {isImagePreviewOpen && <ImagePreviewModal />}
          {isBrowserOpen && <InAppBrowserModal />}
          
          {isMobile ? mobileLayout : desktopLayout}
          
          <SettingsModal />
        </div>
        <BrandingFooter />

        {showEasterEgg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2 animate-bounce">
            <ZapIcon className="w-5 h-5" />
            Cyberpunk Mode Activated!
          </div>
        )}
    </div>
  );
};

export default MainLayout;