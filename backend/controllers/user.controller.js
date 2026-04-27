import { supabase } from '../config/supabase.js';

export const getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, mobile, email, avatar, bio, is_online, last_seen')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  const { name, bio, avatar } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .update({
        name: name || undefined,
        bio: bio || undefined,
        avatar: avatar || undefined,
      })
      .eq('id', req.user.id)
      .select('id, name, mobile, email, avatar, bio')
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchUsers = async (req, res) => {
  const query = req.query.q;

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, mobile, avatar, bio, is_online, last_seen')
      .neq('id', req.user.id)
      .or(`name.ilike.%${query}%,mobile.ilike.%${query}%`);

    if (error) throw error;
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getContacts = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, mobile, avatar, bio, is_online, last_seen')
      .neq('id', req.user.id);

    if (error) throw error;
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFCMToken = async (req, res) => {
  const { fcmToken } = req.body;

  try {
    const { error } = await supabase
      .from('users')
      .update({ fcm_token: fcmToken })
      .eq('id', req.user.id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
