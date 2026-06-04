const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Vendor = require('../models/Vendor');
const TimeSlot = require('../models/TimeSlot');
const { settleOrderPayment, reverseOrderPayment } = require('../utils/settleOrderPayment');
const { getVendorStatus } = require('../utils/vendorHours');
const { notifyVendorNewOrder } = require('../utils/vendorNotify');
const {
    issuePickupCode,
    isPickupCodeExpired,
    pickupCodeExpiredMessage
} = require('../utils/pickupCode');
const {
    logOrderStatus,
    logPickupVerification,
    logAudit,
    notifyStudent,
    logStudentWallet
} = require('../utils/persistence');
const mongoose = require('mongoose');

const isVendorRole = (role) => ['vendor', 'vendor_owner'].includes(role);

const parseOrderIdFromQr = (raw) => {
    const text = String(raw || '').trim();
    if (mongoose.Types.ObjectId.isValid(text) && String(new mongoose.Types.ObjectId(text)) === text) {
        return text;
    }
    const match = text.match(/[a-fA-F0-9]{24}/);
    if (match && mongoose.Types.ObjectId.isValid(match[0])) {
        return match[0];
    }
    return null;
};

const applyOrderCompletion = async (order, meta = {}) => {
    if (order.status === 'Completed') {
        return { alreadyCompleted: true };
    }
    const prevStatus = order.status;
    for (const item of order.items) {
        await MenuItem.findByIdAndUpdate(item.menuItem, {
            $inc: { countInStock: -item.quantity, totalSold: item.quantity }
        });
    }
    order.status = 'Completed';
    await order.save();
    await logOrderStatus({
        orderId: order._id,
        fromStatus: prevStatus,
        toStatus: 'Completed',
        changedBy: meta.changedBy,
        changedByRole: meta.changedByRole || 'vendor',
        note: meta.note || 'Nhận món tại quầy'
    });
    if (meta.req && order.user) {
        await notifyStudent(meta.req, {
            userId: order.user,
            title: 'Đã nhận món',
            message: 'Đơn hàng của bạn đã được xác nhận nhận tại quầy.',
            type: 'ORDER_COMPLETED',
            orderId: order._id
        });
    }
    return { alreadyCompleted: false };
};

const CART_POPULATE = {
    path: 'items.menuItem',
    populate: { path: 'vendor', select: 'name openTime closeTime isActive' }
};

