// server/src/routes/simpleUser.routes.js (yangilangan)
const express = require('express');
const router = express.Router();
const {
    getActiveSessions,
    getSessionHistory,
    getActivityLogs,
    getAllUsers,
    createUser,
    deleteUser,
    getRealtors,
    updateUser
} = require('../controllers/simpleUserController');
const { protect, authorize, cleanupOldSessions } = require('../middleware/simpleAuth');

// ✅ YANGI: /api/users/users ga request kelganda sesiyalarni tozalash
const cleanupBeforeUsers = (req, res, next) => {
    cleanupOldSessions();
    next();
};

// Public routes
router.get('/sessions/active', protect, getActiveSessions);
router.get('/sessions/history', protect, getSessionHistory);
router.get('/logs', protect, getActivityLogs);
router.get('/realtors', getRealtors);

// Admin routes
router.get('/users', protect, authorize('admin'), cleanupBeforeUsers, getAllUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;