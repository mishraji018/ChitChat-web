import { useState } from 'react';
import { Search, ArrowLeft, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './Avatar';
import { User } from '@/types/chat';
import { translations } from '@/i18n/translations';

interface NewChatPanelProps {
  onClose: () => void;
  onStartChat: (user: User) => void;
  t?: any;
}

// Mock registered users - in real app, fetch from /api/users/registered
const registeredUsers: User[] = [
  { id: 'u1', username: 'aarav', displayName: 'Aarav Singh', avatarColor: '#f472b6', isOnline: true, status: 'Building BlinkChat ⚡' },
  { id: 'u2', username: 'priya', displayName: 'Priya Sharma', avatarColor: '#818cf8', isOnline: false, lastSeen: '2:30 PM', status: 'At the gym 💪' },
  { id: 'u3', username: 'rohan', displayName: 'Rohan Verma', avatarColor: '#34d399', isOnline: true, status: 'Available' },
  { id: 'u4', username: 'neha', displayName: 'Neha Gupta', avatarColor: '#fb923c', isOnline: false, lastSeen: 'Yesterday', status: 'Busy' },
  { id: 'u5', username: 'arjun', displayName: 'Arjun Mehta', avatarColor: '#60a5fa', isOnline: true, status: 'Working remotely' },
];

const NewChatPanel = ({ onClose, onStartChat, t }: NewChatPanelProps) => {
  const safeT = t || translations['English'];
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = registeredUsers.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-sidebar-custom flex flex-col h-full border-r border-border"
    >
      {/* Header */}
      <div className="p-4 bg-background/50 backdrop-blur-sm shadow-sm flex items-center gap-4">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 text-muted-foreground hover:text-primary rounded-full hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-display font-bold text-lg text-foreground flex-1">
          {safeT.newChat || 'New Chat'}
        </h2>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <input
            autoFocus
            type="text"
            placeholder="Search by name or username..."
            className="w-full bg-muted/30 border-none rounded-xl py-2.5 pl-10 pr-4 text-[15px] focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredUsers.length > 0 ? (
          <div className="px-2 pb-4">
            {filteredUsers.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onStartChat(user)}
                className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-xl cursor-pointer transition-colors"
              >
                <div className="relative">
                  <UserAvatar name={user.displayName} color={user.avatarColor} />
                  {user.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username} • {user.isOnline ? 'Online' : user.lastSeen}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No users found</p>
            <p className="text-sm text-muted-foreground mt-1">Try searching with a different name</p>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground py-6 px-10">
          Only showing users who have BlinkChat installed
        </p>
      </div>
    </motion.div>
  );
};

export default NewChatPanel;