// 1. [POST] Sinh viên đặt đồ ăn
const createOrder = async (req, res) => {
    try {
        const { paymentMethod, note, pickupSlot } = req.body; 
        const userId = req.user.id;

        // 🌟 KIỂM TRA KHUNG GIỜ
        if (!pickupSlot) return res.status(400).json({ message: 'Vui lòng chọn khung giờ nhận hàng!' });
        const slot = await TimeSlot.findById(pickupSlot);
        if (!slot) return res.status(400).json({ message: 'Khung giờ không hợp lệ!' });
        const pickupSlotLabel = `${slot.startTime} - ${slot.endTime}`;

        const cart = await Cart.findOne({ user: userId }).populate(CART_POPULATE);
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng đang trống!' });
        }

        const vendorIdsInCart = [...new Set(
            cart.items
                .map((ci) => ci.menuItem?.vendor?._id || ci.menuItem?.vendor)
                .filter(Boolean)
                .map(String)
        )];
        const slotOpts = { slotStart: slot.startTime, slotEnd: slot.endTime };
        for (const vid of vendorIdsInCart) {
            const vendor = await Vendor.findById(vid);
            const vendorCheck = getVendorStatus(vendor, slotOpts);
            if (!vendorCheck.isOpen) {
                return res.status(400).json({ message: vendorCheck.message });
            }
        }

        let totalAmount = 0;
        const processedItems = [];
        let firstVendorId = null;

        for (const cartItem of cart.items) {
            const itemDb = cartItem.menuItem;
            
            if (!itemDb || itemDb.isAvailable === false || itemDb.countInStock < cartItem.quantity) {
                return res.status(400).json({ message: `Món ${itemDb ? itemDb.name : 'không xác định'} đã hết hoặc không đủ số lượng!` });
            }

            const vendorId = itemDb.vendor?._id || itemDb.vendor;
            if (!firstVendorId) firstVendorId = vendorId;

            totalAmount += itemDb.price * cartItem.quantity;
            processedItems.push({
                menuItem: itemDb._id,
                quantity: cartItem.quantity,
                price: itemDb.price
            });
        }

        // --- XỬ LÝ THANH TOÁN VÍ NỘI BỘ ---
        if (paymentMethod === 'wallet') {
            const user = await User.findById(userId);
            if (user.walletBalance < totalAmount) {
                return res.status(400).json({ message: 'Số dư ví không đủ!' });
            }

            user.walletBalance -= totalAmount;
            await user.save();
            const balanceAfterPay = user.walletBalance;

            const newOrder = new Order({
                user: userId,
                vendor: firstVendorId,
                items: processedItems,
                totalPrice: totalAmount,
                note,
                pickupSlot: pickupSlotLabel,
                status: 'Processing',
                paymentStatus: 'Paid',
                paymentMethod: 'wallet'
            });
            issuePickupCode(newOrder);
            await newOrder.save();
            await logOrderStatus({
                orderId: newOrder._id,
                fromStatus: '',
                toStatus: 'Processing',
                changedBy: userId,
                changedByRole: 'student',
                note: 'Đặt đơn & thanh toán ví'
            });
            await settleOrderPayment({
                orderId: newOrder._id,
                studentUserId: userId,
                vendorDocId: firstVendorId,
                totalAmount,
                paymentMethod: 'wallet'
            });
            await logStudentWallet({
                userId,
                amount: -totalAmount,
                balanceAfter: balanceAfterPay,
                type: 'PAYMENT',
                orderId: newOrder._id,
                description: `Thanh toán đơn #${String(newOrder._id).slice(-6)}`
            });

            await notifyVendorNewOrder(req, newOrder, user);

            cart.items = []; cart.totalPrice = 0; await cart.save();
            return res.status(201).json({ message: 'Đặt đơn thành công!', order: newOrder });
        }

        // --- XỬ LÝ VNPay ---
        if (paymentMethod === 'vnpay') {
            const newOrder = new Order({
                user: userId, vendor: firstVendorId, items: processedItems,
                totalPrice: totalAmount, note, pickupSlot: pickupSlotLabel,
                status: 'Pending', paymentStatus: 'Unpaid', paymentMethod: 'vnpay'
            });
            await newOrder.save();
            await logOrderStatus({
                orderId: newOrder._id,
                fromStatus: '',
                toStatus: 'Pending',
                changedBy: userId,
                changedByRole: 'student',
                note: 'Khởi tạo đơn VNPay'
            });
            cart.items = []; cart.totalPrice = 0; await cart.save();
            return res.status(201).json({ message: 'Khởi tạo đơn VNPay', order: newOrder, isVNPay: true });
        }

        return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ!' });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi tạo đơn', error: error.message });
    }
};

// 2. [PUT] Cập nhật trạng thái (Dùng cho Vendor)
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        if (isVendorRole(req.user.role)) {
            const vendor = await Vendor.findOne({ owner: req.user.id });
            if (!vendor || order.vendor.toString() !== vendor._id.toString()) {
                return res.status(403).json({ message: 'Bạn không có quyền sửa đơn của quầy khác!' });
            }
        }

        // Logic hủy đơn -> Hoàn tiền
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            const prev = order.status;
            if (order.paymentStatus === 'Paid') {
                await reverseOrderPayment(order);
                order.paymentStatus = 'Refunded';
            }
            order.status = status;
            await order.save();
            await logOrderStatus({
                orderId: order._id,
                fromStatus: prev,
                toStatus: 'Cancelled',
                changedBy: req.user.id,
                changedByRole: req.user.role,
                note: 'Hủy đơn'
            });
            return res.status(200).json({ message: 'Cập nhật thành công', order });
        }

        if (status === 'Completed') {
            if (order.paymentStatus === 'Paid' && isPickupCodeExpired(order)) {
                return res.status(400).json({ message: pickupCodeExpiredMessage() });
            }
            await applyOrderCompletion(order, {
                req,
                changedBy: req.user.id,
                changedByRole: req.user.role,
                note: 'Hoàn thành thủ công'
            });
            const populated = await Order.findById(order._id)
                .populate('user', 'name')
                .populate('items.menuItem', 'name price imageUrl');
            return res.status(200).json({ message: 'Cập nhật thành công', order: populated });
        }

        const prev = order.status;
        order.status = status;
        await order.save();
        await logOrderStatus({
            orderId: order._id,
            fromStatus: prev,
            toStatus: status,
            changedBy: req.user.id,
            changedByRole: req.user.role
        });
        if (status === 'Ready' && order.user) {
            await notifyStudent(req, {
                userId: order.user,
                title: 'Đơn sẵn sàng',
                message: 'Quầy đã chuẩn bị xong — bạn có thể đến nhận món.',
                type: 'ORDER_READY',
                orderId: order._id
            });
        }
        res.status(200).json({ message: 'Cập nhật thành công', order });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
    }
};

