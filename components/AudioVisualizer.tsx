import React, { useEffect, useRef } from 'react';

const AudioVisualizer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let isMounted = true;

        const setupAudio = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('Audio visualization not supported: getUserMedia not available.');
                return;
            }
            
            try {
                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                if (!isMounted) {
                     streamRef.current.getTracks().forEach(track => track.stop());
                    return;
                };

                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;
                analyserRef.current = audioContext.createAnalyser();
                analyserRef.current.fftSize = 256;
                sourceRef.current = audioContext.createMediaStreamSource(streamRef.current);
                sourceRef.current.connect(analyserRef.current);

                draw();

            } catch (err) {
                console.error('Error accessing microphone for visualizer:', err);
            }
        };

        setupAudio();

        return () => {
            isMounted = false;
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const draw = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        const analyser = analyserRef.current;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
        
        const rootStyle = getComputedStyle(document.documentElement);
        const primaryAccent = rootStyle.getPropertyValue('--accent-primary').trim();
        const secondaryAccent = rootStyle.getPropertyValue('--accent-secondary').trim();

        const gradient = canvasCtx.createLinearGradient(0, 0, WIDTH, 0);
        gradient.addColorStop(0, primaryAccent);
        gradient.addColorStop(1, secondaryAccent);

        const renderFrame = () => {
            animationFrameIdRef.current = requestAnimationFrame(renderFrame);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

            let x = 0;
            const barWidth = (WIDTH / bufferLength);

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = Math.pow(dataArray[i] / 255, 2) * HEIGHT;
                
                canvasCtx.fillStyle = gradient;
                canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        renderFrame();
    };

    return (
        <canvas 
            ref={canvasRef} 
            width="1000" 
            height="50" 
            className="fixed bottom-0 left-0 w-full h-4 z-50 pointer-events-none opacity-50" 
        />
    );
};

export default AudioVisualizer;