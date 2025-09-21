import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Resizable } from 're-resizable';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// FIX: Imported XIcon to resolve 'Cannot find name' error.
import { CpuIcon, FilePlusIcon, Trash2Icon, FolderIcon, FolderOpenIcon, FileIcon, PlayIcon, DownloadIcon, WrenchIcon, LightbulbIcon, ZapIcon, InfoIcon, AlertTriangleIcon, XCircleIcon, TelescopeIcon, CodeIcon, MenuIcon, BotIcon, XIcon } from '../components/icons/Icons';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import type { FileSystemItem, VirtualFile, VirtualFolder, Message } from '../types';
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_PERSONAS, LOADING_MESSAGES } from '../constants';
import JSZip from 'jszip';
import { useWindowSize } from '../hooks/useWindowSize';
import { useAppContext } from '../contexts/AppContext';

const CodeEditor: React.FC<{
    value: string;
    onChange: (value: string) => void;
    language: string;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    isLiteMode: boolean;
}> = ({ value, onChange, language, textareaRef, isLiteMode }) => {
    const preRef = useRef<HTMLPreElement>(null);

    const handleScroll = () => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };
    
    const PreTagWithRef = useCallback((props: any) => {
        return <pre ref={preRef} {...props} />;
    }, []);

    return (
        <div className="relative flex-1 bg-[#1e293b] h-full rgb-border-glow rounded-md">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                className={`absolute inset-0 bg-transparent p-4 font-mono focus:outline-none resize-none leading-relaxed tracking-wide caret-white w-full h-full ${isLiteMode ? '!text-white' : 'text-transparent'}`}
                placeholder="Select a file or create a new one to start coding..."
                spellCheck="false"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
            />
            {!isLiteMode && (
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, padding: '1rem', width: '100%', height: '100%', overflow: 'auto', backgroundColor: 'transparent' }}
                    codeTagProps={{ style: { fontFamily: 'monospace', lineHeight: 'inherit', letterSpacing: 'inherit' } }}
                    PreTag={PreTagWithRef}
                >
                    {value + '\n'}
                </SyntaxHighlighter>
            )}
        </div>
    );
};

const findItemByPath = (items: FileSystemItem[], path: string): FileSystemItem | undefined => {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.type === 'folder') {
      const found = findItemByPath(item.children, path);
      if (found) return found;
    }
  }
  return undefined;
};

interface AiOperation {
    action: "CREATE_FILE" | "UPDATE_FILE" | "DELETE_FILE" | "CREATE_FOLDER" | "ADD_PACKAGE" | "REMOVE_PACKAGE";
    path?: string;
    content?: string;
    package?: string;
}
interface AiResponse {
    thought: string;
    operations: AiOperation[];
}


