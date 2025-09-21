import React, { useRef, useState, useEffect, ChangeEvent, forwardRef, useImperativeHandle } from 'react';
import 'regenerator-runtime/runtime'; // Required for react-speech-recognition
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { PaperclipIcon, MicIcon, SendIcon, XIcon, StopCircleIcon } from './icons/Icons';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: (prompt: string, image?: { data: string; type: string }) => void;
  isLoading: boolean;
  onStop?: () => void;
  disabled?: boolean;
  disabledText?: string;
}

export interface PromptInputRef {
  triggerFilePicker: () => void;
}

const LoadingButton: React.FC<{ onStop?: () => void }> = ({ onStop }) => (
    <div className="relative w-8 h-8">
        <svg className="absolute inset-0" viewBox="0 0 36 36">
            <circle
                className="text-white/20"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
            />
            <circle
                className="text-[var(--accent-primary)]"
                strokeWidth="4"
                strokeDasharray="100"
                strokeDashoffset="75"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            >
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 18 18"
                    to="360 18 18"
                    dur="1s"
                    repeatCount="indefinite"
                />
            </circle>
        </svg>
        {onStop && (
            <button
                onClick={onStop}
                className="absolute inset-0 flex items-center justify-center text-white/80 hover:text-white"
                aria-label="Stop generating"
            >
                <StopCircleIcon className="w-5 h-5" />
            </button>
        )}
    </div>
);


const PromptInput = forwardRef<PromptInputRef, PromptInputProps>(({ prompt, onPromptChange, onSend, isLoading, onStop, disabled = false, disabledText }, ref) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{ data: string; type: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { transcript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition();
  
  useImperativeHandle(ref, () => ({
    triggerFilePicker: () => {
        fileInputRef.current?.click();
    }
  }));

  useEffect(() => {
    if (transcript) {
      onPromptChange(transcript);
    }
  }, [transcript, onPromptChange]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [prompt]);

  const handleSend = () => {
    if ((prompt.trim() || imageFile) && !isLoading && !disabled) {
      onSend(prompt, imageFile || undefined);
      onPromptChange('');
      setImageFile(null);
      setImagePreview(null);
      SpeechRecognition.stopListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImageFile({ data: base64String, type: file.type });
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    console.warn("Browser doesn't support speech recognition.");
  }
  
  const isDisabled = isLoading || disabled;

  return (
    <div className="p-4 bg-panel-no-blur border-t border-[var(--panel-border-color)]">
      <div className={`rgb-border-glow rounded-xl ${isDisabled ? 'opacity-70' : ''}`}>
        <div className="relative bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-lg">
          {imagePreview && (
            <div className="p-2 relative">
              <img src={imagePreview} alt="preview" className="h-20 w-auto rounded-md" />
              <button
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                  if(fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-0 right-0 m-1 p-1 bg-black/50 rounded-full hover:bg-black/80"
              >
                <XIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? disabledText : "Ask MentorX anything..."}
            className="w-full bg-transparent p-4 pr-32 text-[var(--text-primary)] placeholder-gray-500 resize-none focus:outline-none max-h-48"
            rows={1}
            disabled={isDisabled}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* This button is now hidden and triggered programmatically */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={isDisabled}
              style={{ display: 'none'}}
              aria-hidden="true"
            >
              <PaperclipIcon className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {browserSupportsSpeechRecognition && (
              <button
                onClick={toggleListen}
                className={`p-2 transition-colors disabled:opacity-50 ${listening ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
                disabled={isDisabled}
              >
                <MicIcon className="w-5 h-5" />
              </button>
            )}
            {isLoading ? (
               <LoadingButton onStop={onStop} />
            ) : (
              <button
                  onClick={handleSend}
                  className="p-2 rounded-full bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
                  disabled={(!prompt.trim() && !imageFile) || isDisabled}
                  aria-label="Send message"
              >
                  <SendIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PromptInput;