import React, { useState, useEffect } from 'react';
import { MentorXLogoIcon } from './icons/Icons';

const WelcomeScreen: React.FC = () => {
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isGone, setIsGone] = useState(false);

    useEffect(() => {
        const animationTimer = setTimeout(() => {
            setIsAnimatingOut(true);
        }, 1500);

        const removalTimer = setTimeout(() => {
            setIsGone(true);
        }, 2500);

        return () => {
            clearTimeout(animationTimer);
            clearTimeout(removalTimer);
        };
    }, []);

    if (isGone) {
        return null;
    }

    return (
        <>
            <style>{`
                .welcome-screen-container {
                    background: #0d1127; /* Match primary bg */
                }
                .logo-animate path {
                    animation-fill-mode: forwards;
                    stroke-dasharray: 250;
                    stroke-dashoffset: 250;
                }
                /* M Shape */
                .logo-animate path:nth-of-type(1) {
                    animation: draw-logo-path 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) 0.2s forwards;
                }
                
                .welcome-text, .welcome-subtitle {
                    opacity: 0;
                    animation: fade-in-text 0.8s ease-in forwards;
                }
                .welcome-text {
                    animation-delay: 1s;
                }
                .welcome-subtitle {
                    animation-delay: 1.2s;
                }

                @keyframes draw-logo-path {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
                
                @keyframes fade-in-text {
                    to { opacity: 1; }
                }
            `}</style>
            <div
                className={`welcome-screen-container fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-1000 ${
                    isAnimatingOut ? 'opacity-0' : 'opacity-100'
                }`}
            >
                <div className="flex flex-col items-center gap-4">
                    <MentorXLogoIcon className="w-40 h-40 logo-animate" />
                    <div className="text-center">
                        <h1 className="text-5xl font-bold text-white welcome-text tracking-widest -mt-4">MentorX</h1>
                        <p className="text-lg text-[var(--text-secondary)] welcome-subtitle mt-2">Your AI-Powered Workspace</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WelcomeScreen;