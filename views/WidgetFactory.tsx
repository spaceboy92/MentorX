import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Resizable } from 're-resizable';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { LayoutTemplateIcon, MenuIcon, BotIcon, CopyIcon, CheckIcon, CodeIcon, BrainCircuitIcon } from '../components/icons/Icons';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import { useAppContext } from '../contexts/AppContext';
import { useWindowSize } from '../hooks/useWindowSize';
import { GoogleGenAI } from '@google/genai';
import { getPersonas, LOADING_MESSAGES } from '../constants';
import type { Message, Persona } from '../types';

type CodeType = 'html' | 'css' | 'js';
type WidgetCode = { html: string; css: string; js: string; };

const messagesToGeminiHistory = (messages: Message[]) => {
  return messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
};

const CodeEditor: React.FC<{ code: string, language: string, onCodeChange: (newCode: string) => void }> = memo(({ code, language, onCodeChange }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative h-full bg-[#1e293b]">
             <div className="absolute top-2 right-2 z-10">
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-black/20 hover:bg-black/40 text-gray-300">
                    {copied ? <CheckIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4"/>}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <textarea
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                className="absolute inset-0 bg-transparent p-4 font-mono text-transparent caret-white resize-none w-full h-full focus:outline-none"
                spellCheck="false"
            />
            <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', height: '100%', overflow: 'auto', background: 'transparent' }}>
                {code}
            </SyntaxHighlighter>
        </div>
    );
});


const WidgetFactory: React.FC = () => {
    const { 
        activeSessionMessages: messages, 
        updateActiveSessionMessages: setMessages,
        activeSessionWidgetCode: code,
        updateActiveSessionWidgetCode: setCode,
        toggleLeftSidebar, 
        customPersonas, 
        setGlobalLoading 
    } = useAppContext();
    
    const [persona, setPersona] = useState<Persona | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [activeCodeTab, setActiveCodeTab] = useState<CodeType>('html');
    const [srcDoc, setSrcDoc] = useState('');
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const { width } = useWindowSize();
    const isMobile = width < 1024;
    const [mobileView, setMobileView] = useState<'chat' | 'code' | 'preview'>('code');

    useEffect(() => {
        setGlobalLoading(false);
        const allPersonas = getPersonas(customPersonas);
        const wfPersona = allPersonas.find(p => p.id === 'ui-architect');
        if (wfPersona) setPersona(wfPersona);
        return () => setGlobalLoading(false);
    }, [customPersonas, setGlobalLoading]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isLoading]);
    
    useEffect(() => {
        const timeout = setTimeout(() => {
            setSrcDoc(`
                <html>
                    <body>${code.html}</body>
                    <style>${code.css}</style>
                    <script>${code.js}</script>
                </html>
            `);
        }, 250);
        return () => clearTimeout(timeout);
    }, [code]);
    
    const handleCodeChange = (type: CodeType, newCode: string) => {
        setCode(prev => ({...prev, [type]: newCode}));
    };
    
    const handleSend = async (userPrompt: string) => {
        if (!userPrompt.trim() || isLoading || !persona) return;
        
        const newUserMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userPrompt };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        setPrompt('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const history = messagesToGeminiHistory(newMessages);

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: history,
                config: {
                    systemInstruction: persona.systemInstruction,
                    responseMimeType: 'application/json'
                }
            });
            
            const aiResponse = JSON.parse(response.text);
            
            if(aiResponse.thought && aiResponse.code) {
                const thoughtMessage: Message = { id: `model-${Date.now()}`, role: 'model', text: aiResponse.thought };
                setMessages(prev => [...prev, thoughtMessage]);
                setCode(aiResponse.code);
            } else {
                 throw new Error("Invalid response format from AI.");
            }

        } catch (error) {
            console.error(error);
            const errorMsg: Message = { id: `error-${Date.now()}`, role: 'model', text: `Sorry, an error occurred. ${error instanceof Error ? error.message : ''}` };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!persona) return null; // Or a loading state

    const codePanel = (
         <div className="flex flex-col h-full bg-panel">
            <div className="flex border-b border-white/10 shrink-0">
                <button onClick={() => setActiveCodeTab('html')} className={`px-4 py-2 text-sm font-semibold ${activeCodeTab === 'html' ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:bg-white/5'}`}>HTML</button>
                <button onClick={() => setActiveCodeTab('css')} className={`px-4 py-2 text-sm font-semibold ${activeCodeTab === 'css' ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:bg-white/5'}`}>CSS</button>
                <button onClick={() => setActiveCodeTab('js')} className={`px-4 py-2 text-sm font-semibold ${activeCodeTab === 'js' ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:bg-white/5'}`}>JS</button>
            </div>
            <div className="flex-1 min-h-0">
                {activeCodeTab === 'html' && <CodeEditor code={code.html} language="html" onCodeChange={(c) => handleCodeChange('html', c)} />}
                {activeCodeTab === 'css' && <CodeEditor code={code.css} language="css" onCodeChange={(c) => handleCodeChange('css', c)} />}
                {activeCodeTab === 'js' && <CodeEditor code={code.js} language="javascript" onCodeChange={(c) => handleCodeChange('js', c)} />}
            </div>
        </div>
    );
    
    const chatPanel = (
        <div className="flex flex-col h-full bg-panel">
            <div className="flex-1 overflow-y-auto">
                {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
                {isLoading && (
                     <div className="flex items-start gap-4 p-4">
                         <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/20">
                            <BotIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                         </div>
                         <div className="flex-grow pt-1 flex flex-col items-start gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] animate-pulse">{loadingMessage}</p>
                        </div>
                    </div>
                )}
                 <div ref={chatEndRef} />
            </div>
            <PromptInput prompt={prompt} onPromptChange={setPrompt} onSend={handleSend} isLoading={isLoading} />
        </div>
    );
    
    const previewPanel = <iframe srcDoc={srcDoc} title="Preview" className="w-full h-full bg-white" sandbox="allow-scripts" />;

    return (
        <div className="flex flex-col h-full bg-transparent">
            <header className="flex items-center justify-between p-3 border-b border-[var(--panel-border-color)] shrink-0 bg-panel-no-blur">
                 <div className="flex items-center gap-3">
                    <button onClick={toggleLeftSidebar} className="p-2 rounded-full hover:bg-white/10 lg:hidden">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <LayoutTemplateIcon className="w-8 h-8 text-[var(--accent-primary)]" />
                    <div>
                        <h1 className="text-lg font-semibold text-white">{persona.name}</h1>
                        <p className="text-xs text-[var(--text-secondary)]">{persona.description}</p>
                    </div>
                </div>
            </header>
            <div className="flex-1 min-h-0">
                {isMobile ? (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 min-h-0">
                            {mobileView === 'chat' && chatPanel}
                            {mobileView === 'code' && codePanel}
                            {mobileView === 'preview' && previewPanel}
                        </div>
                        <div className="flex justify-around items-center p-1 bg-[var(--bg-secondary)] border-t border-white/10 shrink-0">
                            <button onClick={() => setMobileView('chat')} className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full ${mobileView === 'chat' ? 'text-[var(--accent-primary)]' : 'text-gray-400'}`}>
                                <BrainCircuitIcon className="w-6 h-6"/> <span className="text-xs">Chat</span>
                            </button>
                             <button onClick={() => setMobileView('code')} className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full ${mobileView === 'code' ? 'text-[var(--accent-primary)]' : 'text-gray-400'}`}>
                                <CodeIcon className="w-6 h-6"/> <span className="text-xs">Code</span>
                            </button>
                             <button onClick={() => setMobileView('preview')} className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full ${mobileView === 'preview' ? 'text-[var(--accent-primary)]' : 'text-gray-400'}`}>
                                <LayoutTemplateIcon className="w-6 h-6"/> <span className="text-xs">Preview</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full">
                        <Resizable defaultSize={{ width: '25%', height: '100%' }} minWidth="250" handleClasses={{ right: "w-1.5 h-full right-0 top-0 cursor-col-resize hover:bg-[var(--accent-primary)]/50 transition-colors z-10" }}>
                           {chatPanel}
                        </Resizable>
                        <Resizable defaultSize={{ width: '45%', height: '100%' }} minWidth="300" handleClasses={{ right: "w-1.5 h-full right-0 top-0 cursor-col-resize hover:bg-[var(--accent-primary)]/50 transition-colors z-10" }}>
                            {codePanel}
                        </Resizable>
                        <div className="flex-1 h-full min-w-[250px]">
                            {previewPanel}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WidgetFactory;