import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Message, Persona, Session } from '../types';
import { getPersonas, AVAILABLE_TOOLS_PRO } from '../constants';
import { callGeminiModel, generateImage, generateSummary, performWebSearch } from '../services/geminiService';
import ChatMessage from '../components/ChatMessage';
import PromptInput, { PromptInputRef } from '../components/PromptInput';
import FloatingToolbar from '../components/FloatingToolbar';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import { useAppContext } from '../contexts/AppContext';
import { MenuIcon, PanelRightOpenIcon, ZapIcon, LockIcon, BookTextIcon, BotIcon } from '../components/icons/Icons';

const MESSAGES_PER_PAGE = 30;

// Helper to convert our Message format to Gemini's Content format
const messagesToGeminiHistory = (messages: Message[]) => {
  return messages
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
};


const ChatView: React.FC = () => {
  const { personaId } = useParams();
  const navigate = useNavigate();
  
  const { 
    activeSessionId, 
    sessions, 
    updateMessagesForActiveSession, 
    toggleLeftSidebar, 
    toggleRightSidebar,
    customPersonas,
    addGeneratedImage,
    consumeToken,
    isOutOfTokens,
    secondsUntilTokenRegen,
  } = useAppContext();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDeepAnalysis, setUseDeepAnalysis] = useState(false);
  const [isPrivateChat, setIsPrivateChat] = useState(false);
  const [page, setPage] = useState(1);
  const [prompt, setPrompt] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const promptInputRef = useRef<PromptInputRef>(null);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Autosave messages every 30 seconds to prevent data loss
  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const intervalId = setInterval(() => {
      // Use the ref to get the latest messages without re-triggering the effect,
      // and persist them to localStorage.
      if (messagesRef.current.length > 0) {
        updateMessagesForActiveSession(messagesRef.current);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [activeSessionId, updateMessagesForActiveSession]);

  // Load session data (persona and messages)
  useEffect(() => {
    const activeSessionInfo = sessions.find(s => s.id === activeSessionId);
    if(activeSessionInfo) {
        const allPersonas = getPersonas(customPersonas);
        const foundPersona = allPersonas.find(p => p.id === activeSessionInfo.personaId);
        if (foundPersona) {
          setPersona(foundPersona);
          // Load full messages from localStorage for the active session
          const allSessionsFromStorage: Session[] = JSON.parse(localStorage.getItem('mentorx-sessions') || '[]');
          const fullActiveSession = allSessionsFromStorage.find(s => s.id === activeSessionId);
          setMessages(fullActiveSession ? fullActiveSession.messages : []);
          setPage(1); // Reset pagination on session change
        } else {
          navigate('/');
        }
    } else {
        if (personaId) { 
           navigate('/');
        }
    }
  }, [activeSessionId, sessions, navigate, personaId, customPersonas]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages, isLoading]);
  
  const handleStop = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsLoading(false);
    }
  };
  
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
      const newMessages = [...messages, summaryMessage];
      setMessages(newMessages);
      updateMessagesForActiveSession(newMessages);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate summary: ${errorMessage}`);
    } finally {
      setIsSummarizing(false);
    }
  };
  
  const handleSend = useCallback(async (currentPrompt: string, image?: { data: string; type: string }) => {
    if (!persona || (!currentPrompt.trim() && !image) || isOutOfTokens) return;

    consumeToken();
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: currentPrompt,
      image: image ? `data:${image.type};base64,${image.data}` : undefined,
    };
    
    // Update UI immediately with user's message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    updateMessagesForActiveSession(updatedMessages);

    // FIX: Changed type to `any[]` to allow for tool call history parts (`role: 'tool'`)
    // which were causing type conflicts with the strictly typed `role: 'user' | 'model'`.
    const geminiHistory: any[] = messagesToGeminiHistory(updatedMessages);
    let accumulatedCitations: { uri: string; title: string }[] = [];
    
    try {
      while (true) {
        const response = await callGeminiModel(
          geminiHistory,
          `${persona.systemInstruction} ${useDeepAnalysis ? 'Provide an expert-level, detailed, and comprehensive answer.' : ''}`,
          AVAILABLE_TOOLS_PRO
        );
        
        const responseContent = response.candidates[0].content;
        const toolCallParts = responseContent.parts.filter(part => part.functionCall);

        if (toolCallParts.length === 0) {
          // No tool call, this is the final text response
          const text = response.text;
          const finalMessage: Message = {
            id: `model-${Date.now()}`,
            role: 'model',
            text: text,
            citations: accumulatedCitations.length > 0 ? [...new Map(accumulatedCitations.map(item => [item.uri, item])).values()] : undefined,
          };
          setMessages(prev => [...prev, finalMessage]);
          updateMessagesForActiveSession([...messagesRef.current, finalMessage]);
          break; // Exit loop
        }

        // It's a tool call, process it
        geminiHistory.push(responseContent); // Add model's tool call request to history

        const toolResponseParts = [];
        let toolCallIndicatorMessageId: string | null = null;

        for (const toolCallPart of toolCallParts) {
            const { name, args } = toolCallPart.functionCall;
            if (name === 'generateImage') {
                // FIX: Cast `args.prompt` to a string to resolve potential 'unknown' type errors.
                const promptText = String(args.prompt);
                const indicatorMessage: Message = { id: `tool-call-${Date.now()}`, role: 'model', text: `Generating an image for: "${promptText}"` };
                toolCallIndicatorMessageId = indicatorMessage.id;
                setMessages(prev => [...prev, indicatorMessage]);
                
                const imageUrl = await generateImage(promptText);
                
                const imageMessage: Message = { id: `img-${Date.now()}`, role: 'model', type: 'image', text: promptText, image: imageUrl };
                addGeneratedImage({ prompt: promptText, url: imageUrl });
                setMessages(prev => [...prev.filter(m => m.id !== toolCallIndicatorMessageId), imageMessage]);
                
                toolResponseParts.push({
                    functionResponse: {
                        name: 'generateImage',
                        response: { content: 'Image generated successfully.' }
                    }
                });
            } else if (name === 'searchWeb') {
                const query = String(args.query);
                const indicatorMessage: Message = { id: `tool-call-${Date.now()}`, role: 'model', text: `Searching the web for: "${query}"` };
                toolCallIndicatorMessageId = indicatorMessage.id;
                setMessages(prev => [...prev, indicatorMessage]);

                const searchResult = await performWebSearch(query);
                
                // Remove indicator message
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
        console.error(e);
        const errorMsg = { id: `error-${Date.now()}`, role: 'model' as const, text: `Sorry, something went wrong: ${errorMessage}` };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }

  }, [persona, messages, useDeepAnalysis, updateMessagesForActiveSession, addGeneratedImage, consumeToken, isOutOfTokens]);


  const displayedMessages = messages.slice(-page * MESSAGES_PER_PAGE);
  const canLoadMore = messages.length > page * MESSAGES_PER_PAGE;

  const handleLoadMore = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const oldScrollHeight = container.scrollHeight;
    
    setPage(p => p + 1);

    // After render, restore scroll position to keep view stable
    setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop += (newScrollHeight - oldScrollHeight);
    }, 0);
  };

  const handleAttachFile = () => {
    promptInputRef.current?.triggerFilePicker();
  };

  if (!persona && !activeSessionId) {
    return <div className="flex-1 flex items-center justify-center">Select a persona or start a new chat from the dashboard.</div>;
  }
  
  if (!persona) {
     return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <header className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={toggleLeftSidebar} className="p-2 rounded-full hover:bg-white/10 md:hidden">
            <MenuIcon className="w-6 h-6" />
          </button>
          <persona.icon className="w-8 h-8 text-[var(--accent-primary)]" />
          <div>
            <h1 className="text-lg font-semibold text-white">{persona.name}</h1>
            <p className="text-xs text-[var(--text-secondary)]">{persona.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className='hidden md:flex items-center gap-2'>
              <LockIcon className="w-4 h-4 text-gray-400" />
              <ToggleSwitch label="Private Chat" checked={isPrivateChat} onChange={setIsPrivateChat} />
          </div>
          <div className='hidden md:flex items-center gap-2'>
              <ZapIcon className="w-4 h-4 text-gray-400" />
              <ToggleSwitch label="Deep Analysis" checked={useDeepAnalysis} onChange={setUseDeepAnalysis} />
          </div>
          <button onClick={handleSummarize} title="Summarize Conversation" disabled={isLoading || isSummarizing || messages.length < 2} className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSummarizing ? <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin"></div> : <BookTextIcon className="w-5 h-5" />}
          </button>
          <button onClick={toggleRightSidebar} className="p-2 rounded-full hover:bg-white/10">
            <PanelRightOpenIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
        {canLoadMore && (
          <div className="text-center my-2">
              <button onClick={handleLoadMore} className="px-4 py-1.5 text-xs bg-white/5 rounded-full hover:bg-white/10 transition-colors text-[var(--text-secondary)]">
                  Load previous messages
              </button>
          </div>
        )}
        {displayedMessages.map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={msg} 
          />
        ))}
        {isLoading && (
             <div className="flex items-start gap-4 p-4">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/20">
                    <BotIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                 </div>
                 <div className="flex-grow pt-1 flex items-center gap-2">
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
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
      
      <div className='p-2 md:hidden flex flex-wrap gap-4 justify-center bg-[var(--bg-secondary)]/50 border-t border-white/10'>
         <ToggleSwitch label="Deep Analysis" checked={useDeepAnalysis} onChange={setUseDeepAnalysis} />
         <ToggleSwitch label="Private Chat" checked={isPrivateChat} onChange={setIsPrivateChat} />
      </div>
        
      <div className="relative">
          <FloatingToolbar
              onSetPrompt={setPrompt}
              onTriggerFile={handleAttachFile}
            />
          <PromptInput 
            ref={promptInputRef}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSend={handleSend} 
            isLoading={isLoading} 
            onStop={handleStop} 
            disabled={isOutOfTokens}
            disabledText={isOutOfTokens ? `AI is recharging... Available in ${secondsUntilTokenRegen}s` : undefined}
          />
      </div>
    </div>
  );
};

export default ChatView;