interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  image?: string;
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-20 h-20 text-2xl', '2xl': 'w-32 h-32 text-4xl' };
const dotSizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-4 h-4', '2xl': 'w-6 h-6' };

const UserAvatar = ({ name, color, size = 'md', isOnline, image }: AvatarProps) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="relative inline-flex shrink-0">
      {image ? (
        <img src={image} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
      ) : (
        <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold`} style={{ backgroundColor: color, color: '#fff' }}>
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-card ${isOnline ? 'bg-online' : 'bg-muted-foreground'}`} />
      )}
    </div>
  );
};

export default UserAvatar;
