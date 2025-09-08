import React, { useState, useRef, useEffect } from 'react';
import type { MediaAsset, TimelineClip, TimelineTrack, ClipEffect } from '../types';
import { UploadIcon, FilmIcon, MusicIcon, ImageIcon, PlayIcon, PauseIcon, ScissorsIcon, BrushIcon } from '../components/icons/Icons';

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
    
    const currentVideoClip = videoTrack?.clips.find(c => currentTime >= c.timelineStart && currentTime < c.timelineStart + c.duration);
    const videoAsset = assets.find(a => a.id === currentVideoClip?.assetId);

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

    return (
        <div className="bg-black rounded-lg w-full h-full flex items-center justify-center relative group">
            <video ref={videoRef} className="max-w-full max-h-full" style={{ filter: filterStyle }} />
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
    onScrub: (time: number) => void;
    onDrop: (assetId: string, trackId: string, timelineStart: number) => void;
    onSelectClip: (clipInstanceId: string | null) => void;
}> = ({ assets, tracks, currentTime, totalDuration, selectedClipId, onScrub, onDrop, onSelectClip }) => {
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const PIXELS_PER_SECOND = 50;
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

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
        if (e.buttons !== 1) return; // Only scrub when mouse is down
        if (!e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = Math.max(0, (x + e.currentTarget.scrollLeft) / PIXELS_PER_SECOND);
        onScrub(time);
    };
    
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onSelectClip(null);
      }
    }

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
                                    onClick={(e) => { e.stopPropagation(); onSelectClip(clip.instanceId); }}
                                    className={`absolute top-1/2 -translate-y-1/2 h-16 bg-indigo-500/50 rounded-md overflow-hidden cursor-pointer transition-all ${isSelected ? 'border-4 border-cyan-400 shadow-lg' : 'border-2 border-indigo-400'}`}
                                    style={{
                                        left: `${clip.timelineStart * PIXELS_PER_SECOND}px`,
                                        width: `${clip.duration * PIXELS_PER_SECOND}px`,
                                    }}
                                >
                                    <span className="p-2 text-xs text-white truncate pointer-events-none absolute inset-0 bg-black/20 flex items-center">{asset?.name}</span>
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
}> = ({ selectedClip, onUpdateClip }) => {
    if (!selectedClip) {
        return <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full items-center justify-center text-gray-500 p-4"><p className="text-center">Select a clip on the timeline to edit its properties.</p></div>;
    }

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

    const getEffectValue = (type: ClipEffect['type'], defaultValue: number) => {
        return selectedClip.effects.find(e => e.type === type)?.value ?? defaultValue;
    };

    return (
        <div className="bg-[var(--bg-secondary)]/50 rounded-lg border border-white/10 flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white p-4 border-b border-white/10">Inspector</h3>
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2"><ScissorsIcon className="w-4 h-4"/>Properties</h4>
                    {/* Trim controls can be added here */}
                </div>
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
            </div>
        </div>
    );
};

// --- Main Component ---

const VideoStudio: React.FC = () => {
    const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
    const [tracks, setTracks] =useState<TimelineTrack[]>([
        { id: 'track-video-1', type: 'video', clips: [] },
        { id: 'track-audio-1', type: 'audio', clips: [] },
    ]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    // FIX: Correctly initialize useRef for animation frame ID to allow null values.
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

    const handleUpdateClip = (updatedClip: TimelineClip) => {
        setTracks(prevTracks => prevTracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => clip.instanceId === updatedClip.instanceId ? updatedClip : clip)
        })));
    };

    // FIX: Improved togglePlay logic to handle resetting playback from the end of the timeline.
    const togglePlay = () => {
        // If at the end of the timeline, reset to the beginning before playing
        if (!isPlaying && currentTime >= totalDuration) {
            setCurrentTime(0);
        }
        setIsPlaying(prev => !prev);
    };

    // FIX: Replaced flawed animation logic with a robust implementation.
    // This new useEffect hook correctly uses the high-resolution timestamp from `requestAnimationFrame`
    // and removes `currentTime` from its dependency array to prevent an infinite re-render loop,
    // which was the likely cause of the original error.
    useEffect(() => {
        if (!isPlaying) {
            return;
        }

        let animationStartTime: number | null = null;
        // Capture the timeline position when playback starts
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
        
        // Start the animation loop
        animationFrameRef.current = requestAnimationFrame(animate);

        // Cleanup function to stop the animation frame when the component unmounts or dependencies change
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
        // This effect should only re-run when the playing state or total duration changes.
        // currentTime is updated inside the effect, so it's not a dependency.
        // Scrubbing (handled below) pauses playback, allowing this effect to pick up the new currentTime when play is resumed.
    }, [isPlaying, totalDuration]);

    const selectedClip = tracks.flatMap(t => t.clips).find(c => c.instanceId === selectedClipId) || null;

    return (
        <div className="flex flex-col lg:flex-row h-full bg-[var(--bg-primary)] p-4 gap-4">
            <div className="w-full h-1/3 lg:h-full lg:w-1/4 lg:min-w-[250px]">
                {selectedClip ? (
                    <InspectorPanel selectedClip={selectedClip} onUpdateClip={handleUpdateClip} />
                ) : (
                    <MediaBin assets={mediaAssets} onUpload={handleFileUpload} />
                )}
            </div>
            <div className="w-full h-2/3 lg:h-full lg:w-3/4 flex flex-col gap-4 min-w-0">
                <div className="h-3/5 min-h-[200px]">
                     <PreviewPlayer assets={mediaAssets} tracks={tracks} currentTime={currentTime} isPlaying={isPlaying} onTogglePlay={togglePlay}/>
                </div>
                <div className="h-2/5 min-h-[200px]">
                    <Timeline 
                        assets={mediaAssets} 
                        tracks={tracks} 
                        currentTime={currentTime} 
                        totalDuration={totalDuration} 
                        selectedClipId={selectedClipId}
                        // FIX: Added logic to pause playback on scrub to prevent animation conflicts.
                        onScrub={(time) => {
                            if (isPlaying) setIsPlaying(false); // Pause on scrub
                            setCurrentTime(time);
                        }} 
                        onDrop={handleDropOnTimeline}
                        onSelectClip={setSelectedClipId}
                    />
                </div>
            </div>
        </div>
    );
};

export default VideoStudio;