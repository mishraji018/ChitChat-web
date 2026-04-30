import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/config/supabase';
import { formatDistanceToNow, isPast } from 'date-fns';
import { Lock, Unlock, Clock, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryCapsule {
  id: string;
  title: string;
  message: string;
  unlock_at: string;
  created_at: string;
  created_by: string;
  is_unlocked: boolean;
}

interface MemoryCapsuleListProps {
  chatId: string;
}

export const MemoryCapsuleList = ({ chatId }: MemoryCapsuleListProps) => {
  const [capsules, setCapsules] = useState<MemoryCapsule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCapsules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memory_capsules')
        .select('*')
        .eq('chat_id', chatId)
        .order('unlock_at', { ascending: true });

      if (error) throw error;
      setCapsules(data || []);
    } catch (error) {
      console.error('Error fetching capsules:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUnlocks = async () => {
    const now = new Date().toISOString();
    const toUpdate = capsules.filter(c => !c.is_unlocked && isPast(new Date(c.unlock_at)));
    
    if (toUpdate.length > 0) {
      const ids = toUpdate.map(c => c.id);
      await supabase
        .from('memory_capsules')
        .update({ is_unlocked: true })
        .in('id', ids);
      fetchCapsules();
    }
  };

  useEffect(() => {
    fetchCapsules();
  }, [chatId]);

  return (
    <Sheet onOpenChange={(open) => open && checkUnlocks()}>
      <SheetTrigger asChild>
        <button className="p-2 text-zinc-500 hover:text-purple-400 hover:bg-white/5 rounded-xl transition-all" title="View Memory Capsules">
          <History size={20} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#0f0f0f] border-white/5 text-zinc-100 p-0 w-full sm:max-w-md overflow-hidden flex flex-col">
        <SheetHeader className="p-6 border-b border-white/5">
          <SheetTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            Memory Vault <span className="text-2xl">🏛️</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {loading && capsules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
              <p>Opening vault...</p>
            </div>
          ) : capsules.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-zinc-500" size={32} />
              </div>
              <p className="text-zinc-400">No memory capsules found.</p>
              <p className="text-sm text-zinc-500 mt-2">Create one to surprise your future self!</p>
            </div>
          ) : (
            capsules.map((capsule) => {
              const unlocked = isPast(new Date(capsule.unlock_at));
              return (
                <motion.div
                  key={capsule.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border transition-all duration-300",
                    unlocked 
                      ? "bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border-purple-500/30 shadow-lg shadow-purple-500/10" 
                      : "bg-[#1a1a1a] border-white/10 opacity-80"
                  )}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-[15px] truncate max-w-[200px]">
                        {capsule.title}
                      </h4>
                      {unlocked ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                          <Unlock size={12} /> Unlocked
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-500/20 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                          <Lock size={12} /> Locked
                        </div>
                      )}
                    </div>

                    {unlocked ? (
                      <div className="space-y-3">
                        <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                          {capsule.message}
                        </p>
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Created {new Date(capsule.created_at).toLocaleDateString()}</span>
                          <span className="text-purple-400 font-medium">Unlocked 🎉</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="h-12 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm">
                          <p className="text-zinc-500 italic text-[13px] select-none">Message hidden until unlock</p>
                        </div>
                        <p className="text-[12px] text-zinc-400 flex items-center gap-1.5 font-medium">
                          <Clock size={14} className="text-purple-500" />
                          Unlocks in {formatDistanceToNow(new Date(capsule.unlock_at))}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
