const express = require('express');
const router = express.Router();
const {
    getOnlineUsers,
    getUserActivity,
    getAllUsers,
    createUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/online', protect, getOnlineUsers);
router.get('/:id/activity', protect, getUserActivity);
router.get('/', protect, authorize('admin'), getAllUsers);
router.post('/', protect, authorize('admin'), createUser);

module.exports = router;