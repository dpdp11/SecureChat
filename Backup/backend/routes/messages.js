const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');

const router = express.Router();
const ObjectId = mongoose.Types.ObjectId;

// Get history
router.get('/history/:userId/:friendId', async (req, res) => {
  try {
    const { userId, friendId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    }).sort('createdAt').populate('sender', 'username').populate('receiver', 'username').populate({
      path: 'replyTo',
      select: 'text sender createdAt',
      populate: { path: 'sender', select: 'username' }
    });
    
    // Mark as read automatically when history is fetched
    await Message.updateMany(
      { sender: friendId, receiver: userId, isRead: false },
      { $set: { isRead: true } }
    );
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread counts
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const unreadMessages = await Message.aggregate([
      { $match: { receiver: new ObjectId(userId), isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    
    const unreadCounts = {};
    unreadMessages.forEach(msg => {
      unreadCounts[msg._id] = msg.count;
    });
    
    res.json(unreadCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
