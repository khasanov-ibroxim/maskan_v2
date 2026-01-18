// server/src/routes/client.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const {
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    assignRealtor,
    assignObject,
    unassignObject,
    findMatches,
    getStats,
    getAssignedObjects // ✅ NEW
} = require('../controllers/clientController');

// Statistics (must be before /:id)
router.get('/stats/summary', protect, authorize('admin'), getStats);

// Get all clients
router.get('/', protect, authorize('admin'), getClients);

// Get client by ID
router.get('/:id', protect, authorize('admin'), getClient);

// Create new client
router.post('/', protect, authorize('admin'), createClient);

// Update client
router.put('/:id', protect, authorize('admin'), updateClient);

// Delete client
router.delete('/:id', protect, authorize('admin'), deleteClient);

// Assign realtor
router.post('/:id/assign-realtor', protect, authorize('admin'), assignRealtor);

// Assign/Unassign objects
router.post('/:id/assign-object', protect, authorize('admin'), assignObject);
router.post('/:id/unassign-object', protect, authorize('admin'), unassignObject);

// Find matching objects
router.get('/:id/matches', protect, authorize('admin'), findMatches);

// ✅ NEW: Get assigned objects
router.get('/:id/assigned-objects', protect, authorize('admin'), getAssignedObjects);

module.exports = router;