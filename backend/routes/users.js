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

// Remove friend
router.post('/remove-friend', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile specifically
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('_id username');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends and decoupled active chats
router.get('/friends/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).populate('friends', '_id username');
    
    // 1. Get ALL messages involving the user to determine independent conversational history
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).populate('sender', '_id username').populate('receiver', '_id username');
    
    const partnerMap = new Map();
    messages.forEach(msg => {
      const isSender = msg.sender._id.toString() === userId;
      const partner = isSender ? msg.receiver : msg.sender;
      if (!partner) return;
      const pId = partner._id.toString();
      
      if (!partnerMap.has(pId)) {
        partnerMap.set(pId, { _id: partner._id, username: partner.username, latestMsg: msg });
      } else {
        if (new Date(msg.createdAt) > new Date(partnerMap.get(pId).latestMsg.createdAt)) {
          partnerMap.get(pId).latestMsg = msg;
        }
      }
    });

    // Determine post-clear active chats
    const activeChats = [];
    partnerMap.forEach(partner => {
      const clearedAt = user.clearedChats?.get(partner._id.toString()) || new Date(0);
      if (new Date(partner.latestMsg.createdAt) > clearedAt) {
        activeChats.push({
          _id: partner._id,
          username: partner.username,
          hasActiveChat: true,
          latestMessageAt: partner.latestMsg.createdAt
        });
      }
    });

    // Map strict friends independently
    const allFriends = user.friends.map(f => ({
      _id: f._id,
      username: f.username,
    }));

    activeChats.sort((a, b) => new Date(b.latestMessageAt) - new Date(a.latestMessageAt));

    res.json({ friends: allFriends, activeChats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
