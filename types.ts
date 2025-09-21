export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 encoded image
  citations?: { uri: string; title: string }[];
  type?: 'chat' | 'summary' | 'image' | 'tool';
}

export interface Persona {
  id:string;
  name: string;
  description: string;
  systemInstruction: string;
  icon: React.ComponentType<{ className?: string }>;
  workspace: 'chat' | 'code' | 'widget' | 'content' | 'video' | 'hacking';
  route?: string; // e.g., '/chat' for unified chat, '/code-sandbox' for specific tool
  custom?: boolean;
}

// Represents a file in the virtual file system
export interface VirtualFile {
  type: 'file';
  name: string;
  path: string;
  content: string;
}

// Represents a folder in the virtual file system
export interface VirtualFolder {
  type: 'folder';
  name: string;
  path: string;
  children: FileSystemItem[];
}

// Union type for files and folders
export type FileSystemItem = VirtualFile | VirtualFolder;


export interface Theme {
  name:string;
  className: string;
  fontFamily: string;
  colors: {
    'bg-primary': string;
    'bg-secondary': string;
    'accent-primary': string;
    'accent-secondary': string;
    'text-primary': string;
    'text-secondary': string;
  };
}

export interface Session {
  id: string;
  name: string;
  personaId: string;
  messages: Message[];
  fileSystem?: FileSystemItem[];
  packages?: string[];
  widgetCode?: {
    html: string;
    css: string;
    js: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface ImageRecord {
  id: string;
  prompt: string;
  url: string;
  timestamp: number;
}

export interface CustomBackground {
  url: string;
  dimness: number; // 0 to 1
}

// Types for the new Video Editor
export interface MediaAsset {
  id: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string; // Object URL
  duration: number; // in seconds
  element: HTMLVideoElement | HTMLAudioElement | HTMLImageElement;
}
export interface ClipEffect {
  id: string;
  type: 'brightness' | 'contrast' | 'grayscale';
  value: number; // e.g., 0-200 for brightness/contrast, 0-100 for grayscale
}

export interface ClipTransition {
  type: 'fade-in' | 'fade-out' | 'wipe-left' | 'wipe-right';
  duration: number; // in seconds
}

export interface TimelineClip {
  id: string;
  instanceId: string; // Unique ID for this specific instance on the timeline
  assetId: string;
  trackId: string;
  // Timing relative to the asset itself
  trimStart: number;
  trimEnd: number;
  // Timing relative to the main timeline
  timelineStart: number;
  // Calculated properties
  duration: number;
  effects: ClipEffect[];
  transition?: ClipTransition; // Transition leading INTO this clip
  outroTransition?: ClipTransition; // Transition leading OUT of this clip

  // For text clips
  text?: string;
  fontFamily?: string;
  fontSize?: number; // in vw units for responsiveness
  color?: string;
  backgroundColor?: string;
  position?: { x: number; y: number }; // 0-100 for percentage
}


export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text';
  clips: TimelineClip[];
}

export interface UserMemory {
  id: string;
  key: string;
  value: string;
}

export interface AppContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLeftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  isFocusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  notes: string;
  setNotes: (notes: string) => void;
  sessions: Omit<Session, 'messages' | 'fileSystem' | 'packages' | 'widgetCode'>[];
  activeSessionId: string | null;
  selectSession: (sessionId: string | null) => void;
  createNewSession: (personaId: string, initialMessages?: Message[]) => string;
  deleteSession: (sessionId: string) => { nextSessionId: string | null; wasActiveSessionDeleted: boolean; };
  renameSession: (sessionId: string, newName: string) => void;
  updateSessionPersona: (sessionId: string, newPersonaId: string) => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  currentUser: User | null;
  signIn: (user: User | string) => void;
  signOut: () => void;
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  hasBeenOnboarded: boolean;
  completeOnboarding: () => void;
  customPersonas: Persona[];
  addCustomPersona: (persona: Omit<Persona, 'id' | 'custom' | 'workspace' | 'route'>) => void;
  updateCustomPersona: (persona: Persona) => void;
  deleteCustomPersona: (personaId: string) => void;
  isPersonaModalOpen: boolean;
  openPersonaModal: (persona?: Persona | null) => void;
  closePersonaModal: () => void;
  editingPersona: Persona | null;
  generatedImages: ImageRecord[];
  addGeneratedImage: (image: Omit<ImageRecord, 'id' | 'timestamp'>) => void;
  consumeToken: () => void;
  isOutOfTokens: boolean;
  secondsUntilTokenRegen: number;

  // Image Preview Modal
  isImagePreviewOpen: boolean;
  previewingImage: ImageRecord | null;
  openImagePreview: (image: ImageRecord) => void;
  closeImagePreview: () => void;

  // Image Library Modal
  isImageLibraryOpen: boolean;
  openImageLibrary: () => void;
  closeImageLibrary: () => void;

  // In-App Browser Modal
  isBrowserOpen: boolean;
  browserUrl: string;
  openBrowser: (url: string) => void;
  closeBrowser: () => void;

  // UI Customization
  customBackground: CustomBackground | null;
  setCustomBackground: (bg: CustomBackground | null) => void;
  uiDensity: 'compact' | 'comfortable';
  setUiDensity: (density: 'compact' | 'comfortable') => void;
  panelOpacity: number; // 0.5 to 1
  setPanelOpacity: (opacity: number) => void;
  leftSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;
  rightSidebarWidth: number;
  setRightSidebarWidth: (width: number) => void;
  isGlassmorphism: boolean;
  setGlassmorphism: (enabled: boolean) => void;

  // Performance Mode
  isLiteMode: boolean;
  setLiteMode: (lite: boolean) => void;

  // Global Loading State
  isGlobalLoading: boolean;
  setGlobalLoading: (isLoading: boolean) => void;
  
  // Personalization
  isMemoryEnabled: boolean;
  setMemoryEnabled: (enabled: boolean) => void;
  userMemories: UserMemory[];
  addUserMemory: (memory: Omit<UserMemory, 'id'>) => void;
  updateUserMemory: (memory: UserMemory) => void;
  deleteUserMemory: (memoryId: string) => void;
  
  // Guest Mode
  isGuest: boolean;
  setGuestMode: (isGuest: boolean) => void;
  
  // Active Session Data Management
  activeSessionMessages: Message[];
  updateActiveSessionMessages: (updater: React.SetStateAction<Message[]>) => void;
  activeSessionFileSystem: FileSystemItem[];
  updateActiveSessionFileSystem: (updater: React.SetStateAction<FileSystemItem[]>) => void;
  activeSessionPackages: string[];
  updateActiveSessionPackages: (updater: React.SetStateAction<string[]>) => void;
  activeSessionWidgetCode: { html: string; css: string; js: string; };
  updateActiveSessionWidgetCode: (updater: React.SetStateAction<{ html: string; css: string; js: string; }>) => void;
}

// FIX: Added type definitions for the Google Identity Services client library.
// This resolves TypeScript errors by informing the compiler about the `window.google` object
// that is available globally when the Google Sign-In script is loaded.
// EXTEND: Added `deviceMemory` to the global Navigator type to allow for performance checks
// on supported browsers (like Chrome) without causing TypeScript errors.
declare global {
  interface Navigator {
    deviceMemory?: number;
  }
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: any) => void; }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, any>) => void;
          disableAutoSelect: () => void;
          prompt: () => void;
        };
      };
    };
  }
}