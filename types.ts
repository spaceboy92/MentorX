export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 encoded image
  citations?: { uri: string; title: string }[];
  type?: 'chat' | 'summary' | 'image';
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  icon: React.ComponentType<{ className?: string }>;
  workspace: 'chat' | 'code' | 'widget' | 'content' | 'video';
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface Widget {
  id: string;
  name: string;
  html: string;
}

export interface ImageRecord {
  id: string;
  prompt: string;
  url: string;
  timestamp: number;
}

export interface VideoRecord {
  id: string;
  prompt: string;
  url: string; // This will be the blob URL
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
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio';
  clips: TimelineClip[];
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
  sessions: Omit<Session, 'messages'>[];
  activeSessionId: string | null;
  selectSession: (sessionId: string | null) => void;
  createNewSession: (personaId: string, initialMessages?: Message[]) => void;
  updateMessagesForActiveSession: (messages: Message[]) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newName: string) => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  currentUser: User | null;
  signIn: (token: string) => void;
  signOut: () => void;
  pinnedWidgets: Widget[];
  pinWidget: (widget: Widget) => void;
  unpinWidget: (widgetId: string) => void;
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  hasBeenOnboarded: boolean;
  completeOnboarding: () => void;
  customPersonas: Persona[];
  addCustomPersona: (persona: Omit<Persona, 'id' | 'custom' | 'workspace'>) => void;
  updateCustomPersona: (persona: Persona) => void;
  deleteCustomPersona: (personaId: string) => void;
  isPersonaModalOpen: boolean;
  openPersonaModal: (persona?: Persona) => void;
  closePersonaModal: () => void;
  editingPersona: Persona | null;
  generatedImages: ImageRecord[];
  addGeneratedImage: (image: Omit<ImageRecord, 'id' | 'timestamp'>) => void;
  generatedVideos: VideoRecord[];
  addGeneratedVideo: (video: Omit<VideoRecord, 'id' | 'timestamp'>) => void;
  consumeToken: () => void;
  isOutOfTokens: boolean;
  secondsUntilTokenRegen: number;

  // Image Preview Modal
  isImagePreviewOpen: boolean;
  previewingImage: ImageRecord | null;
  openImagePreview: (image: ImageRecord) => void;
  closeImagePreview: () => void;

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
}

// FIX: Added type definitions for the Google Identity Services client library.
// This resolves TypeScript errors by informing the compiler about the `window.google` object
// that is available globally when the Google Sign-In script is loaded.
declare global {
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