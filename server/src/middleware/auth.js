const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');

// JWT token yaratish
exports.generateToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Tokenni tekshirish
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Header'dan token olish
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Ruxsat yo\'q. Token topilmadi'
            });
        }

        // Tokenni verify qilish
        const decoded = jwt.verify(token, JWT_SECRET);

        // Userni topish
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User topilmadi yoki faol emas'
            });
        }

        // User faoliyatini yangilash
        await user.updateActivity();

        req.user = user;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Token noto\'g\'ri yoki muddati tugagan'
        });
    }
};

// Role tekshirish
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Bu amalni bajarish uchun ruxsatingiz yo\'q'
            });
        }
        next();
    };
};