



import React, { useEffect, useState, useRef } from 'react';
import { Resizable } from 're-resizable';
// FIX: Using namespace import for react-router-dom to resolve module export errors.
import * as ReactRouterDom from 'react-router-dom';
const { useLocation } = ReactRouterDom;
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import SettingsModal from './SettingsModal';
import OnboardingModal from './OnboardingModal';
import CommandPalette from './CommandPalette';
import PersonaModal from './PersonaModal';
import ImagePreviewModal from './ImagePreviewModal';
import ImageLibraryModal from './ImageLibraryModal';
import InAppBrowserModal from './InAppBrowserModal';
import BrandingFooter from './BrandingFooter';
import ParticleBackground from './ParticleBackground';
import ChatTabs from './ChatTabs';
import { useAppContext } from '../contexts/AppContext';
import { useWindowSize } from '../hooks/useWindowSize';
import { THEMES } from '../constants';
import { ZapIcon } from './icons/Icons';

const GlobalLoader: React.FC = () => (
  <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center gap-4 animate-fade-in">
     <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
    `}</style>
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div>
    <p className="text-xl text-[var(--text-secondary)] font-semibold">Preparing workspace...</p>
  </div>
);

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    isLeftSidebarOpen, toggleLeftSidebar, 
    isRightSidebarOpen,
    isFocusMode, 
    hasBeenOnboarded, 
    toggleCommandPalette,
    isPersonaModalOpen,
    isImagePreviewOpen,
    isImageLibraryOpen,
    isBrowserOpen,
    customBackground,
    leftSidebarWidth, setLeftSidebarWidth,
    rightSidebarWidth, setRightSidebarWidth,
    setTheme,
    isLiteMode,
    isGlassmorphism,
    isGlobalLoading,
  } = useAppContext();

  const { width } = useWindowSize();
  const location = useLocation();
  const isMobile = width < 1024; // Use lg breakpoint for mobile layout
  const sidebarEffectivelyOpen = !isMobile || isLeftSidebarOpen;
  const [konamiCode, setKonamiCode] = useState<string[]>([]);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const barrelRollRef = useRef('');
  const [barrelRoll, setBarrelRoll] = useState(false);
  
  const isChatView = location.pathname.startsWith('/chat/');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      
      // Disable easter eggs in lite mode
      if (isLiteMode) return;

      const activeEl = document.activeElement;
      const isInputFocused = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      if (isInputFocused) return; // Don't trigger easter eggs if user is typing
      
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
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        barrelRollRef.current = (barrelRollRef.current + e.key.toLowerCase()).slice(-targetPhrase.length);
        if (barrelRollRef.current === targetPhrase) {
          setBarrelRoll(true);
          setTimeout(() => setBarrelRoll(false), 1000); // Animation duration
          barrelRollRef.current = '';
        }
      } else if (!['Shift', 'Control', 'Alt', 'Meta', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Reset on non-character, non-modifier, non-arrow keys to avoid interference
        barrelRollRef.current = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, konamiCode, setTheme, isLiteMode]);

  const desktopLayout = (
    <>
      {!isFocusMode && (
        isLiteMode ? (
          sidebarEffectivelyOpen && (
            <div style={{ width: leftSidebarWidth }} className="flex-shrink-0 h-full">
              <Sidebar />
            </div>
          )
        ) : (
          <Resizable
            size={{ width: sidebarEffectivelyOpen ? leftSidebarWidth : 0, height: '100vh' }}
            minWidth={sidebarEffectivelyOpen ? 200 : 0}
            maxWidth={sidebarEffectivelyOpen ? 500 : 0}
            enable={{ right: sidebarEffectivelyOpen }}
            handleClasses={{ right: "w-1.5 h-full right-0 top-0 cursor-col-resize hover:bg-[var(--accent-primary)]/50 transition-colors z-10" }}
            onResizeStop={(e, direction, ref, d) => {
              setLeftSidebarWidth(leftSidebarWidth + d.width);
            }}
            className={!sidebarEffectivelyOpen ? 'w-0' : ''}
          >
           {sidebarEffectivelyOpen && <Sidebar />}
          </Resizable>
        )
      )}

      <main className="flex-1 flex flex-col min-w-0">
        {isChatView && <ChatTabs />}
        {children}
      </main>
      
      {!isFocusMode && (
        <Resizable
          size={{ width: isRightSidebarOpen ? rightSidebarWidth : 0, height: '100vh' }}
          minWidth={isRightSidebarOpen ? 250 : 0}
          maxWidth={isRightSidebarOpen ? 500 : 0}
          enable={{ left: isRightSidebarOpen }}
          handleClasses={{ left: "w-1.5 h-full left-0 top-0 cursor-col-resize hover:bg-[var(--accent-primary)]/50 transition-colors z-10" }}
          onResizeStop={(e, direction, ref, d) => {
            setRightSidebarWidth(rightSidebarWidth - d.width);
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
      <main className="flex-1 flex flex-col min-h-0">
        {isChatView && <ChatTabs />}
        {children}
      </main>
      
      {isLeftSidebarOpen && !isFocusMode && (
         <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={toggleLeftSidebar}></div>
      )}
    </>
  );

  return (
    <div className={`h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased overflow-hidden relative ${barrelRoll ? 'animate-barrel-roll' : ''} ${isLiteMode ? 'lite-mode' : ''} ${isGlassmorphism ? 'glass-effect' : ''}`}>
        {!isLiteMode && <ParticleBackground />}
        <div 
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{ backgroundImage: `var(--bg-image)`, opacity: `var(--bg-image-opacity, 0)` }}
        />
        <div className="absolute inset-0 bg-[var(--bg-primary)]" style={{ opacity: customBackground ? customBackground.dimness : 1 }}/>

        <div className="relative h-full w-full flex">
          {isGlobalLoading && <GlobalLoader />}
          {!hasBeenOnboarded && <OnboardingModal />}
          <CommandPalette />
          {isPersonaModalOpen && <PersonaModal />}
          {isImagePreviewOpen && <ImagePreviewModal />}
          {isImageLibraryOpen && <ImageLibraryModal />}
          {isBrowserOpen && <InAppBrowserModal />}
          
          {isMobile ? mobileLayout : desktopLayout}
          
          <SettingsModal />
        </div>
        <BrandingFooter />

        {showEasterEgg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2 animate-bounce z-50">
            <ZapIcon className="w-5 h-5" />
            Cyberpunk Mode Activated!
          </div>
        )}
    </div>
  );
};

export default MainLayout;