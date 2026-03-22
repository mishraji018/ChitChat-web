import { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCw, Check, User, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { registeredUsers } from '@/data/mockData';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { image: string, caption: string, contactId: string }) => void;
}

const CameraModal = ({ isOpen, onClose, onSend }: CameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, capturedImage]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera access error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const handleSend = () => {
    if (capturedImage && selectedContact) {
      onSend({ image: capturedImage, caption, contactId: selectedContact });
      reset();
      onClose();
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setCaption('');
    setSelectedContact('');
    setRotation(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-primary/20 relative flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Camera className="text-primary" />
            {capturedImage ? 'Preview Photo' : 'Take Photo'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {!capturedImage ? (
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center group">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <button 
                onClick={capturePhoto}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-all scale-100 hover:scale-110 active:scale-90 shadow-lg"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="max-w-full max-h-full transition-transform duration-300"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
                <button 
                  onClick={() => setRotation(r => r + 90)}
                  className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-md"
                >
                  <RotateCw size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Caption</label>
                  <input 
                    type="text"
                    placeholder="Add a caption..."
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Send to</label>
                  <select 
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-foreground"
                    value={selectedContact}
                    onChange={(e) => setSelectedContact(e.target.value)}
                  >
                    <option value="">Select a contact...</option>
                    {registeredUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {capturedImage && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
            <button 
              onClick={() => setCapturedImage(null)}
              className="px-6 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Retake
            </button>
            <button 
              onClick={handleSend}
              disabled={!selectedContact}
              className="px-8 py-2.5 rounded-xl gradient-primary text-white font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 shadow-lg shadow-primary/20"
            >
              <Send size={18} />
              Send
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CameraModal;
