import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { XIcon, LayoutTemplateIcon, PinIcon, ImageIcon, ClapperboardIcon, StickyNoteIcon } from './icons/Icons';
import type { Widget, ImageRecord } from '../types';

const PinnedWidget: React.FC<{ widget: Widget }> = ({ widget }) => (
  <div className="bg-black/20 p-2 rounded-lg border border-white/10 group relative">
    <h4 className="text-xs font-semibold truncate mb-1 text-white">{widget.name}</h4>
    <div className="aspect-video bg-grid-pattern overflow-hidden rounded-md">
       <div className="w-full h-full transform scale-[0.3] origin-top-left pointer-events-none">
          <div dangerouslySetInnerHTML={{ __html: widget.html }} />
      </div>
    </div>
  </div>
);

const GeneratedImage: React.FC<{ image: ImageRecord }> = ({ image }) => (
    <div className="bg-black/20 rounded-lg border border-white/10 group relative overflow-hidden">
        <img src={image.url} alt={image.prompt} className="w-full h-auto aspect-square object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
        </div>
    </div>
);

const RightSidebar: React.FC = () => {
  const { isRightSidebarOpen, toggleRightSidebar, pinnedWidgets, generatedImages, notes, setNotes } = useAppContext();

  return (
    <aside className={`
      bg-panel border-l border-white/10 shadow-2xl h-full w-full
      fixed top-0 right-0 h-full z-30 w-[85%] max-w-xs transition-transform duration-300 ease-in-out
      ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      lg:relative lg:translate-x-0 lg:w-full lg:max-w-none
    `}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Workspace</h2>
          <button onClick={toggleRightSidebar} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 lg:hidden">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gray-400 uppercase flex items-center gap-2">
                <StickyNoteIcon className="w-4 h-4"/>
                Scratchpad
            </h3>
             <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Jot down your notes here... They are saved automatically."
                className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gray-400 uppercase flex items-center gap-2">
                <PinIcon className="w-4 h-4"/>
                Pinned Widgets
            </h3>
            {pinnedWidgets.length > 0 ? (
                 <div className="space-y-3">
                    {pinnedWidgets.map(widget => (
                        <PinnedWidget key={widget.id} widget={widget} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 px-2 border border-dashed border-white/10 rounded-lg">
                    <LayoutTemplateIcon className="w-8 h-8 mx-auto text-gray-600 mb-2"/>
                    <p className="text-xs text-gray-500">
                        No pinned widgets yet. Create and pin them from the Widget Factory!
                    </p>
                </div>
            )}
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-gray-400 uppercase flex items-center gap-2">
                <ImageIcon className="w-4 h-4"/>
                Image Library
            </h3>
            {generatedImages.length > 0 ? (
                 <div className="grid grid-cols-2 gap-2">
                    {generatedImages.map(image => (
                        <GeneratedImage key={image.id} image={image} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 px-2 border border-dashed border-white/10 rounded-lg">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-600 mb-2"/>
                    <p className="text-xs text-gray-500">
                        Generated images will appear here. Try asking the AI to generate one!
                    </p>
                </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;