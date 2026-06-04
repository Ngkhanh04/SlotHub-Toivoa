const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// 1. Logic Hoàn tiền SIÊU VIP (Cộng tiền vào Ví nội bộ)
const requestRefund = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
        
        if (order.paymentStatus !== 'Paid') {
            return res.status(400).json({ message: "Đơn hàng chưa thanh toán hoặc đã được hoàn tiền!" });
        }

        // BƯỚC 1: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
        order.status = 'Cancelled';
        order.paymentStatus = 'Refunded';
        await order.save();

        // BƯỚC 2: CỘNG TIỀN VÀO VÍ NGƯỜI DÙNG (Tăng Wallet Balance)
        const user = await User.findById(order.user);
        if (user) {
            user.walletBalance += order.totalAmount;
            await user.save();
        }

        // BƯỚC 3: TẠO TRANSACTION REFUND ĐỂ ĐỐI SOÁT
        const refundTrans = new Transaction({
            orderId: order._id,
            userId: order.user,
            vendorId: order.vendor,
            amount: order.totalAmount,
            type: 'REFUND',
            status: 'SUCCESS',
            description: `Hoàn tiền tự động vào ví SlotHub cho đơn #${orderId.slice(-6)}. Lý do: ${reason || 'Hủy đơn'}`
        });
        await refundTrans.save();

        // BƯỚC 4: THÔNG BÁO REAL-TIME
        const io = req.app.get('socketio');
        if (io) {
            io.emit(`notification_${order.user}`, { 
                title: "Tiền đã về ví! 💰",
                message: `Đã hoàn trả ${order.totalAmount.toLocaleString()}đ vào tài khoản SlotHub của bạn.`,
                type: 'REFUND',
                newBalance: user.walletBalance
            });
        }

        res.status(200).json({ 
            message: "Hoàn tiền thành công vào ví nội bộ!", 
            transactionId: refundTrans._id,
            currentBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi hoàn tiền", error: error.message });
    }
};

// 2. Lấy lịch sử hoàn tiền (Giữ nguyên của bạn)
const getRefundHistory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: "Quyền hạn không đủ!" });

        const history = await Transaction.find({ type: 'REFUND' })
            .populate('userId', 'name email walletBalance')
            .populate('vendorId', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy lịch sử", error: error.message });
    }
};

module.exports = { requestRefund, getRefundHistory };