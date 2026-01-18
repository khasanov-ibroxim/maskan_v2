// server/src/routes/client.routes.js - ✅ FULLY FIXED
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');

// ✅ CRITICAL FIX: Import entire controller module
const clientController = require('../controllers/clientController');

// ============================================
// ROUTES - PROPER ORDER (Specific → Dynamic)
// ============================================

// Statistics (must be FIRST - specific route)
router.get('/stats/summary', protect, authorize('admin'), clientController.getStats);

// Get all clients
router.get('/', protect, authorize('admin'), clientController.getClients);

// ✅ Get assigned objects (BEFORE /:id to avoid conflicts)
router.get('/:id/assigned-objects', protect, authorize('admin'), clientController.getAssignedObjects);

// ✅ Find matching objects (BEFORE /:id)
router.get('/:id/matches', protect, authorize('admin'), clientController.findMatches);

// Get client by ID (after specific sub-routes)
router.get('/:id', protect, authorize('admin'), clientController.getClient);

// Create new client
router.post('/', protect, authorize('admin'), clientController.createClient);

// Update client
router.put('/:id', protect, authorize('admin'), clientController.updateClient);

// Delete client
router.delete('/:id', protect, authorize('admin'), clientController.deleteClient);

// Assign realtor
router.post('/:id/assign-realtor', protect, authorize('admin'), clientController.assignRealtor);

// Assign object to client
router.post('/:id/assign-object', protect, authorize('admin'), clientController.assignObject);

// Unassign object from client
router.post('/:id/unassign-object', protect, authorize('admin'), clientController.unassignObject);

module.exports = router;