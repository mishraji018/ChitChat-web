import { Check, CheckCheck, FileText, MapPin, Mic, Play, Download, Reply, Forward, Copy, Star, Edit, Trash2, Smile } from 'lucide-react';
import { Message, User } from '@/types/chat';
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
        ? <mark key={i} className="bg-primary/40 text-foreground rounded px-0.5">{part}</mark>
        : part
    );
  };

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="rounded-xl overflow-hidden max-w-[240px] -mx-1 -mt-1">
            <img src={message.content} alt="Shared" className="w-full object-cover" />
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
        return (
          <div className="flex items-center gap-3 bg-background/20 rounded-lg p-3 min-w-[200px]">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.fileName}</p>
              <p className="text-xs opacity-70">{message.fileSize}</p>
            </div>
            <Download size={18} className="opacity-70 cursor-pointer hover:opacity-100 transition-opacity" />
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
      className={`flex w-full mb-1 ${isSent ? 'justify-end' : 'justify-start'} group`}
    >
      <ContextMenu>
        <ContextMenuTrigger className="max-w-[70%]">
          <div
            className={`px-3 py-2 rounded-[18px] relative transition-transform active:scale-[0.98]
              ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
              ${isEmojiOnly 
                ? 'bg-transparent shadow-none' 
                : isSent
                  ? 'bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white rounded-br-sm shadow-md'
                  : 'bg-card text-foreground border border-border rounded-bl-sm shadow-sm'
              }`}
          >
            {renderContent()}
            
            {!isEmojiOnly && (
              <div className={`flex items-center justify-end gap-1 mt-1 ${isSent ? 'text-white/70' : 'text-muted-foreground'}`}>
                {message.isEdited && <span className="text-[9px] italic mr-1">edited</span>}
                <span className="text-[10px] font-medium">{message.timestamp}</span>
                {isSent && (
                  <span className="text-[11px] ml-0.5">
                    {message.isQueued ? (
                      <span title="Waiting to deliver — recipient is offline">🕐</span>
                    ) : (
                      message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'
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
                    className="p-2 hover:bg-primary/20 rounded-md text-xl transition-colors"
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
