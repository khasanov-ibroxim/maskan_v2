// server/src/middleware/simpleAuth.js - PostgreSQL VERSION
const Session = require('../models/Session.pg');
const User = require('../models/User.pg');
const ActivityLog = require('../models/ActivityLog.pg');

const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Create new session
 */
const createSession = async (userId, username, ipAddress, userAgent) => {
    try {
        const session = await Session.create(userId, username, ipAddress, userAgent);

        // Log activity
        await ActivityLog.create(
            userId,
            username,
            'login',
            'Tizimga kirdi',
            ipAddress,
            userAgent
        );

        console.log(`✅ Session created: ${username} (${session.session_id.substring(0, 8)}...)`);
        return session.session_id;
    } catch (error) {
        console.error('❌ Session creation error:', error);
        throw error;
    }
};

/**
 * End session
 */
const endSession = async (sessionId, reason = 'manual_logout') => {
    try {
        const session = await Session.end(sessionId, reason);

        if (session && reason === 'manual_logout') {
            await ActivityLog.create(
                session.user_id,
                session.username,
                'logout',
                'Tizimdan chiqdi',
                session.ip_address,
                session.user_agent
            );
        }
    } catch (error) {
        console.error('❌ End session error:', error);
    }
};

/**
 * Log activity
 */
const logActivity = async (userId, username, action, description, ipAddress, userAgent) => {
    try {
        await ActivityLog.create(userId, username, action, description, ipAddress, userAgent);
    } catch (error) {
        console.error('❌ Log activity error:', error);
    }
};

/**
 * Cleanup old sessions
 */
const cleanupOldSessions = async () => {
    try {
        await Session.cleanup(ACTIVITY_TIMEOUT);
    } catch (error) {
        console.error('❌ Cleanup error:', error);
    }
};

// Auto cleanup every 5 minutes
setInterval(cleanupOldSessions, 5 * 60 * 1000);
console.log('♻️ Session cleanup scheduler activated (every 5 minutes)');

/**
 * Authentication middleware
 */
const protect = async (req, res, next) => {
    try {
        const sessionId = req.headers['x-session-id'];

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'Tizimga kirish talab qilinadi'
            });
        }

        // Find session
        const session = await Session.findBySessionId(sessionId);

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Session topilmadi yoki tugagan'
            });
        }

        // Check expiration
        const now = Date.now();
        const expiresAt = new Date(session.expires_at).getTime();
        const lastActivity = new Date(session.last_activity).getTime();

        if (now > expiresAt) {
            await endSession(sessionId, 'auto_logout');
            return res.status(401).json({
                success: false,
                error: 'Session muddati tugagan'
            });
        }

        if ((now - lastActivity) > ACTIVITY_TIMEOUT) {
            await endSession(sessionId, 'auto_logout');
            return res.status(401).json({
                success: false,
                error: 'Faollik muddati tugagan (30 daqiqa)'
            });
        }

        // Find user
        const user = await User.findById(session.user_id);

        if (!user || !user.is_active) {
            await endSession(sessionId, 'auto_logout');
            return res.status(401).json({
                success: false,
                error: 'User topilmadi yoki faol emas'
            });
        }

        // Update activity
        await Session.updateActivity(sessionId);

        // Attach to request
        req.user = {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at
        };

        req.session = {
            sessionId: session.session_id,
            loginTime: session.login_time,
            lastActivity: session.last_activity,
            ipAddress: session.ip_address
        };

        next();

    } catch (error) {
        console.error('❌ Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

/**
 * Authorization middleware (Role check)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') {
            return next();
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autentifikatsiya talab qilinadi'
            });
        }

        // Realtor cannot access admin panel
        if (req.user.role === 'rieltor' && roles.includes('admin')) {
            return res.status(403).json({
                success: false,
                error: 'Rieltorlarga admin panel kirish taqiqlangan'
            });
        }

        // Manager = Admin rights
        const userRole = req.user.role === 'manager' ? 'admin' : req.user.role;

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Bu amal uchun ruxsatingiz yo\'q'
            });
        }

        next();
    };
};

module.exports = {
    protect,
    authorize,
    createSession,
    endSession,
    logActivity,
    cleanupOldSessions
};