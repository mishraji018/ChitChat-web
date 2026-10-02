import { useState } from 'react';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  image?: string;
  avatar?: string;
  className?: string;
}

const sizes = { 
  sm: 'w-8 h-8 text-xs', 
  md: 'w-10 h-10 text-sm', 
  lg: 'w-12 h-12 text-base', 
  xl: 'w-20 h-20 text-2xl', 
  '2xl': 'w-32 h-32 text-4xl' 
};

const dotSizes = { 
  sm: 'w-2 h-2', 
  md: 'w-2.5 h-2.5', 
  lg: 'w-3 h-3', 
  xl: 'w-4 h-4', 
  '2xl': 'w-6 h-6' 
};

const UserAvatar = ({ name, color = '#7c3aed', size = 'md', isOnline, image, avatar, className }: AvatarProps) => {
  const photo = image || avatar;
  const [imgError, setImgError] = useState(false);

  const cleanName = (name || '?').trim();
  const initials = cleanName
    ? cleanName.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?'
    : '?';

  return (
    <div className={`relative inline-flex shrink-0 ${sizes[size]} ${className || ''}`}>
      {photo && !imgError ? (
        <img 
          src={photo} 
          alt={cleanName} 
          onError={() => setImgError(true)} 
          referrerPolicy="no-referrer"
          className="w-full h-full rounded-full object-cover shadow-sm" 
        />
      ) : (
        <div 
          className="w-full h-full rounded-full flex items-center justify-center font-bold shadow-sm" 
          style={{ backgroundColor: color || '#7c3aed', color: '#fff' }}
        >
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span 
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-[var(--chat-list-bg,#ffffff)] ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-zinc-400/40'}`} 
        />
      )}
    </div>
  );
};

export default UserAvatar;
