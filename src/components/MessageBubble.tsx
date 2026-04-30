import { FileText, MapPin, Mic, Play, Download, Reply, Forward, Copy, Star, Edit, Trash2, Smile } from 'lucide-react';
import { Message, User } from '@/types';
import { motion } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from "@/components/ui/context-menu";
import { toast } from 'sonner';
import { translations } from '@/i18n/translations';
import { Loader2, AlertCircle } from 'lucide-react';

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  t?: any;
  currentUser: User;
  searchQuery?: string;
  isHighlighted?: boolean;
  onReact?: (emoji: string) => void;
}

const MessageBubble = ({ message, isSent, t, currentUser, searchQuery = '', isHighlighted = false, onReact }: MessageBubbleProps) => {
  const safeT = t || translations['English'];
  
  const isEmojiOnly = message.type === 'sticker' || (message.type === 'text' && /^(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|[ \t\n\r])+$/u.test(message.content) && message.content.length <= 8);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-purple-500/40 text-zinc-100 rounded px-0.5 font-bold">{part}</mark>
        : part
    );
  };

  const renderContent = () => {
    const isUploading = message.uploadStatus === 'uploading';
    const isQueued = message.uploadStatus === 'queued';
    const isError = message.uploadStatus === 'error';
    const mediaUrl = message.mediaUrl || message.content;

    const StatusOverlay = () => (
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-xl backdrop-blur-[2px] z-10">
        {isUploading && (
          <>
            <Loader2 size={24} className="animate-spin text-white mb-2" />
            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Uploading...</span>
          </>
        )}
        {isQueued && (
          <>
            <span className="text-xl mb-1">🕐</span>
            <span className="text-[10px] text-white font-bold text-center px-4">Waiting for connection...</span>
          </>
        )}
        {isError && (
          <>
            <AlertCircle size={24} className="text-red-400 mb-2" />
            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Upload Failed</span>
            <button className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-[9px] text-white transition-all">Retry</button>
          </>
        )}
      </div>
    );

    switch (message.type) {
      case 'image':
        return (
          <div className="rounded-xl overflow-hidden max-w-[240px] -mx-1 -mt-1 relative">
            {(isUploading || isQueued || isError) && <StatusOverlay />}
            <img 
              src={mediaUrl} 
              alt="Shared" 
              className={`w-full object-cover cursor-pointer transition-all duration-500 ${isUploading || isQueued || isError ? 'blur-sm scale-110' : 'hover:scale-105'}`} 
              onClick={() => !isUploading && !isQueued && window.open(mediaUrl, '_blank')}
            />
          </div>
        );
      case 'video':
        return (
          <div className="rounded-xl overflow-hidden max-w-[240px] -mx-1 -mt-1 relative bg-black/20">
            {(isUploading || isQueued || isError) && <StatusOverlay />}
            <video 
              src={mediaUrl}
              controls={!isUploading && !isQueued}
              className={`w-full rounded-xl ${isUploading || isQueued || isError ? 'blur-sm' : ''}`}
              preload="metadata"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="min-w-[200px] relative">
            {(isUploading || isQueued || isError) && <StatusOverlay />}
            <audio 
              src={mediaUrl}
              controls={!isUploading && !isQueued}
              className={`w-full h-8 ${isUploading || isQueued || isError ? 'blur-sm' : ''}`}
            />
          </div>
        );
      case 'location':
        return (
          <div className="flex items-center gap-3 min-w-[200px] py-1">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <MapPin size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{message.mediaData?.name || 'Location'}</p>
              <p className="text-xs opacity-70 truncate">{message.mediaData?.address || message.content}</p>
            </div>
          </div>
        );
      case 'sticker':
        return <span className="text-6xl block py-2">{message.content}</span>;
      case 'document':
      case 'file':
        return (
          <div className="relative">
            {(isUploading || isQueued || isError) && <StatusOverlay />}
            <a 
              href={mediaUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-3 min-w-[220px] transition-all border border-white/5 ${isUploading || isQueued || isError ? 'blur-[1px]' : ''}`}
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-xl">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-zinc-100">{message.mediaName || message.fileName || 'Document'}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{formatFileSize(message.mediaSize || 0)}</p>
              </div>
              <Download size={18} className="text-zinc-400 shrink-0" />
            </a>
          </div>
        );
      default:
        return (
          <p className={`${isEmojiOnly ? 'text-5xl py-2' : 'text-sm'} leading-relaxed break-words whitespace-pre-wrap`}>
            {searchQuery ? highlightText(message.content, searchQuery) : message.content}
          </p>
        );
    }
  };

  return (
    <motion.div
      initial={isSent ? { opacity: 0, x: 20, scale: 0.95 } : { opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex w-full mb-2 ${isSent ? 'justify-end' : 'justify-start'} group`}
    >
      <ContextMenu>
        <ContextMenuTrigger className="max-w-[75%]">
          <div
            className={`px-4 py-2.5 rounded-[22px] relative transition-all active:scale-[0.98]
              ${isHighlighted ? 'ring-2 ring-purple-500/50 ring-offset-2 ring-offset-[#0f0f0f]' : ''}
              ${isEmojiOnly 
                ? 'bg-transparent shadow-none' 
                : isSent
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm shadow-lg shadow-purple-500/10'
                  : 'bg-[#1e1e1e] text-zinc-100 border border-white/5 rounded-bl-sm shadow-sm'
              }`}
          >
            {renderContent()}
            
            {!isEmojiOnly && (
              <div className={`flex items-center justify-end gap-1.5 mt-1 ${isSent ? 'text-white/60' : 'text-zinc-500'}`}>
                {message.isEdited && <span className="text-[9px] italic mr-1">edited</span>}
                <span className="text-[10px] font-medium tracking-tight">{message.timestamp}</span>
                {isSent && (
                  <span className="flex items-center ml-0.5">
                    {message.status === 'seen' && (
                      <span className="text-[10px] text-white/40 font-medium">
                        Seen {(() => {
                          if (!message.createdAt) return 'just now';
                          const diff = Math.floor((new Date().getTime() - new Date(message.createdAt).getTime()) / 60000);
                          if (diff < 1) return 'just now';
                          if (diff < 60) return `${diff}m ago`;
                          const hrs = Math.floor(diff / 60);
                          if (hrs < 24) return `${hrs}h ago`;
                          return `${Math.floor(hrs / 24)}d ago`;
                        })()}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
            
            {/* Reactions Overlay */}
            {message.reactions && message.reactions.length > 0 && (
              <div className={`absolute -bottom-2 ${isSent ? 'right-2' : 'left-2'} flex gap-1 bg-background/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm border border-border text-[10px]`}>
                {message.reactions.map((r, i) => (
                  <span key={i}>{r.emoji}</span>
                ))}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => toast.info('Reply logic coming soon')} className="gap-2">
            <Reply size={16} /> {safeT.reply}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { navigator.clipboard.writeText(message.content); toast.success('Copied!'); }} className="gap-2">
            <Copy size={16} /> {safeT.copy}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => toast.info('Forward logic coming soon')} className="gap-2">
            <Forward size={16} /> {safeT.forward}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => toast.success('Starred!')} className="gap-2">
            <Star size={16} /> {safeT.star}
          </ContextMenuItem>
          {isSent && (
            <ContextMenuItem onClick={() => toast.info('Edit logic coming soon')} className="gap-2">
              <Edit size={16} /> {safeT.edit}
            </ContextMenuItem>
          )}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <Smile size={16} /> React
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <div className="flex flex-wrap gap-1 p-1">
                {['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '🎉'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact?.(emoji);
                      toast.success(`Reacted with ${emoji}`);
                    }}
                    className="p-2 hover:bg-purple-500/20 rounded-md text-xl transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => toast.success('Deleted locally')} className="gap-2 text-destructive">
            <Trash2 size={16} /> {safeT.deleteForMe}
          </ContextMenuItem>
          {isSent && (
            <ContextMenuItem onClick={() => toast.success('Deleted for everyone')} className="gap-2 text-destructive">
              <Trash2 size={16} /> {safeT.deleteForEveryone}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </motion.div>
  );
};

export default MessageBubble;
