import { supabase } from '../config/supabase.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token with Supabase
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authUser) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
      }
      
      // Fetch the full user from our database table
      const { data: user, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (dbError || !user) {
        return res.status(401).json({ success: false, message: 'User profile not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      res.status(401).json({ success: false, message: 'Not authorized' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};
