import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { BookTextIcon, CopyIcon, CheckIcon } from '../components/icons/Icons';
import { useAppContext } from '../contexts/AppContext';

type Action = 'summarize' | 'rewrite' | 'professional' | 'casual';

const ContentLab: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<Action>('summarize');
    const [copied, setCopied] = useState(false);
    const { theme } = useAppContext();

    const handleAction = async (action: Action) => {
        if (!inputText || isLoading) return;
        setIsLoading(true);
        setOutputText('');
        setActiveAction(action);
        
        const actionPrompts: Record<Action, string> = {
            summarize: 'Provide a concise summary of the following text:',
            rewrite: 'Rewrite the following text in a clearer and more engaging way:',
            professional: 'Rewrite the following text in a professional and formal tone:',
            casual: 'Rewrite the following text in a casual and friendly tone:',
        };
        
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${actionPrompts[action]}\n\n---\n\n${inputText}`,
            });
            
            setOutputText(response.text);

        } catch (error) {
            console.error(error);
            setOutputText('Sorry, an error occurred while processing your request.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(outputText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const ActionButton: React.FC<{ action: Action, label: string }> = ({ action, label }) => (
        <button
            onClick={() => handleAction(action)}
            disabled={isLoading || !inputText}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                activeAction === action && isLoading === false
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-white/5 text-[var(--text-primary)] hover:bg-white/10'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
            <header className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <BookTextIcon className="w-8 h-8 text-[var(--accent-primary)]" />
                    <div>
                        <h1 className="text-lg font-semibold text-white">Content Lab</h1>
                        <p className="text-xs text-[var(--text-secondary)]">Summarize, rewrite, or change the tone of your text.</p>
                    </div>
                </div>
            </header>
            <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
                {/* Input Panel */}
                <div className="flex flex-col bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your text here..."
                        className="w-full h-full bg-transparent p-4 text-[var(--text-primary)] placeholder-gray-500 resize-none focus:outline-none flex-1"
                    />
                    <div className="p-2 border-t border-white/10 flex flex-wrap gap-2 justify-center">
                        <ActionButton action="summarize" label="Summarize" />
                        <ActionButton action="rewrite" label="Rewrite" />
                        <ActionButton action="professional" label="Make Professional" />
                        <ActionButton action="casual" label="Make Casual" />
                    </div>
                </div>
                
                {/* Output Panel */}
                <div className="flex flex-col bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10">
                    <div className="flex-1 p-4 overflow-y-auto relative">
                        {isLoading ? (
                             <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div>
                            </div>
                        ) : outputText ? (
                            <>
                            <button onClick={handleCopy} className="absolute top-2 right-2 p-2 rounded-lg bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors">
                                {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                            </button>
                            <div className="prose prose-invert prose-sm max-w-none prose-p:text-[var(--text-primary)]">
                               {outputText.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-500">
                                Your processed text will appear here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentLab;