import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { generateVideo } from '../services/geminiService';
import PromptInput from '../components/PromptInput';
import { ClapperboardIcon, DownloadIcon } from '../components/icons/Icons';
import type { VideoRecord } from '../types';

const LoadingOverlay: React.FC<{ status: string }> = ({ status }) => (
    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center gap-4 text-center p-4">
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div>
        <h2 className="text-2xl font-bold text-white">Generating Your Masterpiece...</h2>
        <p className="text-lg text-[var(--text-secondary)] animate-pulse">{status}</p>
        <p className="text-sm text-gray-500 max-w-md">This process can take a few minutes. Please keep this tab open. The AI is working hard behind the scenes!</p>
    </div>
);

const VideoCard: React.FC<{ video: VideoRecord }> = ({ video }) => (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-white/10 overflow-hidden shadow-lg group">
        <div className="aspect-video relative">
            <video src={video.url} controls className="w-full h-full object-cover" />
             <a 
                href={video.url} 
                download={`mentorx-video-${video.id}.mp4`}
                className="absolute top-2 right-2 p-2 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)] transition-all"
                title="Download Video"
            >
                <DownloadIcon className="w-5 h-5" />
            </a>
        </div>
        <div className="p-4">
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{video.prompt}</p>
        </div>
    </div>
);

const VideoStudio: React.FC = () => {
    const { generatedVideos, addGeneratedVideo, consumeToken, isOutOfTokens, secondsUntilTokenRegen } = useAppContext();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    // FIX: Added state to control the prompt input value, which is a required prop for PromptInput.
    const [prompt, setPrompt] = useState('');

    const handleGenerate = async (prompt: string, image?: { data: string; type: string }) => {
        if (!prompt.trim() || isOutOfTokens) return;
        
        consumeToken();
        setIsLoading(true);
        setError(null);

        try {
            const videoUrl = await generateVideo(prompt, setLoadingStatus, image);
            addGeneratedVideo({ prompt, url: videoUrl });
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An unknown error occurred during video generation.');
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] relative">
            {isLoading && <LoadingOverlay status={loadingStatus} />}

            <header className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <ClapperboardIcon className="w-8 h-8 text-[var(--accent-primary)]" />
                    <div>
                        <h1 className="text-lg font-semibold text-white">Video Studio</h1>
                        <p className="text-xs text-[var(--text-secondary)]">Generate stunning short videos from text and images.</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {error && (
                    <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-4 text-center">
                        <p className="font-semibold">Generation Failed</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                
                {generatedVideos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {generatedVideos.slice().reverse().map(video => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                        <ClapperboardIcon className="w-24 h-24 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Bring Your Ideas to Life</h2>
                        <p className="max-w-md">Describe a scene, a character, or an action. The AI Director will turn your vision into a video. Try "a sloth surfing on a rainbow" or upload an image and ask to animate it.</p>
                    </div>
                )}
            </main>

            <div className="shrink-0">
                {/* FIX: Passed required `prompt` and `onPromptChange` props to the PromptInput component to resolve the type error. */}
                <PromptInput
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    onSend={handleGenerate}
                    isLoading={isLoading}
                    disabled={isOutOfTokens}
                    disabledText={isOutOfTokens ? `AI is recharging... Available in ${secondsUntilTokenRegen}s` : undefined}
                />
            </div>
        </div>
    );
};

export default VideoStudio;
