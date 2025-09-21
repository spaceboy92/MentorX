import React from 'react';

const BrandingFooter: React.FC = () => {
    return (
        <footer className="absolute bottom-2 right-3 text-xs text-gray-600 z-10 hidden md:block">
            Powered by <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-500 hover:text-[var(--accent-primary)] transition-colors">
                Google Gemini
            </a>
        </footer>
    );
};

export default BrandingFooter;
