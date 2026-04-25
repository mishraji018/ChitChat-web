import User from '../models/User.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passkey');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  const { name, bio, avatar } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = name || user.name;
      user.bio = bio || user.bio;
      user.avatar = avatar || user.avatar;
      
      const updatedUser = await user.save();
      res.status(200).json({
        success: true,
        data: {
          id: updatedUser._id,
          name: updatedUser.name,
          mobile: updatedUser.mobile,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchUsers = async (req, res) => {
  const query = req.query.q;

  try {
    const users = await User.find({
      $and: [
        { 
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { mobile: { $regex: query, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user.id } }
      ]
    }).select('name mobile avatar bio isOnline lastSeen');

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getContacts = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('name mobile avatar bio isOnline lastSeen');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFCMToken = async (req, res) => {
  const { fcmToken } = req.body;

  try {
    await User.findByIdAndUpdate(req.user.id, { fcmToken });
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