// 2b. [POST] Vendor quét QR xác nhận sinh viên nhận món
const verifyVendorPickup = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới quét mã nhận đơn!' });
        }

        const vendor = await Vendor.findOne({ owner: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Bạn chưa có gian hàng!' });
        }

        const { qrData, orderId, otpCode } = req.body;
        let parsedId = parseOrderIdFromQr(orderId || qrData);

        let order;
        if (parsedId) {
            order = await Order.findById(parsedId);
        } else if (otpCode && String(otpCode).trim()) {
            order = await Order.findOne({
                vendor: vendor._id,
                otpCode: String(otpCode).trim(),
                paymentStatus: 'Paid',
                status: { $nin: ['Cancelled'] }
            }).sort({ createdAt: -1 });
        }

        if (!parsedId && !order) {
            return res.status(400).json({
                message: 'Mã không hợp lệ. Quét QR trên app sinh viên hoặc nhập mã OTP 4 số.'
            });
        }

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng!' });
        }

        if (order.vendor.toString() !== vendor._id.toString()) {
            return res.status(403).json({ message: 'Đơn hàng không thuộc quầy của bạn!' });
        }

        if (order.paymentStatus !== 'Paid') {
            return res.status(400).json({ message: 'Đơn chưa thanh toán, không thể giao món.' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Đơn đã bị hủy.' });
        }

        if (order.status === 'Completed') {
            const populatedDone = await Order.findById(order._id)
                .populate('user', 'name phone')
                .populate('items.menuItem', 'name price imageUrl');
            return res.status(200).json({
                success: true,
                alreadyCompleted: true,
                message: 'Đơn đã được xác nhận nhận món trước đó.',
                order: populatedDone
            });
        }

        const pickupAllowed = ['Pending', 'Processing', 'Ready'];
        if (!pickupAllowed.includes(order.status)) {
            return res.status(400).json({ message: `Trạng thái đơn không hợp lệ: ${order.status}` });
        }

        if (otpCode && order.otpCode && String(otpCode).trim() !== order.otpCode) {
            return res.status(400).json({ message: 'Mã OTP không khớp với đơn hàng.' });
        }

        if (isPickupCodeExpired(order)) {
            return res.status(400).json({ message: pickupCodeExpiredMessage(), expired: true });
        }

        const method = parsedId ? 'QR' : (otpCode ? 'OTP' : 'MANUAL_STATUS');
        const { alreadyCompleted } = await applyOrderCompletion(order, {
            req,
            changedBy: req.user.id,
            changedByRole: req.user.role,
            note: `Xác nhận nhận món (${method})`
        });

        await logPickupVerification({
            order: order._id,
            vendor: vendor._id,
            student: order.user,
            verifiedBy: req.user.id,
            method,
            success: true,
            alreadyCompleted,
            otpMatched: otpCode ? String(otpCode).trim() === order.otpCode : undefined,
            note: alreadyCompleted ? 'Đơn đã hoàn thành trước đó' : 'Xác nhận thành công'
        });
        await logAudit({
            actor: req.user.id,
            actorRole: req.user.role,
            action: 'ORDER_PICKUP_VERIFIED',
            entityType: 'Order',
            entityId: order._id,
            metadata: { method, alreadyCompleted }
        });

        const populated = await Order.findById(order._id)
            .populate('user', 'name phone')
            .populate('items.menuItem', 'name price imageUrl');

        res.status(200).json({
            success: true,
            alreadyCompleted,
            message: alreadyCompleted
                ? 'Đơn đã được xác nhận nhận món trước đó.'
                : 'Xác nhận nhận món thành công!',
            order: populated
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xác nhận nhận món', error: error.message });
    }
};

// 3. [GET] Lấy danh sách đơn hàng cho VENDOR
const getVendorOrders = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ owner: req.user.id });
        if (!vendor) return res.status(404).json({ message: 'Bạn chưa có gian hàng!' });

        const orders = await Order.find({ vendor: vendor._id })
            .populate('user', 'name')
            .populate('items.menuItem', 'name price imageUrl')
            .sort({ createdAt: -1 });
            
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy đơn', error: error.message });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .populate('vendor', 'name')
            .populate('items.menuItem', 'name price imageUrl')
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy đơn hàng', error: error.message });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    updateOrderStatus,
    getVendorOrders,
    verifyVendorPickup
};