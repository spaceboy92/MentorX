import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAppContext } from '../contexts/AppContext';
import { getPersonas, LOADING_MESSAGES } from '../constants';
import ChatMessage from '../components/ChatMessage';
import type { Message, Persona } from '../types';
// FIX: Replaced non-existent 'ShieldLockIcon' with 'LockIcon'.
import { MenuIcon, LockIcon, SendIcon } from '../components/icons/Icons';
import { useWindowSize } from '../hooks/useWindowSize';

interface ConsoleLine {
    type: 'command' | 'output' | 'error';
    text: string;
}

const ChatPanel: React.FC<{
    messages: Message[];
    isAiThinking: boolean;
    chatInput: string;
    setChatInput: (val: string) => void;
    handleChatSend: () => void;
    chatEndRef: React.RefObject<HTMLDivElement>;
    loadingMessage: string;
}> = memo(({ messages, isAiThinking, chatInput, setChatInput, handleChatSend, chatEndRef, loadingMessage }) => (
    <div className="flex flex-col h-full bg-panel">
        <h3 className="text-lg font-semibold text-white p-4 border-b border-white/10">AI Security Assistant</h3>
        <div className="flex-1 overflow-y-auto">
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            {isAiThinking && (
                <div className="flex items-start gap-4 p-4">
                     <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/20">
                        <LockIcon className="w-5 h-5 text-[var(--accent-primary)]" />
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
        <div className="p-4 border-t border-white/10">
            <div className="relative rgb-border-glow rounded-lg">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder="Ask for guidance or explanations..."
                  className="w-full p-3 pr-12 bg-[var(--bg-primary)] border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  disabled={isAiThinking}
                />
                 <button
                    onClick={handleChatSend}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all disabled:bg-gray-600"
                    disabled={!chatInput.trim() || isAiThinking}
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
));

const ConsolePanel: React.FC<{
    consoleLines: ConsoleLine[];
    isConsoleRunning: boolean;
    consoleInput: string;
    setConsoleInput: (val: string) => void;
    handleConsoleRun: () => void;
    consoleEndRef: React.RefObject<HTMLDivElement>;
}> = memo(({ consoleLines, isConsoleRunning, consoleInput, setConsoleInput, handleConsoleRun, consoleEndRef }) => (
     <div className="flex flex-col h-full bg-black/50 rounded-lg border border-white/10 font-mono">
        <h3 className="text-lg font-semibold text-green-400 p-4 border-b border-white/10">Hacking Console (Simulated)</h3>
        <div className="flex-1 p-4 overflow-y-auto text-sm">
            {consoleLines.map((line, index) => (
                <div key={index} className="flex">
                    {line.type === 'command' && <span className="text-cyan-400 mr-2 shrink-0">{'>'}</span>}
                    <pre className={`whitespace-pre-wrap ${line.type === 'output' ? 'text-gray-300' : line.type === 'error' ? 'text-red-500' : 'text-green-400'}`}>
                        {line.text}
                    </pre>
                </div>
            ))}
            {isConsoleRunning && <div className="text-yellow-400 animate-pulse">Running...</div>}
            <div ref={consoleEndRef} />
        </div>
         <div className="p-4 border-t border-white/10 rgb-border-glow rounded-b-lg">
            <div className="relative flex items-center gap-2">
                <span className="text-green-400 shrink-0">sentinel&gt;</span>
                <input
                  type="text"
                  value={consoleInput}
                  onChange={(e) => setConsoleInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleConsoleRun()}
                  placeholder="Enter a command (e.g., nmap -sV example.com)"
                  className="w-full bg-transparent text-green-300 focus:outline-none"
                  disabled={isConsoleRunning}
                />
                 <button
                    onClick={handleConsoleRun}
                    className="px-4 py-1 rounded-md bg-green-500/80 text-black font-bold hover:bg-green-500 disabled:bg-gray-600"
                    disabled={!consoleInput.trim() || isConsoleRunning}
                >
                    Run
                </button>
            </div>
        </div>
    </div>
));


const CyberSentinel: React.FC = () => {
    // FIX: Refactored to use centralized message state from AppContext instead of local state.
    // This resolves an error from trying to call a non-existent `updateMessagesForActiveSession` function.
    const { 
        activeSessionMessages: messages,
        updateActiveSessionMessages: setMessages,
        toggleLeftSidebar, 
        customPersonas, 
        setGlobalLoading
    } = useAppContext();

    const [persona, setPersona] = useState<Persona | null>(null);
    const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [consoleInput, setConsoleInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [isConsoleRunning, setIsConsoleRunning] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    const { width } = useWindowSize();
    const isMobile = width < 1024;
    const [mobileView, setMobileView] = useState<'chat' | 'console'>('chat');


    useEffect(() => {
        setGlobalLoading(false);
        const allPersonas = getPersonas(customPersonas);
        const csPersona = allPersonas.find(p => p.id === 'cyber-sentinel');
        if (csPersona) {
            setPersona(csPersona);
        }
    }, [customPersonas, setGlobalLoading]);
    
    useEffect(() => {
        if (isAiThinking) {
            const interval = setInterval(() => {
                setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isAiThinking]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consoleLines]);
    
    const handleChatSend = useCallback(async () => {
        if (!chatInput.trim() || isAiThinking || !persona) return;
        
        const newUserMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: chatInput };
        setMessages(prev => [...prev, newUserMessage]);

        setChatInput('');
        setIsAiThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const chatHistory = [...messages, newUserMessage].map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: chatHistory,
                config: { systemInstruction: persona.systemInstruction }
            });

            const aiResponse: Message = { id: `model-${Date.now()}`, role: 'model', text: response.text };
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg: Message = { id: `error-${Date.now()}`, role: 'model', text: "Sorry, an error occurred." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsAiThinking(false);
        }
    }, [isAiThinking, persona, chatInput, messages, setMessages]);

    const handleConsoleRun = useCallback(async () => {
        if (!consoleInput.trim() || isConsoleRunning || !persona) return;

        const commandToRun = consoleInput;
        const newCommand: ConsoleLine = { type: 'command', text: commandToRun };
        setConsoleLines(prev => [...prev, newCommand]);
        setConsoleInput('');
        setIsConsoleRunning(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const prompt = `User command: \`${commandToRun}\``;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: persona.systemInstruction,
                    responseMimeType: 'application/json'
                }
            });
            
            const parsedResponse = JSON.parse(response.text);

            if (parsedResponse.thought) {
                const thoughtMessage: Message = { id: `thought-${Date.now()}`, role: 'model', text: parsedResponse.thought };
                setMessages(prev => [...prev, thoughtMessage]);
            }

            if (parsedResponse.operations && Array.isArray(parsedResponse.operations)) {
                for (const op of parsedResponse.operations) {
                    if (op.action === 'EXECUTE') {
                        // If the AI is running a different command than the user typed (part of a multi-step plan),
                        // then display that command first.
                        if (op.command !== commandToRun) {
                            setConsoleLines(prev => [...prev, { type: 'command', text: op.command }]);
                        }

                        if (op.delay) {
                           await new Promise(resolve => setTimeout(resolve, op.delay));
                        }
                        
                        setConsoleLines(prev => [...prev, { type: 'output', text: op.output }]);
                    }
                }
            } else {
                 const fallbackOutput: ConsoleLine = { type: 'output', text: response.text };
                 setConsoleLines(prev => [...prev, fallbackOutput]);
            }

        } catch (error) {
            console.error("Console simulation error:", error);
            const errorText = error instanceof Error ? `Failed to parse AI response. ${error.message}` : "Could not simulate command.";
            const errorLine: ConsoleLine = { type: 'error', text: `Error: ${errorText}` };
            setConsoleLines(prev => [...prev, errorLine]);
        } finally {
            setIsConsoleRunning(false);
        }
    }, [isConsoleRunning, persona, consoleInput, setMessages]);
    
    if (!persona) return null;

    return (
        <div className="flex flex-col h-full bg-transparent">
            <header className="flex items-center justify-between p-3 border-b border-[var(--panel-border-color)] shrink-0 bg-panel-no-blur">
                <div className="flex items-center gap-3">
                    <button onClick={toggleLeftSidebar} className="p-2 rounded-full hover:bg-white/10 lg:hidden">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <LockIcon className="w-8 h-8 text-[var(--accent-primary)]" />
                    <div>
                        <h1 className="text-lg font-semibold text-white">{persona.name}</h1>
                        <p className="text-xs text-[var(--text-secondary)]">{persona.description}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-4 min-h-0">
                {isMobile ? (
                    <div className="flex flex-col h-full">
                        <div className="flex border-b border-white/10">
                            <button onClick={() => setMobileView('chat')} className={`flex-1 p-3 text-center font-semibold ${mobileView === 'chat' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>AI Assistant</button>
                            <button onClick={() => setMobileView('console')} className={`flex-1 p-3 text-center font-semibold ${mobileView === 'console' ? 'bg-white/10 text-white' : 'text-gray-400'}`}>Console</button>
                        </div>
                        <div className="flex-1 min-h-0 pt-2">
                            {mobileView === 'chat' ? <ChatPanel {...{messages, isAiThinking, chatInput, setChatInput, handleChatSend, chatEndRef, loadingMessage}} /> : <ConsolePanel {...{consoleLines, isConsoleRunning, consoleInput, setConsoleInput, handleConsoleRun, consoleEndRef}} />}
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 h-full">
                        <div className="w-1/3 h-full">
                            <ChatPanel {...{messages, isAiThinking, chatInput, setChatInput, handleChatSend, chatEndRef, loadingMessage}} />
                        </div>
                        <div className="w-2/3 h-full">
                            <ConsolePanel {...{consoleLines, isConsoleRunning, consoleInput, setConsoleInput, handleConsoleRun, consoleEndRef}} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CyberSentinel;