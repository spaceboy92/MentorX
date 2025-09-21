import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { MentorXLogoIcon, BrainCircuitIcon, CodeIcon, FileCodeIcon, XIcon } from './icons/Icons';

const FeatureCard = ({ Icon, title, description }) => (
    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
        <div className="flex-shrink-0 p-2 bg-white/10 rounded-lg">
            <Icon className="w-6 h-6 text-[var(--accent-primary)]"/>
        </div>
        <div>
            <h4 className="font-semibold text-white">{title}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
    </div>
);

const OnboardingModal: React.FC = () => {
    const { completeOnboarding } = useAppContext();

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="bg-[var(--bg-secondary)] w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col m-4">
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                     <div className="flex items-center gap-3">
                        <MentorXLogoIcon className="w-8 h-8" />
                        <h2 className="text-2xl font-bold text-white">Welcome to MentorX!</h2>
                    </div>
                    <button onClick={completeOnboarding} className="p-2 rounded-full hover:bg-white/10">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                <div className="p-6 space-y-4">
                    <p className="text-center text-lg text-[var(--text-secondary)]">
                        Your all-in-one AI workspace. Here's a quick look at what you can do:
                    </p>
                    <div className="space-y-3">
                        <FeatureCard 
                            Icon={BrainCircuitIcon} 
                            title="AI Personas"
                            description="Select specialized AI assistants from the dashboard, each with a unique expertise for your tasks."
                        />
                        <FeatureCard 
                            Icon={CodeIcon} 
                            title="Code Canvas"
                            description="A live coding environment where you can build with HTML, CSS, and JS, guided by an AI developer."
                        />
                         <FeatureCard 
                            Icon={FileCodeIcon} 
                            title="Multi-Modal Analysis"
                            description="Analyze and discuss various file types, including images, right within your chat."
                        />
                    </div>
                </div>
                <footer className="p-6 border-t border-white/10">
                     <button 
                        onClick={completeOnboarding}
                        className="w-full bg-[var(--accent-primary)] text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity active:scale-95 text-lg"
                    >
                        Get Started
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default OnboardingModal;