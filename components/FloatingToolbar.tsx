import React, { useState } from 'react';
import { PaperclipIcon, BookTextIcon, ImageIcon, LightbulbIcon, TelescopeIcon, MoreHorizontalIcon, XIcon } from './icons/Icons';

interface FloatingToolbarProps {
  onSetPrompt: (prompt: string) => void;
  onTriggerFile: () => void;
}

const ToolButton: React.FC<{
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  delay: number;
  isMenuOpen: boolean;
}> = ({ Icon, label, onClick, delay, isMenuOpen }) => {
  return (
    <div
      className={`flex items-center gap-3 transition-all duration-300 ease-in-out ${
        isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      }`}
      style={{ transitionDelay: isMenuOpen ? `${delay}ms` : '0ms' }}
    >
      <span className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">{label}</span>
      <button
        onClick={onClick}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white shadow-lg border border-white/10 transform hover:scale-110 transition-all"
      >
        <Icon className="w-5 h-5" />
      </button>
    </div>
  );
};

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ onSetPrompt, onTriggerFile }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToolClick = (promptText: string) => {
    onSetPrompt(promptText);
    setIsOpen(false);
  };

  const tools = [
    { Icon: PaperclipIcon, label: 'Add photos & files', action: () => { onTriggerFile(); setIsOpen(false); } },
    { Icon: BookTextIcon, label: 'Study and learn', action: () => handleToolClick('Explain the following concept in simple terms: ') },
    { Icon: ImageIcon, label: 'Create image', action: () => handleToolClick('Create an image of ') },
    { Icon: LightbulbIcon, label: 'Think longer', action: () => handleToolClick('Let\'s think step-by-step about the best way to approach this problem: ') },
    { Icon: TelescopeIcon, label: 'Deep research', action: () => handleToolClick('Do a deep research analysis on the topic of ') },
  ];

  return (
    <div className="absolute bottom-20 right-4 flex flex-col items-end gap-3 z-10">
      {isOpen && (
        <div className="flex flex-col items-end gap-4 p-4 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10">
          {tools.map((tool, index) => (
            <ToolButton
              key={tool.label}
              Icon={tool.Icon}
              label={tool.label}
              onClick={tool.action}
              delay={index * 40}
              isMenuOpen={isOpen}
            />
          ))}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent-primary)] text-white shadow-lg transform hover:scale-110 active:scale-100 transition-all duration-200"
        aria-label="Toggle Tools Menu"
      >
        <div className="transition-transform duration-300" style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}>
          {isOpen ? <XIcon className="w-6 h-6" /> : <MoreHorizontalIcon className="w-6 h-6" />}
        </div>
      </button>
    </div>
  );
};

export default FloatingToolbar;