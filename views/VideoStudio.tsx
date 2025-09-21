import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MediaAsset, TimelineClip, TimelineTrack, ClipEffect, ClipTransition } from '../types';
import { UploadIcon, FilmIcon, MusicIcon, ImageIcon, PlayIcon, PauseIcon, ScissorsIcon, BrushIcon, TypeIcon, MoveIcon, TextIcon, DownloadIcon, MenuIcon, SparklesIcon, AlertTriangleIcon, XIcon, WandSparklesIcon, ClapperboardIcon, RotateCcwIcon, RotateCwIcon, CopyIcon, Trash2Icon } from '../components/icons/Icons';
import { useAppContext } from '../contexts/AppContext';
import { useWindowSize } from '../hooks/useWindowSize';
import { generateVideo, styleTitleCard } from '../services/geminiService';
import { VIDEO_GENERATION_MESSAGES } from '../constants';


// Helper to get media duration
const getMediaDuration = (element: HTMLMediaElement): Promise<number> => {
    return new Promise((resolve) => {
        if (isFinite(element.duration)) {
            resolve(element.duration);
        } else {
            element.onloadedmetadata = () => resolve(element.duration);
             setTimeout(() => {
                if (!isFinite(element.duration)) {
                    console.warn("Could not get duration for", element.src);
                    resolve(0);
                }
            }, 3000);
        }
    });
};

// --- Sub-components ---

const AiVideoGenerator: React.FC<{
    onVideoGenerated: (asset: MediaAsset) => void;
}> = ({ onVideoGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(VIDEO_GENERATION_MESSAGES[0]);

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingMessage(VIDEO_GENERATION_MESSAGES[Math.floor(Math.random() * VIDEO_GENERATION_MESSAGES.length)]);
            }, 2500);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    const handleGenerate = async () => {
        if (!prompt.trim() || isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            const videoBlob = await generateVideo(prompt);
            const src = URL.createObjectURL(videoBlob);
            const videoElement = document.createElement('video');
            videoElement.src = src;
            const duration = await getMediaDuration(videoElement);
            
            const asset: MediaAsset = {
                id: `asset-ai-${Date.now()}`,
                type: 'video',
                name: prompt.substring(0, 20) + '...',
                src,
                duration,
                element: videoElement,
            };
            onVideoGenerated(asset);
            setPrompt('');

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="p-4 h-full flex flex-col">
            <h4 className="text-base font-semibold text-white mb-2">Generate Video with AI</h4>
            <div className="space-y-3 flex-1 flex flex-col">
                <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g., A robot holding a red skateboard."
                    rows={3}
                    className="w-full bg-black/20 border border-white/10 rounded-md p-2 text-sm text-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                    disabled={isLoading}
                />
                 {error && <p className="text-xs text-red-400">{error}</p>}
                 {isLoading && (
                    <div className="text-center p-4 space-y-2">
                         <div className="w-8 h-8 mx-auto border-4 border-dashed rounded-full animate-spin border-[var(--accent-primary)]"></div>
                         <p className="text-sm text-[var(--text-secondary)] animate-pulse">{loadingMessage}</p>
                    </div>
                )}
            </div>
            <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 bg-[var(--accent-primary)] text-white hover:opacity-90 transform active:scale-95 disabled:opacity-50"
            >
                <WandSparklesIcon className="w-5 h-5"/>
                <span>{isLoading ? 'Generating...' : 'Generate'}</span>
            </button>
        </div>
    );
};


const MediaBin: React.FC<{
    assets: MediaAsset[];
    onUpload: (files: FileList) => void;
    onVideoGenerated: (asset: MediaAsset) => void;
    onAddTemplate: (type: 'intro' | 'outro') => void;
}> = ({ assets, onUpload, onVideoGenerated, onAddTemplate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'library' | 'ai' | 'templates'>('library');

    const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ assetId: asset.id }));
    };

    return (
        <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full">
            <div className="flex items-center border-b border-white/10 p-2">
                 <button onClick={() => setActiveTab('library')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'library' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>Library</button>
                 <button onClick={() => setActiveTab('templates')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'templates' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>Templates</button>
                 <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 text-sm font-semibold rounded-md ${activeTab === 'ai' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>Generate</button>
            </div>

            {activeTab === 'library' && (
                 <div className="flex-1 p-2 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 content-start">
                    {assets.map(asset => (
                        <div
                            key={asset.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, asset)}
                            className="bg-black/20 p-2 rounded-md border border-transparent hover:border-[var(--accent-primary)] cursor-grab"
                        >
                            <div className="aspect-video bg-black rounded-sm flex items-center justify-center mb-1">
                                {asset.type === 'video' && <FilmIcon className="w-8 h-8 text-gray-500" />}
                                {asset.type === 'audio' && <MusicIcon className="w-8 h-8 text-gray-500" />}
                                {asset.type === 'image' && <ImageIcon className="w-8 h-8 text-gray-500" />}
                            </div>
                            <p className="text-xs text-gray-300 truncate">{asset.name}</p>
                        </div>
                    ))}
                </div>
            )}
            
            {activeTab === 'templates' && (
                <div className="p-4 space-y-3">
                    <button onClick={() => onAddTemplate('intro')} className="w-full p-4 bg-black/20 rounded-md border border-transparent hover:border-[var(--accent-primary)] text-left">
                        <h4 className="font-semibold text-white">Simple Title Intro</h4>
                        <p className="text-xs text-gray-400">A 5-second title card with a fade-in effect.</p>
                    </button>
                     <button onClick={() => onAddTemplate('outro')} className="w-full p-4 bg-black/20 rounded-md border border-transparent hover:border-[var(--accent-primary)] text-left">
                        <h4 className="font-semibold text-white">Fading Outro</h4>
                        <p className="text-xs text-gray-400">A "Thanks for watching!" card that fades to black.</p>
                    </button>
                </div>
            )}

            {activeTab === 'ai' && (
                <AiVideoGenerator onVideoGenerated={onVideoGenerated}/>
            )}

            <div className="p-4 border-t border-white/10">
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => e.target.files && onUpload(e.target.files)}
                    accept="video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,image/jpeg,image/png"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 bg-white/5 text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transform active:scale-95"
                >
                    <UploadIcon className="w-5 h-5" />
                    <span>Upload Media</span>
                </button>
            </div>
        </div>
    );
};


