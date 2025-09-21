import React, { useState, useEffect, useRef, useCallback } from 'react';
// FIX: Using namespace import for react-router-dom to resolve module export errors.
import * as ReactRouterDom from 'react-router-dom';
const { useParams, useNavigate, useLocation } = ReactRouterDom;
import type { Message, Persona, Session } from '../types';
import { getPersonas, AVAILABLE_TOOLS_PRO, THEMES, LOADING_MESSAGES } from '../constants';
import { callGeminiModel, generateImage, generateSummary, performWebSearch, generateTitleForChat, extractMemoriesFromChat } from '../services/geminiService';
import ChatMessage from '../components/ChatMessage';
import PromptInput, { PromptInputRef } from '../components/PromptInput';
import FloatingToolbar from '../components/FloatingToolbar';
import { useAppContext } from '../contexts/AppContext';
// FIX: Added BotIcon to imports to fix 'Cannot find name' error.
import { MenuIcon, DownloadIcon, BookTextIcon, LightbulbIcon, MessageSquarePlusIcon, BotIcon, PanelRightOpenIcon } from '../components/icons/Icons';

const MESSAGES_PER_PAGE = 30;

// Helper to convert our Message format to Gemini's Content format
const messagesToGeminiHistory = (messages: Message[]) => {
  const historyWithParts = messages
    .filter(m => m.type !== 'summary') // Exclude summaries from history
    .map(msg => {
        const parts = [];
        if (msg.text) {
            parts.push({ text: msg.text });
        }
        if (msg.image && msg.role === 'user') { // Only include user-uploaded images in history parts
            const [mimeType, base64Data] = msg.image.split(';base64,');
            parts.push({
                inlineData: {
                    mimeType: mimeType.replace('data:', ''),
                    data: base64Data
                }
            });
        }
        return {
            role: msg.role,
            parts: parts
        };
    });

  // A multi-turn chat history for the Gemini API must start with a 'user' role.
  // If our stored history begins with a 'model' welcome message, we must slice it off.
  if (historyWithParts.length > 0 && historyWithParts[0].role === 'model') {
    return historyWithParts.slice(1);
  }
  
  return historyWithParts;
};

