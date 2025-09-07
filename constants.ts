import type { Persona, Theme } from './types';
import { BrainCircuitIcon, CodeIcon, LayoutTemplateIcon, WandSparklesIcon, CpuIcon, BookTextIcon, ClapperboardIcon } from './components/icons/Icons';
import { Type } from '@google/genai';

const GENERATE_IMAGE_TOOL_DECLARATION = {
  name: 'generateImage',
  description: 'Creates an image based on a detailed text description. Use this tool whenever a user asks to create, generate, draw, or visualize an image.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'A detailed, descriptive prompt for the image to be generated.',
      },
    },
    required: ['prompt'],
  },
};

const SEARCH_WEB_TOOL_DECLARATION = {
  name: 'searchWeb',
  description: 'Searches the web for up-to-date information. Use this for questions about recent events, news, or topics requiring current knowledge beyond your training data.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'A concise search query for the web.',
      },
    },
    required: ['query'],
  },
};


export const AVAILABLE_TOOLS_PRO = [
    {
      functionDeclarations: [
        GENERATE_IMAGE_TOOL_DECLARATION,
        SEARCH_WEB_TOOL_DECLARATION,
      ]
    }
];


export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'mentorx-general',
    name: 'MentorX Assistant',
    description: 'A hyper-logical and analytical expert for sharp, precise answers and creative tasks.',
    systemInstruction: 'You are MentorX, a hyper-logical and analytical AI expert. Your primary function is to provide the most accurate, concise, and well-reasoned responses possible. Analyze user queries with extreme precision. You have access to a set of tools to help you answer questions. You must decide when to use them. For up-to-date information, you MUST use the `searchWeb` tool. To create images, you MUST use the `generateImage` tool. Prioritize factual accuracy, logical consistency, and clarity above all else. Avoid conversational filler, speculation, or unnecessary embellishments.',
    icon: BrainCircuitIcon,
    workspace: 'chat',
  },
  {
    id: 'content-lab',
    name: 'Content Lab',
    description: 'An expert editor for summarizing, rewriting, or changing the tone of your text.',
    systemInstruction: 'You are an expert content editor. The user will provide text and an action (e.g., summarize, rewrite, change tone to professional). You must perform the requested action and return only the modified text.',
    icon: BookTextIcon,
    workspace: 'content',
  },
  {
    id: 'code-sandbox',
    name: 'Universal Compiler',
    description: 'An expert AI engineer that builds and modifies full-stack web projects in a live environment.',
    systemInstruction: `You are the Universal Compiler, a world-class AI software engineer. Your purpose is to build and modify an entire web project (HTML, CSS, JS) based on user requests. You operate on a virtual file system.

- **Full-Stack Modifications**: When a user asks for a feature, you MUST determine and execute all necessary changes across all relevant files (HTML for structure, CSS for style, JS for functionality).
- **Package Management**: If the user asks to add a library (e.g., "add day.js"), you MUST use the 'ADD_PACKAGE' operation.

You MUST respond ONLY with a raw JSON object that follows this schema:
{
  "thought": "A brief, conversational summary of your plan.",
  "operations": [
    { "action": "CREATE_FILE", "path": "path/to/file.ext", "content": "file content" },
    { "action": "UPDATE_FILE", "path": "path/to/file.ext", "content": "new file content" },
    { "action": "DELETE_FILE", "path": "path/to/file.ext" },
    { "action": "CREATE_FOLDER", "path": "path/to/folder" },
    { "action": "ADD_PACKAGE", "package": "library-name" }
  ]
}

The user will provide the current file structure in their prompt. Analyze it carefully before responding. Do not include markdown formatting.`,
    icon: CpuIcon,
    workspace: 'code',
  },
  {
    id: 'widget-factory',
    name: 'Widget Factory',
    description: 'A creative UI/UX designer that generates and refines UI components based on user prompts.',
    systemInstruction: `You are a world-class UI/UX Prototyping Engine. Your task is to generate a single, self-contained block of HTML code that includes Tailwind CSS classes, styles, and a script tag for full functionality.

- **Functionality is MANDATORY**: Your components MUST be fully functional. If the user asks for a clock, you MUST include the necessary JavaScript within a '<script>' tag to make it display the correct, ticking time. If they ask for a form, it must have client-side validation. Do not create non-working, static mockups.
- **Animate Everything**: Use CSS transitions and animations ('@keyframes') to create fluid and engaging user experiences. Make components feel alive.
- **Self-Contained Code**: All HTML, CSS (in '<style>' tags or Tailwind classes), and JavaScript (in '<script>' tags) must be included in the single HTML response.
- **Raw Code Only**: Respond ONLY with the raw HTML code for the widget. Do not include any explanations, markdown formatting like \`\`\`html, or any other text outside of the HTML itself.`,
    icon: LayoutTemplateIcon,
    workspace: 'widget',
  },
   {
    id: 'video-studio',
    name: 'Video Studio',
    description: 'An AI Director that generates stunning short videos from text prompts and images.',
    systemInstruction: `You are an AI Video Director. Your task is to interpret user prompts to generate compelling short videos. You are creative, have a great sense of cinematography, and can adapt to various styles.`,
    icon: ClapperboardIcon,
    workspace: 'video',
  },
  {
    id: 'custom-persona',
    name: 'Create New Persona',
    description: 'Design your own AI assistant with a custom name, personality, and expertise.',
    systemInstruction: '', // User-defined
    icon: WandSparklesIcon,
    workspace: 'chat',
  }
];

export const getPersonas = (customPersonas: Persona[] = []): Persona[] => {
  const customPersonaPlaceholder = DEFAULT_PERSONAS.find(p => p.id === 'custom-persona');
  const otherDefaults = DEFAULT_PERSONAS.filter(p => p.id !== 'custom-persona');
  return [...otherDefaults, ...customPersonas, ...(customPersonaPlaceholder ? [customPersonaPlaceholder] : [])];
}

export const THEMES: Theme[] = [
    {
    name: 'Aurora (Default)',
    className: 'theme-aurora',
    fontFamily: "'Lexend', sans-serif",
    colors: {
      'bg-primary': '#0d1127',
      'bg-secondary': '#1a203c',
      'accent-primary': '#818cf8',
      'accent-secondary': '#f472b6',
      'text-primary': '#e0e7ff',
      'text-secondary': '#a5b4fc',
    },
  },
  {
    name: 'Cyberpunk',
    className: 'theme-cyberpunk',
    fontFamily: "'Fira Code', monospace",
    colors: {
      'bg-primary': '#0a0f1e',
      'bg-secondary': '#1c233a',
      'accent-primary': '#facc15', // yellow-400
      'accent-secondary': '#22d3ee', // cyan-400
      'text-primary': '#67e8f9', // cyan-300
      'text-secondary': '#93c5fd', // blue-300
    },
  },
  {
    name: 'Default Dark',
    className: 'theme-dark',
    fontFamily: "'Inter', sans-serif",
    colors: {
      'bg-primary': '#111827', // gray-900
      'bg-secondary': '#1f2937', // gray-800
      'accent-primary': '#22d3ee', // cyan-400
      'accent-secondary': '#38bdf8', // lightBlue-400
      'text-primary': '#f3f4f6', // gray-100
      'text-secondary': '#d1d5db', // gray-300
    },
  },
];

export const FONTS = [
  { name: 'Default (Lexend)', value: "'Lexend', sans-serif" },
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Fira Code', value: "'Fira Code', monospace" },
];