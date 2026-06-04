const Notification = require('../models/Notification');

const studentNotiFilter = (userId) => ({
    audience: 'student',
    recipientId: userId
});

// 1. [GET] Lấy danh sách thông báo sinh viên
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find(studentNotiFilter(req.user.id))
            .sort({ createdAt: -1 });
        const unreadCount = await Notification.countDocuments({
            ...studentNotiFilter(req.user.id),
            isRead: false
        });
        res.status(200).json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách thông báo', error: error.message });
    }
};

// 2. [PUT] Đánh dấu 1 thông báo cụ thể là "Đã đọc" (Khi user click vào)
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, ...studentNotiFilter(req.user.id) },
            { isRead: true },
            { returnDocument: 'after' }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }

        res.status(200).json({ message: 'Đã đánh dấu đọc', notification });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật trạng thái', error: error.message });
    }
};

// 3. [PUT] Đánh dấu TẤT CẢ thông báo là "Đã đọc" (Nút clear all cực tiện lợi)
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { ...studentNotiFilter(req.user.id), isRead: false },
            { isRead: true }
        );
        res.status(200).json({ message: 'Đã dọn dẹp sạch sẽ hộp thư!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
};

// 4. [POST] Tạo thông báo mới (Thường dùng cho Admin bắn thông báo toàn trường, hoặc test API)
const createNotification = async (req, res) => {
    try {
        const { userId, title, message, type, linkUrl } = req.body;
        
        const newNoti = new Notification({
            audience: 'student',
            recipientId: userId,
            title,
            message,
            type: type || 'SYSTEM',
            actionLink: linkUrl || ''
        });
        
        await newNoti.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(`user_${userId}`).emit('student_notification', newNoti);
        }

        res.status(201).json({ message: 'Đã bắn thông báo thành công!', notification: newNoti });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo thông báo', error: error.message });
    }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead, createNotification };