const PreviewPlayer: React.FC<{
    assets: MediaAsset[];
    tracks: TimelineTrack[];
    currentTime: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
}> = ({ assets, tracks, currentTime, isPlaying, onTogglePlay }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({});

    const videoTrack = tracks.find(t => t.type === 'video');
    const audioTrack = tracks.find(t => t.type === 'audio');
    const textTrack = tracks.find(t => t.type === 'text');
    
    const currentVideoClip = videoTrack?.clips.find(c => currentTime >= c.timelineStart && currentTime < c.timelineStart + c.duration);
    const videoAsset = assets.find(a => a.id === currentVideoClip?.assetId);
    
    const activeTextClips = textTrack?.clips.filter(c => currentTime >= c.timelineStart && currentTime < c.timelineStart + c.duration) || [];

    // This effect syncs the preview elements with the timeline state
    useEffect(() => {
        // Handle Video
        if (videoRef.current && videoAsset && currentVideoClip) {
            if (videoRef.current.src !== videoAsset.src) {
                videoRef.current.src = videoAsset.src;
            }
            const videoTime = currentTime - currentVideoClip.timelineStart + currentVideoClip.trimStart;
            if (Math.abs(videoRef.current.currentTime - videoTime) > 0.2) {
                videoRef.current.currentTime = videoTime;
            }
        } else if (videoRef.current && !videoAsset) {
            videoRef.current.src = "";
        }
        
        // Handle Audio
        const activeAudioClips = audioTrack?.clips.filter(c => currentTime >= c.timelineStart && currentTime < c.timelineStart + c.duration) || [];
        const activeAudioAssets = activeAudioClips.map(clip => ({ clip, asset: assets.find(a => a.id === clip.assetId) }));
        
        Object.values(audioRefs.current).forEach(audioEl => audioEl.muted = true);

        activeAudioAssets.forEach(({ clip, asset }) => {
            if (asset) {
                if (!audioRefs.current[asset.id]) {
                    audioRefs.current[asset.id] = new Audio(asset.src);
                }
                const audioEl = audioRefs.current[asset.id];
                audioEl.muted = false;
                const audioTime = currentTime - clip.timelineStart + clip.trimStart;
                if (Math.abs(audioEl.currentTime - audioTime) > 0.2) {
                    audioEl.currentTime = audioTime;
                }
            }
        });

    }, [tracks, currentTime, assets, videoAsset, currentVideoClip, audioTrack]);
    
     // This effect handles play/pause state
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        if (isPlaying) {
            videoElement.play().catch(e => console.error("Video play error:", e));
            Object.values(audioRefs.current).forEach(audioEl => {
                if (!audioEl.muted) audioEl.play().catch(e => console.error("Audio play error:", e));
            });
        } else {
            videoElement.pause();
            Object.values(audioRefs.current).forEach(audioEl => audioEl.pause());
        }
    }, [isPlaying]);
    
    // Mute the video element itself to avoid double audio if a video clip has sound
    useEffect(() => {
        if(videoRef.current) videoRef.current.volume = 0;
    }, []);
    
    const getClipStyles = (clip: TimelineClip | undefined) => {
        if (!clip) return {};

        // Effects
        const filterStyle = clip.effects.map(effect => {
            switch(effect.type) {
                case 'brightness': return `brightness(${effect.value}%)`;
                case 'contrast': return `contrast(${effect.value}%)`;
                case 'grayscale': return `grayscale(${effect.value}%)`;
                default: return '';
            }
        }).join(' ');

        // Transitions
        let opacity = 1;
        let transform = 'translate(-50%, -50%)'; // for text
        let clipPath = 'inset(0% 0% 0% 0%)';

        // Handle Intro Transition
        if (clip.transition) {
            const { type, duration } = clip.transition;
            const progress = Math.min(1, (currentTime - clip.timelineStart) / duration);
            if (progress < 1) {
                if (type === 'fade-in') opacity = progress;
                if (type === 'wipe-right') clipPath = `inset(0% ${100 - progress * 100}% 0% 0%)`;
                if (type === 'wipe-left') clipPath = `inset(0% 0% 0% ${100 - progress * 100}%)`;
            }
        }

        // Handle Outro Transition
        if (clip.outroTransition) {
            const { type, duration } = clip.outroTransition;
            const clipEndTime = clip.timelineStart + clip.duration;
            const transitionStartTime = clipEndTime - duration;
            if (currentTime >= transitionStartTime) {
                const progress = Math.min(1, (currentTime - transitionStartTime) / duration);
                 if (type === 'fade-out') opacity = 1 - progress;
                 if (type === 'wipe-left') clipPath = `inset(0% ${progress * 100}% 0% 0%)`;
                 if (type === 'wipe-right') clipPath = `inset(0% 0% 0% ${progress * 100}%)`;
            }
        }
        
        return { filter: filterStyle, opacity, clipPath, transform };
    };

    const videoStyles = getClipStyles(currentVideoClip);

    return (
        <div className="bg-black rounded-lg w-full h-full flex items-center justify-center relative group overflow-hidden">
            <video ref={videoRef} className="max-w-full max-h-full" style={videoStyles} />

            {/* Text Overlays */}
            <div className="absolute inset-0 pointer-events-none w-full h-full">
                {activeTextClips.map(clip => {
                    const textStyles = getClipStyles(clip);
                    return (
                         <div 
                            key={clip.instanceId}
                            className="p-2 rounded"
                            style={{
                                position: 'absolute',
                                left: `${clip.position?.x ?? 50}%`,
                                top: `${clip.position?.y ?? 50}%`,
                                transform: textStyles.transform,
                                opacity: textStyles.opacity,
                                clipPath: textStyles.clipPath,
                                fontSize: `${clip.fontSize ?? 4}vw`,
                                color: clip.color ?? '#FFFFFF',
                                backgroundColor: clip.backgroundColor ?? 'transparent',
                                fontFamily: clip.fontFamily ?? 'sans-serif',
                                whiteSpace: 'pre-wrap',
                                textAlign: 'center',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                            }}
                        >
                            {clip.text}
                        </div>
                    );
                })}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                 <button onClick={onTogglePlay} className="p-3 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)] transition-all">
                    {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6" />}
                 </button>
            </div>
        </div>
    );
};


