import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import { BotIcon, UserIcon, CopyIcon, CheckIcon, Volume2Icon, BookTextIcon } from './icons/Icons';
import { useAppContext } from '../contexts/AppContext';

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return !inline ? (
    <div className="relative my-2 rounded-lg bg-[#1e293b]/50">
      <div className="flex items-center justify-between px-4 py-1 text-xs text-gray-400 bg-gray-800/30 rounded-t-lg">
        <span>{lang}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white">
          {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter style={vscDarkPlus} language={lang} PreTag="div" {...props}>
        {code}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className="text-emerald-400 bg-gray-700/50 px-1 py-0.5 rounded-sm" {...props}>
      {children}
    </code>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const { uiDensity, generatedImages, openImagePreview, openBrowser } = useAppContext();
  const isModel = message.role === 'model';

  const densityClasses = {
      'comfortable': 'py-4 px-4',
      'compact': 'py-3 px-4'
  };
  
  const handleTextToSpeech = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message.text);
      window.speechSynthesis.cancel(); // Stop any previous speech
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Your browser does not support text-to-speech.');
    }
  };

  const handleCitationClick = (e: React.MouseEvent<HTMLAnchorElement>, uri: string) => {
    e.preventDefault();
    openBrowser(uri);
  };

  if (message.type === 'summary') {
    return (
      <div className={`flex items-start gap-4 p-4 border-t border-b border-dashed border-white/10 bg-black/10 my-4 ${densityClasses[uiDensity]}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/20`}>
          <BookTextIcon className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-grow pt-1 overflow-x-auto">
          <h3 className="font-semibold text-amber-300 mb-1">Conversation Summary</h3>
          <div className="prose prose-invert prose-sm max-w-none prose-p:text-[var(--text-secondary)]">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-4 ${isModel ? 'bg-white/5' : ''} ${densityClasses[uiDensity]}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isModel ? 'bg-cyan-500/20' : 'bg-indigo-500/20'}`}>
        {isModel ? <BotIcon className="w-5 h-5 text-[var(--accent-primary)]" /> : <UserIcon className="w-5 h-5 text-[var(--text-secondary)]" />}
      </div>
      <div className="flex-grow pt-1 overflow-x-auto">
        <div className="prose prose-invert prose-sm max-w-none prose-p:text-[var(--text-primary)] prose-headings:text-white prose-strong:text-white">
          {message.type !== 'image' && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{ code: CodeBlock }}
            >
              {message.text + (isModel && isLoading ? '​<span class="blinking-cursor">|</span>' : '')}
            </ReactMarkdown>
          )}
        </div>
        {message.image && !message.type && ( // Show user-uploaded images, but not AI-generated ones here
          <div className="mt-2">
            <img src={message.image} alt="user upload" className="max-w-xs rounded-lg" />
          </div>
        )}
         {message.type === 'image' && message.image && (
            <div className="mt-2 space-y-2">
                <p className="text-sm text-[var(--text-secondary)] italic">{message.text}</p>
                 <button
                    onClick={() => {
                        const imageRecord = generatedImages.find(img => img.url === message.image);
                        if (imageRecord) {
                            openImagePreview(imageRecord);
                        } else {
                            openImagePreview({
                                id: `temp-${Date.now()}`,
                                prompt: message.text,
                                url: message.image!,
                                timestamp: Date.now()
                            });
                        }
                    }}
                    className="block w-full max-w-md group/img relative rounded-lg overflow-hidden border border-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] focus:ring-[var(--accent-primary)]"
                >
                    <img src={message.image} alt={message.text} className="w-full" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-bold text-sm">Click to Preview & Edit</p>
                    </div>
                </button>
            </div>
        )}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Sources:</h4>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation, index) => (
                <a
                  key={index}
                  href={citation.uri}
                  onClick={(e) => handleCitationClick(e, citation.uri)}
                  className="text-xs bg-white/5 hover:bg-white/10 text-[var(--accent-primary)] px-2 py-1 rounded-md truncate max-w-xs cursor-pointer"
                >
                  {citation.title || citation.uri}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      {isModel && (
         <div className="flex-shrink-0">
            <button onClick={handleTextToSpeech} className="p-1 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-opacity">
                <Volume2Icon className="w-4 h-4" />
            </button>
         </div>
      )}
    </div>
  );
};

export default ChatMessage;