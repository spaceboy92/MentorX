import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Resizable } from 're-resizable';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CpuIcon, FilePlusIcon, Trash2Icon, FolderIcon, FolderOpenIcon, FileIcon, PlayIcon, DownloadIcon, WrenchIcon, LightbulbIcon, ZapIcon, InfoIcon, AlertTriangleIcon, XCircleIcon } from '../components/icons/Icons';
import ChatMessage from '../components/ChatMessage';
import PromptInput from '../components/PromptInput';
import type { FileSystemItem, VirtualFile, VirtualFolder, Message } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Changed import from PERSONAS to DEFAULT_PERSONAS as PERSONAS is not an exported member.
import { DEFAULT_PERSONAS } from '../constants';
import JSZip from 'jszip';

const initialFiles: FileSystemItem[] = [
  { type: 'file', name: 'index.html', path: 'index.html', content: '<h1>Hello, MentorX!</h1>\n<p>Ask the AI to change my style!</p>\n<link rel="stylesheet" href="style.css">\n<script src="script.js"></script>' },
  { type: 'file', name: 'style.css', path: 'style.css', content: 'body { font-family: sans-serif; background: #222; color: #eee; text-align: center; padding-top: 2rem; }' },
  { type: 'file', name: 'script.js', path: 'script.js', content: 'console.log("Welcome to the Universal Compiler!");\n// Try asking the AI to add an interactive button.' },
];

const CodeEditor: React.FC<{
    value: string;
    onChange: (value: string) => void;
    language: string;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
}> = ({ value, onChange, language, textareaRef }) => {
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
        <div className="relative flex-1 bg-[#1e293b]">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                className="absolute inset-0 bg-transparent p-4 text-transparent font-mono focus:outline-none resize-none leading-relaxed tracking-wide caret-white w-full h-full"
                placeholder="Select a file or create a new one to start coding..."
                spellCheck="false"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
            />
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1rem', width: '100%', height: '100%', overflow: 'auto', backgroundColor: 'transparent' }}
                codeTagProps={{ style: { fontFamily: 'monospace', lineHeight: 'inherit', letterSpacing: 'inherit' } }}
                PreTag={PreTagWithRef}
            >
                {value + '\n'}
            </SyntaxHighlighter>
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

const CodeCanvas: React.FC = () => {
  const [files, setFiles] = useState<FileSystemItem[]>(initialFiles);
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' });
  const [activeTab, setActiveTab] = useState<'preview' | 'console'>('preview');
  const [consoleMessages, setConsoleMessages] = useState<any[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  // FIX: Added state to control the prompt input value, which is a required prop for PromptInput.
  const [prompt, setPrompt] = useState('');

  const currentFile = findItemByPath(files, activeFile);

  const updateFileContent = (path: string, newContent: string) => {
    const updateRecursively = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.map(item => {
            if (item.path === path && item.type === 'file') return { ...item, content: newContent };
            if (item.type === 'folder') return { ...item, children: updateRecursively(item.children) };
            return item;
        });
    };
    setFiles(updateRecursively(files));
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
        try { return JSON.stringify(arg, null, 2); } catch (e) { return 'Unserializable Object'; }
    }) }, '*');

    console.log = (...args) => { post('log', args); originalLog.apply(console, args); };
    console.error = (...args) => { post('error', args); originalError.apply(console, args); };
    console.warn = (...args) => { post('warn', args); originalWarn.apply(console, args); };
    
    window.addEventListener('error', (event) => {
       console.error(event.message, event.filename, event.lineno);
    });
  `;
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'console') {
            setConsoleMessages(prev => [...prev, { level: event.data.level, message: event.data.message.join(' ') }]);
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const generatePreviewSrcDoc = () => {
    const allFiles = flattenFiles(files);
    const htmlFile = allFiles.find(f => f.path === 'index.html');
    if (!htmlFile) return '<body>No index.html file found to preview.</body>';

    let doc = htmlFile.content;

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
  };

  const handleRun = () => {
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

  const handleCodeAction = async (action: 'refactor' | 'explain' | 'optimize') => {
    if (!selection.text || isLoading) return;
    setIsLoading(true);
    const actionPrompt = `You are an expert software engineer. Look at this code snippet from the file named '${activeFile}':
