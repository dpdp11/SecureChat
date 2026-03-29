const express = require('express');
const User = require('../models/User');

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
    
    // Add reciprocal friend
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

// Get friends
router.get('/friends/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('friends', '_id username');
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
