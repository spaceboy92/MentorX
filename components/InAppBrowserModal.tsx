import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { XIcon } from './icons/Icons';

const InAppBrowserModal: React.FC = () => {
    const { browserUrl, closeBrowser } = useAppContext();

    if (!browserUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" 
            onClick={closeBrowser}
        >
            <div 
                className="bg-panel w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-2 pl-4 bg-[var(--bg-secondary)] border-b border-white/10 shrink-0">
                    <p className="text-sm text-gray-400 truncate">{browserUrl}</p>
                    <button onClick={closeBrowser} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                <iframe
                    src={browserUrl}
                    title="In-App Browser"
                    className="w-full h-full bg-white"
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
        </div>
    );
};

export default InAppBrowserModal;