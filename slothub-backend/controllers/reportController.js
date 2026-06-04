const Report = require('../models/Report');
const Order = require('../models/Order');
const { sendReportMessage } = require('./messageController');
const { logAudit } = require('../utils/persistence');

// 1. [POST] Sinh viên gửi Report khiếu nại đơn hàng
const createReport = async (req, res) => {
    try {
        const { orderId, issueType, description, images } = req.body;
        const userId = req.user.id;

        // Tìm đơn hàng để lấy thông tin quán bị report
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng này' });

        const newReport = new Report({
            user: userId,
            order: orderId,
            vendor: order.vendor,
            issueType,
            description,
            images
        });

        await newReport.save();
        await logAudit({
            actor: userId,
            actorRole: 'student',
            action: 'REPORT_CREATED',
            entityType: 'Report',
            entityId: newReport._id,
            metadata: { orderId, issueType }
        });

        const chatInfo = await sendReportMessage(req, newReport, order);

        res.status(201).json({
            message: 'Đã gửi khiếu nại thành công. Tin nhắn đã gửi tới quầy — bạn có thể tiếp tục trao đổi trong mục Tin nhắn.',
            report: newReport,
            conversationId: chatInfo?.conversation?._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi gửi khiếu nại', error: error.message });
    }
};

// 2. [PUT] Admin xử lý khiếu nại (Phán quyết)
const resolveReport = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ Admin mới có quyền phán xử!' });
        }

        const { status, adminNote } = req.body; // status: 'RESOLVED' hoặc 'REJECTED'
        const reportId = req.params.id;

        const report = await Report.findByIdAndUpdate(
            reportId, 
            { status, adminNote }, 
            { returnDocument: 'after' }
        ).populate('user', 'email name');

        // (Tùy chọn) Bắn Email thông báo cho sinh viên biết kết quả xử lý
        // sendEmail(report.user.email, 'Kết quả khiếu nại...', adminNote);

        await logAudit({
            actor: req.user.id,
            actorRole: 'admin',
            action: 'REPORT_RESOLVED',
            entityType: 'Report',
            entityId: reportId,
            metadata: { status, adminNote }
        });

        res.status(200).json({ message: 'Đã xử lý khiếu nại!', report });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xử lý khiếu nại', error: error.message });
    }
};

module.exports = { createReport, resolveReport };