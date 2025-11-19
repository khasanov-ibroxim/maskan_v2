// middleware/simpleAuth.js
const SimpleUser = require('../models/SimpleUser');
const crypto = require('crypto');

// Konstantalar
const SESSION_LIFETIME = 24 * 60 * 60 * 1000; // 24 soat millisoniyalarda
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 daqiqa millisoniyalarda

/**
 * Yangi session yaratish
 */
const createSession = (userId, username, ipAddress, userAgent) => {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const sessions = SimpleUser.getSessions();
    const now = new Date();

    const newSession = {
        sessionId,
        userId,
        username,
        loginTime: now.toISOString(),
        lastActivity: now.toISOString(),
        expiresAt: new Date(Date.now() + SESSION_LIFETIME).toISOString(),
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        isActive: true
    };

    sessions.push(newSession);
    SimpleUser.saveSessions(sessions);

    // Login log qo'shish
    logActivity(
        userId,
        username,
        'login',
        'Tizimga kirdi',
        ipAddress,
        userAgent
    );

    console.log(`✅ Session yaratildi: ${username} (${sessionId.substring(0, 8)}...)`);
    return sessionId;
};

/**
 * Sessionni tugatish
 */
const endSession = (sessionId, reason = 'manual_logout') => {
    const sessions = SimpleUser.getSessions();
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);

    if (sessionIndex !== -1) {
        const session = sessions[sessionIndex];
        const loginTime = new Date(session.loginTime).getTime();
        const duration = Math.floor((Date.now() - loginTime) / 1000);

        sessions[sessionIndex] = {
            ...session,
            isActive: false,
            logoutTime: new Date().toISOString(),
            logoutReason: reason,
            duration: duration
        };

        SimpleUser.saveSessions(sessions);

        // Manual logout bo'lsa log qo'shish
        if (reason === 'manual_logout') {
            logActivity(
                session.userId,
                session.username,
                'logout',
                'Tizimdan chiqdi',
                session.ipAddress,
                session.userAgent
            );
        }

        console.log(`🔴 Session tugatildi: ${session.username} - ${reason}`);
    }
};

/**
 * Activity log qo'shish
 */
const logActivity = (userId, username, action, description, ipAddress, userAgent) => {
    const logs = SimpleUser.getLogs();

    const newLog = {
        timestamp: new Date().toISOString(),
        userId,
        username,
        action,
        description,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown'
    };

    logs.push(newLog);

    // Faqat oxirgi 1000 ta logni saqlash
    if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
    }

    SimpleUser.saveLogs(logs);
};

/**
 * Eski va nofaol sesiyalarni tozalash
 */
const cleanupOldSessions = () => {
    const sessions = SimpleUser.getSessions();
    const now = Date.now();
    let cleanedCount = 0;

    const updatedSessions = sessions.map(session => {
        // Agar allaqachon nofaol bo'lsa, o'zgartirmaslik
        if (!session.isActive) {
            return session;
        }

        const expiresAt = new Date(session.expiresAt).getTime();
        const lastActivity = new Date(session.lastActivity).getTime();

        // Vaqt tugagan
        if (now > expiresAt) {
            cleanedCount++;
            return {
                ...session,
                isActive: false,
                logoutTime: new Date().toISOString(),
                logoutReason: 'auto_logout',
                duration: Math.floor((now - new Date(session.loginTime).getTime()) / 1000)
            };
        }

        // Faollik muddati tugagan
        if ((now - lastActivity) > ACTIVITY_TIMEOUT) {
            cleanedCount++;
            return {
                ...session,
                isActive: false,
                logoutTime: new Date().toISOString(),
                logoutReason: 'auto_logout',
                duration: Math.floor((now - new Date(session.loginTime).getTime()) / 1000)
            };
        }

        return session;
    });

    if (cleanedCount > 0) {
        SimpleUser.saveSessions(updatedSessions);
        console.log(`🧹 ${cleanedCount} ta eski session tozalandi`);
    }
};

// Har 5 daqiqada avtomatik tozalash
setInterval(cleanupOldSessions, 5 * 60 * 1000);
console.log('♻️ Session tozalash rejimi faollashtirildi (har 5 daqiqa)');

/**
 * Authentication middleware
 * Har bir himoyalangan route uchun
 */
const protect = async (req, res, next) => {
    try {
        // Session ID ni headerdan olish
        const sessionId = req.headers['x-session-id'];

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                error: 'Tizimga kirish talab qilinadi'
            });
        }

        // Sessionni topish
        const sessions = SimpleUser.getSessions();
        const session = sessions.find(s => s.sessionId === sessionId && s.isActive);

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Session topilmadi yoki tugagan'
            });
        }

        // Session vaqti va faolligini tekshirish
        const now = Date.now();
        const expiresAt = new Date(session.expiresAt).getTime();
        const lastActivity = new Date(session.lastActivity).getTime();

        // Muddati tugagan
        if (now > expiresAt) {
            endSession(sessionId, 'auto_logout');
            return res.status(401).json({
                success: false,
                error: 'Session muddati tugagan'
            });
        }

        // Faollik muddati tugagan
        if ((now - lastActivity) > ACTIVITY_TIMEOUT) {
            endSession(sessionId, 'auto_logout');
            return res.status(401).json({
                success: false,
                error: 'Faollik muddati tugagan (30 daqiqa)'
            });
        }

        // Userni topish
        const user = SimpleUser.findById(session.userId);

        if (!user) {
            endSession(sessionId, 'auto_logout');
            return res.status(401).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        if (!user.isActive) {
            endSession(sessionId, 'auto_logout');
            return res.status(401).json({
                success: false,
                error: 'User faol emas'
            });
        }

        // Last activity yangilash
        const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
        if (sessionIndex !== -1) {
            sessions[sessionIndex].lastActivity = new Date().toISOString();
            SimpleUser.saveSessions(sessions);
        }

        // Request objectga user va session qo'shish
        req.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
        };

        req.session = {
            sessionId: session.sessionId,
            loginTime: session.loginTime,
            lastActivity: session.lastActivity,
            ipAddress: session.ipAddress
        };

        next();

    } catch (error) {
        console.error('❌ Auth middleware xato:', error);
        return res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

/**
 * Authorization middleware (Role tekshirish)
 * @param  {...string} roles - Ruxsat berilgan rollar
 */
// ✅ TO'G'RI authorize:
const authorize = (...roles) => {
    return (req, res, next) => {
        // OPTIONS so'rovlarini o'tkazib yuborish
        if (req.method === 'OPTIONS') {
            return next();
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autentifikatsiya talab qilinadi'
            });
        }

        if (!roles.includes(req.user.role)) {
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