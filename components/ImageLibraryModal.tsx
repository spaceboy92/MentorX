import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { XIcon, ImageIcon } from './icons/Icons';

const ImageLibraryModal: React.FC = () => {
    const { 
        isImageLibraryOpen, 
        closeImageLibrary, 
        generatedImages, 
        openImagePreview 
    } = useAppContext();

    if (!isImageLibraryOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={closeImageLibrary}
        >
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
            `}</style>
            <div 
                className="bg-panel w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <ImageIcon className="w-6 h-6 text-[var(--accent-primary)]" />
                        <h2 className="text-xl font-bold text-white">Image Library</h2>
                    </div>
                    <button onClick={closeImageLibrary} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto">
                    {generatedImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {generatedImages.map(image => (
                                <button 
                                    key={image.id} 
                                    onClick={() => {
                                        openImagePreview(image);
                                        closeImageLibrary(); // Close library to show preview
                                    }} 
                                    className="aspect-square bg-black/20 rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] focus:ring-[var(--accent-primary)] relative"
                                    aria-label={`Preview image with prompt: ${image.prompt}`}
                                >
                                    <img src={image.url} alt={image.prompt} className="w-full h-full object-cover transition-transform group-hover:scale-110"/>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <ImageIcon className="w-24 h-24 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">No Images Yet</h3>
                            <p className="text-sm">Start a chat with MentorX Assistant and ask it to generate an image!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageLibraryModal;