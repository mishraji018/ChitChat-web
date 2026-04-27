import { supabase } from '../config/supabase.js';

export const googleAuth = async (req, res) => {
  const { accessToken } = req.body;

  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authUser) {
      return res.status(401).json({ success: false, message: 'Invalid Supabase token' });
    }

    const { email, user_metadata, id: userId } = authUser;
    const { full_name, avatar_url } = user_metadata;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!user) {
      return res.status(200).json({
        success: true,
        isNewUser: true,
        userData: { userId, email, name: full_name, avatar: avatar_url }
      });
    }

    await supabase
      .from('users')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', user.id);

    res.status(200).json({
      success: true,
      isNewUser: false,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
        }
      }
    });
  } catch (error) {
    console.error('Google Auth Sync Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeGoogleSignup = async (req, res) => {
  const { userId, username, email, avatar_url } = req.body;

  try {
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('name', username)
      .single();

    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: username,
        email,
        avatar: avatar_url,
        is_verified: true,
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json({
      success: true,
      message: 'Signup completed successfully',
      data: { user: newUser }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    await supabase
      .from('users')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('id', req.user.id);

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ success: false, message: error.message });
    res.json({ success: true, session: data.session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};