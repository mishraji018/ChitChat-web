import { useState, useCallback, useEffect } from 'react';
import { Phone, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import BottomNav, { MobileTab } from '@/components/BottomNav';
import ChatListSidebar from '@/components/ChatListSidebar';
import ChatPanel from '@/components/ChatPanel';
import ProfilePanel from '@/components/ProfilePanel';
import SettingsPanel from '@/components/SettingsPanel';
import NewChatPanel from '@/components/NewChatPanel';
import Header from '@/components/Header';
import NavigationSidebar from '@/components/NavigationSidebar';
import CameraModal from '@/components/CameraModal';
import NewGroupModal from '@/components/NewGroupModal';
import ContactInfoPanel from '@/components/ContactInfoPanel';
import { DeleteChatModal, BlockUserModal, ReportUserModal } from '@/components/ConfirmationModals';
import { AIAssistant } from '@/components/AIAssistant';
import type { ThemeType, User, Message, MessageStatus } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { wallpapers } from '@/data/wallpapers';
import { supabase } from '@/config/supabase';
import { MessageSquare } from "lucide-react";
import { toast } from '@/components/ui/use-toast';

interface IndexProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchAccount?: () => void;
  t: any;
  language: string;
  onLanguageChange: (lang: string) => void;
}

const Index = ({ currentUser, onLogout, onSwitchAccount, t, language, onLanguageChange }: IndexProps) => {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<MobileTab>('chats');
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('blinkchat_conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select(`
            *,
            participant1:users!participant1_id(*),
            participant2:users!participant2_id(*),
            messages:messages(text, created_at, seen, status)
          `)
          .or(`participant1_id.eq.${currentUser.id},participant2_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          const mappedChats = data.map((conv: any) => {
            const otherParticipant = conv.participant1_id === currentUser.id ? conv.participant2 : conv.participant1;
            
            // Get the last message if exists
            const lastMsg = conv.messages && conv.messages.length > 0 
              ? conv.messages[conv.messages.length - 1] 
              : null;

            return {
              id: conv.id,
              user: {
                id: otherParticipant.id,
                username: otherParticipant.username || otherParticipant.name?.toLowerCase(),
                displayName: otherParticipant.display_name || otherParticipant.name || 'User',
                avatar: otherParticipant.avatar_url || otherParticipant.avatar,
                avatarColor: '#ff4500',
                isOnline: false, // Will be updated by presence
                lastSeen: otherParticipant.last_seen
              },
              messages: [],
              lastMessage: lastMsg ? {
                text: lastMsg.text,
                timestamp: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: lastMsg.seen ? 'seen' : 'sent'
              } : null,
              unreadCount: 0,
              isPinned: false,
              isMuted: false,
              isArchived: false,
              lastMessageAt: lastMsg ? lastMsg.created_at : conv.created_at,
            };
          });

          setChats(mappedChats);
        }
      } catch (err) {
        console.error('Failed to fetch conversations from Supabase:', err);
      }
    };

    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    // Supabase Presence for online status
    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state)
          .flat()
          .map((p: any) => p.user_id);
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  const [globalSearch, setGlobalSearch] = useState('');

  const [currentTheme, setCurrentTheme] = useState<ThemeType>(
    () => (localStorage.getItem('blinkchat_theme') as ThemeType) || 'light'
  );

  const handleThemeChange = useCallback((t: ThemeType) => {
    setCurrentTheme(t);
  }, []);

  const [wallpaper, setWallpaper] = useLocalStorage('blinkchat_wallpaper', 'default');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-deep-blue', 'theme-rose');
    if (currentTheme === 'dark') root.classList.add('dark');
    else if (currentTheme === 'deep-blue') root.classList.add('theme-deep-blue');
    else if (currentTheme === 'rose') root.classList.add('theme-rose');
    else root.classList.add('theme-light');
    localStorage.setItem('blinkchat_theme', currentTheme);
  }, [currentTheme]);

  const handleTabChange = (tab: string) => {
    if (tab === 'profile') {
      setShowProfile(true);
    } else if (tab === 'settings') {
      setShowSettings(true);
    } else if (tab === 'switch') {
      onSwitchAccount?.();
    } else {
      setActiveTab(tab);
    }
  };

  // Replace useSocket with Supabase Realtime
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    // Listen for new messages across ALL chats
    const channel = supabase.channel('global-messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        const newMessage = payload.new;
        
        setChats((prev: any) => {
          const chatIndex = prev.findIndex((c: any) => c.id === newMessage.chat_id);
          if (chatIndex > -1) {
            const updatedChats = [...prev];
            const chat = { ...updatedChats[chatIndex] };
            
            const mappedMsg: Message = {
              id: newMessage.id,
              senderId: newMessage.sender_id,
              receiverId: newMessage.receiver_id || currentUser.id,
              content: newMessage.text,
              type: newMessage.type || 'text',
              mediaUrl: newMessage.media_url,
              mediaType: newMessage.media_type,
              mediaSize: newMessage.media_size,
              mediaName: newMessage.media_name,
              uploadStatus: newMessage.upload_status || 'done',
              timestamp: new Date(newMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: (newMessage.seen ? 'seen' : 'sent') as MessageStatus
            };

            if (!chat.messages.some((m: any) => m.id === mappedMsg.id)) {
              chat.messages = [...chat.messages, mappedMsg];
              chat.lastMessage = mappedMsg;
              chat.lastMessageAt = newMessage.created_at;
              // Only increment unread count if NOT currently in this chat
              if (selectedChatId !== chat.id) {
                chat.unreadCount = (chat.unreadCount || 0) + 1;
              }
            }
            
            updatedChats.splice(chatIndex, 1);
            return [chat, ...updatedChats];
          }
          return prev;
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const updatedMsg = payload.new;
        setChats((prev: any) => prev.map((c: any) => {
          if (c.id === updatedMsg.chat_id) {
            const updatedMessages = c.messages.map((m: any) => 
              m.id === updatedMsg.id ? { ...m, ...updatedMsg, status: (updatedMsg.status || (updatedMsg.seen ? 'seen' : 'sent')) as MessageStatus } : m
            );
            const lastMsg = updatedMessages[updatedMessages.length - 1];
            return { 
              ...c, 
              messages: updatedMessages, 
              lastMessage: lastMsg
            };
          }
          return c;
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, selectedChatId]); // Added selectedChatId to correctly gate unread increments

  // Reset unread count when opening a chat
  useEffect(() => {
    if (selectedChatId) {
      setChats((prev: any) => prev.map((c: any) => 
        c.id === selectedChatId ? { ...c, unreadCount: 0 } : c
      ));
    }
  }, [selectedChatId]);

  // Sync online status
  useEffect(() => {
    if (onlineUsers.length > 0) {
      setChats((prev: any) => prev.map((c: any) => ({
        ...c,
        user: { ...c.user, isOnline: onlineUsers.includes(c.user.id) }
      })));
    }
  }, [onlineUsers]);

  useEffect(() => {
    localStorage.setItem('blinkchat_conversations', JSON.stringify(chats));
  }, [chats]);

  // Fetch messages when selectedChatId changes
  useEffect(() => {
    if (!selectedChatId) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', selectedChatId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        if (data) {
          const mapped = data.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            text: m.text,
            content: m.text,
            type: m.type || 'text',
            mediaUrl: m.media_url,
            mediaType: m.media_type,
            mediaSize: m.media_size,
            mediaName: m.media_name,
            uploadStatus: m.upload_status || 'done',
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: m.seen ? 'seen' : 'sent'
          }));

          setChats((prev: any) => prev.map((c: any) => 
            c.id === selectedChatId ? { ...c, messages: mapped, unreadCount: 0 } : c
          ));
          
          // Mark as read
          await supabase
            .from('messages')
            .update({ status: 'seen', seen: true })
            .eq('chat_id', selectedChatId)
            .neq('sender_id', currentUser.id)
            .or('status.neq.seen,status.is.null');
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };

    fetchMessages();
  }, [selectedChatId]);

  const handleStartChat = async (user: User) => {
    try {
      // 1. Check local state first
      const existingLocal = chats.find((c: any) => c.user.id === user.id);
      if (existingLocal) {
        setSelectedChatId(existingLocal.id);
        setShowNewChat(false);
        return;
      }

      // 2. Check database for existing chat between these two users
      const { data: existingChat, error: fetchError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(participant1_id.eq.${currentUser.id},participant2_id.eq.${user.id}),and(participant1_id.eq.${user.id},participant2_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingChat) {
        // Chat exists in DB but maybe not in local state yet
        const newChat = {
          id: existingChat.id,
          user: user,
          messages: [],
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          isArchived: false,
          lastMessage: null,
          lastMessageAt: existingChat.created_at
        };
        setChats((prev: any) => [newChat, ...prev]);
        setSelectedChatId(existingChat.id);
      } else {
        // 3. Create new conversation in Supabase
        const { data: newChatData, error: insertError } = await supabase
          .from('chats')
          .insert({
            participant1_id: currentUser.id,
            participant2_id: user.id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (newChatData) {
          const newChat = {
            id: newChatData.id,
            user: user,
            messages: [],
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            isArchived: false,
            lastMessage: null,
            lastMessageAt: newChatData.created_at
          };
          setChats((prev: any) => [newChat, ...prev]);
          setSelectedChatId(newChat.id);
        }
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
    setShowNewChat(false);
  };

  const handleToggleMute = async (chatId: string) => {
    setChats((prev: any) => prev.map((c: any) => c.id === chatId ? { ...c, isMuted: !c.isMuted } : c));
  };

  const handleTogglePin = async (chatId: string) => {
    setChats((prev: any) => prev.map((c: any) => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
  };

  const handleToggleArchive = async (chatId: string) => {
    setChats((prev: any) => prev.map((c: any) => c.id === chatId ? { ...c, isArchived: !c.isArchived } : c));
  };

  const handleDeleteConversation = async (chatId: string) => {
    try {
      await supabase.from('chats').delete().eq('id', chatId);
      setChats((prev: any) => prev.filter((c: any) => c.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setShowContactInfo(false);
      }
    } catch (err) { console.error(err); }
    setShowDeleteConfirm(false);
  };

  const handleBlockUser = async (chatId: string) => {
    toast({ title: 'User blocked (Locally)' });
    setShowBlockConfirm(false);
  };

  const handleReportUser = async (chatId: string) => {
    toast({ title: 'User reported (Locally)' });
    setShowReportConfirm(false);
  };

  const handleReact = async (chatId: string, messageId: string, emoji: string) => {
    // React logic would go here via Supabase (e.g. a 'reactions' table)
    toast({ title: 'Reaction added locally' });
  };

  const archivedChats = chats.filter((c: any) => c.isArchived);
  const activeChats = chats.filter((c: any) => !c.isArchived);

  const displayChats = activeTab === 'archived' ? archivedChats : activeChats;

  const sortedChats = [...displayChats].sort((a: any, b: any) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = new Date(a.lastMessageAt || 0).getTime();
    const timeB = new Date(b.lastMessageAt || 0).getTime();
    return timeB - timeA;
  });

  const selectedChat = chats.find((c: any) => c.id === selectedChatId) || null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-screen w-screen overflow-hidden bg-background font-display"
    >
      <Header 
        onOpenSettings={() => setShowSettings(true)}
        onOpenAI={() => setShowAI(true)}
        onSearch={setGlobalSearch}
      />

      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <NavigationSidebar
            currentUser={currentUser}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onLogout={onLogout}
          />
        )}

        <div className="flex-1 h-full flex overflow-hidden relative">
          {isMobile ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f0f0f]">
              {selectedChatId ? (
                <ChatPanel
                  key={selectedChatId}
                  chat={selectedChat}
                  currentUser={currentUser}
                  onBack={() => setSelectedChatId(null)}
                  currentTheme={currentTheme}
                  t={t}
                  onSendMessage={async (chatId, msg) => {
                    setChats((prev: any) => prev.map((c: any) => 
                      c.id === chatId ? { ...c, lastMessage: msg, lastMessageAt: new Date().toISOString() } : c
                    ));
                  }}
                  onOpenInfo={() => setShowContactInfo(true)}
                  showSearch={showChatSearch}
                  onOpenSearch={() => setShowChatSearch(true)}
                  onCloseSearch={() => setShowChatSearch(false)}
                  onToggleMute={handleToggleMute}
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                  onDeleteChat={() => setShowDeleteConfirm(true)}
                  onToggleBlock={() => setShowBlockConfirm(true)}
                  onReportChat={() => setShowReportConfirm(true)}
                  onOpenWallpaper={() => setShowWallpaperPicker(true)}
                  onAddToGroup={() => {}}
                  onReact={handleReact}
                />
              ) : (
                <>
                  <div className="flex-1 overflow-hidden relative">
                    {mobileTab === 'chats' && (
                      <ChatListSidebar
                        chats={sortedChats}
                        selectedChatId={selectedChatId}
                        onSelectChat={setSelectedChatId}
                        onOpenProfile={() => setMobileTab('profile')}
                        onNewChat={() => setShowNewChat(true)}
                        onOpenNewGroup={() => setShowNewGroup(true)}
                        onLogout={onLogout}
                        onOpenSettings={() => setShowSettings(true)}
                        t={t}
                        currentUser={currentUser}
                        globalSearch={globalSearch}
                      />
                    )}
                    {mobileTab === 'calls' && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-purple-500/5 flex items-center justify-center mb-6">
                          <Phone size={32} className="text-purple-500/20" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-100 mb-2">Calls</h2>
                        <p className="text-sm text-zinc-500 max-w-[240px]">Audio and video calling is coming soon to Blink.</p>
                      </div>
                    )}
                    {mobileTab === 'groups' && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-purple-500/5 flex items-center justify-center mb-6">
                          <Users size={32} className="text-purple-500/20" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-100 mb-2">Groups</h2>
                        <p className="text-sm text-zinc-500 max-w-[240px]">Create communities and group chats with your friends.</p>
                        <button onClick={() => setShowNewGroup(true)} className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm">Create Group</button>
                      </div>
                    )}
                    {mobileTab === 'profile' && (
                      <div className="h-full bg-[#0f0f0f] overflow-y-auto">
                        <div className="px-6 py-8 flex flex-col items-center">
                          <div className="w-24 h-24 rounded-[32px] bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 text-3xl font-bold text-purple-400">
                            {currentUser.displayName[0]}
                          </div>
                          <h2 className="text-2xl font-bold text-zinc-100">{currentUser.displayName}</h2>
                          <p className="text-zinc-500">@{currentUser.username}</p>
                          
                          <div className="w-full mt-10 space-y-3">
                            <button onClick={() => setShowProfile(true)} className="w-full p-4 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-between group">
                              <span className="font-bold text-zinc-200">Edit Profile</span>
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><Users size={16} className="text-zinc-500" /></div>
                            </button>
                            <button onClick={() => setShowSettings(true)} className="w-full p-4 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-between">
                              <span className="font-bold text-zinc-200">Settings</span>
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><MessageSquare size={16} className="text-zinc-500" /></div>
                            </button>
                            <button onClick={onLogout} className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                              <span className="font-bold text-red-400">Sign Out</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <BottomNav activeTab={mobileTab} onTabChange={setMobileTab} />
                </>
              )}
            </div>
          ) : (
            <>
              {/* Main Chat Panel */}
              <div className="flex-1 h-full bg-chat relative overflow-hidden">
                {selectedChatId ? (
                  <ChatPanel
                    key={selectedChatId || 'none'}
                    chat={selectedChat}
                    currentUser={currentUser}
                    onBack={() => setSelectedChatId(null)}
                    currentTheme={currentTheme}
                    t={t}
                    onSendMessage={async (chatId, msg) => {
                      setChats((prev: any) => prev.map((c: any) => 
                        c.id === chatId ? { ...c, lastMessage: msg, lastMessageAt: new Date().toISOString() } : c
                      ));
                    }}
                    onOpenInfo={() => setShowContactInfo(true)}
                    showSearch={showChatSearch}
                    onOpenSearch={() => setShowChatSearch(true)}
                    onCloseSearch={() => setShowChatSearch(false)}
                    onToggleMute={handleToggleMute}
                    onTogglePin={handleTogglePin}
                    onToggleArchive={handleToggleArchive}
                    onDeleteChat={() => setShowDeleteConfirm(true)}
                    onToggleBlock={() => setShowBlockConfirm(true)}
                    onReportChat={() => setShowReportConfirm(true)}
                    onOpenWallpaper={() => setShowWallpaperPicker(true)}
                    onAddToGroup={() => {}}
                    onReact={handleReact}
                  />
                ) : (
                  <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-[#0f0f0f]">
                    <div className="w-24 h-24 rounded-[32px] bg-purple-500/5 flex items-center justify-center mb-6 border border-purple-500/10">
                      <MessageSquare size={48} className="text-purple-500/40" />
                    </div>
                    <h1 className="text-3xl font-bold text-zinc-100 mb-4 tracking-tight">Select a friend to start chatting</h1>
                    <p className="max-w-md text-zinc-500 text-sm leading-relaxed">
                      Choose a conversation from the list or start a new one to begin your secure, encrypted messaging experience.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Chat List */}
              <div className="w-[340px] border-l border-border bg-white h-full relative shrink-0">
                <ChatListSidebar
                  chats={sortedChats}
                  selectedChatId={selectedChatId}
                  onSelectChat={setSelectedChatId}
                  onOpenProfile={() => setShowProfile(true)}
                  onNewChat={() => setShowNewChat(true)}
                  onOpenNewGroup={() => setShowNewGroup(true)}
                  onLogout={onLogout}
                  onOpenSettings={() => setShowSettings(true)}
                  t={t}
                  currentUser={currentUser}
                  activeFilter={activeTab === 'archived' ? 'archived' : 'all'}
                  globalSearch={globalSearch}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(showProfile || showSettings || showNewChat || showContactInfo) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowProfile(false);
              setShowSettings(false);
              setShowNewChat(false);
              setShowContactInfo(false);
            }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <ProfilePanel 
            isOpen={showProfile} 
            onClose={() => setShowProfile(false)} 
            user={currentUser}
            onSignOut={onLogout}
          />
        )}
        {showSettings && (
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            wallpaper={wallpaper}
            onWallpaperChange={setWallpaper}
            language={language}
            onLanguageChange={onLanguageChange}
            currentUser={currentUser}
          />
        )}
        {showNewChat && (
          <NewChatPanel
            onClose={() => setShowNewChat(false)}
            onStartChat={handleStartChat}
            currentUser={currentUser}
            t={t}
          />
        )}
        {showCamera && (
          <CameraModal 
            isOpen={showCamera} 
            onClose={() => setShowCamera(false)}
            onSend={(data) => {
              console.log("Send camera photo", data);
              setShowCamera(false);
            }}
          />
        )}
        {showNewGroup && (
          <NewGroupModal 
            isOpen={showNewGroup} 
            onClose={() => setShowNewGroup(false)}
            onCreate={(data) => {
              const newChat = {
                id: `group_${Date.now()}`,
                user: {
                  id: `g_${Date.now()}`,
                  username: data.name.toLowerCase().replace(/\s/g, '_'),
                  displayName: data.name,
                  avatarColor: data.iconColor,
                  isOnline: true,
                },
                messages: [],
                unreadCount: 0,
                isPinned: false,
                isMuted: false,
                isArchived: false,
              };
              setChats((prev: any) => [newChat, ...prev]);
              setSelectedChatId(newChat.id);
              setShowNewGroup(false);
            }}
          />
        )}
        {showContactInfo && selectedChat && (
          <ContactInfoPanel
            key={selectedChatId}
            user={selectedChat.user}
            chat={selectedChat}
            messages={selectedChat.messages}
            onClose={() => setShowContactInfo(false)}
            onOpenWallpaper={() => setShowWallpaperPicker(true)}
            onOpenSearch={() => setShowChatSearch(true)}
            onMessageClick={() => setShowContactInfo(false)}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
        {showAI && (
          <AIAssistant 
            isOpen={showAI} 
            onClose={() => setShowAI(false)} 
          />
        )}
      </AnimatePresence>

      <DeleteChatModal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        onConfirm={() => selectedChatId && handleDeleteConversation(selectedChatId)} 
      />
      <BlockUserModal 
        isOpen={showBlockConfirm} 
        onClose={() => setShowBlockConfirm(false)} 
        onConfirm={() => selectedChatId && handleBlockUser(selectedChatId)}
      />
      <ReportUserModal 
        isOpen={showReportConfirm} 
        onClose={() => setShowReportConfirm(false)} 
        onConfirm={() => selectedChatId && handleReportUser(selectedChatId)}
      />
    </motion.div>
  );
};

export default Index;
