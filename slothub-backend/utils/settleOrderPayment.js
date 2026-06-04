const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Transaction = require('../models/Transaction');
const { logStudentWallet } = require('./persistence');

const PLATFORM_FEE_RATE = 0.05;

/**
 * Phân bổ tiền sau khi đơn đã thanh toán:
 * - 95% → ví chủ quầy (có thể rút qua lệnh admin duyệt)
 * - 5%  → ví admin (quỹ nền tảng / tiền thực tế hệ thống giữ)
 */
const settleOrderPayment = async ({ orderId, studentUserId, vendorDocId, totalAmount, paymentMethod = 'wallet' }) => {
    const vendorShare = Math.round(totalAmount * (1 - PLATFORM_FEE_RATE));
    const platformShare = totalAmount - vendorShare;

    const vendor = await Vendor.findById(vendorDocId);
    if (vendor?.owner) {
        await User.findByIdAndUpdate(vendor.owner, {
            $inc: { walletBalance: vendorShare }
        });
    }

    const admin = await User.findOne({ role: 'admin' });
    if (admin && platformShare > 0) {
        await User.findByIdAndUpdate(admin._id, {
            $inc: { walletBalance: platformShare }
        });
    }

    const orderRef = String(orderId).slice(-6);

    const paymentTx = await Transaction.create({
        orderId,
        userId: studentUserId,
        vendorId: vendorDocId,
        amount: totalAmount,
        type: 'PAYMENT',
        status: 'SUCCESS',
        paymentMethod: paymentMethod === 'vnpay' ? 'VNPAY' : 'WALLET',
        description: `Thanh toán đơn hàng #${orderRef}`
    });
    if (admin && platformShare > 0) {
        await Transaction.create({
            orderId,
            userId: admin._id,
            vendorId: vendorDocId,
            amount: platformShare,
            type: 'PLATFORM_FEE',
            status: 'SUCCESS',
            description: `Phí sàn 5% đơn #${orderRef}`
        });
    }
};

/**
 * Hoàn tiền khi hủy đơn đã thanh toán
 */
const reverseOrderPayment = async (order) => {
    const vendorShare = Math.round(order.totalPrice * (1 - PLATFORM_FEE_RATE));
    const platformShare = order.totalPrice - vendorShare;

    const student = await User.findById(order.user);
    if (student) {
        student.walletBalance += order.totalPrice;
        await student.save();
        await logStudentWallet({
            userId: order.user,
            amount: order.totalPrice,
            balanceAfter: student.walletBalance,
            type: 'REFUND',
            orderId: order._id,
            description: `Hoàn tiền đơn #${String(order._id).slice(-6)}`
        });
    }

    const vendor = await Vendor.findById(order.vendor);
    if (vendor?.owner) {
        await User.findByIdAndUpdate(vendor.owner, {
            $inc: { walletBalance: -vendorShare }
        });
    }

    const admin = await User.findOne({ role: 'admin' });
    if (admin && platformShare > 0) {
        await User.findByIdAndUpdate(admin._id, {
            $inc: { walletBalance: -platformShare }
        });
    }
};

module.exports = { settleOrderPayment, reverseOrderPayment, PLATFORM_FEE_RATE };
