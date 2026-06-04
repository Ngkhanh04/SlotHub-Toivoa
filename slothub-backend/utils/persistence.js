const OrderStatusLog = require('../models/OrderStatusLog');
const PickupVerification = require('../models/PickupVerification');
const AuditLog = require('../models/AuditLog');
const MenuItemReview = require('../models/MenuItemReview');
const StudentWalletLog = require('../models/StudentWalletLog');
const Notification = require('../models/Notification');

/** Ghi lịch sử trạng thái đơn — không chặn luồng chính nếu lỗi */
const logOrderStatus = async ({
    orderId,
    fromStatus = '',
    toStatus,
    changedBy = null,
    changedByRole = 'system',
    note = ''
}) => {
    try {
        if (!orderId || !toStatus) return;
        await OrderStatusLog.create({
            order: orderId,
            fromStatus,
            toStatus,
            changedBy,
            changedByRole,
            note
        });
    } catch (err) {
        console.error('[OrderStatusLog]', err.message);
    }
};

const logPickupVerification = async (payload) => {
    try {
        await PickupVerification.create(payload);
    } catch (err) {
        console.error('[PickupVerification]', err.message);
    }
};

const logAudit = async ({
    actor = null,
    actorRole = 'system',
    action,
    entityType = '',
    entityId = null,
    metadata = {}
}) => {
    try {
        await AuditLog.create({
            actor,
            actorRole,
            action,
            entityType,
            entityId,
            metadata
        });
    } catch (err) {
        console.error('[AuditLog]', err.message);
    }
};

const persistMenuItemReview = async ({ menuItem, user, rating, comment, orderId = null }) => {
    try {
        await MenuItemReview.findOneAndUpdate(
            { menuItem: menuItem._id, user: user.id || user._id },
            {
                menuItem: menuItem._id,
                vendor: menuItem.vendor,
                user: user.id || user._id,
                order: orderId,
                name: user.name,
                avatar: user.avatar || '',
                rating: Number(rating),
                comment
            },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (err) {
        console.error('[MenuItemReview]', err.message);
    }
};

const logStudentWallet = async ({
    userId,
    amount,
    balanceAfter,
    type,
    orderId = null,
    transactionId = null,
    description = ''
}) => {
    try {
        await StudentWalletLog.create({
            user: userId,
            amount,
            balanceAfter,
            type,
            order: orderId,
            transaction: transactionId,
            description
        });
    } catch (err) {
        console.error('[StudentWalletLog]', err.message);
    }
};

const notifyStudent = async (req, { userId, title, message, type = 'SYSTEM', orderId = null }) => {
    try {
        const noti = await Notification.create({
            audience: 'student',
            recipientId: userId,
            orderId,
            title,
            message,
            type,
            actionLink: orderId ? `orders` : ''
        });
        const io = req?.app?.get('socketio');
        if (io && userId) {
            io.to(`user_${userId}`).emit('student_notification', noti);
        }
    } catch (err) {
        console.error('[StudentNotification]', err.message);
    }
};

module.exports = {
    logOrderStatus,
    logPickupVerification,
    logAudit,
    persistMenuItemReview,
    logStudentWallet,
    notifyStudent
};
