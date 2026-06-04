const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');

const isVendorRole = (role) => ['vendor', 'vendor_owner'].includes(role);
const uid = (u) => String(u?._id || u?.id || u);

const getAdminUser = async () => User.findOne({ role: 'admin' });

const canAccessConversation = async (user, conversation) => {
    const userId = uid(user);
    if (user.role === 'admin') {
        return conversation.type === 'VENDOR_ADMIN';
    }
    if (user.role === 'student') {
        return conversation.type === 'STUDENT_VENDOR' && uid(conversation.student) === userId;
    }
    if (isVendorRole(user.role)) {
        if (uid(conversation.vendorOwner) !== userId) return false;
        return true;
    }
    return false;
};

const formatConversation = (conv, viewer) => {
    const viewerId = uid(viewer);
    let title = 'Hội thoại';
    let subtitle = '';
    let avatar = null;

    if (conv.type === 'STUDENT_VENDOR') {
        if (viewer.role === 'student') {
            title = conv.vendor?.name || 'Quầy';
            subtitle = 'Chat với quầy · báo cáo / khiếu nại';
        } else {
            title = conv.student?.name || 'Sinh viên';
            subtitle = conv.student?.email || '';
            avatar = conv.student?.avatar;
        }
    } else if (conv.type === 'VENDOR_ADMIN') {
        if (viewer.role === 'admin') {
            title = conv.vendor?.name || 'Gian hàng';
            subtitle = conv.vendorOwner?.name || conv.vendorOwner?.email || 'Chủ quầy';
        } else {
            title = 'Ban quản lý SlotHub';
            subtitle = 'Hỗ trợ & báo cáo hệ thống';
        }
    }

    return {
        _id: conv._id,
        type: conv.type,
        title,
        subtitle,
        avatar,
        vendorId: conv.vendor?._id || conv.vendor,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount || 0
    };
};

const countUnread = async (conversationId, userId) => {
    return Message.countDocuments({
        conversation: conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId }
    });
};

// [GET] Danh sách hội thoại
const getMyConversations = async (req, res) => {
    try {
        const user = req.user;
        const userId = uid(user);
        let filter = {};

        if (user.role === 'student') {
            filter = { type: 'STUDENT_VENDOR', student: userId };
        } else if (isVendorRole(user.role)) {
            filter = { vendorOwner: userId };
        } else if (user.role === 'admin') {
            filter = { type: 'VENDOR_ADMIN' };
        } else {
            return res.status(403).json({ message: 'Không có quyền truy cập tin nhắn' });
        }

        const conversations = await Conversation.find(filter)
            .populate('vendor', 'name imageUrl')
            .populate('student', 'name email avatar')
            .populate('vendorOwner', 'name email')
            .sort({ lastMessageAt: -1 });

        const result = await Promise.all(
            conversations.map(async (c) => {
                const unreadCount = await countUnread(c._id, userId);
                return formatConversation({ ...c.toObject(), unreadCount }, user);
            })
        );

        const totalUnread = result.reduce((s, c) => s + c.unreadCount, 0);
        res.status(200).json({ conversations: result, totalUnread });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy hội thoại', error: error.message });
    }
};

// [GET] Quầy để SV bắt đầu chat (từ đơn đã mua + tất cả quầy active)
const getVendorsForChat = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Chỉ sinh viên mới dùng được' });
        }

        const orders = await Order.find({ user: req.user._id }).distinct('vendor');
        const vendors = await Vendor.find({ isActive: { $ne: false } })
            .select('name imageUrl openTime closeTime')
            .sort({ name: 1 });

        const orderedSet = new Set(orders.map(String));
        const list = vendors.map((v) => ({
            _id: v._id,
            name: v.name,
            imageUrl: v.imageUrl,
            orderedBefore: orderedSet.has(String(v._id))
        }));

        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách quầy', error: error.message });
    }
};

