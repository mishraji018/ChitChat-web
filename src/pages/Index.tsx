import { useState, useCallback, useEffect, useRef } from 'react';
import { Phone, Users, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import BottomNav, { MobileTab } from '@/components/BottomNav';
import ChatListSidebar from '@/components/ChatListSidebar';
import ChatPanel from '@/components/ChatPanel';
import ProfilePanel from '@/components/ProfilePanel';
import SettingsPanel from '@/components/SettingsPanel';
import NavigationSidebar from '@/components/NavigationSidebar';
import CameraModal from '@/components/CameraModal';
import NewGroupModal from '@/components/NewGroupModal';
import ContactInfoPanel from '@/components/ContactInfoPanel';
import { DeleteChatModal, BlockUserModal, ReportUserModal } from '@/components/ConfirmationModals';
import { AIAssistant } from '@/components/AIAssistant';
import type { ThemeType, User, Message, MessageStatus } from '@/types';
import { supabase } from '@/config/supabase';
import { subscribeOnce, unsubscribe } from '@/lib/realtimeManager';
import { toast } from '@/components/ui/use-toast';
import { sortMessagesByTime } from '@/hooks/useMessages';

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
  const [chats, setChats] = useState<any[]>(() => {
    if (currentUser?.id) {
      const cached = localStorage.getItem(`chats_${currentUser.id}`);
      if (cached) {
        try { return JSON.parse(cached) || []; } catch {}
      }
    }
    return [];
  });
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [globalRealtimeStatus, setGlobalRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR'>('CONNECTING');

  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          participant1:users!chats_participant1_id_fkey(*),
          participant2:users!chats_participant2_id_fkey(*),
          messages:messages(
            id, text, type, created_at, seen, status, sender_id,
            media_url, media_type, media_size, media_name,
            reply_to, reply_to_message
          )
        `)
        .or(`participant1_id.eq.${currentUser.id},participant2_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const rawMappedChats = data
          .map((conv: any) => {
            const otherParticipant = conv.participant1_id === currentUser.id ? conv.participant2 : conv.participant1;
            if (!otherParticipant) return null;

            const sortedMsgs = (conv.messages || []).sort(
              (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const lastMsg = sortedMsgs.length > 0 ? sortedMsgs[0] : null;

            const allMappedMsgs = (conv.messages || [])
              .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((m: any) => ({
                id: m.id,
                senderId: m.sender_id,
                receiverId: m.receiver_id || otherParticipant.id,
                content: m.text,
                text: m.text,
                type: m.type || 'text',
                mediaUrl: m.media_url,
                mediaType: m.media_type,
                mediaSize: m.media_size,
                mediaName: m.media_name,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: m.created_at,
                status: (m.status || (m.seen ? 'seen' : 'sent')) as MessageStatus,
                replyTo: m.reply_to,
                replyToMessage: m.reply_to_message
              }));

            return {
              id: conv.id,
              user: {
                id: otherParticipant.id,
                username: otherParticipant.username || otherParticipant.name?.toLowerCase() || 'user',
                displayName: otherParticipant.display_name || otherParticipant.name || 'User',
                avatar: otherParticipant.avatar_url || otherParticipant.avatar,
                avatarColor: otherParticipant.avatar_color || '#ff4500',
                isOnline: false,
                lastSeen: otherParticipant.last_seen
              },
              messages: allMappedMsgs,
              lastMessage: lastMsg ? {
                id: lastMsg.id,
                senderId: lastMsg.sender_id,
                content: lastMsg.text,
                text: lastMsg.text,
                type: lastMsg.type || 'text',
                timestamp: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: (lastMsg.status || (lastMsg.seen ? 'seen' : 'sent')) as MessageStatus
              } : null,
              unreadCount: 0,
              isPinned: false,
              isMuted: false,
              isArchived: false,
              lastMessageAt: lastMsg ? lastMsg.created_at : conv.created_at,
            };
          })
          .filter(Boolean);

        const uniqueChatsMap = new Map<string, any>();
        for (const chat of rawMappedChats) {
          if (!chat) continue;
          const otherUserId = chat.user.id;
          if (!uniqueChatsMap.has(otherUserId)) {
            uniqueChatsMap.set(otherUserId, chat);
          } else {
            const existing = uniqueChatsMap.get(otherUserId);
            const mergedMsgs = [...existing.messages, ...chat.messages].sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            const dedupedMsgs = Array.from(new Map(mergedMsgs.map(m => [m.id, m])).values());
            const latestMsg = dedupedMsgs.length > 0 ? dedupedMsgs[dedupedMsgs.length - 1] : existing.lastMessage;

            if (chat.messages.length > existing.messages.length) {
              uniqueChatsMap.set(otherUserId, { ...chat, messages: dedupedMsgs, lastMessage: latestMsg });
            } else {
              uniqueChatsMap.set(otherUserId, { ...existing, messages: dedupedMsgs, lastMessage: latestMsg });
            }
          }
        }
        const mappedChats = Array.from(uniqueChatsMap.values()).map((c: any) => ({
          ...c,
          user: { ...c.user, isOnline: onlineUsers.includes(c.user.id) }
        }));

        localStorage.setItem(`chats_${currentUser.id}`, JSON.stringify(mappedChats));
        setChats(mappedChats);

        // Automatically mark incoming messages received in these conversations as delivered
        const incomingSentChatIds = data
          .filter((conv: any) =>
            conv.messages?.some((m: any) => m.sender_id !== currentUser.id && m.status === 'sent')
          )
          .map((c: any) => c.id);

        if (incomingSentChatIds.length > 0) {
          supabase
            .from('messages')
            .update({ status: 'delivered' })
            .in('chat_id', incomingSentChatIds)
            .neq('sender_id', currentUser.id)
            .eq('status', 'sent')
            .then(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations from Supabase:', err);
    }
  }, [currentUser?.id, onlineUsers]);

  useEffect(() => {
    if (currentUser?.id) {
      const cachedChats = localStorage.getItem(`chats_${currentUser.id}`);
      if (cachedChats) {
        try {
          const parsed = JSON.parse(cachedChats);
          if (Array.isArray(parsed) && parsed.length > 0) setChats(parsed);
        } catch (e) {
          console.error('Cache load error:', e);
        }
      }
    }
    fetchConversations();
  }, [currentUser?.id, fetchConversations]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: currentUser.id } }
    });

    const updatePresenceState = () => {
      const state = channel.presenceState();
      const onlineIds = new Set<string>();
      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => { if (p.user_id) onlineIds.add(p.user_id); });
      });
      setOnlineUsers(Array.from(onlineIds));
    };

    const trackPresence = async () => {
      await channel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
    };

    const updateLastSeen = () => {
      supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id).then(() => {});
    };

    channel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          newPresences.forEach((p: any) => { if (p.user_id) next.add(p.user_id); });
          return Array.from(next);
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          leftPresences.forEach((p: any) => { if (p.user_id) next.delete(p.user_id); });
          return Array.from(next);
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await trackPresence();
      });

    const handleBeforeUnload = () => {
      updateLastSeen();
      channel.untrack();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.untrack();
      updateLastSeen();
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    window.history.pushState({ chatId }, '', `#chat`);
  };

  const handleBack = () => {
    setSelectedChatId(null);
    window.history.back();
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setSelectedChatId(e.state?.chatId ?? null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const [currentTheme, setCurrentTheme] = useState<ThemeType>(
    () => (localStorage.getItem('blinkchat_theme') as ThemeType) || 'light'
  );

  const handleThemeChange = useCallback((t: ThemeType) => {
    setCurrentTheme(t);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-light', 'theme-dark', 'theme-deep-blue', 'theme-rose', 'theme-teal');
    root.setAttribute('data-theme', currentTheme);

    if (currentTheme === 'light') {
      root.classList.add('light', 'theme-light');
    } else {
      root.classList.add('dark');
      if (currentTheme === 'deep-blue') root.classList.add('theme-deep-blue');
      else if (currentTheme === 'rose') root.classList.add('theme-rose');
      else if (currentTheme === 'teal') root.classList.add('theme-teal');
      else root.classList.add('theme-dark');
    }

    localStorage.setItem('blinkchat_theme', currentTheme);
  }, [currentTheme]);

  const handleTabChange = (tab: string) => {
    if (tab === 'profile') setShowProfile(true);
    else if (tab === 'settings') setShowSettings(true);
    else if (tab === 'switch') onSwitchAccount?.();
    else setActiveTab(tab);
  };

  const currentUserIdRef = useRef(currentUser?.id);
  currentUserIdRef.current = currentUser?.id;
  const selectedChatIdRef = useRef(selectedChatId);
  selectedChatIdRef.current = selectedChatId;
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;
  const setChatsRef = useRef(setChats);
  setChatsRef.current = setChats;

  useEffect(() => {
    if (!currentUser?.id) return;
    const CHANNEL = 'global-messages';

    subscribeOnce(CHANNEL, (ch) =>
      ch
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMessage = payload.new as any;

          setChatsRef.current((prev: any) => {
            const chatIndex = prev.findIndex((c: any) => c.id === newMessage.chat_id);
            if (chatIndex > -1) {
              const updatedChats = [...prev];
              const chat = { ...updatedChats[chatIndex] };

              const mappedMsg: Message = {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id || currentUserIdRef.current,
                content: newMessage.text,
                text: newMessage.text,
                type: newMessage.type || 'text',
                mediaUrl: newMessage.media_url,
                mediaType: newMessage.media_type,
                mediaSize: newMessage.media_size,
                mediaName: newMessage.media_name,
                uploadStatus: newMessage.upload_status || 'done',
                timestamp: new Date(newMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: newMessage.created_at,
                status: (newMessage.status || (newMessage.seen ? 'seen' : 'sent')) as MessageStatus,
                replyTo: newMessage.reply_to,
                replyToMessage: newMessage.reply_to_message,
              };

              if (!chat.messages.some((m: any) => m.id === mappedMsg.id)) {
                chat.messages = [...chat.messages, mappedMsg];
                chat.lastMessage = mappedMsg;
                chat.lastMessageAt = newMessage.created_at;
                if (selectedChatIdRef.current !== chat.id) {
                  chat.unreadCount = (chat.unreadCount || 0) + 1;
                }
              }

              updatedChats.splice(chatIndex, 1);
              return [chat, ...updatedChats];
            } else {
              fetchConversationsRef.current();
              return prev;
            }
          });
        })
        // FIX: ab raw snake_case fields spread nahi karte — sirf status/reactions normalize karke update karte hain
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          const updatedMsg = payload.new as any;
          setChatsRef.current((prev: any) => prev.map((c: any) => {
            if (c.id === updatedMsg.chat_id) {
              const updatedMessages = c.messages.map((m: any) =>
                m.id === updatedMsg.id
                  ? {
                      ...m,
                      status: (updatedMsg.status || (updatedMsg.seen ? 'seen' : 'sent')) as MessageStatus,
                      reactions: updatedMsg.reactions ?? m.reactions,
                    }
                  : m
              );
              return { ...c, messages: updatedMessages, lastMessage: updatedMessages[updatedMessages.length - 1] };
            }
            return c;
          }));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, () => fetchConversationsRef.current())
        .subscribe((status) => {
          setGlobalRealtimeStatus(status as any);
        })
    );

    return () => { unsubscribe(CHANNEL); };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const intervalTime = globalRealtimeStatus === 'SUBSCRIBED' ? 15000 : 4000;
    const interval = setInterval(() => { fetchConversations(); }, intervalTime);
    return () => clearInterval(interval);
  }, [currentUser?.id, fetchConversations, globalRealtimeStatus]);

  useEffect(() => {
    if (selectedChatId) {
      setChats((prev: any) => prev.map((c: any) => c.id === selectedChatId ? { ...c, unreadCount: 0 } : c));
    }
  }, [selectedChatId]);

  useEffect(() => {
    setChats((prev: any) =>
      prev.map((c: any) => {
        const isOnline = onlineUsers.includes(c.user.id);
        if (isOnline) {
          let updated = false;
          const updatedMessages = c.messages.map((m: any) => {
            if (m.status === 'sent') {
              updated = true;
              return { ...m, status: 'delivered' as MessageStatus };
            }
            return m;
          });
          const lastMsg = updatedMessages[updatedMessages.length - 1];
          return {
            ...c,
            user: { ...c.user, isOnline },
            messages: updated ? updatedMessages : c.messages,
            lastMessage: updated && lastMsg ? { ...lastMsg, status: 'delivered' as MessageStatus } : c.lastMessage
          };
        }
        return { ...c, user: { ...c.user, isOnline } };
      })
    );

    if (currentUser?.id && onlineUsers.length > 0) {
      const onlineContactChatIds = chats
        .filter((c: any) => onlineUsers.includes(c.user?.id))
        .map((c: any) => c.id);

      if (onlineContactChatIds.length > 0) {
        supabase
          .from('messages')
          .update({ status: 'delivered' })
          .in('chat_id', onlineContactChatIds)
          .eq('status', 'sent')
          .then(({ error }) => {
            if (error && import.meta.env.DEV) console.error('[Index] mark delivered error:', error);
          });
      }
    }
  }, [onlineUsers, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('blinkchat_conversations', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (!selectedChatId) return;
    const markAsRead = async () => {
      try {
        await supabase
          .from('messages')
          .update({ status: 'seen', seen: true })
          .eq('chat_id', selectedChatId)
          .neq('sender_id', currentUser.id)
          .or('status.neq.seen,status.is.null');
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    };
    markAsRead();
  }, [selectedChatId]);

  const handleStartChat = async (user: User) => {
    try {
      const existingLocal = chats.find((c: any) => c.user.id === user.id);
      if (existingLocal) {
        handleSelectChat(existingLocal.id);
        return;
      }

      const { data: existingChats, error: fetchError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(participant1_id.eq.${currentUser.id},participant2_id.eq.${user.id}),and(participant1_id.eq.${user.id},participant2_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;
      const existingChat = existingChats && existingChats.length > 0 ? existingChats[0] : null;

      if (existingChat) {
        const newChat = {
          id: existingChat.id, user, messages: [], unreadCount: 0,
          isPinned: false, isMuted: false, isArchived: false,
          lastMessage: null, lastMessageAt: existingChat.created_at
        };
        setChats((prev: any) => [newChat, ...prev]);
        handleSelectChat(existingChat.id);
      } else {
        const { data: newChatData, error: insertError } = await supabase
          .from('chats')
          .insert({ participant1_id: currentUser.id, participant2_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        if (newChatData) {
          const newChat = {
            id: newChatData.id, user, messages: [], unreadCount: 0,
            isPinned: false, isMuted: false, isArchived: false,
            lastMessage: null, lastMessageAt: newChatData.created_at
          };
          setChats((prev: any) => [newChat, ...prev]);
          handleSelectChat(newChat.id);
        }
      }
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
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
        handleBack();
        setShowContactInfo(false);
      }
    } catch (err) { console.error(err); }
    setShowDeleteConfirm(false);
  };

  const handleBlockUser = async () => {
    toast({ title: 'User blocked (Locally)' });
    setShowBlockConfirm(false);
  };

  const handleReportUser = async () => {
    toast({ title: 'User reported (Locally)' });
    setShowReportConfirm(false);
  };

  const handleReact = async () => {
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
      className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-display"
    >
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
                  onBack={handleBack}
                  currentTheme={currentTheme}
                  t={t}
                  onSendMessage={async (chatId, msg) => {
                    setChats((prev: any) => prev.map((c: any) => {
                      if (c.id === chatId) {
                        const exists = c.messages.some((m: any) => m.id === msg.id);
                        const updatedMessages = exists ? c.messages : sortMessagesByTime([...c.messages, msg]);
                        return { ...c, messages: updatedMessages, lastMessage: msg, lastMessageAt: new Date().toISOString() };
                      }
                      return c;
                    }));
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
                  onlineUsers={onlineUsers}
                />
              ) : (
                <>
                  <div className="flex-1 overflow-hidden relative">
                    {mobileTab === 'chats' && (
                      <ChatListSidebar
                        chats={sortedChats}
                        selectedChatId={selectedChatId}
                        onSelectChat={handleSelectChat}
                        onOpenProfile={() => setMobileTab('profile')}
                        onNewChat={() => {}}
                        onStartChat={handleStartChat}
                        onOpenNewGroup={() => setShowNewGroup(true)}
                        onLogout={onLogout}
                        onOpenSettings={() => setShowSettings(true)}
                        onOpenAI={() => setShowAI(true)}
                        t={t}
                        currentUser={currentUser}
                        globalSearch={globalSearch}
                        onRefresh={fetchConversations}
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
            <div className="flex-1 h-full flex p-3 md:p-5 gap-4 overflow-hidden bg-[var(--bg-primary)]">
              <div className="w-[360px] lg:w-[400px] h-full flex flex-col rounded-[2.2rem] bg-[var(--chat-list-bg,#ffffff)] text-[var(--chat-list-text,#111111)] shadow-2xl overflow-hidden shrink-0 border border-black/5 dark:border-white/10 transition-all">
                <ChatListSidebar
                  chats={sortedChats}
                  selectedChatId={selectedChatId}
                  onSelectChat={handleSelectChat}
                  onOpenProfile={() => setShowProfile(true)}
                  onNewChat={() => {}}
                  onStartChat={handleStartChat}
                  onOpenNewGroup={() => setShowNewGroup(true)}
                  onLogout={onLogout}
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenAI={() => setShowAI(true)}
                  t={t}
                  currentUser={currentUser}
                  activeFilter={activeTab === 'archived' ? 'archived' : 'all'}
                  globalSearch={globalSearch}
                  onRefresh={fetchConversations}
                />
              </div>

              <div className="flex-1 h-full rounded-[2.2rem] bg-[var(--bg-primary)] border border-[var(--border-color)] relative overflow-hidden flex flex-col shadow-inner">
                {selectedChatId ? (
                  <ChatPanel
                    key={selectedChatId || 'none'}
                    chat={selectedChat}
                    currentUser={currentUser}
                    onBack={handleBack}
                    currentTheme={currentTheme}
                    t={t}
                    onSendMessage={async (chatId, msg) => {
                      setChats((prev: any) => prev.map((c: any) => {
                        if (c.id === chatId) {
                          const exists = c.messages.some((m: any) => m.id === msg.id);
                          const updatedMessages = exists ? c.messages : sortMessagesByTime([...c.messages, msg]);
                          return { ...c, messages: updatedMessages, lastMessage: msg, lastMessageAt: new Date().toISOString() };
                        }
                        return c;
                      }));
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
                    allChats={chats}
                    onlineUsers={onlineUsers}
                  />
                ) : (
                  <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-transparent">
                    <div className="w-24 h-24 rounded-[32px] bg-black/5 dark:bg-white/10 flex items-center justify-center mb-6 border border-black/10 dark:border-white/20 shadow-md">
                      <MessageSquare size={48} className="text-[var(--text-primary)] opacity-70" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-3 tracking-tight">Select a conversation</h1>
                    <p className="max-w-md text-[var(--text-secondary)] text-sm leading-relaxed">
                      Choose a chat from the left panel to begin messaging with end-to-end realtime encryption.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showProfile && (
          <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)} user={currentUser} onSignOut={onLogout} currentTheme={currentTheme} />
        )}
        {showSettings && (
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            currentTheme={currentTheme}
            onThemeChange={handleThemeChange}
            language={language}
            onLanguageChange={onLanguageChange}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        )}
        {showCamera && (
          <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onSend={() => setShowCamera(false)} />
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
                messages: [], unreadCount: 0, isPinned: false, isMuted: false, isArchived: false,
              };
              setChats((prev: any) => [newChat, ...prev]);
              handleSelectChat(newChat.id);
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
            currentTheme={currentTheme}
          />
        )}
        {showAI && <AIAssistant isOpen={showAI} onClose={() => setShowAI(false)} chats={chats} />}
      </AnimatePresence>

      <DeleteChatModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={() => selectedChatId && handleDeleteConversation(selectedChatId)} />
      <BlockUserModal isOpen={showBlockConfirm} onClose={() => setShowBlockConfirm(false)} onConfirm={handleBlockUser} />
      <ReportUserModal isOpen={showReportConfirm} onClose={() => setShowReportConfirm(false)} onConfirm={handleReportUser} />
    </motion.div>
  );
};

export default Index;
