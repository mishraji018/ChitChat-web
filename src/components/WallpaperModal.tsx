import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { WALLPAPERS } from '@/hooks/useWallpaper';
import { useState } from 'react';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentId: string;
  onApply: (id: string) => void;
  title?: string;
}

const WallpaperModal = ({ isOpen, onClose, currentId, onApply, title = "Chat Wallpaper" }: WallpaperModalProps) => {
  const [selectedId, setSelectedId] = useState(currentId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-[#1a1a1a] border border-white/10 rounded-[32px] w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-2 gap-4">
          {WALLPAPERS.map(w => (
            <button 
              key={w.id} 
              onClick={() => setSelectedId(w.id)} 
              className={`group relative h-24 rounded-2xl border-2 transition-all overflow-hidden ${selectedId === w.id ? 'border-purple-500 ring-4 ring-purple-500/20' : 'border-white/5 hover:border-white/20'}`}
              style={{ background: w.bg }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{w.name}</span>
              </div>
              {selectedId === w.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 bg-black/20 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 bg-white/5 text-zinc-300 rounded-xl font-bold hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onApply(selectedId); onClose(); }} 
            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WallpaperModal;
