



import React, { Suspense, lazy, useEffect } from 'react';
// FIX: Using namespace import for react-router-dom to resolve module export errors.
import * as ReactRouterDom from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } = ReactRouterDom;
import { AppProvider, useAppContext } from './contexts/AppContext';
import MainLayout from './components/MainLayout';
import WelcomeScreen from './components/WelcomeScreen';
import AuthView from './views/AuthView';
import { getPersonas } from './constants';

// Lazy load the view components
const Dashboard = lazy(() => import('./views/Dashboard'));
const ChatView = lazy(() => import('./views/ChatView'));
const CodeCanvas = lazy(() => import('./views/CodeCanvas'));
const ContentLab = lazy(() => import('./views/ContentLab'));
const VideoStudio = lazy(() => import('./views/VideoStudio'));
const WidgetFactory = lazy(() => import('./views/WidgetFactory'));
const CyberSentinel = lazy(() => import('./views/CyberSentinel'));

const LoadingFallback: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
    <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div>
  </div>
);

// This component centralizes the logic for syncing the URL with the active session.
// It must be a child of HashRouter to use navigation hooks.
const RouterSync: React.FC = () => {
  const { activeSessionId, sessions, customPersonas } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (activeSessionId === null) {
      if (location.pathname !== '/') {
        navigate('/');
      }
      return;
    }

    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) {
      navigate('/');
      return;
    }
    
    const personas = getPersonas(customPersonas);
    const persona = personas.find(p => p.id === session.personaId);
    if (!persona) {
        navigate('/');
        return;
    }

    const path = persona.route === '/chat'
      ? `/chat/${session.id}`
      : persona.route || '/';
      
    if (path !== location.pathname) {
        navigate(path);
    }
  }, [activeSessionId, sessions, customPersonas, navigate, location.pathname]);
  
  return null; // This component renders nothing.
};


const AppContent: React.FC = () => {
  const { currentUser, isGuest } = useAppContext();

  if (!currentUser && !isGuest) {
    return <AuthView />;
  }

  return (
    <>
      <WelcomeScreen />
      <HashRouter>
        <RouterSync />
        <MainLayout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat/:sessionId" element={<ChatView />} />
              <Route path="/code-sandbox" element={<CodeCanvas />} />
              <Route path="/content-lab" element={<ContentLab />} />
              <Route path="/video-studio" element={<VideoStudio />} />
              <Route path="/widget-factory" element={<WidgetFactory />} />
              <Route path="/cyber-sentinel" element={<CyberSentinel />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </HashRouter>
    </>
  );
}


const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};


export default App;