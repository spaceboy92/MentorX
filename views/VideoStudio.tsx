import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MediaAsset, TimelineClip, TimelineTrack, ClipEffect, ClipTransition } from '../types';
import { UploadIcon, FilmIcon, MusicIcon, ImageIcon, PlayIcon, PauseIcon, ScissorsIcon, BrushIcon, TypeIcon, MoveIcon, TextIcon, DownloadIcon } from '../components/icons/Icons';

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

const MediaBin: React.FC<{
    assets: MediaAsset[];
    onUpload: (files: FileList) => void;
}> = ({ assets, onUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ assetId: asset.id }));
    };

    return (
        <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white p-4 border-b border-white/10">Media Library</h3>
            <div className="flex-1 p-2 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 content-start">
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
            <div className="p-4 border-t border-white/10">
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => e.target.files && onUpload(e.target.files)}
                    accept="video/*,audio/*,image/*"
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
    
    const filterStyle = currentVideoClip?.effects.map(effect => {
        switch(effect.type) {
            case 'brightness': return `brightness(${effect.value}%)`;
            case 'contrast': return `contrast(${effect.value}%)`;
            case 'grayscale': return `grayscale(${effect.value}%)`;
            default: return '';
        }
    }).join(' ');
    
    let opacity = 1;
    if (currentVideoClip?.transition?.type === 'fade-in') {
        const progress = (currentTime - currentVideoClip.timelineStart) / currentVideoClip.transition.duration;
        if (progress < 1) {
            opacity = progress;
        }
    }

    return (
        <div className="bg-black rounded-lg w-full h-full flex items-center justify-center relative group overflow-hidden">
            <video ref={videoRef} className="max-w-full max-h-full" style={{ filter: filterStyle, opacity }} />

            {/* Text Overlays */}
            <div className="absolute inset-0 pointer-events-none w-full h-full">
                {activeTextClips.map(clip => (
                    <div 
                        key={clip.instanceId}
                        className="p-2 rounded"
                        style={{
                            position: 'absolute',
                            left: `${clip.position?.x ?? 50}%`,
                            top: `${clip.position?.y ?? 50}%`,
                            transform: 'translate(-50%, -50%)',
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
                ))}
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
    assets: MediaAsset[];
}> = ({ selectedClip, onUpdateClip, assets }) => {
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
    
    const handleTransitionChange = (type: ClipTransition['type'], duration: number) => {
        if (duration <= 0) {
            onUpdateClip({ ...selectedClip, transition: undefined });
        } else {
            const newTransition: ClipTransition = { type, duration };
            onUpdateClip({ ...selectedClip, transition: newTransition });
        }
    };

    const getEffectValue = (type: ClipEffect['type'], defaultValue: number) => {
        return selectedClip.effects.find(e => e.type === type)?.value ?? defaultValue;
    };

    return (
        <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white p-4 border-b border-white/10">Inspector</h3>
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
                {isTextClip ? (
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><TextIcon className="w-4 h-4"/>Text Content</h4>
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
                    <>
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
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3"><FilmIcon className="w-4 h-4"/>Transitions</h4>
                             <div className="space-y-2 text-xs">
                                 <label className="block space-y-1"><span>Fade In Duration (s)</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.1"
                                        value={selectedClip.transition?.type === 'fade-in' ? selectedClip.transition.duration : 0} 
                                        onChange={e => handleTransitionChange('fade-in', +e.target.value )} 
                                        className="w-full bg-black/20 border border-white/10 rounded p-1"/>
                                 </label>
                             </div>
                        </div>
                    </>
                )}
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


// --- Main Component ---

const VideoStudio: React.FC = () => {
    const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
    const [tracks, setTracks] =useState<TimelineTrack[]>([
        { id: 'track-video-1', type: 'video', clips: [] },
        { id: 'track-text-1', type: 'text', clips: [] },
        { id: 'track-audio-1', type: 'audio', clips: [] },
    ]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'select' | 'split'>('select');
    const animationFrameRef = useRef<number | null>(null);
    
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

        setTracks(prevTracks => prevTracks.map(track => 
            track.id === trackId ? { ...track, clips: [...track.clips, newClip] } : track
        ));
    };
    
    const handleAddText = () => {
        const textTrack = tracks.find(t => t.type === 'text');
        if (!textTrack) return;

        const newClip: TimelineClip = {
            id: `text-${Date.now()}`,
            instanceId: `instance-text-${Date.now()}`,
            assetId: 'text', // Special ID for text clips
            trackId: textTrack.id,
            timelineStart: currentTime,
            duration: 5,
            trimStart: 0,
            trimEnd: 5,
            effects: [],
            text: 'New Text',
            fontSize: 5,
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: { x: 50, y: 50 },
        };
        
        setTracks(prev => prev.map(track => track.id === textTrack.id ? {...track, clips: [...track.clips, newClip]} : track));
        setSelectedClipId(newClip.instanceId);
    };
    
    const handleSplitClip = (clipInstanceId: string, time: number) => {
        setTracks(prevTracks => {
            const originalTrack = prevTracks.find(t => t.clips.some(c => c.instanceId === clipInstanceId));
            const originalClip = originalTrack?.clips.find(c => c.instanceId === clipInstanceId);

            if (!originalTrack || !originalClip) return prevTracks;

            // Ensure playhead is actually within the clip's bounds
            if (time <= originalClip.timelineStart || time >= originalClip.timelineStart + originalClip.duration) {
                return prevTracks;
            }

            // Create a mutable copy to work with
            const newTracks = JSON.parse(JSON.stringify(prevTracks));
            const trackToModify = newTracks.find((t: TimelineTrack) => t.id === originalTrack.id)!;
            const clipIndex = trackToModify.clips.findIndex((c: TimelineClip) => c.instanceId === clipInstanceId);
            const clipToSplit = trackToModify.clips[clipIndex];

            const splitPointInClipTime = time - originalClip.timelineStart;

            // Part 1 (modifies the clip in the copied state)
            const firstPartDuration = splitPointInClipTime;
            clipToSplit.duration = firstPartDuration;
            clipToSplit.trimEnd = originalClip.trimStart + firstPartDuration;
            
            // Part 2 (new clip)
            const secondPartDuration = originalClip.duration - firstPartDuration;
            const secondPart: TimelineClip = {
                ...originalClip, // Use original clip as base to preserve properties like effects
                id: `clip-${Date.now()}`,
                instanceId: `instance-${Date.now()}`,
                timelineStart: time,
                duration: secondPartDuration,
                trimStart: clipToSplit.trimEnd, // Start where the first part ended in the source asset
                trimEnd: originalClip.trimEnd, // End where the original clip ended
            };

            trackToModify.clips.splice(clipIndex + 1, 0, secondPart);
            return newTracks;
        });
    };

    const handleUpdateClip = (updatedClip: TimelineClip) => {
        setTracks(prevTracks => prevTracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => clip.instanceId === updatedClip.instanceId ? updatedClip : clip)
        })));
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

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
            <header className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <FilmIcon className="w-8 h-8 text-[var(--accent-primary)]" />
                    <div>
                        <h1 className="text-lg font-semibold text-white">Video Studio</h1>
                        <p className="text-xs text-[var(--text-secondary)]">Create and edit videos on the timeline.</p>
                    </div>
                </div>
                 <button onClick={() => alert('Video rendering is coming soon!')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">
                    <DownloadIcon className="w-5 h-5" />
                    Export Video
                </button>
            </header>
            <div className="flex flex-col lg:flex-row flex-1 p-4 gap-4 min-h-0">
                <div className="w-full lg:w-1/4 lg:min-w-[250px] flex-shrink-0 h-full">
                    {selectedClip ? (
                        <InspectorPanel selectedClip={selectedClip} onUpdateClip={handleUpdateClip} assets={mediaAssets} />
                    ) : (
                        <MediaBin assets={mediaAssets} onUpload={handleFileUpload} />
                    )}
                </div>
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="flex-[3] min-h-0">
                         <PreviewPlayer assets={mediaAssets} tracks={tracks} currentTime={currentTime} isPlaying={isPlaying} onTogglePlay={togglePlay}/>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-black/20 rounded-md">
                        <ToolButton label="Select/Move Tool" Icon={MoveIcon} isActive={activeTool === 'select'} onClick={() => setActiveTool('select')} />
                        <ToolButton label="Split Tool" Icon={ScissorsIcon} isActive={activeTool === 'split'} onClick={() => setActiveTool('split')} />
                        <ToolButton label="Add Text" Icon={TypeIcon} isActive={false} onClick={handleAddText} />
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
        </div>
    );
};

export default VideoStudio;