const MagicToolsPopup: React.FC<{
  selection: string;
  position: { top: number; left: number };
  onAction: (action: string) => void;
}> = ({ selection, position, onAction }) => {
  if (!selection) return null;

  const actions = [
    { label: 'Explain', prompt: `Explain this concept simply: "${selection}"`, icon: <LightbulbIcon className="w-4 h-4" /> },
    { label: 'Summarize', prompt: `Summarize this text: "${selection}"`, icon: <BookTextIcon className="w-4 h-4" /> },
    { label: 'Expand', prompt: `Expand on this topic: "${selection}"`, icon: <MessageSquarePlusIcon className="w-4 h-4" /> },
  ];

  return (
    <div
      className="absolute z-20 bg-panel shadow-lg rounded-lg border border-white/10 p-1 flex gap-1 animate-fade-in-fast"
      style={{ top: position.top, left: position.left, transform: 'translateY(-100%)' }}
    >
        <style>{`.animate-fade-in-fast { animation: fade-in 0.15s ease-out; }`}</style>
      {actions.map(action => (
        <button
          key={action.label}
          onClick={() => onAction(action.prompt)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-white/5 text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white"
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
};


const ChatView: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    activeSessionId, 
    sessions, 
    selectSession,
    activeSessionMessages: messages,
    updateActiveSessionMessages: setMessages,
    renameSession,
    updateSessionPersona,
    toggleLeftSidebar, 
    toggleRightSidebar,
    customPersonas,
    addGeneratedImage,
    consumeToken,
    isOutOfTokens,
    secondsUntilTokenRegen,
    setTheme,
    isLiteMode,
    setGlobalLoading,
    isMemoryEnabled,
    userMemories,
    addUserMemory,
  } = useAppContext();

  const [session, setSession] = useState<Omit<Session, 'messages'> | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [selection, setSelection] = useState({ text: '', top: 0, left: 0 });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const promptInputRef = useRef<PromptInputRef>(null);
  const initialPromptSent = useRef(false);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  useEffect(() => {
    setGlobalLoading(false);
    return () => setGlobalLoading(false);
  }, [setGlobalLoading]);

  useEffect(() => {
    if (isLoading) {
        const interval = setInterval(() => {
            setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
        }, 2000);
        return () => clearInterval(interval);
    }
  }, [isLoading]);

  const processAndSend = useCallback(async (messagesForApi: Message[]) => {
    if (!persona) return;

    setIsLoading(true);
    setError(null);
    setSelection({ text: '', top: 0, left: 0 }); // Clear selection on send

    const geminiHistory: any[] = messagesToGeminiHistory(messagesForApi);
    let accumulatedCitations: { uri: string; title: string }[] = [];

    const getPersonalizedSystemInstruction = () => {
        if (!isMemoryEnabled || userMemories.length === 0) {
            return persona.systemInstruction;
        }
        const memoryPreamble = "To provide a personalized experience, remember these facts about the user:\n" +
            userMemories.map(m => `- ${m.key}: ${m.value}`).join('\n') +
            "\n---\n";
        return memoryPreamble + persona.systemInstruction;
    };
    const personalizedSystemInstruction = getPersonalizedSystemInstruction();
    
    const generateAndSetTitle = (messagesForTitle: Message[]) => {
        if (messagesForTitle.length === 2 && sessionId && session?.name.startsWith('New ')) {
            generateTitleForChat(messagesForTitle)
              .then(newTitle => {
                if (newTitle && newTitle !== "Untitled Chat") {
                  renameSession(sessionId, newTitle);
                }
              })
              .catch(err => console.error("Failed to generate title:", err));
        }
    };
    
    try {
      while (true) {
        const response = await callGeminiModel(
          geminiHistory,
          personalizedSystemInstruction,
          AVAILABLE_TOOLS_PRO,
          isLiteMode
        );
        
        const responseContent = response.candidates?.[0]?.content;
        if (!responseContent) {
            throw new Error("Invalid response from API.");
        }
        
        const toolCallParts = responseContent.parts.filter(part => part.functionCall);

        if (toolCallParts.length === 0) {
          const text = response.text;
          const finalMessage: Message = {
            id: `model-${Date.now()}`,
            role: 'model',
            text: text,
            citations: accumulatedCitations.length > 0 ? [...new Map(accumulatedCitations.map(item => [item.uri, item])).values()] : undefined,
          };
          setMessages(prev => {
            const newMessages = [...prev, finalMessage];
            generateAndSetTitle(newMessages);
            return newMessages;
          });
          break; // Exit loop
        }

        geminiHistory.push(responseContent); // Add model's tool call request to history

        const toolResponseParts = [];
        let toolCallIndicatorMessageId: string | null = null;
        
        for (const toolCallPart of toolCallParts) {
            const { name, args } = toolCallPart.functionCall;
            if (name === 'generateImage') {
                const promptText = String(args.prompt);
                const indicatorMessage: Message = { id: `tool-call-${Date.now()}`, type: 'tool', role: 'model', text: `Generating an image for: "${promptText}"` };
                toolCallIndicatorMessageId = indicatorMessage.id;
                setMessages(prev => [...prev, indicatorMessage]);
                
                const imageUrl = await generateImage(promptText);
                
                const imageMessage: Message = { id: `img-${Date.now()}`, role: 'model', type: 'image', text: promptText, image: imageUrl };
                addGeneratedImage({ prompt: promptText, url: imageUrl });
                
                setMessages(prev => {
                  const filtered = prev.filter(m => m.id !== toolCallIndicatorMessageId);
                  return [...filtered, imageMessage];
                });
                
                toolResponseParts.push({
                    functionResponse: {
                        name: 'generateImage',
                        response: { content: 'Image generated successfully.' }
                    }
                });
            } else if (name === 'searchWeb') {
                const query = String(args.query);
                const indicatorMessage: Message = { id: `tool-call-${Date.now()}`, type: 'tool', role: 'model', text: `Searching the web for: "${query}"` };
                toolCallIndicatorMessageId = indicatorMessage.id;
                setMessages(prev => [...prev, indicatorMessage]);

                const searchResult = await performWebSearch(query);
                
                setMessages(prev => prev.filter(m => m.id !== toolCallIndicatorMessageId));

                accumulatedCitations.push(...searchResult.citations);
                
                toolResponseParts.push({
                    functionResponse: {
                        name: 'searchWeb',
                        response: { content: searchResult.summary }
                    }
                });
            }
        }
        
        geminiHistory.push({
            role: 'tool',
            parts: toolResponseParts,
        });
      }
    } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
        console.error("Chat error:", e);
        const errorMsg = { id: `error-${Date.now()}`, role: 'model' as const, text: `Sorry, something went wrong: ${errorMessage}` };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
    
    // Memory Extraction Logic (run after the main response is complete)
    const lastUserMessage = messagesForApi.filter(m => m.role === 'user').pop()?.text || '';
    if (isMemoryEnabled && lastUserMessage) {
      extractMemoriesFromChat(lastUserMessage).then(memories => {
        if (memories && memories.length > 0) {
          memories.forEach(mem => addUserMemory(mem));
        }
      });
    }

  }, [persona, addGeneratedImage, isLiteMode, sessionId, session, renameSession, isMemoryEnabled, userMemories, addUserMemory, setMessages]);

  const handleSend = useCallback(async (currentPrompt: string, image?: { data: string; type: string }) => {
    const trimmedPrompt = currentPrompt.trim();
    
    if (trimmedPrompt.toLowerCase() === '/hackermode on') {
      const hackerTheme = THEMES.find(t => t.name === 'Hacker');
      if (hackerTheme) setTheme(hackerTheme);
      setPrompt('');
      return;
    }
    if (trimmedPrompt.toLowerCase() === '/hackermode off') {
      setTheme(THEMES[0]); // Reset to default Aurora theme
      setPrompt('');
      return;
    }

    if (!persona || (!trimmedPrompt && !image) || isOutOfTokens) return;

    consumeToken();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmedPrompt,
      image: image ? `data:${image.type};base64,${image.data}` : undefined,
    };
    
    const updatedMessages = [...messagesRef.current, userMessage];
    setMessages(updatedMessages);
    processAndSend(updatedMessages);

  }, [persona, consumeToken, isOutOfTokens, setTheme, processAndSend, setMessages]);


  // This effect synchronizes the view's local state (persona, session metadata)
  // with the global active session ID managed by the AppContext and RouterSync.
  useEffect(() => {
    // RouterSync is the source of truth for navigation. This component only renders
    // what the global state dictates. If the session ID from the URL doesn't match
    // the active session in our context, it means we're in a transitional state
    // and RouterSync will soon correct the URL. We avoid loading data to prevent flicker.
    if (sessionId !== activeSessionId) {
      return;
    }
    
    if (sessionId) { // and we know sessionId === activeSessionId
        const allPersonas = getPersonas(customPersonas);
        const sessionInfo = sessions.find(s => s.id === sessionId);

        if (!sessionInfo) {
            // This is a safeguard. RouterSync should have already redirected if the session is invalid.
            navigate('/');
            return;
        }
        
        const foundPersona = allPersonas.find(p => p.id === sessionInfo.personaId);
        if (foundPersona) {
            setPersona(foundPersona);
            setSession(sessionInfo); // Store session metadata locally for the view
            setPage(1); 
            initialPromptSent.current = false;
        } else {
            // Safeguard for corrupted session data
            console.warn("Persona not found for session, redirecting.");
            navigate('/');
        }
    } else {
       // This component shouldn't be rendered without a sessionId, but as a safeguard:
       navigate('/');
    }
  }, [sessionId, activeSessionId, sessions, customPersonas, navigate]);

  // Handle initial prompt from Dashboard
  useEffect(() => {
    if (location.state?.fetchResponse && messages.length > 0 && messages[messages.length - 1].role === 'user' && !initialPromptSent.current) {
        initialPromptSent.current = true;
        processAndSend(messages);
        navigate(location.pathname, { replace: true, state: {} }); // Clean up state
    }
  }, [location.state, messages, processAndSend, navigate, location.pathname]);


  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages, isLoading]);
  
  const handleSummarize = async () => {
    if (messages.length < 2 || isLoading || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const summaryText = await generateSummary(messages);
      const summaryMessage: Message = {
        id: `summary-${Date.now()}`,
        role: 'model',
        text: summaryText,
        type: 'summary',
      };
      setMessages(prev => [...prev, summaryMessage]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate summary: ${errorMessage}`);
    } finally {
      setIsSummarizing(false);
    }
  };
  
  const handleExportChat = () => {
    if (!session) return;
    const formattedContent = messages.map(msg => {
        if (msg.type === 'summary') return `## Summary\n\n${msg.text}`;
        const prefix = msg.role === 'user' ? '👤 User' : `🤖 ${persona?.name || 'MentorX'}`;
        let content = `### ${prefix}\n\n`;
        if (msg.text) content += `${msg.text}\n\n`;
        if (msg.image) content += `![Image Attached]\n\n`;
        if (msg.citations) {
            content += '**Sources:**\n';
            msg.citations.forEach(c => {
                content += `- [${c.title}](${c.uri})\n`;
            });
        }
        return content;
    }).join('---\n\n');

    const blob = new Blob([formattedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.name.replace(/\s/g, '_')}_${new Date().toISOString()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const displayedMessages = messages.slice(-page * MESSAGES_PER_PAGE);
  const canLoadMore = messages.length > page * MESSAGES_PER_PAGE;

  const handleLoadMore = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const oldScrollHeight = container.scrollHeight;
    
    setPage(p => p + 1);

    setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop += (newScrollHeight - oldScrollHeight);
    }, 0);
  };

  const handleAttachFile = () => {
    promptInputRef.current?.triggerFilePicker();
  };
  
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      let parent = range.commonAncestorContainer;
      while (parent) {
        if (parent instanceof Element && parent.closest('.prose')) {
          setSelection({
            text: selection.toString().trim(),
            top: rect.top - (chatContainerRef.current?.getBoundingClientRect().top || 0) + (chatContainerRef.current?.scrollTop || 0),
            left: rect.left - (chatContainerRef.current?.getBoundingClientRect().left || 0) + (rect.width / 2),
          });
          return;
        }
        parent = parent.parentNode;
      }
    } else {
      setSelection({ text: '', top: 0, left: 0 });
    }
  }, []);
  
  const handleMagicAction = (actionPrompt: string) => {
    handleSend(actionPrompt);
    setSelection({ text: '', top: 0, left: 0 });
  };
  
  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (sessionId) {
      updateSessionPersona(sessionId, e.target.value);
    }
  };

  const chatPersonas = getPersonas(customPersonas).filter(p => p.route === '/chat' && p.id !== 'custom-persona');

  if (!persona || !session) {
     return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div></div>;
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <header className="flex items-center justify-between p-3 border-b border-[var(--panel-border-color)] shrink-0 bg-panel-no-blur">
        <div className="flex items-center gap-3">
          <button onClick={toggleLeftSidebar} className="p-2 rounded-full hover:bg-white/10 lg:hidden">
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 relative group">
            <persona.icon className="w-8 h-8 text-[var(--accent-primary)]" />
            <select
              value={persona.id}
              onChange={handlePersonaChange}
              className="bg-transparent font-semibold text-lg text-white appearance-none focus:outline-none cursor-pointer pr-6"
              style={{ minWidth: '150px' }}
            >
              {chatPersonas.map(p => <option key={p.id} value={p.id} className="bg-[var(--bg-secondary)] text-white">{p.name}</option>)}
            </select>
             <p className="text-xs text-[var(--text-secondary)] hidden md:block">{persona.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportChat} title="Export Chat" disabled={messages.length === 0} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
            <DownloadIcon className="w-5 h-5" />
          </button>
          <button onClick={handleSummarize} title="Summarize Conversation" disabled={isLoading || isSummarizing || messages.length < 2} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSummarizing ? <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin"></div> : <BookTextIcon className="w-5 h-5" />}
          </button>
          <button onClick={toggleRightSidebar} title="Toggle Workspace" className="p-2 rounded-full hover:bg-white/10 hidden md:inline-flex">
            <PanelRightOpenIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto relative" onMouseUp={handleMouseUp} onScroll={() => setSelection({ text: '', top: 0, left: 0 })}>
        <MagicToolsPopup selection={selection.text} position={{ top: selection.top, left: selection.left }} onAction={handleMagicAction} />
        {canLoadMore && (
          <div className="text-center my-2">
              <button onClick={handleLoadMore} className="px-4 py-1.5 text-xs bg-white/5 rounded-full hover:bg-white/10 transition-colors text-[var(--text-secondary)]">
                  Load previous messages
              </button>
          </div>
        )}
        {displayedMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
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

      {error && (
        <div className="p-4 bg-red-500/20 text-red-300 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
        
      <div className="relative">
          <FloatingToolbar
              onSetPrompt={setPrompt}
              onTriggerFile={handleAttachFile}
            />
          <PromptInput 
            ref={promptInputRef}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSend={(p, img) => handleSend(p, img)} 
            isLoading={isLoading} 
            disabled={isOutOfTokens}
            disabledText={isOutOfTokens ? `AI is recharging... Available in ${secondsUntilTokenRegen}s` : undefined}
          />
      </div>
    </div>
  );
};

export default ChatView;