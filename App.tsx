import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import MainLayout from './components/MainLayout';
import WelcomeScreen from './components/WelcomeScreen';

// Lazy load the view components
const Dashboard = lazy(() => import('./views/Dashboard'));
const ChatView = lazy(() => import('./views/ChatView'));
const CodeCanvas = lazy(() => import('./views/CodeCanvas'));
const WidgetFactory = lazy(() => import('./views/WidgetFactory'));
const ContentLab = lazy(() => import('./views/ContentLab'));
const VideoStudio = lazy(() => import('./views/VideoStudio'));

const LoadingFallback: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-[var(--bg-primary)]">
    <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div>
  </div>
);

const App: React.FC = () => {
  return (
    <AppProvider>
      <WelcomeScreen />
      <HashRouter>
        <MainLayout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat/:personaId" element={<ChatView />} />
              <Route path="/code-sandbox" element={<CodeCanvas />} />
              <Route path="/widget-factory" element={<WidgetFactory />} />
              <Route path="/content-lab" element={<ContentLab />} />
              <Route path="/video-studio" element={<VideoStudio />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;