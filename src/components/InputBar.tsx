// Toast
import { toast } from 'sonner';

// Image compression utilities
import { compressImage, generateVideoThumbnail } from '@/utils/imageCompressor';

// Token manager
import { getToken } from '@/utils/tokenManager';

import { useState, useRef } from 'react';
import { Send, Smile, Paperclip, Mic, Image, FileText, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ThemeType, User } from '@/types/chat';

interface InputBarProps {
  onSend: (text: string, type?: string, mediaData?: any) => void;
  currentTheme?: ThemeType;
  t: any;
  currentUser: User;
  disabled?: boolean;
  onTyping?: () => void;
  isRecipientOnline?: boolean;
}

const InputBar = ({ onSend, currentTheme, t, currentUser, disabled, onTyping, isRecipientOnline = true }: InputBarProps) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [activeUploadType, setActiveUploadType] = useState<string>('image');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let fileToUpload = file;
      let thumbnail = '';

      if (file.type.startsWith('image/')) {
        toast.info('Optimizing image...');
        fileToUpload = await compressImage(file);
      } else if (file.type.startsWith('video/')) {
        toast.info('Generating thumbnail...');
        thumbnail = await generateVideoThumbnail(file);
      }

      const sizeMB = (fileToUpload.size / 1024 / 1024).toFixed(2);
      
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = getToken();
      
      const res = await fetch(`${API_URL}/api/media/upload/${activeUploadType}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (data.url) {
        onSend(data.url, activeUploadType, {
          fileName: file.name,
          fileSize: `${sizeMB} MB`,
          thumbnail: thumbnail || data.thumbnail,
          ...data
        });
      }
    } catch (err) {
      toast.error('Upload failed. Try again.');
      console.error(err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordTime(0);
    timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    // TODO: connect API here — start audio recording
  };

  const stopRecording = (send: boolean) => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    if (send) {
      // TODO: connect API here — send voice note
      onSend('🎤 Voice note');
    }
    setRecordTime(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const attachOptions = [
    { icon: Image, label: 'Photo/Video', color: 'text-primary' },
    { icon: FileText, label: 'Document', color: 'text-accent' },
    { icon: MapPin, label: 'Location', color: 'text-destructive' },
  ];

  return (
    <div className="relative border-t border-border bg-card p-3">
      <AnimatePresence>
        {!isRecipientOnline && !disabled && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary/5 text-[11px] text-muted-foreground py-1 px-3 mb-2 rounded-lg flex items-center gap-1.5"
          >
            <span className="text-primary">🕙</span>
            <span>Recipient is offline. Messages will be delivered when they connect.</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 mb-2 z-30"
          >
            <EmojiPicker
              theme={currentTheme === 'light' ? Theme.LIGHT : Theme.DARK}
              onEmojiClick={(e) => setText(t => t + e.emoji)}
              width={320}
              height={360}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attach dropdown */}
      <AnimatePresence>
        {showAttach && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-12 mb-2 z-30 bg-popover border border-border rounded-xl p-2 shadow-xl"
          >
            {attachOptions.map(({ icon: Icon, label, color }) => (
              <button
                key={label}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setShowAttach(false);
                  if (label === 'Location') {
                    onSend('123 Main St, New York, NY', 'location', {
                      name: 'Central Park',
                      address: '123 Main St, New York, NY',
                      latitude: 40.785091,
                      longitude: -73.968285
                    });
                  } else {
                    const type = label === 'Photo/Video' ? 'image' : 'document';
                    setActiveUploadType(type);
                    fileInputRef.current?.click();
                  }
                }}
              >
                <Icon size={18} className={color} />
                <span className="text-sm text-foreground">{label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
        accept={activeUploadType === 'image' ? "image/*,video/*" : ".pdf,.doc,.docx,.xls,.xlsx,.txt"}
      />

      {isUploading && (
        <div className="px-4 py-2 bg-card border-t border-border mb-2 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-primary h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress || 50}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{uploadProgress || '...'}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Uploading...</p>
        </div>
      )}

      {isRecording ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
          <button onClick={() => stopRecording(false)} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-destructive font-medium">{formatTime(recordTime)}</span>
            <div className="flex items-center gap-0.5 flex-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full bg-primary"
                  animate={{ height: [4, 4 + Math.random() * 16, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.03 }}
                />
              ))}
            </div>
          </div>
          <button onClick={() => stopRecording(true)} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Send size={18} className="text-primary-foreground" />
          </button>
        </motion.div>
      ) : (
        <div className={`flex items-end gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <button
            disabled={disabled}
            onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
            className="p-2 text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <Smile size={22} />
          </button>
          <button
            disabled={disabled}
            onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
            className="p-2 text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <Paperclip size={22} />
          </button>
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "You cannot message a blocked contact" : t.typeMessage}
            className="flex-1 bg-muted/50 border border-border/50 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {text.trim() ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleSend}
              disabled={disabled}
              className="p-2.5 rounded-full gradient-primary shrink-0"
            >
              <Send size={18} className="text-primary-foreground" />
            </motion.button>
          ) : (
            <button
              onMouseDown={startRecording}
              disabled={disabled}
              className="p-2 text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              <Mic size={22} />
            </button>
          )}
        </div>

      )}
    </div>
  );
};

export default InputBar;
