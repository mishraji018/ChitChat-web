import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';

export const useStreak = (uid1: string, uid2: string) => {
  const [streak, setStreak] = useState(0);
  const [justBroken, setJustBroken] = useState(false);

  const fetchStreak = async () => {
    if (!uid1 || !uid2) return;
    const { data } = await supabase
      .from('streaks')
      .select('*')
      .or(`and(user1_id.eq.${uid1},user2_id.eq.${uid2}),and(user1_id.eq.${uid2},user2_id.eq.${uid1})`)
      .maybeSingle();
    if (data) setStreak(data.streak_count);
  };

  const updateStreak = async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const { data } = await supabase
      .from('streaks')
      .select('*')
      .or(`and(user1_id.eq.${uid1},user2_id.eq.${uid2}),and(user1_id.eq.${uid2},user2_id.eq.${uid1})`)
      .maybeSingle();

    if (!data) {
      await supabase.from('streaks').insert({
        user1_id: uid1, user2_id: uid2,
        streak_count: 1, last_message_date: today
      });
      setStreak(1);
    } else if (data.last_message_date === today) {
      return; // already messaged today
    } else if (data.last_message_date === yesterday) {
      const newStreak = data.streak_count + 1;
      await supabase.from('streaks')
        .update({ streak_count: newStreak, last_message_date: today, updated_at: new Date().toISOString() })
        .eq('id', data.id);
      setStreak(newStreak);
    } else {
      // streak broken
      if (data.streak_count > 3) setJustBroken(true);
      await supabase.from('streaks')
        .update({ streak_count: 1, last_message_date: today })
        .eq('id', data.id);
      setStreak(1);
    }
  };

  useEffect(() => { fetchStreak(); }, [uid1, uid2]);
  return { streak, updateStreak, justBroken };
};
