import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/config/supabase';
import { toast } from 'sonner';

interface MemoryCapsuleProps {
  chatId: string;
  currentUserId: string;
  onCreated?: () => void;
}

export const MemoryCapsuleCreation = ({ chatId, currentUserId, onCreated }: MemoryCapsuleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !message || !date) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('memory_capsules').insert({
        chat_id: chatId,
        created_by: currentUserId,
        title,
        message,
        unlock_at: date.toISOString(),
      });

      if (error) throw error;

      toast.success('Memory Capsule locked 🔒');
      setIsOpen(false);
      setTitle('');
      setMessage('');
      setDate(undefined);
      onCreated?.();
    } catch (error: any) {
      console.error('Error creating capsule:', error);
      toast.error('Failed to lock memory');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="p-2 text-zinc-500 hover:text-purple-400 hover:bg-white/5 rounded-xl transition-all" title="Send Memory Capsule">
          <span className="text-xl">🕰️</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#121212] border-white/10 text-zinc-100 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Create Memory Capsule <span className="text-2xl">🕰️</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-zinc-400">Name this memory</Label>
            <Input
              id="title"
              placeholder="Our First Road Trip..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-purple-500/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message" className="text-zinc-400">Write your message...</Label>
            <Textarea
              id="message"
              placeholder="Remember when we..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-purple-500/50 min-h-[100px]"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-zinc-400">Unlock on</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 hover:text-zinc-100",
                    !date && "text-zinc-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#1a1a1a] border-white/10" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="bg-[#1a1a1a] text-zinc-100"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
        >
          {isLoading ? 'Locking...' : <><Lock size={18} /> Lock it 🔒</>}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
