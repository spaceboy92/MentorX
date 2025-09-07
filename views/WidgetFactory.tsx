import React, { useState } from 'react';
import { LayoutTemplateIcon, PinIcon, SparklesIcon, RotateCcwIcon } from '../components/icons/Icons';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import type { Message, Widget } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { useAppContext } from '../contexts/AppContext';
// FIX: Changed import from PERSONAS to DEFAULT_PERSONAS as PERSONAS is not an exported member.
import { DEFAULT_PERSONAS } from '../constants';

const WidgetFactory: React.FC = () => {
  const { pinnedWidgets, pinWidget, unpinWidget } = useAppContext();
  const [activeWidget, setActiveWidget] = useState<Widget | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [widgetVariations, setWidgetVariations] = useState<Widget[]>([]);
  // FIX: Added state to control the prompt input value, which is a required prop for PromptInput.
  const [prompt, setPrompt] = useState('');

  const isWidgetPinned = activeWidget ? pinnedWidgets.some(w => w.id === activeWidget.id) : false;

  const handleGenerateVariations = async () => {
    if (!activeWidget || messages.length === 0) return;
    setIsLoading(true);
    setWidgetVariations([]);
    
    // Find the first user message to use as the base prompt
    const basePrompt = messages.find(m => m.role === 'user')?.text;
    if (!basePrompt) {
        setIsLoading(false);
        return;
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the prompt "${basePrompt}", generate 3 distinct design variations of the UI component. Include animations and interactivity.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        variations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        const parsed = JSON.parse(response.text);
        const variations: Widget[] = parsed.variations.map((html: string, index: number) => ({
            id: `var-${activeWidget.id}-${index}`,
            name: `${activeWidget.name} - Var ${index + 1}`,
            html: html,
        }));
        setWidgetVariations(variations);

    } catch (error) {
        console.error("Failed to generate variations:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSend = async (prompt: string) => {
    setIsLoading(true);
    setWidgetVariations([]);
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: prompt };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    
    try {
        if (!process.env.API_KEY) throw new Error("API_KEY not set");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const persona = DEFAULT_PERSONAS.find(p => p.id === 'widget-factory')!;
        
        const history = currentMessages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        if (activeWidget && messages.length > 1) { // Refine existing
             history.splice(0, 0, { role: 'model', parts: [{ text: activeWidget.html }]});
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: history,
            config: { systemInstruction: persona.systemInstruction },
        });
        
        const htmlContent = response.text.trim();
        const newWidget = {
            id: activeWidget?.id || `widget-${Date.now()}`,
            name: prompt.substring(0, 30),
            html: htmlContent
        };
        setActiveWidget(newWidget);
        
        const modelHtmlMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', text: htmlContent };
        setMessages(prev => [...prev, modelHtmlMessage]);

    } catch (error) {
        console.error("Widget generation failed:", error);
        setMessages(prev => [...prev, {id: (Date.now()+1).toString(), role: 'model', text: `Sorry, I couldn't generate that widget.`}]);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handlePinToggle = () => {
      if (!activeWidget) return;
      if (isWidgetPinned) {
          unpinWidget(activeWidget.id);
      } else {
          pinWidget(activeWidget);
      }
  }

  const handleClear = () => {
    setActiveWidget(null);
    setMessages([]);
    setWidgetVariations([]);
  }

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      {/* Live Renderer */}
      <div className="flex-1 flex flex-col p-8 bg-grid-pattern overflow-auto relative">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button onClick={handleClear} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-full bg-white/10 text-gray-300 hover:bg-white/20 transition-all disabled:opacity-50">
                <RotateCcwIcon className="w-4 h-4"/>
                <span>Clear</span>
            </button>
            {activeWidget && (
                 <button onClick={handleGenerateVariations} disabled={isLoading} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-full bg-white/10 text-gray-300 hover:bg-white/20 transition-all disabled:opacity-50">
                    <SparklesIcon className="w-4 h-4"/>
                    <span>Generate Variations</span>
                </button>
            )}
            {activeWidget && (
                <button onClick={handlePinToggle} className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-all ${isWidgetPinned ? 'bg-amber-500/80 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                    <PinIcon className="w-4 h-4"/>
                    <span>{isWidgetPinned ? 'Pinned' : 'Pin'}</span>
                </button>
            )}
        </div>
        
        <div className="flex-1 flex items-center justify-center">
            {activeWidget ? (
              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: activeWidget.html }} />
            ) : (
              <div className="text-center text-gray-500">
                <LayoutTemplateIcon className="w-24 h-24 mx-auto mb-4" />
                <p>Your generated widget will appear here.</p>
                <p className="text-xs mt-2">Try asking for "an animated login form" or "a pricing table with a toggle".</p>
              </div>
            )}
        </div>
        
        {widgetVariations.length > 0 && (
            <div className="flex-shrink-0 mt-4">
                <h3 className="text-center font-semibold text-white mb-2">Variations</h3>
                <div className="flex gap-4 justify-center p-4 bg-black/20 rounded-lg">
                    {widgetVariations.map(v => (
                        <div key={v.id} onClick={() => setActiveWidget(v)} className="w-48 h-32 bg-white rounded-md overflow-hidden cursor-pointer border-2 border-transparent hover:border-[var(--accent-primary)] transition-all">
                             <div className="transform scale-[0.2] origin-top-left w-[960px] h-[640px]">
                                <div dangerouslySetInnerHTML={{ __html: v.html }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* AI Chat Panel */}
      <div className="w-96 bg-[var(--bg-secondary)] border-l border-white/10 flex flex-col">
        <header className="p-3 border-b border-white/10 flex items-center gap-2 shrink-0">
            <LayoutTemplateIcon className="w-6 h-6 text-[var(--accent-primary)]" />
            <h2 className="text-lg font-semibold text-white">Widget Prototyping</h2>
        </header>
        <div className="flex-1 overflow-y-auto">
            {messages.length === 0 && (
                <div className="p-4 text-xs text-gray-400 bg-black/20">
                    <p>Describe the UI component you want to build. The AI can create animations and add javascript for interactivity!</p>
                </div>
            )}
            {messages.filter(m => !m.text.trim().startsWith('<')).map(msg => <ChatMessage key={msg.id} message={msg} />)}
        </div>
        {/* FIX: Passed required `prompt` and `onPromptChange` props to the PromptInput component to resolve the type error. */}
        <PromptInput prompt={prompt} onPromptChange={setPrompt} onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default WidgetFactory;
