// server/src/controllers/clientController.js
const Client = require('../models/Client.pg');
const PropertyObject = require('../models/Object.pg');

/**
 * Get all clients
 * GET /api/clients
 */
exports.getClients = async (req, res) => {
    try {
        const { status, realtorId, search } = req.query;

        const clients = await Client.getAll({ status, realtorId, search });

        res.json({
            success: true,
            data: clients,
            count: clients.length
        });
    } catch (error) {
        console.error('❌ Get clients error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get client by ID
 * GET /api/clients/:id
 */
exports.getClient = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await Client.getById(id);

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client topilmadi'
            });
        }

        res.json({
            success: true,
            data: client
        });
    } catch (error) {
        console.error('❌ Get client error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Create new client
 * POST /api/clients
 */
exports.createClient = async (req, res) => {
    try {
        const clientData = {
            ...req.body,
            createdBy: req.user.id
        };

        // Validation
        if (!clientData.fullName || !clientData.phone) {
            return res.status(400).json({
                success: false,
                error: 'Full name va telefon majburiy'
            });
        }

        // Phone validation
        const phoneRegex = /^\+998\d{9}$/;
        if (!phoneRegex.test(clientData.phone)) {
            return res.status(400).json({
                success: false,
                error: 'Telefon raqami noto\'g\'ri formatda (+998XXXXXXXXX)'
            });
        }

        const client = await Client.create(clientData);

        console.log(`✅ Yangi client yaratildi: ${client.full_name}`);

        res.status(201).json({
            success: true,
            message: 'Client muvaffaqiyatli yaratildi',
            data: client
        });
    } catch (error) {
        console.error('❌ Create client error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update client
 * PUT /api/clients/:id
 */
exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await Client.update(id, req.body);

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client topilmadi'
            });
        }

        console.log(`✅ Client yangilandi: ${client.full_name}`);

        res.json({
            success: true,
            message: 'Client muvaffaqiyatli yangilandi',
            data: client
        });
    } catch (error) {
        console.error('❌ Update client error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete client
 * DELETE /api/clients/:id
 */
exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        await Client.delete(id);

        console.log(`🗑️ Client o'chirildi: ${id}`);

        res.json({
            success: true,
            message: 'Client muvaffaqiyatli o\'chirildi'
        });
    } catch (error) {
        console.error('❌ Delete client error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Assign realtor to client (NULL = unassign)
 * POST /api/clients/:id/assign-realtor
 */
exports.assignRealtor = async (req, res) => {
    try {
        const { id } = req.params;
        const { realtorId } = req.body;

        // ✅ Allow NULL to unassign
        const client = await Client.assignRealtor(id, realtorId || null);

        const message = realtorId
            ? 'Rieltor muvaffaqiyatli biriktirildi'
            : 'Rieltor ajratildi';

        console.log(`✅ ${message}: ${client.full_name}`);

        res.json({
            success: true,
            message: message,
            data: client
        });
    } catch (error) {
        console.error('❌ Assign realtor error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Assign object to client
 * POST /api/clients/:id/assign-object
 */
exports.assignObject = async (req, res) => {
    try {
        const { id } = req.params;
        const { objectId } = req.body;

        if (!objectId) {
            return res.status(400).json({
                success: false,
                error: 'Object ID majburiy'
            });
        }

        const client = await Client.assignObject(id, objectId);

        console.log(`✅ Obyekt biriktirildi: ${client.full_name}`);

        res.json({
            success: true,
            message: 'Obyekt muvaffaqiyatli biriktirildi',
            data: client
        });
    } catch (error) {
        console.error('❌ Assign object error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Unassign object from client
 * POST /api/clients/:id/unassign-object
 */
exports.unassignObject = async (req, res) => {
    try {
        const { id } = req.params;
        const { objectId } = req.body;

        if (!objectId) {
            return res.status(400).json({
                success: false,
                error: 'Object ID majburiy'
            });
        }

        const client = await Client.unassignObject(id, objectId);

        console.log(`✅ Obyekt ajratildi: ${client.full_name}`);

        res.json({
            success: true,
            message: 'Obyekt muvaffaqiyatli ajratildi',
            data: client
        });
    } catch (error) {
        console.error('❌ Unassign object error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Find matching objects for client
 * GET /api/clients/:id/matches
 */
exports.findMatches = async (req, res) => {
    try {
        const { id } = req.params;

        const matches = await Client.findMatches(id);

        res.json({
            success: true,
            data: matches,
            count: matches.length
        });
    } catch (error) {
        console.error('❌ Find matches error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get statistics
 * GET /api/clients/stats/summary
 */
exports.getStats = async (req, res) => {
    try {
        const stats = await Client.getStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Get stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get assigned objects for client
 * GET /api/clients/:id/assigned-objects
 */
exports.getAssignedObjects = async (req, res) => {
    try {
        const { id } = req.params;

        const objects = await Client.getAssignedObjects(id);

        res.json({
            success: true,
            data: objects,
            count: objects.length
        });
    } catch (error) {
        console.error('❌ Get assigned objects error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getClients: exports.getClients,
    getClient: exports.getClient,
    createClient: exports.createClient,
    updateClient: exports.updateClient,
    deleteClient: exports.deleteClient,
    assignRealtor: exports.assignRealtor,
    assignObject: exports.assignObject,
    unassignObject: exports.unassignObject,
    findMatches: exports.findMatches,
    getStats: exports.getStats,
    getAssignedObjects: exports.getAssignedObjects // ✅ NEW
};