// [POST] Tạo hoặc lấy hội thoại
const startConversation = async (req, res) => {
    try {
        const user = req.user;
        const { type, vendorId } = req.body;

        if (type === 'STUDENT_VENDOR') {
            if (user.role !== 'student') {
                return res.status(403).json({ message: 'Chỉ sinh viên chat với quầy' });
            }
            if (!vendorId) return res.status(400).json({ message: 'Thiếu vendorId' });

            const vendor = await Vendor.findById(vendorId);
            if (!vendor?.owner) return res.status(404).json({ message: 'Không tìm thấy quầy' });

            let conv = await Conversation.findOne({
                type: 'STUDENT_VENDOR',
                student: user._id,
                vendor: vendorId
            });
            if (!conv) {
                conv = await Conversation.create({
                    type: 'STUDENT_VENDOR',
                    student: user._id,
                    vendor: vendorId,
                    vendorOwner: vendor.owner,
                    lastMessage: '',
                    lastMessageAt: new Date()
                });
            }
            await conv.populate(['vendor', 'student', 'vendorOwner']);
            return res.status(200).json({
                conversation: formatConversation({ ...conv.toObject(), unreadCount: 0 }, user)
            });
        }

        if (type === 'VENDOR_ADMIN') {
            if (!isVendorRole(user.role)) {
                return res.status(403).json({ message: 'Chỉ chủ quầy chat với admin' });
            }
            const vendor = await Vendor.findOne({ owner: user._id });
            if (!vendor) return res.status(404).json({ message: 'Bạn chưa có gian hàng' });

            const admin = await getAdminUser();
            if (!admin) return res.status(404).json({ message: 'Hệ thống chưa có admin' });

            let conv = await Conversation.findOne({
                type: 'VENDOR_ADMIN',
                vendorOwner: user._id
            });
            if (!conv) {
                conv = await Conversation.create({
                    type: 'VENDOR_ADMIN',
                    vendor: vendor._id,
                    vendorOwner: user._id,
                    admin: admin._id,
                    lastMessage: '',
                    lastMessageAt: new Date()
                });
            }
            await conv.populate(['vendor', 'vendorOwner', 'admin']);
            return res.status(200).json({
                conversation: formatConversation({ ...conv.toObject(), unreadCount: 0 }, user)
            });
        }

        return res.status(400).json({ message: 'Loại hội thoại không hợp lệ' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({ message: 'Hội thoại đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi tạo hội thoại', error: error.message });
    }
};

// [GET] Tin nhắn trong hội thoại
const getMessages = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id)
            .populate('vendor', 'name')
            .populate('student', 'name email avatar')
            .populate('vendorOwner', 'name email');

        if (!conversation) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
        if (!(await canAccessConversation(req.user, conversation))) {
            return res.status(403).json({ message: 'Không có quyền xem hội thoại này' });
        }

        const messages = await Message.find({ conversation: conversation._id })
            .populate('sender', 'name email avatar role')
            .sort({ createdAt: 1 })
            .limit(200);

        res.status(200).json({
            conversation: formatConversation(
                { ...conversation.toObject(), unreadCount: 0 },
                req.user
            ),
            messages
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy tin nhắn', error: error.message });
    }
};

// [POST] Gửi tin nhắn
const sendMessage = async (req, res) => {
    try {
        const { body, messageType, reportId } = req.body;
        if (!body?.trim()) return res.status(400).json({ message: 'Nội dung tin nhắn trống' });

        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
        if (!(await canAccessConversation(req.user, conversation))) {
            return res.status(403).json({ message: 'Không có quyền gửi tin' });
        }

        const message = await Message.create({
            conversation: conversation._id,
            sender: req.user._id,
            body: body.trim(),
            messageType: messageType || 'TEXT',
            reportId: reportId || undefined,
            readBy: [req.user._id]
        });

        conversation.lastMessage = body.trim().slice(0, 120);
        conversation.lastMessageAt = new Date();
        await conversation.save();

        await message.populate('sender', 'name email avatar role');

        const io = req.app.get('socketio');
        const payload = { message, conversationId: String(conversation._id) };
        if (io) {
            io.to(`conv_${conversation._id}`).emit('new_message', payload);
            const recipients = [];
            if (conversation.student) recipients.push(uid(conversation.student));
            if (conversation.vendorOwner) recipients.push(uid(conversation.vendorOwner));
            if (conversation.admin) recipients.push(uid(conversation.admin));
            recipients
                .filter((id) => id !== uid(req.user))
                .forEach((id) => io.to(`user_${id}`).emit('conversation_updated', payload));
        }

        res.status(201).json({ message });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi gửi tin nhắn', error: error.message });
    }
};

// [PUT] Đánh dấu đã đọc
const markConversationRead = async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
        if (!(await canAccessConversation(req.user, conversation))) {
            return res.status(403).json({ message: 'Không có quyền' });
        }

        await Message.updateMany(
            {
                conversation: conversation._id,
                sender: { $ne: req.user._id },
                readBy: { $ne: req.user._id }
            },
            { $addToSet: { readBy: req.user._id } }
        );

        res.status(200).json({ message: 'Đã đọc' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi đánh dấu đọc', error: error.message });
    }
};

/** Gửi tin nhắn hệ thống khi có report (gọi từ reportController) */
const sendReportMessage = async (req, report, order) => {
    try {
        const vendor = await Vendor.findById(report.vendor);
        if (!vendor?.owner) return;

        let conv = await Conversation.findOne({
            type: 'STUDENT_VENDOR',
            student: report.user,
            vendor: report.vendor
        });
        if (!conv) {
            conv = await Conversation.create({
                type: 'STUDENT_VENDOR',
                student: report.user,
                vendor: report.vendor,
                vendorOwner: vendor.owner
            });
        }

        const issueLabels = {
            MISSING_ITEM: 'Thiếu món',
            BAD_QUALITY: 'Chất lượng kém',
            WRONG_ITEM: 'Sai món',
            ATTITUDE: 'Thái độ phục vụ',
            OTHER: 'Khác'
        };
        const ref = String(order?._id || report.order).slice(-6);
        const text = `📋 Khiếu nại đơn #${ref}: ${issueLabels[report.issueType] || report.issueType}. ${report.description}`;

        const message = await Message.create({
            conversation: conv._id,
            sender: report.user,
            body: text,
            messageType: 'REPORT',
            reportId: report._id,
            readBy: [report.user]
        });

        conv.lastMessage = text.slice(0, 120);
        conv.lastMessageAt = new Date();
        await conv.save();
        await message.populate('sender', 'name email avatar role');

        const io = req?.app?.get('socketio');
        if (io) {
            io.to(`conv_${conv._id}`).emit('new_message', { message, conversationId: String(conv._id) });
            io.to(`user_${vendor.owner}`).emit('conversation_updated', { message, conversationId: String(conv._id) });
        }
        return { conversation: conv, message };
    } catch (e) {
        console.error('[sendReportMessage]', e.message);
        return null;
    }
};

module.exports = {
    getMyConversations,
    getVendorsForChat,
    startConversation,
    getMessages,
    sendMessage,
    markConversationRead,
    sendReportMessage
};
