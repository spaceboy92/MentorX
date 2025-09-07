import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Dashboard from './views/Dashboard';
import ChatView from './views/ChatView';
import CodeCanvas from './views/CodeCanvas';
import WidgetFactory from './views/WidgetFactory';
import ContentLab from './views/ContentLab';
import VideoStudio from './views/VideoStudio';
import MainLayout from './components/MainLayout';
import WelcomeScreen from './components/WelcomeScreen';

const App: React.FC = () => {
  return (
    <AppProvider>
      <WelcomeScreen />
      <HashRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat/:personaId" element={<ChatView />} />
            <Route path="/code-sandbox" element={<CodeCanvas />} />
            <Route path="/widget-factory" element={<WidgetFactory />} />
            <Route path="/content-lab" element={<ContentLab />} />
            <Route path="/video-studio" element={<VideoStudio />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MainLayout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;