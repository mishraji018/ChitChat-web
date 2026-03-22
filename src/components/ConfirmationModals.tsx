import { X, AlertTriangle, Shield, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data?: any) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'destructive' | 'primary';
  icon?: React.ReactNode;
}

const BaseModal = ({ isOpen, onClose, onConfirm, title, description, confirmLabel, confirmVariant = 'primary', icon }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border flex flex-col items-center text-center"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmVariant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{description}</p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm()}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-95 ${confirmVariant === 'destructive' ? 'bg-destructive shadow-lg shadow-destructive/20' : 'gradient-primary shadow-lg shadow-primary/20'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const DeleteChatModal = ({ isOpen, onClose, onConfirm }: Omit<ModalProps, 'title' | 'description' | 'confirmLabel' | 'icon'>) => (
  <BaseModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Delete Chat?"
    description="This will permanently delete all messages in this conversation. This action only affects your side and cannot be undone."
    confirmLabel="Delete"
    confirmVariant="destructive"
    icon={<AlertTriangle size={24} />}
  />
);

export const BlockUserModal = ({ isOpen, onClose, onConfirm }: Omit<ModalProps, 'title' | 'description' | 'confirmLabel' | 'icon'>) => (
  <BaseModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Block User?"
    description="Blocked contacts will no longer be able to call you or send you messages. They will not see your status updates or profile photo."
    confirmLabel="Block"
    confirmVariant="destructive"
    icon={<Shield size={24} />}
  />
);

export const ReportUserModal = ({ isOpen, onClose, onConfirm }: Omit<ModalProps, 'title' | 'description' | 'confirmLabel' | 'icon'>) => {
  const [reason, setReason] = useState('Spam');
  const reasons = ['Spam', 'Inappropriate content', 'Fake account', 'Harassment', 'Other'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border flex flex-col"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <Flag size={20} />
          </div>
          <h3 className="text-xl font-bold text-foreground">Report User</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">Select a reason for reporting this user:</p>
        
        <div className="space-y-2 mb-6">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${reason === r ? 'bg-primary/10 border-primary text-primary font-semibold' : 'hover:bg-muted border-transparent text-foreground/70'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-3 rounded-xl font-bold text-white gradient-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Submit
          </button>
        </div>
      </motion.div>
    </div>
  );
};
