import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MessageSquarePlus, MoreVertical, Settings, User, Users, Archive, Star, Download, LogOut, ChevronRight, ArrowLeft, X } from 'lucide-react';
import { Chat, User as UserType } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/i18n/translations';
import ChatListItem from './ChatListItem';

interface ChatListSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onOpenProfile: () => void;
  onNewChat: () => void;
  onOpenNewGroup: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  t?: any;
  currentUser: UserType;
  globalSearch?: string;
  activeFilter?: string;
}

type Filter = 'all' | 'unread' | 'favourites' | 'groups';

const ChatListSidebar = ({ 
  chats, 
  selectedChatId, 
  onSelectChat, 
  onOpenProfile, 
  onNewChat, 
  onOpenNewGroup,
  onLogout,
  onOpenSettings,
  t, 
  currentUser,
  globalSearch = ''
}: ChatListSidebarProps) => {
  const safeT = t || translations['English'];
  const [localSearch, setLocalSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Task 3: State variable to track archived chats for immediate UI updates
  const [archivedIds, setArchivedIds] = useState<string[]>(() => 
    chats.map(c => c.id).filter(id => localStorage.getItem(`archived_${id}`) === 'true')
  );

  // Sync archivedIds with chats and localStorage
  useEffect(() => {
    const checkArchived = () => {
      const current = chats.map(c => c.id).filter(id => localStorage.getItem(`archived_${id}`) === 'true');
      setArchivedIds(current);
    };
    
    // Check every 500ms for localStorage changes (hacky but works for cross-component sync)
    const interval = setInterval(checkArchived, 500);
    return () => clearInterval(interval);
  }, [chats]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'favourites', label: 'Favourites' },
    { key: 'groups', label: 'Groups' },
  ];

  const processedChats = useMemo(() => {
    return chats.map(c => {
      const isPinned = localStorage.getItem(`pinned_${c.id}`) === 'true';
      return { ...c, isPinned, isArchived: archivedIds.includes(c.id) };
    });
  }, [chats, archivedIds]);

  const archivedCount = archivedIds.length;
  const activeSearch = globalSearch || localSearch;

  const filtered = useMemo(() => {
    let list = processedChats;

    if (showArchived) {
      list = list.filter(c => c.isArchived);
    } else {
      list = list.filter(c => !c.isArchived);
      if (filter === 'unread') list = list.filter(c => c.unreadCount > 0);
      if (filter === 'favourites') list = list.filter(c => c.isPinned);
      if (filter === 'groups') list = list.filter(c => (c.user.displayName || c.user.username || '').toLowerCase().includes('group'));
    }

    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      list = list.filter(c => 
        (c.user.displayName || c.user.username || '').toLowerCase().includes(q) ||
        (c.lastMessage?.content || c.lastMessage?.text || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt || (a.lastMessage as any).timestamp || a.updatedAt || a.lastMessageAt || 0).getTime() : new Date(a.updatedAt || a.lastMessageAt || 0).getTime();
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt || (b.lastMessage as any).timestamp || b.updatedAt || b.lastMessageAt || 0).getTime() : new Date(b.updatedAt || b.lastMessageAt || 0).getTime();
      return dateB - dateA;
    });
  }, [processedChats, showArchived, filter, activeSearch]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0f0f0f] border-r border-white/5 relative overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showArchived && (
            <button onClick={() => setShowArchived(false)} className="p-2 -ml-2 text-zinc-500 hover:text-zinc-100">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-bold text-zinc-100">
            {showArchived ? 'Archived' : 'Messages'}
          </h1>
        </div>
        {!showArchived && (
          <div className="flex items-center gap-1">
            <button onClick={onNewChat} className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-white/5 rounded-full transition-colors">
              <MessageSquarePlus size={20} />
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-white/5 rounded-full">
                <MoreVertical size={20} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
                    {[
                      { icon: <User size={18} />, label: 'Profile', action: onOpenProfile },
                      { icon: <Settings size={18} />, label: 'Settings', action: onOpenSettings },
                      { icon: <Users size={18} />, label: 'New Group', action: onOpenNewGroup },
                      { icon: <Archive size={18} />, label: 'Archived Chats', action: () => { setShowArchived(true); setShowMenu(false); } },
                      { isSeparator: true },
                      { icon: <LogOut size={18} />, label: 'Logout', action: onLogout, className: 'text-red-400' },
                    ].map((item, idx) => (item as any).isSeparator ? <div key={idx} className="h-px bg-white/5 my-1" /> : (
                      <button key={idx} onClick={() => { (item as any).action(); setShowMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${(item as any).className || 'text-zinc-300'}`}>
                        {(item as any).icon}
                        <span>{(item as any).label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder={showArchived ? "Search archived..." : "Search messages..."}
            className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-purple-500/30 transition-all"
            value={activeSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {activeSearch && (
            <button 
              onClick={() => { setLocalSearch(''); }} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-100 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {!showArchived && (
        <div className="flex items-center gap-2 px-6 py-2 overflow-x-auto scrollbar-none mb-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all
                ${filter === f.key ? 'bg-purple-600 text-white' : 'bg-[#1a1a1a] text-zinc-500 hover:bg-white/5'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto mt-2 scrollbar-thin relative pb-20">
        {filtered.length > 0 ? (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat as any}
              isActive={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-zinc-500">
            <Search size={48} className="mb-4 opacity-10" />
            <p className="font-medium text-zinc-100">No chats found</p>
            <p className="text-xs mt-1">Try searching with a different name</p>
          </div>
        )}

        {/* Archived Button */}
        {!showArchived && archivedCount > 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <button 
              onClick={() => setShowArchived(true)}
              className="w-full p-4 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Archive size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-bold text-zinc-200">Archived Chats</p>
                  <p className="text-[11px] text-zinc-500 font-medium">{archivedCount} conversation{archivedCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{archivedCount}</span>
                <ChevronRight size={18} className="text-zinc-600 group-hover:text-zinc-400 transition-all" />
              </div>
            </button>
          </div>
        )}
        {/* Floating New Chat Button (Mobile) */}
        <div className="md:hidden fixed bottom-20 right-6 z-50">
          <button 
            onClick={onNewChat}
            className="w-14 h-14 rounded-2xl bg-purple-600 text-white shadow-2xl flex items-center justify-center hover:bg-purple-700 active:scale-95 transition-all"
          >
            <MessageSquarePlus size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatListSidebar;