const Timeline: React.FC<{
    assets: MediaAsset[];
    tracks: TimelineTrack[];
    currentTime: number;
    totalDuration: number;
    selectedClipId: string | null;
    activeTool: 'select' | 'split';
    onScrub: (time: number) => void;
    onDrop: (assetId: string, trackId: string, timelineStart: number) => void;
    onSelectClip: (clipInstanceId: string | null) => void;
    onUpdateClip: (updatedClip: TimelineClip) => void;
    onSplitClip: (clipInstanceId: string, time: number) => void;
}> = ({ assets, tracks, currentTime, totalDuration, selectedClipId, activeTool, onScrub, onDrop, onSelectClip, onUpdateClip, onSplitClip }) => {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const draggingInfo = useRef<{ type: 'move' | 'trim-start' | 'trim-end', clipId: string, startX: number, originalClip: TimelineClip } | null>(null);

    const PIXELS_PER_SECOND = 50;

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingInfo.current) return;

        const timeDelta = (e.clientX - draggingInfo.current.startX) / PIXELS_PER_SECOND;
        const { type, clipId, originalClip } = draggingInfo.current;
        const asset = assets.find(a => a.id === originalClip.assetId);
        if (!asset && originalClip.assetId !== 'text') return;
        
        let updatedClip = { ...originalClip };

        if (type === 'move') {
            updatedClip.timelineStart = Math.max(0, originalClip.timelineStart + timeDelta);
        } else if (type === 'trim-start') {
            const trimChange = timeDelta;
            const newTrimStart = Math.max(0, originalClip.trimStart + trimChange);
            const durationChange = originalClip.trimStart - newTrimStart;
            if (originalClip.duration + durationChange > 1) { // Min clip duration
                updatedClip.trimStart = newTrimStart;
                updatedClip.timelineStart = originalClip.timelineStart + trimChange;
                updatedClip.duration = originalClip.duration + durationChange;
            }
        } else if (type === 'trim-end') {
            const durationChange = timeDelta;
            if (originalClip.duration + durationChange > 1) {
                updatedClip.duration = originalClip.duration + durationChange;
                updatedClip.trimEnd = originalClip.trimStart + updatedClip.duration;
            }
        }
        
        // Clamp trim points to asset duration
        if (asset) {
            updatedClip.trimStart = Math.max(0, updatedClip.trimStart);
            updatedClip.trimEnd = Math.min(asset.duration, updatedClip.trimEnd);
        }

        onUpdateClip(updatedClip);

    }, [assets, onUpdateClip]);

    const handleMouseUp = useCallback(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        draggingInfo.current = null;
    }, [handleMouseMove]);

    const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'trim-start' | 'trim-end', clip: TimelineClip) => {
        e.stopPropagation();
        onSelectClip(clip.instanceId);
        if (activeTool !== 'select') return;

        draggingInfo.current = { type, clipId: clip.instanceId, startX: e.clientX, originalClip: clip };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [activeTool, handleMouseMove, handleMouseUp, onSelectClip]);
    
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent, trackId: string) => {
        e.preventDefault();
        const { assetId } = JSON.parse(e.dataTransfer.getData('application/json'));
        if (!timelineContainerRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + timelineContainerRef.current.scrollLeft;
        const timelineStart = x / PIXELS_PER_SECOND;
        onDrop(assetId, trackId, timelineStart);
    };

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.buttons !== 1) return;
        if (!e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, (x + e.currentTarget.scrollLeft) / PIXELS_PER_SECOND);
        onScrub(time);
    };
    
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onSelectClip(null);
    }
    
    const getClipBackgroundColor = (trackType: TimelineTrack['type']) => {
        switch(trackType) {
            case 'video': return 'bg-indigo-500/50';
            case 'audio': return 'bg-emerald-500/50';
            case 'text': return 'bg-rose-500/50';
            default: return 'bg-gray-500/50';
        }
    };
     const getClipBorderColor = (trackType: TimelineTrack['type']) => {
        switch(trackType) {
            case 'video': return 'border-indigo-400';
            case 'audio': return 'border-emerald-400';
            case 'text': return 'border-rose-400';
            default: return 'border-gray-400';
        }
    };

    return (
        <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full overflow-hidden" onClick={handleTimelineClick}>
            <div className="p-2 border-b border-white/10 text-right text-sm font-mono text-gray-400">
                {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
            </div>
            <div 
                ref={timelineContainerRef}
                className="flex-1 overflow-auto relative"
                onDragOver={handleDragOver}
                onMouseMove={handleScrub}
                onMouseDown={handleScrub}
            >
                <div 
                    className="relative h-full"
                    style={{ width: totalDuration * PIXELS_PER_SECOND }}
                >
                     {/* Playhead */}
                    <div className="absolute top-0 bottom-0 bg-[var(--accent-primary)]/80 w-0.5 z-20 pointer-events-none" style={{ left: `${currentTime * PIXELS_PER_SECOND}px`}}>
                        <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-[var(--accent-primary)] rounded-full border-2 border-[var(--bg-secondary)]"></div>
                    </div>

                    {tracks.map(track => (
                        <div 
                            key={track.id} 
                            className="h-20 border-t border-white/10 relative" 
                            onDragOver={handleDragOver} 
                            onDrop={(e) => { e.stopPropagation(); handleDrop(e, track.id)}}
                        >
                            <div className="absolute top-2 left-2 text-xs font-bold text-gray-400 bg-black/30 px-2 py-1 rounded z-10 pointer-events-none">{track.type.toUpperCase()}</div>
                            {track.clips.map(clip => {
                                const asset = assets.find(a => a.id === clip.assetId);
                                const isSelected = clip.instanceId === selectedClipId;
                                return (
                                <div
                                    key={clip.instanceId}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (activeTool === 'split') {
                                            onSplitClip(clip.instanceId, currentTime);
                                        } else {
                                            onSelectClip(clip.instanceId);
                                        }
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, 'move', clip)}
                                    className={`absolute top-1/2 -translate-y-1/2 h-16 ${getClipBackgroundColor(track.type)} rounded-md overflow-hidden transition-all flex items-center ${isSelected ? 'border-4 border-cyan-400 shadow-lg' : `border-2 ${getClipBorderColor(track.type)}`} ${activeTool === 'select' ? 'cursor-move' : 'cursor-pointer'}`}
                                    style={{
                                        left: `${clip.timelineStart * PIXELS_PER_SECOND}px`,
                                        width: `${clip.duration * PIXELS_PER_SECOND}px`,
                                    }}
                                >
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-400/50 z-10"
                                        onMouseDown={e => handleMouseDown(e, 'trim-start', clip)}
                                    />
                                    <span className="p-2 text-xs text-white truncate pointer-events-none w-full text-center">{clip.text || asset?.name}</span>
                                    <div 
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-cyan-400/50 z-10"
                                        onMouseDown={e => handleMouseDown(e, 'trim-end', clip)}
                                    />
                                </div>
                            )})}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const InspectorPanel: React.FC<{
    selectedClip: TimelineClip | null;
    onUpdateClip: (updatedClip: TimelineClip) => void;
    onDeleteClip: (clipId: string) => void;
    onDuplicateClip: (clip: TimelineClip) => void;
    assets: MediaAsset[];
}> = ({ selectedClip, onUpdateClip, onDeleteClip, onDuplicateClip, assets }) => {
    const [isStyling, setIsStyling] = useState(false);

    if (!selectedClip) {
        return <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full items-center justify-center text-gray-500 p-4"><p className="text-center">Select a clip on the timeline to edit its properties.</p></div>;
    }

    const asset = assets.find(a => a.id === selectedClip.assetId);
    const isTextClip = !asset; // Text clips don't have a media asset

    const handleEffectChange = (type: ClipEffect['type'], value: number) => {
        const existingEffect = selectedClip.effects.find(e => e.type === type);
        let newEffects: ClipEffect[];
        if (existingEffect) {
            newEffects = selectedClip.effects.map(e => e.type === type ? { ...e, value } : e);
        } else {
            newEffects = [...selectedClip.effects, { id: `effect-${type}-${Date.now()}`, type, value }];
        }
        onUpdateClip({ ...selectedClip, effects: newEffects });
    };
    
    const handleTransitionChange = (
        edge: 'intro' | 'outro', 
        type: ClipTransition['type'] | 'none',
        duration: number
    ) => {
        const prop = edge === 'intro' ? 'transition' : 'outroTransition';
        if (type === 'none' || duration <= 0) {
             const { [prop]: _, ...rest } = selectedClip;
             onUpdateClip(rest as TimelineClip);
        } else {
            const newTransition: ClipTransition = { type, duration };
            onUpdateClip({ ...selectedClip, [prop]: newTransition });
        }
    };
    
    const handleStyleWithAi = async () => {
        if (!selectedClip.text || isStyling) return;
        setIsStyling(true);
        try {
            const styles = await styleTitleCard(selectedClip.text);
            onUpdateClip({ ...selectedClip, ...styles });
        } catch (error) {
            console.error("AI styling failed:", error);
            // Optionally show an error to the user
        } finally {
            setIsStyling(false);
        }
    };

    const getEffectValue = (type: ClipEffect['type'], defaultValue: number) => {
        return selectedClip.effects.find(e => e.type === type)?.value ?? defaultValue;
    };
    
    const transitionOptions: {value: ClipTransition['type'], label: string}[] = [
        { value: 'fade-in', label: 'Fade In' },
        { value: 'fade-out', label: 'Fade Out' },
        { value: 'wipe-left', label: 'Wipe Left' },
        { value: 'wipe-right', label: 'Wipe Right' },
    ];

    return (
        <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Inspector</h3>
                 <div className="flex items-center gap-2">
                    <button onClick={() => onDuplicateClip(selectedClip)} title="Duplicate Clip" className="p-2 rounded-md hover:bg-white/10 text-gray-300 hover:text-white"><CopyIcon className="w-4 h-4"/></button>
                    <button onClick={() => onDeleteClip(selectedClip.instanceId)} title="Delete Clip" className="p-2 rounded-md hover:bg-red-500/20 text-gray-300 hover:text-red-400"><Trash2Icon className="w-4 h-4"/></button>
                </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
                {isTextClip ? (
                    <div>
                        <div className="flex justify-between items-center mb-3">
                             <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300"><TextIcon className="w-4 h-4"/>Text Content</h4>
                             <button onClick={handleStyleWithAi} disabled={isStyling || !selectedClip.text} className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-50">
                                <SparklesIcon className="w-4 h-4 text-pink-400"/>
                                {isStyling ? 'Styling...' : 'Style with AI'}
                            </button>
                        </div>
                        <div className="space-y-4 text-xs">
                             <textarea value={selectedClip.text || ''} onChange={e => onUpdateClip({...selectedClip, text: e.target.value })} rows={3} className="w-full bg-black/20 border border-white/10 rounded-md p-2 text-sm text-[var(--text-secondary)] resize-y focus:outline-none focus:border-[var(--accent-primary)] transition-colors"/>
                            <label className="block space-y-1"><span>Font Size (vw)</span><input type="number" value={selectedClip.fontSize || 4} onChange={e => onUpdateClip({...selectedClip, fontSize: +e.target.value })} className="w-full bg-black/20 border border-white/10 rounded p-1"/> </label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="block space-y-1"><span>Text Color</span><input type="color" value={selectedClip.color || '#ffffff'} onChange={e => onUpdateClip({...selectedClip, color: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded p-1 h-8"/> </label>
                                <label className="block space-y-1"><span>Background</span><input type="color" value={selectedClip.backgroundColor || '#000000'} onChange={e => onUpdateClip({...selectedClip, backgroundColor: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded p-1 h-8"/> </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><BrushIcon className="w-4 h-4"/>Effects</h4>
                        <div className="space-y-4 text-xs">
                            <label className="block space-y-1">
                                <span>Brightness ({getEffectValue('brightness', 100)}%)</span>
                                <input type="range" min="0" max="200" value={getEffectValue('brightness', 100)} onChange={e => handleEffectChange('brightness', +e.target.value)} className="w-full" />
                            </label>
                             <label className="block space-y-1">
                                <span>Contrast ({getEffectValue('contrast', 100)}%)</span>
                                <input type="range" min="0" max="200" value={getEffectValue('contrast', 100)} onChange={e => handleEffectChange('contrast', +e.target.value)} className="w-full" />
                            </label>
                             <label className="block space-y-1">
                                <span>Grayscale ({getEffectValue('grayscale', 0)}%)</span>
                                <input type="range" min="0" max="100" value={getEffectValue('grayscale', 0)} onChange={e => handleEffectChange('grayscale', +e.target.value)} className="w-full" />
                            </label>
                        </div>
                    </div>
                )}
                
                {/* Transitions Panel */}
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><FilmIcon className="w-4 h-4"/>Transitions</h4>
                    <div className="space-y-4 text-xs">
                        {/* Intro Transition */}
                        <div className="p-2 bg-black/10 rounded-md">
                            <p className="font-semibold mb-2">Intro Transition</p>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={selectedClip.transition?.type || 'none'} onChange={e => handleTransitionChange('intro', e.target.value as any, selectedClip.transition?.duration || 1)} className="w-full bg-black/20 border border-white/10 rounded p-1">
                                    <option value="none">None</option>
                                    {transitionOptions.filter(t => !t.value.includes('out')).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <input type="number" min="0" step="0.1" value={selectedClip.transition?.duration || 0} onChange={e => handleTransitionChange('intro', selectedClip.transition?.type || 'fade-in', +e.target.value)} className="w-full bg-black/20 border border-white/10 rounded p-1" placeholder="Duration (s)"/>
                            </div>
                        </div>
                         {/* Outro Transition */}
                        <div className="p-2 bg-black/10 rounded-md">
                            <p className="font-semibold mb-2">Outro Transition</p>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={selectedClip.outroTransition?.type || 'none'} onChange={e => handleTransitionChange('outro', e.target.value as any, selectedClip.outroTransition?.duration || 1)} className="w-full bg-black/20 border border-white/10 rounded p-1">
                                    <option value="none">None</option>
                                    {transitionOptions.filter(t => !t.value.includes('in')).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                                <input type="number" min="0" step="0.1" value={selectedClip.outroTransition?.duration || 0} onChange={e => handleTransitionChange('outro', selectedClip.outroTransition?.type || 'fade-out', +e.target.value)} className="w-full bg-black/20 border border-white/10 rounded p-1" placeholder="Duration (s)"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ToolButton: React.FC<{label: string, Icon: React.ComponentType<{className?: string}>, isActive: boolean, onClick: () => void}> = ({ label, Icon, isActive, onClick }) => (
    <button 
        onClick={onClick} 
        title={label}
        className={`p-2 rounded-md ${isActive ? 'bg-[var(--accent-primary)] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'} transition-colors`}
    >
        <Icon className="w-5 h-5"/>
    </button>
);

const MobileNavButton: React.FC<{
  label: string;
  icon: React.ComponentType<{className?: string}>;
  view: 'editor' | 'library';
  activeView: 'editor' | 'library';
  onClick: (view: 'editor' | 'library') => void;
}> = ({ label, icon: Icon, view, activeView, onClick }) => (
  <button 
    onClick={() => onClick(view)} 
    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors w-full ${activeView === view ? 'text-[var(--accent-primary)] bg-black/20' : 'text-gray-400'}`}
  >
      <Icon className="w-6 h-6"/>
      <span className="text-xs font-semibold">{label}</span>
  </button>
);


// --- Main Component ---

const VideoStudio: React.FC = () => {
    const { toggleLeftSidebar, isLiteMode, setGlobalLoading } = useAppContext();
    const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
    const [tracks, setTracks] = useState<TimelineTrack[]>([
        { id: 'track-video-1', type: 'video', clips: [] },
        { id: 'track-text-1', type: 'text', clips: [] },
        { id: 'track-audio-1', type: 'audio', clips: [] },
    ]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'select' | 'split'>('select');
    const animationFrameRef = useRef<number | null>(null);
    const [showWarning, setShowWarning] = useState(isLiteMode);

    // Undo/Redo state
    const [history, setHistory] = useState<TimelineTrack[][]>([tracks]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const { width } = useWindowSize();
    const isMobile = width < 1024;
    const [mobileView, setMobileView] = useState<'editor' | 'library'>('editor');

    const updateTracksWithHistory = useCallback((newTracks: React.SetStateAction<TimelineTrack[]>) => {
        setTracks(currentTracks => {
            const resolvedTracks = typeof newTracks === 'function' ? newTracks(currentTracks) : newTracks;
            if (JSON.stringify(resolvedTracks) === JSON.stringify(currentTracks)) {
                return currentTracks;
            }
            
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(resolvedTracks);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);

            return resolvedTracks;
        });
    }, [history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setTracks(history[historyIndex - 1]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setTracks(history[historyIndex + 1]);
        }
    }, [history, historyIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
                handleDeleteClip(selectedClipId);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, selectedClipId]);


    useEffect(() => {
        setGlobalLoading(false);
        return () => setGlobalLoading(false);
    }, [setGlobalLoading]);
    
    const totalDuration = Math.max(20, ...tracks.flatMap(t => t.clips).map(c => c.timelineStart + c.duration));

    const handleFileUpload = async (files: FileList) => {
        const newAssets: MediaAsset[] = [];
        for (const file of Array.from(files)) {
            const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('image') ? 'image' : null;
            if (!type) continue;

            const src = URL.createObjectURL(file);
            const element = document.createElement(type === 'image' ? 'img' : type) as MediaAsset['element'];
            element.src = src;

            const duration = type === 'image' ? 5 : await getMediaDuration(element as HTMLMediaElement);
            
            const asset: MediaAsset = {
                id: `asset-${Date.now()}-${file.name}`,
                type,
                name: file.name,
                src,
                duration,
                element,
            };
            newAssets.push(asset);
        }
        setMediaAssets(prev => [...prev, ...newAssets]);
    };
    
    const handleVideoGenerated = (asset: MediaAsset) => {
        setMediaAssets(prev => [asset, ...prev]);
    };

    const handleDropOnTimeline = (assetId: string, trackId: string, timelineStart: number) => {
        const asset = mediaAssets.find(a => a.id === assetId);
        const targetTrack = tracks.find(t => t.id === trackId);
        
        if (!asset || !targetTrack) return;
        
        const isCorrectTrackType = (targetTrack.type === asset.type) || (targetTrack.type === 'video' && asset.type === 'image');
        if (!isCorrectTrackType) return;
        
        const newClip: TimelineClip = {
            id: `clip-${Date.now()}`,
            instanceId: `instance-${Date.now()}`,
            assetId: asset.id,
            trackId: trackId,
            trimStart: 0,
            trimEnd: asset.duration,
            timelineStart,
            duration: asset.duration,
            effects: [],
        };

        updateTracksWithHistory(prevTracks => prevTracks.map(track => 
            track.id === trackId ? { ...track, clips: [...track.clips, newClip] } : track
        ));
    };
    
    const handleAddText = (text: string, timelineStart: number, duration: number, transition?: ClipTransition, outroTransition?: ClipTransition) => {
        const textTrack = tracks.find(t => t.type === 'text');
        if (!textTrack) return;

        const newClip: TimelineClip = {
            id: `text-${Date.now()}`,
            instanceId: `instance-text-${Date.now()}`,
            assetId: 'text', // Special ID for text clips
            trackId: textTrack.id,
            timelineStart,
            duration,
            trimStart: 0,
            trimEnd: duration,
            effects: [],
            text,
            fontSize: 5,
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: { x: 50, y: 50 },
            transition,
            outroTransition,
        };
        
        updateTracksWithHistory(prev => prev.map(track => track.id === textTrack.id ? {...track, clips: [...track.clips, newClip]} : track));
        setSelectedClipId(newClip.instanceId);
    };
    
     const handleAddTemplate = (type: 'intro' | 'outro') => {
        if (type === 'intro') {
            handleAddText('Your Title Here', 0, 5, { type: 'fade-in', duration: 1 });
        } else if (type === 'outro') {
            const startTime = Math.max(0, totalDuration - 5);
            handleAddText('Thanks for watching!', startTime, 5, undefined, { type: 'fade-out', duration: 2 });
        }
    };
    
    const handleSplitClip = (clipInstanceId: string, time: number) => {
        updateTracksWithHistory(prevTracks => {
            const originalTrack = prevTracks.find(t => t.clips.some(c => c.instanceId === clipInstanceId));
            const originalClip = originalTrack?.clips.find(c => c.instanceId === clipInstanceId);

            if (!originalTrack || !originalClip) return prevTracks;

            // Ensure playhead is actually within the clip's bounds
            if (time <= originalClip.timelineStart || time >= originalClip.timelineStart + originalClip.duration) {
                return prevTracks;
            }

            const newTracks = JSON.parse(JSON.stringify(prevTracks));
            const trackToModify = newTracks.find((t: TimelineTrack) => t.id === originalTrack.id)!;
            const clipIndex = trackToModify.clips.findIndex((c: TimelineClip) => c.instanceId === clipInstanceId);
            const clipToSplit = trackToModify.clips[clipIndex];

            const splitPointInClipTime = time - originalClip.timelineStart;

            const firstPartDuration = splitPointInClipTime;
            clipToSplit.duration = firstPartDuration;
            clipToSplit.trimEnd = originalClip.trimStart + firstPartDuration;
            
            const secondPartDuration = originalClip.duration - firstPartDuration;
            const secondPart: TimelineClip = {
                ...originalClip,
                id: `clip-${Date.now()}`,
                instanceId: `instance-${Date.now()}`,
                timelineStart: time,
                duration: secondPartDuration,
                trimStart: clipToSplit.trimEnd,
                trimEnd: originalClip.trimEnd,
            };

            trackToModify.clips.splice(clipIndex + 1, 0, secondPart);
            return newTracks;
        });
    };

    const handleUpdateClip = (updatedClip: TimelineClip) => {
        updateTracksWithHistory(prevTracks => prevTracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => clip.instanceId === updatedClip.instanceId ? updatedClip : clip)
        })));
    };

    const handleDeleteClip = (clipId: string) => {
        updateTracksWithHistory(prev => prev.map(track => ({
            ...track,
            clips: track.clips.filter(clip => clip.instanceId !== clipId)
        })));
        setSelectedClipId(null);
    };

    const handleDuplicateClip = (clipToDuplicate: TimelineClip) => {
        const newClip: TimelineClip = {
            ...clipToDuplicate,
            id: `clip-${Date.now()}`,
            instanceId: `instance-${Date.now()}`,
            timelineStart: clipToDuplicate.timelineStart + clipToDuplicate.duration,
        };

        updateTracksWithHistory(prev => prev.map(track => {
            if (track.id !== newClip.trackId) return track;
            const clipIndex = track.clips.findIndex(c => c.instanceId === clipToDuplicate.instanceId);
            const newClips = [...track.clips];
            newClips.splice(clipIndex + 1, 0, newClip);
            return { ...track, clips: newClips };
        }));
    };
    
    const togglePlay = () => {
        if (!isPlaying && currentTime >= totalDuration - 0.01) {
            setCurrentTime(0);
        }
        setIsPlaying(prev => !prev);
    };

    useEffect(() => {
        if (!isPlaying) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }
        let animationStartTime: number | null = null;
        const startPlaybackTime = currentTime;

        const animate = (timestamp: number) => {
            if (animationStartTime === null) {
                animationStartTime = timestamp;
            }
            const elapsedTime = (timestamp - animationStartTime) / 1000;
            const newTime = startPlaybackTime + elapsedTime;

            if (newTime >= totalDuration) {
                setCurrentTime(totalDuration);
                setIsPlaying(false);
            } else {
                setCurrentTime(newTime);
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, totalDuration, currentTime]);

    const selectedClip = tracks.flatMap(t => t.clips).find(c => c.instanceId === selectedClipId) || null;

    const desktopLayout = (
        <div className="flex flex-col lg:flex-row flex-1 p-4 gap-4 min-h-0">
            <div className="w-full lg:w-1/4 lg:min-w-[250px] flex-shrink-0 h-full">
                {selectedClip ? (
                    <InspectorPanel selectedClip={selectedClip} onUpdateClip={handleUpdateClip} onDeleteClip={handleDeleteClip} onDuplicateClip={handleDuplicateClip} assets={mediaAssets} />
                ) : (
                    <MediaBin assets={mediaAssets} onUpload={handleFileUpload} onVideoGenerated={handleVideoGenerated} onAddTemplate={handleAddTemplate}/>
                )}
            </div>
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="flex-[3] min-h-0">
                     <PreviewPlayer assets={mediaAssets} tracks={tracks} currentTime={currentTime} isPlaying={isPlaying} onTogglePlay={togglePlay}/>
                </div>
                <div className="flex items-center gap-2 p-2 bg-black/20 rounded-md">
                    <ToolButton label="Select/Move Tool" Icon={MoveIcon} isActive={activeTool === 'select'} onClick={() => setActiveTool('select')} />
                    <ToolButton label="Split Tool" Icon={ScissorsIcon} isActive={activeTool === 'split'} onClick={() => setActiveTool('split')} />
                    <ToolButton label="Add Text" Icon={TypeIcon} isActive={false} onClick={() => handleAddText('New Text', currentTime, 5)} />
                </div>
                <div className="flex-[2] min-h-[200px]">
                    <Timeline 
                        assets={mediaAssets} 
                        tracks={tracks} 
                        currentTime={currentTime} 
                        totalDuration={totalDuration} 
                        selectedClipId={selectedClipId}
                        activeTool={activeTool}
                        onScrub={(time) => {
                            if (isPlaying) setIsPlaying(false);
                            setCurrentTime(time);
                        }} 
                        onDrop={handleDropOnTimeline}
                        onSelectClip={setSelectedClipId}
                        onUpdateClip={handleUpdateClip}
                        onSplitClip={handleSplitClip}
                    />
                </div>
            </div>
        </div>
    );

    const mobileLayout = (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 p-2 min-h-0">
                {mobileView === 'editor' && (
                    <div className="flex flex-col h-full gap-2">
                        <div className="flex-1 min-h-0">
                            <PreviewPlayer assets={mediaAssets} tracks={tracks} currentTime={currentTime} isPlaying={isPlaying} onTogglePlay={togglePlay}/>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-black/20 rounded-md">
                            <ToolButton label="Select/Move Tool" Icon={MoveIcon} isActive={activeTool === 'select'} onClick={() => setActiveTool('select')} />
                            <ToolButton label="Split Tool" Icon={ScissorsIcon} isActive={activeTool === 'split'} onClick={() => setActiveTool('split')} />
                            <ToolButton label="Add Text" Icon={TypeIcon} isActive={false} onClick={() => handleAddText('New Text', currentTime, 5)} />
                        </div>
                        <div className="h-1/3 min-h-[150px]">
                            <Timeline 
                                assets={mediaAssets} tracks={tracks} currentTime={currentTime} totalDuration={totalDuration} 
                                selectedClipId={selectedClipId} activeTool={activeTool} onScrub={(time) => { if (isPlaying) setIsPlaying(false); setCurrentTime(time); }} 
                                onDrop={handleDropOnTimeline} onSelectClip={setSelectedClipId} onUpdateClip={handleUpdateClip} onSplitClip={handleSplitClip}
                            />
                        </div>
                    </div>
                )}
                {mobileView === 'library' && (
                    <div className="h-full">
                        {selectedClip ? (
                            <InspectorPanel selectedClip={selectedClip} onUpdateClip={handleUpdateClip} onDeleteClip={handleDeleteClip} onDuplicateClip={handleDuplicateClip} assets={mediaAssets} />
                        ) : (
                            <MediaBin assets={mediaAssets} onUpload={handleFileUpload} onVideoGenerated={handleVideoGenerated} onAddTemplate={handleAddTemplate}/>
                        )}
                    </div>
                )}
            </div>
            <div className="flex justify-around items-center p-1 bg-[var(--bg-secondary)] border-t border-white/10 shrink-0">
                <MobileNavButton label="Editor" icon={ScissorsIcon} view="editor" activeView={mobileView} onClick={setMobileView} />
                <MobileNavButton label="Library" icon={ImageIcon} view="library" activeView={mobileView} onClick={setMobileView} />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
            <header className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={toggleLeftSidebar} className="p-2 rounded-full hover:bg-white/10 lg:hidden">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <ClapperboardIcon className="w-8 h-8 text-[var(--accent-primary)]" />
                    <div>
                        <h1 className="text-lg font-semibold text-white">Video Studio</h1>
                        <p className="text-xs text-[var(--text-secondary)]">A timeline-based editor to assemble clips, audio, and images into a video.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleUndo} disabled={historyIndex === 0} title="Undo (Cmd+Z)" className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50"><RotateCcwIcon className="w-5 h-5"/></button>
                    <button onClick={handleRedo} disabled={historyIndex === history.length - 1} title="Redo (Cmd+Shift+Z)" className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50"><RotateCwIcon className="w-5 h-5"/></button>
                    <button onClick={() => alert('Video rendering is coming soon!')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">
                        <DownloadIcon className="w-5 h-5" />
                        Export Video
                    </button>
                </div>
            </header>

            {showWarning && (
                <div className="bg-yellow-500/20 text-yellow-300 p-2 text-sm flex items-center justify-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4" />
                    Lite Mode: Video editing may be slow on this device.
                    <button onClick={() => setShowWarning(false)} className="ml-auto p-1"><XIcon className="w-4 h-4"/></button>
                </div>
            )}
            
            {isMobile ? mobileLayout : desktopLayout}
        </div>
    );
};

export default VideoStudio;