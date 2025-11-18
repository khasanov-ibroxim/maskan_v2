const express = require('express');
const router = express.Router();
const {
    getActiveSessions,
    getSessionHistory,
    getActivityLogs,
    getAllUsers,
    createUser,
    deleteUser
} = require('../controllers/simpleUserController');
const { protect, authorize } = require('../middleware/simpleAuth');

// Public routes
router.get('/sessions/active', protect, getActiveSessions);
router.get('/sessions/history', protect, getSessionHistory);
router.get('/logs', protect, getActivityLogs);

// Admin only routes
router.get('/users', protect, authorize('admin'), getAllUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;