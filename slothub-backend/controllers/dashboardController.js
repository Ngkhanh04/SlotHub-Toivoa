const Order = require('../models/Order'); // ĐỔI TỪ Booking SANG Order
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const getAdminStats = async (req, res) => {
    try {
        // Tính tổng doanh thu từ các đơn hàng đã thanh toán thành công
        const totalRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        const stats = {
            totalUsers: await User.countDocuments({ role: 'student' }),
            totalVendors: await Vendor.countDocuments(),
            totalOrders: await Order.countDocuments(),
            revenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
        };

        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy thống kê Dashboard', error: error.message });
    }
};

module.exports = { getAdminStats };