\`\`\`
${selection.text}
\`\`\`
Your task is to **${action}** this code. 
- If explaining, be clear and concise.
- If refactoring or optimizing, provide only the updated code block. Do not include explanations unless the original code was empty.`;
    
    const userMessage: Message = { id: `user-action-${Date.now()}`, role: 'user', text: actionPrompt };
    setMessages(prev => [...prev, userMessage]);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: actionPrompt,
            config: { systemInstruction: "You are an expert code assistant. Your response should be just the code or explanation, without any conversational fluff." }
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
  };

  const getFileTreeString = (items: FileSystemItem[], indent = ''): string => {
      return items.map(item => {
          if (item.type === 'folder') {
              return `${indent}- ${item.name}/\n${getFileTreeString(item.children, indent + '  ')}`;
          }
          return `${indent}- ${item.name}`;
      }).join('\n');
  };

  const processAiCommands = (response: any) => {
    if (response.thought) {
        setMessages(prev => [...prev, { id: `model-thought-${Date.now()}`, role: 'model', text: response.thought }]);
    }

    setFiles(currentFiles => {
        let newFilesState = JSON.parse(JSON.stringify(currentFiles));
        
        for (const op of response.operations) {
            if (op.action === 'CREATE_FILE' || op.action === 'CREATE_FOLDER') {
                const newItem: FileSystemItem = op.action === 'CREATE_FILE'
                    ? { type: 'file', name: op.path.split('/').pop(), path: op.path, content: op.content || '' }
                    : { type: 'folder', name: op.path.split('/').pop(), path: op.path, children: [] };
                newFilesState.push(newItem); // Simplified: assumes root creation for now
            } else if (op.action === 'UPDATE_FILE') {
                 const updateRecursively = (items: FileSystemItem[]): FileSystemItem[] => items.map(item => 
                    item.path === op.path && item.type === 'file' ? { ...item, content: op.content } :
                    item.type === 'folder' ? { ...item, children: updateRecursively(item.children) } : item
                );
                newFilesState = updateRecursively(newFilesState);
            } else if (op.action === 'DELETE_FILE') {
                 const deleteRecursively = (items: FileSystemItem[]): FileSystemItem[] => items
                    .filter(i => i.path !== op.path)
                    .map(item => item.type === 'folder' ? { ...item, children: deleteRecursively(item.children) } : item);
                newFilesState = deleteRecursively(newFilesState);
            } else if (op.action === 'ADD_PACKAGE') {
                const cdnUrl = `https://cdn.jsdelivr.net/npm/${op.package}`;
                const scriptTag = `  <script src="${cdnUrl}"></script>\n`;
                const updateHtmlRecursively = (items: FileSystemItem[]): FileSystemItem[] => items.map(item => {
                    if (item.path === 'index.html' && item.type === 'file') {
                        let content = item.content;
                        content = content.includes('</head>') ? content.replace('</head>', `${scriptTag}</head>`) : content + scriptTag;
                        return { ...item, content };
                    }
                    return item.type === 'folder' ? { ...item, children: updateHtmlRecursively(item.children) } : item;
                });
                newFilesState = updateHtmlRecursively(newFilesState);
            }
        }
        return newFilesState;
    });
  };

  const handleSend = async (prompt: string) => {
    setIsLoading(true);
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const persona = DEFAULT_PERSONAS.find(p => p.id === 'code-sandbox')!;
        const fullPrompt = `The current file structure is:\n${getFileTreeString(files)}\n\nUser request: ${prompt}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { systemInstruction: persona.systemInstruction, responseMimeType: 'application/json' }
        });
        
        const jsonResponse = JSON.parse(response.text);
        processAiCommands(jsonResponse);

    } catch(e) {
        console.error(e);
        const errorMsg = { id: `error-${Date.now()}`, role: 'model' as const, text: `Sorry, I couldn't process that request. The response might not be valid JSON.` };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };
  
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
  
  const FileTreeItem: React.FC<{item: FileSystemItem, level: number}> = ({ item, level }) => {
    const [isOpen, setIsOpen] = useState(item.type === 'folder');
    const handleItemClick = () => {
        if (item.type === 'folder') setIsOpen(!isOpen);
        else setActiveFile(item.path);
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
                    {item.children.map(child => <FileTreeItem key={child.path} item={child} level={level + 1} />)}
                </div>
            )}
        </div>
    );
  }

  // FIX: Implemented useEffect hook to call handleRun on initial component mount.
  // This ensures that the live preview and console are populated with the default
  // project files as soon as the Code Canvas is loaded, providing a better user experience
  // by preventing an empty initial state.
  useEffect(() => {
    handleRun();
  }, []);

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <div className="w-56 bg-[var(--bg-secondary)] p-2 flex flex-col border-r border-white/10">
        <div className='flex justify-between items-center p-2'>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Files</h3>
            <div className='flex items-center gap-1'>
                 <button onClick={handleExportZip} title="Export project as .zip" className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"><DownloadIcon className="w-5 h-5" /></button>
                <button onClick={() => alert('Folder creation via UI coming soon!')} title="Create new folder" className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"><FolderIcon className="w-5 h-5" /></button>
                <button onClick={() => alert('File creation via UI coming soon!')} title="Create new file" className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"><FilePlusIcon className="w-5 h-5" /></button>
            </div>
        </div>
        <div className='overflow-y-auto space-y-0.5 mt-1 flex-1'>
            {files.map(item => <FileTreeItem key={item.path} item={item} level={0} />)}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between bg-black/20 px-4 py-1.5 border-b border-white/10">
            <span className="text-sm text-gray-400 font-mono">{currentFile?.path || 'No file selected'}</span>
             <div className="flex items-center gap-2">
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
          />
        </div>
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
            </div>
        </Resizable>
      </div>

      <div className="w-96 bg-[var(--bg-secondary)] border-l border-white/10 flex flex-col">
        <header className="p-3 border-b border-white/10 flex items-center gap-2 shrink-0">
            <CpuIcon className="w-6 h-6 text-[var(--accent-primary)]" />
            <h2 className="text-lg font-semibold text-white">Universal Compiler</h2>
        </header>
        <div className="flex-1 overflow-y-auto">
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        </div>
        {/* FIX: Passed required `prompt` and `onPromptChange` props to the PromptInput component to resolve the type error. */}
        <PromptInput prompt={prompt} onPromptChange={setPrompt} onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default CodeCanvas;
