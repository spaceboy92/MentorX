import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { editImage } from '../services/geminiService';
import { XIcon, DownloadIcon, CopyIcon, BrushIcon, CheckIcon } from './icons/Icons';

const ImagePreviewModal: React.FC = () => {
    const { 
        previewingImage, 
        closeImagePreview, 
        addGeneratedImage 
    } = useAppContext();

    const [currentImage, setCurrentImage] = useState(previewingImage);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setCurrentImage(previewingImage);
    }, [previewingImage]);

    if (!currentImage) return null;

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPrompt.trim()) return;

        setIsEditing(true);
        setError(null);
        try {
            const base64Data = currentImage.url.split(',')[1];
            const mimeTypeMatch = currentImage.url.match(/data:(image\/\w+);/);
            if (!mimeTypeMatch) throw new Error("Could not determine image MIME type.");
            
            const newImageUrl = await editImage(base64Data, mimeTypeMatch[1], editPrompt);
            
            const newImageRecord = { prompt: editPrompt, url: newImageUrl };
            addGeneratedImage(newImageRecord);

            // Create a temporary full record to update the modal view
            setCurrentImage({
                id: `img-${Date.now()}`,
                prompt: editPrompt,
                url: newImageUrl,
                timestamp: Date.now()
            });
            setEditPrompt('');

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during editing.");
        } finally {
            setIsEditing(false);
        }
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(currentImage.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={closeImagePreview}
        >
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
            `}</style>
            <div 
                className="bg-panel w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 flex flex-col md:flex-row gap-4 p-4" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image Display */}
                <div className="flex-1 flex items-center justify-center bg-black/20 rounded-lg overflow-hidden relative">
                    <img src={currentImage.url} alt={currentImage.prompt} className="max-h-full max-w-full object-contain" />
                    {isEditing && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                             <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div>
                        </div>
                    )}
                </div>

                {/* Controls Panel */}
                <div className="w-full md:w-80 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-white">Image Tools</h3>
                            <p className="text-xs text-[var(--text-secondary)]">Edit, download, or copy.</p>
                        </div>
                        <button onClick={closeImagePreview} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Original Prompt */}
                    <div className="bg-black/20 p-3 rounded-lg border border-white/10">
                        <p className="text-xs font-semibold text-gray-400 mb-1">Original Prompt</p>
                        <p className="text-sm text-[var(--text-primary)]">{currentImage.prompt}</p>
                    </div>

                    {/* Edit with AI */}
                    <form onSubmit={handleEdit} className="bg-black/20 p-3 rounded-lg border border-white/10 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                            <BrushIcon className="w-5 h-5"/>
                            Edit with AI
                        </label>
                        <div className="rgb-border-glow rounded-md">
                            <textarea
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                placeholder="e.g., Make the car red, add a mountain in the background..."
                                rows={3}
                                className="w-full bg-black/30 border border-white/10 rounded-md p-2 text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
                            />
                        </div>
                         {error && <p className="text-xs text-red-400">{error}</p>}
                        <button type="submit" disabled={isEditing} className="w-full bg-[var(--accent-primary)] text-white font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-wait">
                            {isEditing ? 'Generating...' : 'Generate Edit'}
                        </button>
                    </form>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                         <a 
                            href={currentImage.url} 
                            download={`mentorx-${currentImage.id}.png`}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Download
                        </a>
                        <button 
                            onClick={handleCopyPrompt}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                        >
                            {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy Prompt'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImagePreviewModal;