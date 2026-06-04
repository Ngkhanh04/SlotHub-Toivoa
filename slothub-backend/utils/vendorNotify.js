const Notification = require('../models/Notification');
const Vendor = require('../models/Vendor');

/**
 * Thông báo cho chủ quầy khi sinh viên đặt đơn thành công (đã thanh toán).
 */
const notifyVendorNewOrder = async (req, order, student) => {
    try {
        const vendor = await Vendor.findById(order.vendor);
        if (!vendor?.owner) return null;

        const ref = String(order._id).slice(-6);
        const who = student?.name || student?.email || 'Sinh viên';
        const amount = Number(order.totalPrice || 0).toLocaleString('vi-VN');
        const slot = order.pickupSlot || 'Chưa chọn giờ';

        const noti = await Notification.create({
            audience: 'vendor',
            recipientId: vendor.owner,
            orderId: order._id,
            title: 'Có đơn hàng mới',
            message: `${who} vừa đặt đơn #${ref} · ${amount}đ · Nhận: ${slot}`,
            type: 'NEW_ORDER',
            actionLink: 'orders',
            isRead: false
        });

        const io = req?.app?.get('socketio');
        if (io) {
            io.emit(`vendor_notification_${vendor.owner}`, noti);
        }
        return noti;
    } catch (err) {
        console.error('[notifyVendorNewOrder]', err.message);
        return null;
    }
};

/**
 * Thông báo chủ quầy khi sinh viên đánh giá món ăn.
 */
const notifyVendorNewReview = async (req, menuItem, review, student) => {
    try {
        const vendor = await Vendor.findById(menuItem.vendor);
        if (!vendor?.owner) return null;

        const who = student?.name || 'Sinh viên';
        const stars = '⭐'.repeat(Math.min(5, Math.max(1, Number(review.rating) || 5)));
        const snippet = (review.comment || '').slice(0, 120);

        const noti = await Notification.create({
            audience: 'vendor',
            recipientId: vendor.owner,
            title: 'Đánh giá món mới',
            message: `${who} ${stars} · "${menuItem.name}": ${snippet}`,
            type: 'NEW_REVIEW',
            actionLink: 'menu',
            isRead: false
        });

        const io = req?.app?.get('socketio');
        if (io) {
            io.emit(`vendor_notification_${vendor.owner}`, noti);
        }
        return noti;
    } catch (err) {
        console.error('[notifyVendorNewReview]', err.message);
        return null;
    }
};

module.exports = { notifyVendorNewOrder, notifyVendorNewReview };
