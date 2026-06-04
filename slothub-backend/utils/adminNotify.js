const Notification = require('../models/Notification');

/**
 * Ghi thông báo cho admin (dashboard + chuông thông báo).
 * @param {import('express').Request} req - để emit socket nếu có
 */
const notifyAdmin = async (req, { title, message, type = 'SYSTEM', actionLink = '' }) => {
    try {
        const noti = await Notification.create({
            audience: 'admin',
            title,
            message,
            type,
            actionLink,
            isRead: false
        });

        const io = req?.app?.get('socketio');
        if (io) {
            io.emit('admin_notification', noti);
        }
        return noti;
    } catch (err) {
        console.error('[adminNotify]', err.message);
        return null;
    }
};

module.exports = { notifyAdmin };
