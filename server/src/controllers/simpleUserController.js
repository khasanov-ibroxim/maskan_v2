// server/src/controllers/simpleUserController.js - ✅ FIXED: Telegram Chat ID update

const User = require('../models/User.pg');
const { logActivity } = require('../middleware/simpleAuth');

// ... (Other methods unchanged)

/**
 * ✅ CRITICAL FIX: Update user with telegramChatId support
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, fullName, role, appScriptUrl, telegramChatId, telegramThemeId, phone } = req.body;

        console.log(`\n✏️ USER YANGILANMOQDA: ${id}`);
        console.log('  Username:', username);
        console.log('  Role:', role);
        console.log('  Phone:', phone || 'NULL');
        console.log('  Telegram Chat ID:', telegramChatId || 'NULL');  // ✅ NEW
        console.log('  Telegram Theme ID:', telegramThemeId || 'NULL');

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        // Admin self-edit restrictions
        if (id === req.user.id && (username !== user.username || role !== user.role)) {
            return res.status(400).json({
                success: false,
                error: 'O\'z username yoki role\'ingizni o\'zgartira olmaysiz'
            });
        }

        // Admin role protection
        if (user.role === 'admin' && role !== 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Admin rolini o\'zgartirish mumkin emas'
            });
        }

        // Username uniqueness
        if (username && username !== user.username) {
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Bu username band'
                });
            }
        }

        // Prepare updates
        const updates = {};

        if (username) updates.username = username.trim();
        if (fullName) updates.fullName = fullName.trim();
        if (role) updates.role = role;
        if (password && password.length >= 5) {
            updates.password = password;
            console.log('  ✅ Yangi parol belgilandi');
        }

        // ✅ CRITICAL: Role-specific validation
        if (role === 'rieltor') {
            // Regular rieltor - needs App Script URL and Telegram Theme ID
            if (!appScriptUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Rieltor uchun App Script URL kiritilishi kerak'
                });
            }

            // ✅ Theme ID NOT required anymore (can be null)
            // if (!telegramThemeId) {
            //     return res.status(400).json({
            //         success: false,
            //         error: 'Rieltor uchun Telegram Theme ID kiritilishi kerak'
            //     });
            // }

            // URL format validation
            try {
                new URL(appScriptUrl);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Noto\'g\'ri App Script URL formati'
                });
            }

            updates.appScriptUrl = appScriptUrl.trim();
            updates.telegramChatId = telegramChatId || null;  // ✅ NEW - Can be null
            updates.telegramThemeId = telegramThemeId ? parseInt(telegramThemeId) : null;  // ✅ Can be null
            updates.phone = null;  // Clear phone for regular rieltor

            console.log('  📝 Rieltor ma\'lumotlari yangilandi');
            console.log('    App Script URL:', updates.appScriptUrl);
            console.log('    Telegram Chat ID:', updates.telegramChatId || 'NULL');
            console.log('    Telegram Theme ID:', updates.telegramThemeId || 'NULL');
        }

        // ✅ CRITICAL FIX: Individual rieltor phone validation
        if (role === 'individual_rieltor') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Individual rieltor uchun telefon raqami MAJBURIY!'
                });
            }

            // Phone format validation
            const phoneRegex = /^\+998\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Telefon raqami noto\'g\'ri formatda! Format: +998XXXXXXXXX'
                });
            }

            updates.phone = phone.trim();
            updates.telegramChatId = telegramChatId || null;  // ✅ NEW - Can be null
            updates.telegramThemeId = telegramThemeId ? parseInt(telegramThemeId) : null;  // ✅ Can be null
            updates.appScriptUrl = null;  // Clear App Script for individual

            console.log('  📱 Individual rieltor - Telefon yangilandi:', phone);
            console.log('    Telegram Chat ID:', updates.telegramChatId || 'NULL');
            console.log('    Telegram Theme ID:', updates.telegramThemeId || 'NULL');
        }

        // If changing from individual_rieltor or rieltor to another role
        if (user.role === 'individual_rieltor' && role !== 'individual_rieltor') {
            updates.phone = null;
            updates.telegramChatId = null;
            updates.telegramThemeId = null;
            console.log('  🗑️ Telefon va Telegram ma\'lumotlari o\'chirildi (role o\'zgargan)');
        }

        if (user.role === 'rieltor' && role !== 'rieltor') {
            updates.appScriptUrl = null;
            updates.telegramChatId = null;
            updates.telegramThemeId = null;
            console.log('  🗑️ App Script va Telegram ma\'lumotlari o\'chirildi (role o\'zgargan)');
        }

        // Update user
        const updatedUser = await User.update(id, updates);

        if (!updatedUser) {
            return res.status(500).json({
                success: false,
                error: 'User yangilashda xato'
            });
        }

        console.log(`✅ USER YANGILANDI: ${updatedUser.username}`);
        if (updatedUser.phone) {
            console.log(`   📱 Phone: ${updatedUser.phone}`);
        }
        if (updatedUser.telegram_chat_id) {
            console.log(`   💬 Telegram Chat ID: ${updatedUser.telegram_chat_id}`);
        }

        // Log changes
        const changes = [];
        if (username && username !== user.username) changes.push(`username: ${user.username} → ${username}`);
        if (fullName && fullName !== user.full_name) changes.push(`fullName: ${user.full_name} → ${fullName}`);
        if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
        if (password) changes.push('password o\'zgartirildi');
        if (phone !== user.phone) changes.push(`phone: ${user.phone || 'NULL'} → ${phone || 'NULL'}`);
        if (telegramChatId !== user.telegram_chat_id) changes.push(`telegramChatId: ${user.telegram_chat_id || 'NULL'} → ${telegramChatId || 'NULL'}`);

        await logActivity(
            req.user.id,
            req.user.username,
            'update_user',
            `User yangilandi: ${updatedUser.username} (${changes.join(', ')})`,
            req.ip,
            req.get('user-agent')
        );

        res.json({
            success: true,
            message: 'User muvaffaqiyatli yangilandi',
            user: updatedUser
        });

    } catch (error) {
        console.error('❌ Update user xato:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server xatosi'
        });
    }
};

// Export all methods
module.exports = {
    getActiveSessions: exports.getActiveSessions,
    getSessionHistory: exports.getSessionHistory,
    getActivityLogs: exports.getActivityLogs,
    getAllUsers: exports.getAllUsers,
    createUser: exports.createUser,
    deleteUser: exports.deleteUser,
    getRealtors: exports.getRealtors,
    updateUser: exports.updateUser
};