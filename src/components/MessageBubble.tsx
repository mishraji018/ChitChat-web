/**
 * FILE: MessageBubble.tsx
 * PURPOSE: Renders individual message bubbles with support for different media types and context menus
 * HOOKS USED: none (Functional Component)
 */

import { FileText, MapPin, Mic, Play, Download, Reply, Forward, Copy, Star, Edit, Trash2, Smile, Loader2, AlertCircle } from 'lucide-react';
import { Message, User } from '@/types';
import { motion } from 'framer-motion';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from "@/components/ui/context-menu";
import { toast } from 'sonner';
import { translations } from '@/i18n/translations';

const fSize = (b?: number) => {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  const k = b / 1024;
  return k < 1024 ? k.toFixed(1) + ' KB' : (k / 1024).toFixed(1) + ' MB';
};

interface Props { message: Message; isSent: boolean; t?: any; currentUser: User; searchQuery?: string; isHighlighted?: boolean; onReact?: (emoji: string) => void; }

const MessageBubble = ({ message, isSent, t, currentUser, searchQuery = '', isHighlighted = false, onReact }: Props) => {
  // ─── [1-15] Helpers ───────────────────────
  const safeT = t || translations['English'];
  const mContent = message.content || (message as any).text || '';

  if (!mContent && !message.mediaUrl) return null;

  const isEmoji = message.type === 'sticker' || (message.type === 'text' && /^(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|[ \t\n\r])+$/u.test(mContent) && mContent.length <= 8);

  const highlight = (txt: string, q: string) => {
    if (!q) return txt;
    return txt.split(new RegExp(`(${q})`, 'gi')).map((p, i) => p.toLowerCase() === q.toLowerCase() ? <mark key={i} className="bg-purple-500/40 text-zinc-100 rounded px-0.5 font-bold">{p}</mark> : p);
  };

  // ─── [16-160] Render Logic ────────────────
  const render = () => {
    const { uploadStatus: stat, mediaUrl: url, type, mediaName: name, mediaSize: sz, mediaData: dat } = message;
    const up = stat === 'uploading', q = stat === 'queued', err = stat === 'error';
    const mUrl = url || mContent;

    const Status = () => (
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-xl backdrop-blur-[2px] z-10">
        {up && <><Loader2 size={24} className="animate-spin text-white mb-2" /><span className="text-[10px] text-white font-bold">Uploading...</span></>}
        {q && <><span className="text-xl mb-1">🕐</span><span className="text-[10px] text-white font-bold px-4">Waiting...</span></>}
        {err && <><AlertCircle size={24} className="text-red-400 mb-2" /><span className="text-[10px] text-white font-bold">Failed</span></>}
      </div>
    );

    const wrap = (c: any) => <div className="rounded-xl overflow-hidden max-w-full md:max-w-[240px] -mx-1 -mt-1 relative">{ (up || q || err) && <Status /> }{c}</div>;

    switch (type) {
      case 'image': return wrap(<img src={mUrl} alt="Shared" className={`w-full object-cover cursor-pointer transition-all ${up || q || err ? 'blur-sm scale-110' : 'hover:scale-105'}`} onClick={() => !up && !q && window.open(mUrl, '_blank')} />);
      case 'video': return wrap(<video src={mUrl} controls={!up && !q} className={`w-full ${up || q || err ? 'blur-sm' : ''}`} />);
      case 'audio': return <div className="min-w-[200px] relative">{ (up || q || err) && <Status /> }<audio src={mUrl} controls={!up && !q} className={`w-full h-8 ${up || q || err ? 'blur-sm' : ''}`} /></div>;
      case 'location': return <div className="flex items-center gap-3 min-w-[200px] py-1"><div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><MapPin size={20} className="text-primary" /></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{dat?.name || 'Location'}</p><p className="text-xs opacity-70 truncate">{dat?.address || mContent}</p></div></div>;
      case 'sticker': return <span className="text-6xl block py-2">{mContent}</span>;
      case 'file':
      case 'document': return <div className="relative">{(up || q || err) && <Status />}<a href={mUrl} download={name} target="_blank" rel="noreferrer" className={`flex items-center gap-3 bg-[#121212] hover:bg-[#1a1a1a] rounded-xl p-3 min-w-[220px] transition-all border border-purple-500/20 ${up || q || err ? 'blur-[1px]' : ''}`}><div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-xl">📄</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate text-zinc-100">{name || message.fileName || 'Document'}</p><p className="text-[10px] text-zinc-500 font-bold uppercase">{fSize(sz || 0)}</p></div><Download size={18} className="text-purple-400" /></a></div>;
      default: return <p className={`${isEmoji ? 'text-5xl py-2' : 'text-sm'} leading-relaxed break-words whitespace-pre-wrap`}>{searchQuery ? highlight(mContent, searchQuery) : mContent}</p>;
    }
  };

  // ─── [161-273] Final Render ───────────────
  return (
    <motion.div initial={isSent ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`flex w-full mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <ContextMenu>
        <ContextMenuTrigger className="max-w-[85%] md:max-w-[75%]">
          <div className={`px-4 py-2.5 rounded-[22px] relative transition-all active:scale-[0.98] ${isHighlighted ? 'ring-2 ring-purple-500/50 ring-offset-2 ring-offset-[#0f0f0f]' : ''} ${isEmoji ? 'bg-transparent shadow-none' : isSent ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-purple-500/10' : 'bg-[#1e1e1e] text-zinc-100 border border-white/5 rounded-bl-sm shadow-sm'}`}>
            {render()}
            {!isEmoji && (
              <div className={`flex items-center justify-end gap-1.5 mt-1 ${isSent ? 'text-white/60' : 'text-zinc-500'}`}>
                {message.isEdited && <span className="text-[9px] italic mr-1">edited</span>}
                <span className="text-[10px] font-medium">{message.timestamp}</span>
                {isSent && message.status === 'seen' && (
                  <span className="text-[10px] text-white/40 font-medium ml-1">Seen {(() => {
                    if (!message.createdAt) return 'just now';
                    const diff = Math.floor((Date.now() - new Date(message.createdAt).getTime()) / 60000);
                    if (diff < 1) return 'just now';
                    if (diff < 60) return `${diff}m ago`;
                    const h = Math.floor(diff / 60);
                    return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
                  })()}</span>
                )}
              </div>
            )}
            {message.reactions && message.reactions.length > 0 && <div className={`absolute -bottom-2 ${isSent ? 'right-2' : 'left-2'} flex gap-1 bg-background/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm border border-border text-[10px]`}>{message.reactions.map((r, i) => <span key={i}>{r.emoji}</span>)}</div>}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => toast.info('Reply soon')} className="gap-2"><Reply size={16} /> {safeT.reply}</ContextMenuItem>
          <ContextMenuItem onClick={() => { navigator.clipboard.writeText(mContent); toast.success('Copied!'); }} className="gap-2"><Copy size={16} /> {safeT.copy}</ContextMenuItem>
          <ContextMenuItem onClick={() => toast.info('Forward soon')} className="gap-2"><Forward size={16} /> {safeT.forward}</ContextMenuItem>
          <ContextMenuItem onClick={() => toast.success('Starred!')} className="gap-2"><Star size={16} /> {safeT.star}</ContextMenuItem>
          {isSent && <ContextMenuItem onClick={() => toast.info('Edit soon')} className="gap-2"><Edit size={16} /> {safeT.edit}</ContextMenuItem>}
          <ContextMenuSub><ContextMenuSubTrigger className="gap-2"><Smile size={16} /> React</ContextMenuSubTrigger><ContextMenuSubContent className="w-48"><div className="flex flex-wrap gap-1 p-1">{['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '🎉'].map(emoji => <button key={emoji} onClick={() => { onReact?.(emoji); toast.success(`Reacted ${emoji}`); }} className="p-2 hover:bg-purple-500/20 rounded-md text-xl transition-colors">{emoji}</button>)}</div></ContextMenuSubContent></ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => toast.success('Deleted')} className="gap-2 text-destructive"><Trash2 size={16} /> {safeT.deleteForMe}</ContextMenuItem>
          {isSent && <ContextMenuItem onClick={() => toast.success('Deleted everyone')} className="gap-2 text-destructive"><Trash2 size={16} /> {safeT.deleteForEveryone}</ContextMenuItem>}
        </ContextMenuContent>
      </ContextMenu>
    </motion.div>
  );
};

export default MessageBubble;