// Sub-components extracted to prevent re-rendering issues
const FileTreeItem: React.FC<{item: FileSystemItem, level: number, activeFile: string, setActiveFile: (path: string) => void, isMobile: boolean, setMobileView: (view: any) => void}> = ({ item, level, activeFile, setActiveFile, isMobile, setMobileView }) => {
    const [isOpen, setIsOpen] = useState(item.type === 'folder');
    const handleItemClick = () => {
        if (item.type === 'folder') setIsOpen(!isOpen);
        else {
          setActiveFile(item.path);
          if (isMobile) setMobileView('editor');
        }
    };
    const Icon = item.type === 'folder' ? (isOpen ? FolderOpenIcon : FolderIcon) : FileIcon;
    return (
        <div>
            <button
                onClick={handleItemClick}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                className={`w-full text-left flex items-center gap-2 py-1 text-sm rounded transition-colors ${activeFile === item.path ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
            </button>
            {item.type === 'folder' && isOpen && (
                <div className="space-y-0.5">
                    {item.children.map(child => <FileTreeItem key={child.path} item={child} level={level + 1} activeFile={activeFile} setActiveFile={setActiveFile} isMobile={isMobile} setMobileView={setMobileView}/>)}
                </div>
            )}
        </div>
    );
};

const FilePanel = memo<{files: FileSystemItem[], packages: string[], handleExportZip: () => void, activeFile: string, setActiveFile: (path: string) => void, isMobile: boolean, setMobileView: (view: any) => void}>(({ files, packages, handleExportZip, activeFile, setActiveFile, isMobile, setMobileView }) => (
    <div className="w-full md:w-56 bg-[var(--bg-secondary)] p-2 flex flex-col border-r border-white/10 h-full">
        <div className='flex justify-between items-center p-2'>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Files</h3>
            <div className='flex items-center gap-1'>
                 <button onClick={handleExportZip} title="Export project as .zip" className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"><DownloadIcon className="w-5 h-5" /></button>
                <button onClick={() => alert('Folder creation via UI coming soon!')} title="Create new folder" className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"><FolderIcon className="w-5 h-5" /></button>
                <button onClick={() => alert('File creation via UI coming soon!')} title="Create new file" className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"><FilePlusIcon className="w-5 h-5" /></button>
            </div>
        </div>
        <div className='overflow-y-auto space-y-0.5 mt-1 flex-1'>
            {files.map(item => <FileTreeItem key={item.path} item={item} level={0} activeFile={activeFile} setActiveFile={setActiveFile} isMobile={isMobile} setMobileView={setMobileView} />)}
             {packages.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider p-2">Packages</h3>
                    <div className="space-y-0.5">
                        {packages.map(pkg => (
                            <div key={pkg} className="flex items-center gap-2 py-1 text-sm text-gray-400 pl-2">
                                <ZapIcon className="w-4 h-4 flex-shrink-0 text-yellow-500" />
                                <span className="truncate">{pkg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
  ));

const EditorPanel = memo<{
  currentFile: FileSystemItem | undefined,
  updateFileContent: (path: string, content: string) => void,
  activeFile: string,
  editorRef: React.RefObject<HTMLTextAreaElement>,
  isLiteMode: boolean,
  handleRun: () => void,
  handleSuggestImprovements: () => void,
  handleCodeAction: (action: 'refactor' | 'explain' | 'optimize') => void,
  handleDebugError: () => void,
  selection: { text: string },
  isLoading: boolean,
  isMobile: boolean,
  activeTab: 'preview' | 'console',
  setActiveTab: (tab: 'preview' | 'console') => void,
  previewKey: number,
  generatePreviewSrcDoc: () => string,
  consoleMessages: any[],
  setConsoleMessages: React.Dispatch<React.SetStateAction<any[]>>,
  runtimeError: { message: string, stack?: string } | null,
  setRuntimeError: React.Dispatch<React.SetStateAction<{ message: string; stack?: string } | null>>,
}>(({ currentFile, updateFileContent, activeFile, editorRef, isLiteMode, handleRun, handleSuggestImprovements, handleCodeAction, handleDebugError, selection, isLoading, isMobile, activeTab, setActiveTab, previewKey, generatePreviewSrcDoc, consoleMessages, setConsoleMessages, runtimeError, setRuntimeError }) => (
    <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="flex items-center justify-between bg-black/20 px-4 py-1.5 border-b border-white/10">
            <span className="text-sm text-gray-400 font-mono truncate">{currentFile?.path || 'No file selected'}</span>
             <div className="hidden md:flex items-center gap-2">
                <button onClick={handleSuggestImprovements} disabled={currentFile?.type !== 'file' || isLoading} title="Suggest Improvements" className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"><TelescopeIcon className="w-4 h-4" /> Suggest</button>
                <button onClick={() => handleCodeAction('refactor')} disabled={!selection.text || isLoading} title="Refactor Selection" className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"><WrenchIcon className="w-4 h-4" /> Refactor</button>
                <button onClick={() => handleCodeAction('explain')} disabled={!selection.text || isLoading} title="Explain Selection" className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"><LightbulbIcon className="w-4 h-4" /> Explain</button>
                 <button onClick={() => handleCodeAction('optimize')} disabled={!selection.text || isLoading} title="Optimize Selection" className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"><ZapIcon className="w-4 h-4" /> Optimize</button>
            </div>
            <button onClick={handleRun} className="flex items-center gap-2 px-3 py-1 text-sm rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 transition-colors"><PlayIcon className="w-4 h-4"/> Run</button>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <CodeEditor 
            textareaRef={editorRef}
            value={currentFile?.type === 'file' ? currentFile.content : ''}
            onChange={(value) => updateFileContent(activeFile, value)}
            language={currentFile?.name.split('.').pop() || 'text'}
            isLiteMode={isLiteMode}
          />
        </div>
        { isMobile ? (
          <div className="h-2/5 flex flex-col">
              <div className="bg-[#1e293b] h-full w-full flex flex-col">
                <div className="flex items-center justify-between bg-black/20 border-b border-white/10 pr-2">
                    <div className="flex">
                        <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 text-sm ${activeTab === 'preview' ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:bg-white/5'}`}>Live Preview</button>
                        <button onClick={() => setActiveTab('console')} className={`px-4 py-2 text-sm ${activeTab === 'console' ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:bg-white/5'}`}>Console</button>
                    </div>
                     {activeTab === 'console' && <button onClick={() => setConsoleMessages([])} className="text-xs text-gray-400 hover:text-white hover:bg-white/10 px-2 py-1 rounded">Clear</button>}
                </div>
                 <div className="relative w-full h-full">
                    {activeTab === 'preview' ? (
                        <iframe key={previewKey} srcDoc={generatePreviewSrcDoc()} title="Live Preview" sandbox="allow-scripts allow-modals allow-forms" className="w-full h-full bg-white"/>
                    ) : (
                        <div className="w-full h-full p-2 font-mono text-sm overflow-y-auto">
                            {consoleMessages.map((msg, i) => {
                               const Icon = msg.level === 'error' ? XCircleIcon : msg.level === 'warn' ? AlertTriangleIcon : InfoIcon;
                               const color = msg.level === 'error' ? 'text-red-400' : msg.level === 'warn' ? 'text-yellow-400' : 'text-gray-300';
                               return (
                                   <div key={i} className={`flex items-start gap-2 py-1 border-b border-white/5 ${color}`}>
                                       <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                       <pre className="whitespace-pre-wrap flex-1">{msg.message}</pre>
                                   </div>
                               )
                            })}
                        </div>
                    )}
                    {runtimeError && activeTab === 'preview' && (
                        <div className="absolute inset-0 bg-gray-800/95 text-white p-4 font-mono text-sm overflow-auto">
                           <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold text-red-400">Runtime Error</h3>
                             <button onClick={() => setRuntimeError(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20"><XIcon className="w-4 h-4"/></button>
                           </div>
                           <p className="text-red-400 mb-2">{runtimeError.message}</p>
                           {runtimeError.stack && <pre className="text-gray-400 text-xs whitespace-pre-wrap">{runtimeError.stack}</pre>}
                           <button onClick={handleDebugError} disabled={isLoading} className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 bg-white/5 text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transform active:scale-95 disabled:opacity-50">
                                <ZapIcon className="w-4 h-4"/>
                                Ask AI to Fix
                            </button>
                        </div>
                    )}
                </div>
            </div>
          </div>
        ) : (
          <Resizable
              defaultSize={{ width: '100%', height: '40%' }}
              minHeight="10%"
              maxHeight="80%"
              enable={{ top: true }}
              className="border-t-2 border-[var(--accent-primary)]/30"
              handleClasses={{top: "w-full h-2 top-0 cursor-row-resize flex justify-center items-center after:content-[''] after:w-10 after:h-1 after:bg-white/20 after:rounded-full"}}
          >
              <div className="bg-[#1e293b] h-full w-full flex flex-col">
                  <div className="flex items-center justify-between bg-black/20 border-b border-white/10 pr-2">
                      <div className="flex">
                          <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 text-sm ${activeTab === 'preview' ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:bg-white/5'}`}>Live Preview</button>
                          <button onClick={() => setActiveTab('console')} className={`px-4 py-2 text-sm ${activeTab === 'console' ? 'bg-[#1e293b] text-white' : 'text-gray-400 hover:bg-white/5'}`}>Console</button>
                      </div>
                       {activeTab === 'console' && <button onClick={() => setConsoleMessages([])} className="text-xs text-gray-400 hover:text-white hover:bg-white/10 px-2 py-1 rounded">Clear</button>}
                  </div>
                  <div className="relative w-full h-full">
                    {activeTab === 'preview' ? (
                        <iframe key={previewKey} srcDoc={generatePreviewSrcDoc()} title="Live Preview" sandbox="allow-scripts allow-modals allow-forms" className="w-full h-full bg-white"/>
                    ) : (
                        <div className="w-full h-full p-2 font-mono text-sm overflow-y-auto">
                            {consoleMessages.map((msg, i) => {
                               const Icon = msg.level === 'error' ? XCircleIcon : msg.level === 'warn' ? AlertTriangleIcon : InfoIcon;
                               const color = msg.level === 'error' ? 'text-red-400' : msg.level === 'warn' ? 'text-yellow-400' : 'text-gray-300';
                               return (
                                   <div key={i} className={`flex items-start gap-2 py-1 border-b border-white/5 ${color}`}>
                                       <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                       <pre className="whitespace-pre-wrap flex-1">{msg.message}</pre>
                                   </div>
                               )
                            })}
                        </div>
                    )}
                    {runtimeError && activeTab === 'preview' && (
                        <div className="absolute inset-0 bg-gray-800/95 text-white p-4 font-mono text-sm overflow-auto z-10">
                           <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold text-red-400">Runtime Error</h3>
                             <button onClick={() => setRuntimeError(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20"><XIcon className="w-4 h-4"/></button>
                           </div>
                           <p className="text-red-400 mb-2">{runtimeError.message}</p>
                           {runtimeError.stack && <pre className="text-gray-400 text-xs whitespace-pre-wrap">{runtimeError.stack}</pre>}
                           <button onClick={handleDebugError} disabled={isLoading} className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 bg-white/5 text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transform active:scale-95 disabled:opacity-50">
                                <ZapIcon className="w-4 h-4"/>
                                Ask AI to Fix
                            </button>
                        </div>
                    )}
                  </div>
              </div>
          </Resizable>
        )}
    </div>
));

const ChatPanel = memo<{
  messages: Message[],
  prompt: string,
  setPrompt: (prompt: string) => void,
  handleSend: (prompt: string) => void,
  isLoading: boolean,
  loadingMessage: string
}>(({ messages, prompt, setPrompt, handleSend, isLoading, loadingMessage }) => (
    <div className="w-full md:w-96 bg-[var(--bg-secondary)] border-l border-white/10 flex flex-col h-full">
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
        </div>
        <PromptInput prompt={prompt} onPromptChange={setPrompt} onSend={() => handleSend(prompt)} isLoading={isLoading} />
    </div>
));

const MobileNavButton: React.FC<{
  label: string;
  icon: React.ComponentType<{className?: string}>;
  view: 'editor' | 'files' | 'chat';
  activeView: 'editor' | 'files' | 'chat';
  onClick: (view: 'editor' | 'files' | 'chat') => void;
}> = ({ label, icon: Icon, view, activeView, onClick }) => (
  <button onClick={() => onClick(view)} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeView === view ? 'text-[var(--accent-primary)]' : 'text-gray-400'}`}>
      <Icon className="w-6 h-6"/>
      <span className="text-xs">{label}</span>
  </button>
);


const CodeCanvas: React.FC = () => {
  const { 
      activeSessionFileSystem: files,
      updateActiveSessionFileSystem: setFiles,
      activeSessionMessages: messages,
      updateActiveSessionMessages: setMessages,
      activeSessionPackages: packages,
      updateActiveSessionPackages: setPackages,
      toggleLeftSidebar, 
      isLiteMode, 
      setGlobalLoading 
  } = useAppContext();

  // Project state
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [previewKey, setPreviewKey] = useState(0);
  
  // Chat state
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  // UI State
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' });
  const [activeTab, setActiveTab] = useState<'preview' | 'console'>('preview');
  const [consoleMessages, setConsoleMessages] = useState<any[]>([]);
  const [runtimeError, setRuntimeError] = useState<{ message: string; stack?: string } | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [mobileView, setMobileView] = useState<'editor' | 'files' | 'chat'>('editor');
  
  const { width } = useWindowSize();
  const isMobile = width < 768;
  
  // Initial Load
  useEffect(() => {
    setGlobalLoading(false);
    return () => setGlobalLoading(false);
  }, [setGlobalLoading]);

  // Loading message animation
  useEffect(() => {
    if (isLoading) {
        const interval = setInterval(() => {
            setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
        }, 2000);
        return () => clearInterval(interval);
    }
  }, [isLoading]);


  const currentFile = findItemByPath(files, activeFile);

  const updateFileContent = (path: string, newContent: string) => {
    const updateRecursively = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.map(item => {
            if (item.path === path && item.type === 'file') return { ...item, content: newContent };
            if (item.type === 'folder') return { ...item, children: updateRecursively(item.children) };
            return item;
        });
    };
    setFiles(updateRecursively);
  };
  
  const flattenFiles = (items: FileSystemItem[]): VirtualFile[] => {
      let flat: VirtualFile[] = [];
      for (const item of items) {
          if (item.type === 'file') flat.push(item);
          else flat = flat.concat(flattenFiles(item.children));
      }
      return flat;
  }
  
  const consoleLogScript = `
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const post = (level, args) => window.parent.postMessage({ type: 'console', level, message: args.map(arg => {
        try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
    }) }, '*');

    console.log = (...args) => { post('log', args); originalLog.apply(console, args); };
    console.error = (...args) => { post('error', args); originalError.apply(console, args); };
    console.warn = (...args) => { post('warn', args); originalWarn.apply(console, args); };
    
    window.addEventListener('error', (event) => {
       window.parent.postMessage({ 
         type: 'runtime-error', 
         message: event.message,
         stack: event.error ? event.error.stack : 'No stack available.'
       }, '*');
       console.error(event.message, event.filename, event.lineno);
    });
  `;
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'console') {
            setConsoleMessages(prev => [...prev, { level: event.data.level, message: event.data.message.join(' ') }]);
        } else if (event.data.type === 'runtime-error') {
            setRuntimeError({ message: event.data.message, stack: event.data.stack });
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const generatePreviewSrcDoc = useCallback(() => {
    const allFiles = flattenFiles(files);
    const htmlFile = allFiles.find(f => f.path === 'index.html');
    if (!htmlFile) return '<body>No index.html file found to preview.</body>';

    let doc = htmlFile.content;

    // Inject packages
    const packageScripts = packages.map(pkg => `    <script src="https://cdn.jsdelivr.net/npm/${pkg}"></script>`).join('\n');
    if (doc.includes('</head>')) {
        doc = doc.replace('</head>', `${packageScripts}\n</head>`);
    } else {
        doc += packageScripts;
    }

    const cssLinksRegex = /<link\s+.*?href="([^"]+\.css)"[^>]*>/g;
    doc = doc.replace(cssLinksRegex, (match, href) => {
        const cssFile = allFiles.find(f => f.path === href);
        return cssFile ? `<style>\n${cssFile.content}\n</style>` : match;
    });

    const jsLinksRegex = /<script\s+.*?src="([^"]+\.js)"[^>]*><\/script>/g;
    doc = doc.replace(jsLinksRegex, (match, src) => {
        const jsFile = allFiles.find(f => f.path === src);
        return jsFile ? `<script>\n${jsFile.content}\n</script>` : match;
    });

    if (doc.includes('</body>')) {
        doc = doc.replace('</body>', `<script>${consoleLogScript}</script>\n</body>`);
    } else {
        doc += `<script>${consoleLogScript}</script>`;
    }

    return doc;
  }, [files, packages, consoleLogScript]);

  const handleRun = () => {
    setRuntimeError(null);
    setConsoleMessages([]);
    setPreviewKey(k => k + 1);
  };
  
  const handleExportZip = async () => {
    const zip = new JSZip();
    const addItemsToZip = (items: FileSystemItem[], currentFolder: JSZip) => {
        items.forEach(item => {
            if (item.type === 'file') {
                currentFolder.file(item.name, item.content);
            } else if (item.type === 'folder') {
                const newFolder = currentFolder.folder(item.name);
                if (newFolder) addItemsToZip(item.children, newFolder);
            }
        });
    };
    addItemsToZip(files, zip);
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'mentorx-project.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendAndProcessMessage = useCallback(async (promptText: string) => {
    const userMessage: Message = { id: `user-action-${Date.now()}`, role: 'user', text: promptText };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const persona = DEFAULT_PERSONAS.find(p => p.id === 'code-sandbox')!;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptText,
            config: { systemInstruction: persona.systemInstruction }
        });

        const modelMessage: Message = { id: `model-action-${Date.now()}`, role: 'model', text: response.text };
        setMessages(prev => [...prev, modelMessage]);
    } catch (e) {
        console.error(e);
        const errorMsg = { id: `error-${Date.now()}`, role: 'model' as const, text: `Sorry, I couldn't process that action.` };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  }, [setMessages]);

  const handleCodeAction = useCallback(async (action: 'refactor' | 'explain' | 'optimize') => {
    if (!selection.text || isLoading) return;
    const actionPrompt = `You are an expert software engineer. Look at this code snippet from the file named '${activeFile}':
\`\`\`
${selection.text}
\`\`\`
Your task is to **${action}** this code. 
- If explaining, be clear and concise.
- If refactoring or optimizing, provide only the updated code block. Do not include explanations unless the original code was empty.`;
    
    sendAndProcessMessage(actionPrompt);
  }, [selection.text, isLoading, activeFile, sendAndProcessMessage]);

  const handleSuggestImprovements = useCallback(async () => {
    const file = findItemByPath(files, activeFile);
    if (file?.type !== 'file' || isLoading) return;

    const suggestionPrompt = `As an expert software engineer, review the following code from the file "${activeFile}" and provide suggestions for improvement. Focus on best practices, performance, and readability. Respond in Markdown format.\n\n**Code:**\n\`\`\`${file.name.split('.').pop()}\n${file.content}\n\`\`\``;
    
    sendAndProcessMessage(suggestionPrompt);
  }, [activeFile, files, isLoading, sendAndProcessMessage]);


  const getFileTreeString = (items: FileSystemItem[], indent = ''): string => {
      return items.map(item => {
          if (item.type === 'folder') {
              return `${indent}- ${item.name}/\n${getFileTreeString(item.children, indent + '  ')}`;
          }
          return `${indent}- ${item.name}`;
      }).join('\n');
  };

  const processAiCommands = (response: AiResponse) => {
    if (response.thought) {
        const thoughtMessage: Message = { id: `model-thought-${Date.now()}`, role: 'model', text: response.thought };
        setMessages(prev => [...prev, thoughtMessage]);
    }

    for (const op of response.operations) {
        if (op.action === 'ADD_PACKAGE' && op.package) {
            setPackages(current => [...new Set([...current, op.package!])]);
        } else if (op.action === 'REMOVE_PACKAGE' && op.package) {
            setPackages(current => current.filter(p => p !== op.package));
        }
    }

    setFiles(currentFiles => {
        let newFilesState = JSON.parse(JSON.stringify(currentFiles));
        
        for (const op of response.operations) {
            if (op.action === 'CREATE_FILE' || op.action === 'CREATE_FOLDER') {
                const newItem: FileSystemItem = op.action === 'CREATE_FILE'
                    ? { type: 'file', name: op.path!.split('/').pop()!, path: op.path!, content: op.content || '' }
                    : { type: 'folder', name: op.path!.split('/').pop()!, path: op.path!, children: [] };
                newFilesState.push(newItem); // Simplified: assumes root creation for now
            } else if (op.action === 'UPDATE_FILE') {
                 const updateRecursively = (items: FileSystemItem[]): FileSystemItem[] => items.map(item => 
                    item.path === op.path && item.type === 'file' ? { ...item, content: op.content! } :
                    item.type === 'folder' ? { ...item, children: updateRecursively(item.children) } : item
                );
                newFilesState = updateRecursively(newFilesState);
            } else if (op.action === 'DELETE_FILE') {
                 const deleteRecursively = (items: FileSystemItem[]): FileSystemItem[] => items
                    .filter(i => i.path !== op.path)
                    .map(item => item.type === 'folder' ? { ...item, children: deleteRecursively(item.children) } : item);
                newFilesState = deleteRecursively(newFilesState);
            }
        }
        return newFilesState;
    });
  };

  const handleSend = useCallback(async (currentPrompt: string) => {
    if (!currentPrompt.trim()) return;
    setIsLoading(true);
    setPrompt('');
    
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: currentPrompt };
    setMessages(prev => [...prev, userMessage]);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const persona = DEFAULT_PERSONAS.find(p => p.id === 'code-sandbox')!;
        
        const allFiles = flattenFiles(files);
        const fileContents = allFiles.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n');
        
        const fullPrompt = `The current project state is as follows:
Packages: [${packages.join(', ')}]
File Contents:
${fileContents}

---
User Request: ${currentPrompt}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { systemInstruction: persona.systemInstruction, responseMimeType: 'application/json' }
        });
        
        const jsonResponse = JSON.parse(response.text) as AiResponse;
        processAiCommands(jsonResponse);

    } catch(e) {
        console.error(e);
        const errorMsg = { id: `error-${Date.now()}`, role: 'model' as const, text: `Sorry, I couldn't process that request. The response might not be valid JSON.` };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  }, [files, packages, setMessages, setFiles, setPackages]);
  
  const handleDebugError = useCallback(async () => {
    if (!runtimeError || isLoading) return;
    
    const debugPrompt = `I encountered a JavaScript runtime error in my web application.
Error Message: "${runtimeError.message}"
Stack Trace:
${runtimeError.stack}

Here is the current file structure of the project:
${getFileTreeString(files)}

Here are the contents of the files:
${flattenFiles(files).map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n')}

Please analyze the error and the code, and provide the necessary operations to fix the bug.`;

    handleSend(debugPrompt);
    setRuntimeError(null);

  }, [runtimeError, files, isLoading, handleSend]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = editorRef.current;
      if (editor && document.activeElement === editor) {
        setSelection({
          start: editor.selectionStart,
          end: editor.selectionEnd,
          text: editor.value.substring(editor.selectionStart, editor.selectionEnd),
        });
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    handleRun();
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <header className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={toggleLeftSidebar} className="p-2 rounded-full hover:bg-white/10 lg:hidden">
            <MenuIcon className="w-6 h-6" />
          </button>
          <CpuIcon className="w-8 h-8 text-[var(--accent-primary)]" />
          <div>
            <h1 className="text-lg font-semibold text-white">Universal Compiler</h1>
            <p className="text-xs text-[var(--text-secondary)]">An expert AI engineer that builds and modifies full-stack web projects.</p>
          </div>
        </div>
        <div></div>
      </header>

      <div className="flex flex-1 min-h-0">
        {isMobile ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0">
              {mobileView === 'files' && <FilePanel files={files} packages={packages} handleExportZip={handleExportZip} activeFile={activeFile} setActiveFile={setActiveFile} isMobile={isMobile} setMobileView={setMobileView} />}
              {mobileView === 'editor' && <EditorPanel {...{currentFile, updateFileContent, activeFile, editorRef, isLiteMode, handleRun, handleSuggestImprovements, handleCodeAction, handleDebugError, selection, isLoading, isMobile, activeTab, setActiveTab, previewKey, generatePreviewSrcDoc, consoleMessages, setConsoleMessages, runtimeError, setRuntimeError}} />}
              {mobileView === 'chat' && <ChatPanel messages={messages} prompt={prompt} setPrompt={setPrompt} handleSend={handleSend} isLoading={isLoading} loadingMessage={loadingMessage} />}
            </div>
            <div className="flex justify-around items-center p-1 bg-[var(--bg-secondary)] border-t border-white/10 shrink-0">
              <MobileNavButton label="Files" icon={FileIcon} view="files" activeView={mobileView} onClick={setMobileView} />
              <MobileNavButton label="Editor" icon={CodeIcon} view="editor" activeView={mobileView} onClick={setMobileView} />
              <MobileNavButton label="AI Chat" icon={CpuIcon} view="chat" activeView={mobileView} onClick={setMobileView} />
            </div>
          </div>
        ) : (
          <>
            <FilePanel files={files} packages={packages} handleExportZip={handleExportZip} activeFile={activeFile} setActiveFile={setActiveFile} isMobile={isMobile} setMobileView={setMobileView} />
            <EditorPanel {...{currentFile, updateFileContent, activeFile, editorRef, isLiteMode, handleRun, handleSuggestImprovements, handleCodeAction, handleDebugError, selection, isLoading, isMobile, activeTab, setActiveTab, previewKey, generatePreviewSrcDoc, consoleMessages, setConsoleMessages, runtimeError, setRuntimeError}} />
            <ChatPanel messages={messages} prompt={prompt} setPrompt={setPrompt} handleSend={handleSend} isLoading={isLoading} loadingMessage={loadingMessage} />
          </>
        )}
      </div>
    </div>
  );
};

export default CodeCanvas;