const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');

const router = express.Router();

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({ username: { $regex: q, $options: 'i' } })
                            .select('_id username');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add friend
router.post('/add-friend', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    if (userId === friendId) return res.status(400).json({ message: "Cannot add yourself" });
    
    const user = await User.findById(userId);
    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
      await user.save();
    }
    
    const friend = await User.findById(friendId);
    if (!friend.friends.includes(userId)) {
      friend.friends.push(userId);
      await friend.save();
    }
    
    res.json({ message: 'Friend added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends and determine active chats
router.get('/friends/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('friends', '_id username');
    
    // Determine active chats (where latest message createdAt > clearedAt)
    const friendsWithStatus = await Promise.all(user.friends.map(async (friend) => {
      const clearedAt = user.clearedChats?.get(friend._id.toString()) || new Date(0);
      const latestMsg = await Message.findOne({
        $or: [
          { sender: user._id, receiver: friend._id },
          { sender: friend._id, receiver: user._id }
        ],
        createdAt: { $gt: clearedAt }
      }).sort('-createdAt');
      
      return {
        _id: friend._id,
        username: friend.username,
        hasActiveChat: !!latestMsg,
        latestMessageAt: latestMsg ? latestMsg.createdAt : null
      };
    }));

    // Sort by latest msg
    friendsWithStatus.sort((a, b) => {
      if (a.latestMessageAt && b.latestMessageAt) return b.latestMessageAt - a.latestMessageAt;
      if (a.latestMessageAt) return -1;
      if (b.latestMessageAt) return 1;
      return 0;
    });

    res.json(friendsWithStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
