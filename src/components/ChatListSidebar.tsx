import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquarePlus, MoreVertical, Settings, User, Users, Archive, Star, Download, LogOut } from 'lucide-react';
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
  activeFilter?: 'all' | 'archived';
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
  activeFilter = 'all'
}: ChatListSidebarProps) => {
  const safeT = t || translations['English'];
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const filtered = chats.filter(c => {
    if (filter === 'unread') return c.unreadCount > 0;
    if (filter === 'favourites') return c.isPinned;
    if (filter === 'groups') return (c.user.displayName || c.user.username || '').includes('Group');
    return !c.isArchived;
  }).filter(c =>
    (c.user.displayName || c.user.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const menuItems = [
    { icon: <User size={18} />, label: 'Profile', action: onOpenProfile },
    { icon: <Settings size={18} />, label: 'Settings', action: onOpenSettings },
    { icon: <MessageSquarePlus size={18} />, label: 'New Chat', action: onNewChat },
    { icon: <Users size={18} />, label: 'New Group', action: onOpenNewGroup },
    { icon: <Archive size={18} />, label: 'Archived Chats', action: () => {} },
    { icon: <Star size={18} />, label: 'Starred Messages', action: () => {} },
    { icon: <Download size={18} />, label: 'Download Chats', action: () => {} },
    { icon: <LogOut size={18} />, label: 'Logout', action: onLogout, className: 'text-destructive' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-card border-l border-border relative overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {activeFilter === 'archived' ? 'Archived' : 'Messages'}
        </h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={onNewChat}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
          >
            <MessageSquarePlus size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full bg-secondary/50 border-none rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary/20 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-6 py-2 overflow-x-auto scrollbar-none mb-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all
              ${filter === f.key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto mt-2 scrollbar-thin">
        {filtered.length > 0 ? (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-muted-foreground">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-foreground">No chats found</p>
            <p className="text-xs mt-1">Try searching with a different name</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatListSidebar;
