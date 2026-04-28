import { useState, useEffect } from 'react';
import { X, Users, Search, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';
import UserAvatar from './Avatar';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string, iconColor: string, members: string[] }) => void;
}

const colors = [
  '#f472b6', '#818cf8', '#34d399', '#fb923c', '#60a5fa', 
  '#a78bfa', '#f87171', '#4ade80', '#fbbf24', '#2dd4bf'
];

const NewGroupModal = ({ isOpen, onClose, onCreate }: NewGroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*');
        if (data) setUsers(data);
      };
      fetchUsers();
    }
  }, [isOpen]);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedMembers.length > 0) {
      onCreate({ name: groupName, iconColor: selectedColor, members: selectedMembers });
      onClose();
    }
  };

  const filteredUsers = users.filter(u => 
    (u.display_name || u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-primary/20 relative flex flex-col max-h-[90vh]"
      >
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="text-primary" />
            New Group
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Group Info */}
          <div className="flex gap-4 items-center">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ backgroundColor: selectedColor }}
            >
              {groupName ? groupName.charAt(0).toUpperCase() : <Users />}
            </div>
            <div className="flex-1">
              <input 
                type="text"
                placeholder="Group Name"
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">Group Icon Color</label>
            <div className="flex flex-wrap gap-2.5">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center border-2 ${selectedColor === color ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-muted-foreground">Add Members</label>
              <span className="text-xs text-primary font-bold">{selectedMembers.length} selected</span>
            </div>

            {/* Selected Chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-2 bg-muted/30 rounded-2xl max-h-32 overflow-y-auto">
                {selectedMembers.map(id => {
                  const user = users.find(u => u.id === id);
                  return (
                    <div key={id} className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1 rounded-full text-xs">
                      <span>{user?.display_name || user?.name}</span>
                      <button onClick={() => toggleMember(id)} className="text-muted-foreground hover:text-destructive">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text"
                placeholder="Search users..."
                className="w-full bg-muted/30 border border-border rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {filteredUsers.map(user => {
                const isSelected = selectedMembers.includes(user.id);
                const name = user.display_name || user.name || 'User';
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                  >
                    <UserAvatar name={name} image={user.avatar_url} size="sm" isOnline={user.is_online} color="purple" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <p className="text-[11px] text-muted-foreground">@{user.username}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/10 border-t border-border">
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedMembers.length === 0}
            className="w-full py-3 rounded-xl gradient-primary text-white font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create Group
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NewGroupModal;
