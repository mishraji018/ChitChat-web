import { useState, useCallback, useEffect } from 'react';
import { Phone, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SplashScreen from '@/components/SplashScreen';
import LoginScreen from '@/components/LoginScreen';
import ChatListSidebar from '@/components/ChatListSidebar';
import ChatPanel from '@/components/ChatPanel';
import ProfilePanel from '@/components/ProfilePanel';
import SettingsPanel from '@/components/SettingsPanel';
import NewChatPanel from '@/components/NewChatPanel';
import Navbar from '@/components/Navbar';
import CameraModal from '@/components/CameraModal';
import NewGroupModal from '@/components/NewGroupModal';
import ContactInfoPanel from '@/components/ContactInfoPanel';
import { DeleteChatModal, BlockUserModal, ReportUserModal } from '@/components/ConfirmationModals';
import { mockChats } from '@/data/mockData';
import type { ThemeType } from '@/types/chat';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { wallpapers } from '@/data/wallpapers';
import { useLanguage } from '@/hooks/use-language';
import { User } from '@/types/chat';

interface IndexProps {
  currentUser: User;
  onLogout: () => void;
  t: any;
  language: string;
  onLanguageChange: (lang: string) => void;
}

const Index = ({ currentUser, onLogout, t, language, onLanguageChange }: IndexProps) => {
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('blinkchat_conversations');
    return saved ? JSON.parse(saved) : mockChats;
  });
  
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
  const [activeTab, setActiveTab] = useState('chats');

  const [currentTheme, setCurrentTheme] = useState<ThemeType>(
    () => (localStorage.getItem('blinkchat_theme') as ThemeType) || 'dark'
  );

  const handleThemeChange = useCallback((t: ThemeType) => {
    setCurrentTheme(t);
  }, []);

  const [wallpaper, setWallpaper] = useLocalStorage('blinkchat_wallpaper', 'default');

  useEffect(() => {
    const root = document.documentElement;
    
    if (currentTheme === 'dark') {
      root.style.setProperty('--background', '260 20% 6%');
      root.style.setProperty('--card', '260 20% 9%');
      root.style.setProperty('--foreground', '280 30% 95%');
      root.style.setProperty('--muted-foreground', '260 20% 65%');
      root.style.setProperty('--card-foreground', '280 30% 95%');
      root.style.setProperty('--primary', '330 85% 65%');
      root.style.setProperty('--muted', '260 15% 15%');
      root.style.setProperty('--border', '260 15% 18%');
      // Message bubbles
      root.style.setProperty('--msg-sent-bg', '#f472b6');
      root.style.setProperty('--msg-sent-text', '#0d0a0f');
      root.style.setProperty('--msg-recv-bg', '#1e1528');
      root.style.setProperty('--msg-recv-text', '#f0e6ff');
      root.style.setProperty('--msg-time-color', '#a07898');
    } 
    else if (currentTheme === 'deep-blue') {
      root.style.setProperty('--background', '220 40% 6%');
      root.style.setProperty('--card', '220 40% 10%');
      root.style.setProperty('--foreground', '210 30% 95%');
      root.style.setProperty('--muted-foreground', '220 20% 60%');
      root.style.setProperty('--card-foreground', '210 30% 95%');
      root.style.setProperty('--primary', '215 90% 65%');
      root.style.setProperty('--muted', '220 30% 15%');
      root.style.setProperty('--border', '220 25% 18%');
      // Message bubbles
      root.style.setProperty('--msg-sent-bg', '#4f8ef7');
      root.style.setProperty('--msg-sent-text', '#ffffff');
      root.style.setProperty('--msg-recv-bg', '#0f1e35');
      root.style.setProperty('--msg-recv-text', '#e0eeff');
      root.style.setProperty('--msg-time-color', '#6a90b8');
    }
    else if (currentTheme === 'light') {
      root.style.setProperty('--background', '210 20% 96%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--foreground', '220 25% 8%');
      root.style.setProperty('--muted-foreground', '220 15% 35%');
      root.style.setProperty('--card-foreground', '220 25% 8%');
      root.style.setProperty('--primary', '162 60% 35%');
      root.style.setProperty('--muted', '210 15% 88%');
      root.style.setProperty('--border', '210 15% 80%');
      // Message bubbles
      root.style.setProperty('--msg-sent-bg', '#00b894');
      root.style.setProperty('--msg-sent-text', '#ffffff');
      root.style.setProperty('--msg-recv-bg', '#ffffff');
      root.style.setProperty('--msg-recv-text', '#111827');
      root.style.setProperty('--msg-time-color', '#667781');
    }
    else if (currentTheme === 'rose') {
      root.style.setProperty('--background', '340 30% 7%');
      root.style.setProperty('--card', '340 25% 11%');
      root.style.setProperty('--foreground', '340 30% 95%');
      root.style.setProperty('--muted-foreground', '340 15% 60%');
      root.style.setProperty('--card-foreground', '340 30% 95%');
      root.style.setProperty('--primary', '330 85% 65%');
      root.style.setProperty('--muted', '340 20% 16%');
      root.style.setProperty('--border', '340 20% 20%');
      // Message bubbles
      root.style.setProperty('--msg-sent-bg', '#f472b6');
      root.style.setProperty('--msg-sent-text', '#1a0010');
      root.style.setProperty('--msg-recv-bg', '#2a0f1e');
      root.style.setProperty('--msg-recv-text', '#ffe0f0');
      root.style.setProperty('--msg-time-color', '#b06080');
    }

    root.classList.remove('theme-light', 'theme-rose', 'theme-deep-blue', 'theme-dark');
    if (currentTheme !== 'dark') {
      root.classList.add(`theme-${currentTheme}`);
    }

    localStorage.setItem('blinkchat_theme', currentTheme);
  }, [currentTheme]);

  // Persist conversations
  useEffect(() => {
    localStorage.setItem('blinkchat_conversations', JSON.stringify(chats));
  }, [chats]);

  // Apply Wallpaper Logic
  useEffect(() => {
    const chatBg = document.querySelector('.messages-area') as HTMLElement;
    if (!chatBg) return;

    if (wallpaper === 'default') {
      chatBg.style.removeProperty('background');
      chatBg.style.removeProperty('background-image');
    } else if (wallpaper.startsWith('device:')) {
      // device uploaded photo
      const dataUrl = wallpaper.replace('device:', '');
      chatBg.style.background = `url(${dataUrl}) center/cover no-repeat`;
    } else {
      const wp = wallpapers.find(w => w.id === wallpaper);
      if (wp) chatBg.style.background = wp.color;
    }
  }, [wallpaper, selectedChatId]); // Re-run when chat changes to apply to new .messages-area

  const handleStartChat = (user: User) => {
    const existing = chats.find((c: any) => c.user.id === user.id);
    
    if (existing) {
      setSelectedChatId(existing.id);
    } else {
      const newChat = {
        id: `c_${user.id}_${Date.now()}`,
        user: user,
        messages: [],
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        isArchived: false,
      };
      setChats((prev: any) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
    }
    setShowNewChat(false);
  };

  const handleToggleMute = (chatId: string) => {
    setChats((prev: any) => prev.map((c: any) => c.id === chatId ? { ...c, isMuted: !c.isMuted } : c));
  };

  const handleTogglePin = (chatId: string) => {
    setChats((prev: any) => prev.map((c: any) => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
  };

  const handleToggleArchive = (chatId: string) => {
    setChats((prev: any) => prev.map((c: any) => c.id === chatId ? { ...c, isArchived: !c.isArchived } : c));
  };

  const handleDeleteConversation = (chatId: string) => {
    setChats((prev: any) => prev.filter((c: any) => c.id !== chatId));
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      setShowContactInfo(false);
    }
    setShowDeleteConfirm(false);
  };

  const handleBlockUser = (chatId: string) => {
    // For now just hide the chat or mark as blocked
    setShowBlockConfirm(false);
  };

  const handleReportUser = (chatId: string) => {
    setShowReportConfirm(false);
  };

  const handleReact = (chatId: string, messageId: string, emoji: string) => {
    setChats((prev: any) => prev.map((c: any) => {
      if (c.id !== chatId) return c;
      return {
        ...c,
        messages: c.messages.map((m: any) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions || [];
          const existingIdx = reactions.findIndex((r: any) => r.userId === currentUser.id);
          
          let newReactions;
          if (existingIdx > -1) {
            if (reactions[existingIdx].emoji === emoji) {
              // Remove if same emoji
              newReactions = reactions.filter((_: any, i: number) => i !== existingIdx);
            } else {
              // Update emoji
              newReactions = reactions.map((r: any, i: number) => i === existingIdx ? { ...r, emoji } : r);
            }
          } else {
            // Add new
            newReactions = [...reactions, { userId: currentUser.id, emoji }];
          }
          
          return { ...m, reactions: newReactions };
        })
      };
    }));
  };

  const archivedChats = chats.filter((c: any) => c.isArchived);
  const activeChats = chats.filter((c: any) => !c.isArchived);

  const displayChats = activeTab === 'archived' ? archivedChats : activeChats;

  const sortedChats = [...displayChats].sort((a: any, b: any) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Sort by timestamp (simple string comparison for now as it's HH:MM)
    const timeA = a.lastMessage?.timestamp || '00:00';
    const timeB = b.lastMessage?.timestamp || '00:00';
    return timeB.localeCompare(timeA);
  });

  const selectedChat = chats.find((c: any) => c.id === selectedChatId) || null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-screen w-screen overflow-hidden bg-background"
    >
      <Navbar 
        activeTab={showProfile ? 'profile' : (showSettings ? 'settings' : activeTab)} 
        onTabChange={setActiveTab} 
        onOpenCamera={() => setShowCamera(true)}
        onOpenProfile={() => {
          setShowSettings(false);
          setShowProfile(true);
        }}
        onOpenSettings={() => {
          setShowProfile(false);
          setShowSettings(true);
        }}
        archivedCount={archivedChats.length}
      />

      {/* Sidebar - fixed 340px on desktop */}
      <div className="w-[340px] min-w-[340px] h-full border-r border-border bg-sidebar-custom flex flex-col relative shrink-0">
        {(activeTab === 'chats' || activeTab === 'archived') ? (
          <ChatListSidebar
            chats={sortedChats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onOpenProfile={() => setShowProfile(true)}
            onNewChat={() => setShowNewChat(true)}
            onOpenNewGroup={() => setShowNewGroup(true)}
            onLogout={onLogout}
            t={t}
            currentUser={currentUser}
            activeFilter={activeTab === 'archived' ? 'archived' : 'all'}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-sidebar-custom">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              {activeTab === 'calls' && <Phone size={32} />}
              {activeTab === 'contacts' && <Users size={32} />}
            </div>
            <h2 className="text-xl font-bold text-foreground capitalize mb-2">{activeTab}</h2>
            <p className="text-sm">This section is coming soon. Stay tuned!</p>
          </div>
        )}

        {/* Overlay Panels */}
        <AnimatePresence>
          {showProfile && (
            <ProfilePanel 
              isOpen={showProfile} 
              onClose={() => setShowProfile(false)} 
              currentUser={currentUser}
              onLogout={onLogout}
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
              t={t}
            />
          )}
          {showCamera && (
            <CameraModal 
              isOpen={showCamera} 
              onClose={() => setShowCamera(false)}
              onSend={(data) => {
                console.log("Send camera photo to", data.contactId, data);
                // Here you would find/create chat and send message
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
        </AnimatePresence>
      </div>

      {/* Chat panel */}
      <div className="flex-1 h-full flex flex-col relative bg-background overflow-hidden">
        {selectedChatId ? (
          <ChatPanel
            key={selectedChatId || 'none'}
            chat={selectedChat}
            currentUser={currentUser}
            onBack={() => setSelectedChatId(null)}
            currentTheme={currentTheme}
            t={t}
            onSendMessage={(chatId, msg) => {
              setChats((prev: any) => prev.map((c: any) => 
                c.id === chatId ? { ...c, messages: [...c.messages, msg], lastMessage: msg } : c
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
          <div className="flex-1 flex flex-col items-center justify-center bg-chat chat-pattern messages-area text-center p-8">
            <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-6">
              <Phone size={48} className="text-muted-foreground opacity-20" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">BlinkChat Desktop</h1>
            <p className="max-w-md text-muted-foreground">
              Send and receive messages without keeping your phone online.<br/>
              Use BlinkChat on up to 4 linked devices and 1 phone at the same time.
            </p>
          </div>
        )}

        <AnimatePresence>
          {showContactInfo && selectedChat && (
            <ContactInfoPanel
              key={selectedChatId}
              user={selectedChat.user}
              chat={selectedChat}
              messages={selectedChat.messages}
              onClose={() => setShowContactInfo(false)}
              onOpenWallpaper={() => setShowWallpaperPicker(true)}
              onOpenSearch={() => setShowChatSearch(true)}
              onMessageClick={() => {
                setShowContactInfo(false);
                // The ChatPanel input is focused automatically when search closes or via ref
              }}
              onDeleteConversation={handleDeleteConversation}
            />
          )}
        </AnimatePresence>

      </div>

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
