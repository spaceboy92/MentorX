import React from 'react';

const BrandingFooter: React.FC = () => {
    return (
        <div className="fixed bottom-4 right-4 z-50 group">
            <div className="relative flex items-center justify-center w-20 h-20">
                {/* Text that appears on hover */}
                <div className="absolute right-full mr-2 whitespace-nowrap bg-[var(--bg-secondary)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 translate-x-4 pointer-events-none">
                    <p className="font-semibold text-sm">Made with <span className="text-red-400">♥</span> by MentorX</p>
                </div>
                
                {/* Anime Character SVG */}
                <svg
                    width="80"
                    height="80"
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                    className="cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                >
                    <defs>
                        <linearGradient id="skin-gradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#ffefd5" />
                            <stop offset="100%" stopColor="#ffd1b3" />
                        </linearGradient>
                         <linearGradient id="hair-gradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="var(--accent-secondary)" />
                            <stop offset="100%" stopColor="#f0abfc" />
                        </linearGradient>
                        <linearGradient id="shirt-gradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="var(--accent-primary)" />
                            <stop offset="100%" stopColor="#a5b4fc" />
                        </linearGradient>
                    </defs>

                    {/* Body */}
                    <path d="M40 75 Q 50 85, 60 75 L 65 95 L 35 95 Z" fill="url(#shirt-gradient)" />
                    
                    {/* Head */}
                    <circle cx="50" cy="45" r="20" fill="url(#skin-gradient)" />
                    
                    {/* Hair */}
                    <path d="M30 45 Q 25 25, 50 25 T 70 45 Q 75 60 65 60 L 60 40 L 40 40 L 35 60 Q 25 60 30 45 Z" fill="url(#hair-gradient)" />
                    <path d="M 65 50 C 75 55, 75 70, 65 75" stroke="url(#hair-gradient)" strokeWidth="8" fill="none" strokeLinecap="round" />
                     <path d="M 35 50 C 25 55, 25 70, 35 75" stroke="url(#hair-gradient)" strokeWidth="8" fill="none" strokeLinecap="round" />


                    {/* Eyes */}
                    <circle cx="42" cy="48" r="2.5" fill="#333" className="transition-transform duration-300 group-hover:scale-y-0" />
                    <circle cx="58" cy="48" r="2.5" fill="#333" className="transition-transform duration-300 group-hover:scale-y-0" />
                    {/* Blinking eyes */}
                    <path d="M 39 48 Q 42 46, 45 48" stroke="#333" strokeWidth="1.5" fill="none" className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <path d="M 55 48 Q 58 46, 61 48" stroke="#333" strokeWidth="1.5" fill="none" className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />


                    {/* Smile */}
                    <path d="M45 55 Q 50 60, 55 55" stroke="#333" strokeWidth="1.5" fill="none" />

                    {/* Arms - these will animate */}
                    <g className="transition-transform duration-500 ease-in-out" style={{transformOrigin: '40px 80px'}}>
                         {/* Left Arm */}
                         <path d="M40 80 C 20 70, 20 90, 30 95" stroke="url(#skin-gradient)" strokeWidth="10" fill="none" strokeLinecap="round" className="group-hover:-rotate-[30deg] group-hover:translate-x-4 group-hover:-translate-y-8" />
                    </g>
                    <g className="transition-transform duration-500 ease-in-out" style={{transformOrigin: '60px 80px'}}>
                        {/* Right Arm */}
                        <path d="M60 80 C 80 70, 80 90, 70 95" stroke="url(#skin-gradient)" strokeWidth="10" fill="none" strokeLinecap="round" className="group-hover:rotate-[30deg] group-hover:-translate-x-4 group-hover:-translate-y-8" />
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default BrandingFooter;
