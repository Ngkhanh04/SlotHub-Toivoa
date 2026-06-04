const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Vendor = require('../models/Vendor');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { getVendorStatus } = require('../utils/vendorHours');
const { normalizeVendorHours, formatVendorHoursRange } = require('../utils/timeFormat');
const { logAudit } = require('../utils/persistence');

// 1. [GET] Lấy các chỉ số thống kê cho Dashboard
const getDashboardStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Truy cập bị từ chối!' });
        }

        const successfulDeposits = await Transaction.aggregate([
            { $match: { type: 'DEPOSIT', status: 'SUCCESS' } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
        ]);
        const totalDeposits = successfulDeposits.length > 0 ? successfulDeposits[0].totalAmount : 0;

        const orderPayments = await Transaction.aggregate([
            { $match: { type: 'PAYMENT', status: 'SUCCESS' } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
        ]);
        const totalOrderVolume = orderPayments.length > 0 ? orderPayments[0].totalAmount : 0;

        const platformFees = await Transaction.aggregate([
            { $match: { type: 'PLATFORM_FEE', status: 'SUCCESS' } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
        ]);
        const totalPlatformFee = platformFees.length > 0 ? platformFees[0].totalAmount : 0;

        // Ví admin đang đăng nhập (phí sàn 5% tích lũy, trừ khi đã rút nếu có)
        const adminFresh = await User.findById(req.user._id).select('walletBalance');
        const adminWalletBalance = adminFresh?.walletBalance ?? req.user.walletBalance ?? 0;

        const pendingDeposits = await Transaction.countDocuments({ type: 'DEPOSIT', status: 'PENDING' });

        const studentCount = await User.countDocuments({ role: 'student' });
        const vendorCount = await User.countDocuments({ role: { $in: ['vendor', 'vendor_owner'] } });

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayTxCount = await Transaction.countDocuments({
            createdAt: { $gte: startOfToday }
        });

        res.status(200).json({
            adminWalletBalance,
            totalPlatformFee,
            totalOrderVolume,
            totalDeposits,
            pendingDeposits,
            studentCount,
            vendorCount,
            todayTxCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thống kê Dashboard', error: error.message });
    }
};

// Biểu đồ dòng tiền 7 ngày gần nhất
const getCashFlowChart = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Truy cập bị từ chối!' });
        }

        const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 3), 30);
        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        start.setHours(0, 0, 0, 0);

        const labels = [];
        const labelMap = {};
        for (let i = 0; i < days; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
            const display = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
            labels.push(key);
            labelMap[key] = { date: key, label: display, deposits: 0, payments: 0, platformFee: 0, withdrawals: 0 };
        }

        const rows = await Transaction.aggregate([
            {
                $match: {
                    status: 'SUCCESS',
                    createdAt: { $gte: start },
                    type: { $in: ['DEPOSIT', 'PAYMENT', 'PLATFORM_FEE', 'WITHDRAW', 'PAYOUT'] }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                        type: '$type'
                    },
                    total: { $sum: '$amount' }
                }
            }
        ]);

        rows.forEach((row) => {
            const day = row._id.day;
            if (!labelMap[day]) return;
            const t = row._id.type;
            if (t === 'DEPOSIT') labelMap[day].deposits = row.total;
            else if (t === 'PAYMENT') labelMap[day].payments = row.total;
            else if (t === 'PLATFORM_FEE') labelMap[day].platformFee = row.total;
            else if (t === 'WITHDRAW' || t === 'PAYOUT') labelMap[day].withdrawals += row.total;
        });

        const chartData = labels.map((k) => {
            const d = labelMap[k];
            return {
                ...d,
                /** Thu thực của sàn trong ngày (phí 5%) */
                netPlatformRevenue: d.platformFee,
                /** Tiền cần đối chiếu TK ngân hàng: vào (nạp+đơn) − ra (rút) */
                bankInEstimate: d.deposits + d.payments,
                bankOutEstimate: d.withdrawals
            };
        });

        const daily = [...chartData].reverse();
        const summary = chartData.reduce(
            (acc, d) => ({
                deposits: acc.deposits + d.deposits,
                payments: acc.payments + d.payments,
                platformFee: acc.platformFee + d.platformFee,
                withdrawals: acc.withdrawals + d.withdrawals,
                bankInEstimate: acc.bankInEstimate + d.bankInEstimate,
                bankOutEstimate: acc.bankOutEstimate + d.bankOutEstimate
            }),
            { deposits: 0, payments: 0, platformFee: 0, withdrawals: 0, bankInEstimate: 0, bankOutEstimate: 0 }
        );
        summary.netPlatformRevenue = summary.platformFee;

        const [pendingDeposits, pendingWithdraws, pendingPayouts] = await Promise.all([
            Transaction.countDocuments({ type: 'DEPOSIT', status: 'PENDING' }),
            Transaction.countDocuments({ type: 'WITHDRAW', status: 'PENDING' }),
            Transaction.countDocuments({ type: 'PAYOUT', status: 'PENDING' })
        ]);

        res.status(200).json({
            days,
            chartData,
            daily,
            summary,
            pending: {
                deposits: pendingDeposits,
                withdraws: pendingWithdraws,
                payouts: pendingPayouts
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy biểu đồ dòng tiền', error: error.message });
    }
};

// Hoạt động + số lệnh chờ (cho panel cảnh báo dashboard)
const getDashboardActivity = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Truy cập bị từ chối!' });
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 12, 30);
        const adminFilter = { $or: [{ audience: 'admin' }, { audience: { $exists: false } }] };

        const notifications = await Notification.find(adminFilter)
            .sort({ createdAt: -1 })
            .limit(limit);

        const unreadCount = await Notification.countDocuments({ ...adminFilter, isRead: false });

        const [pendingDeposits, pendingWithdraws, pendingPayouts, pendingVendors] = await Promise.all([
            Transaction.countDocuments({ type: 'DEPOSIT', status: 'PENDING' }),
            Transaction.countDocuments({ type: 'WITHDRAW', status: 'PENDING' }),
            Transaction.countDocuments({ type: 'PAYOUT', status: 'PENDING' }),
            User.countDocuments({ role: 'vendor_owner', isApproved: false })
        ]);

        res.status(200).json({
            notifications,
            unreadCount,
            pending: {
                deposits: pendingDeposits,
                withdraws: pendingWithdraws,
                payouts: pendingPayouts,
                vendors: pendingVendors
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy hoạt động', error: error.message });
    }
};

// 2. [GET] Lấy thông tin Ngân hàng của Admin cho Sinh viên nạp tiền
const getAdminBankInfo = async (req, res) => {
    try {
        const admin = await User.findOne({ role: 'admin' });
        
        if (!admin) {
            return res.status(404).json({ message: 'Hệ thống chưa có Admin!' });
        }

        res.status(200).json({
            bankName: admin.bankAccount?.bankName || '',
            accountNumber: admin.bankAccount?.accountNumber || '',
            accountName: admin.bankAccount?.accountName || ''
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy thông tin ngân hàng Admin', error: error.message });
    }
};

// 3. [GET] Tất cả gian hàng (đầy đủ thông tin cho Admin)
const getAllVendorsAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Truy cập bị từ chối!' });
        }

        const vendors = await Vendor.find()
            .populate('owner', 'name email phone avatar walletBalance isApproved role isActive createdAt')
            .sort({ createdAt: -1 });

        const vendorIds = vendors.map((v) => v._id);
        if (vendorIds.length === 0) return res.status(200).json([]);

        const [menuCounts, orderStats] = await Promise.all([
            MenuItem.aggregate([
                { $match: { vendor: { $in: vendorIds } } },
                {
                    $group: {
                        _id: '$vendor',
                        count: { $sum: 1 },
                        available: { $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] } }
                    }
                }
            ]),
            Order.aggregate([
                { $match: { vendor: { $in: vendorIds }, paymentStatus: 'Paid' } },
                { $group: { _id: '$vendor', orders: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } }
            ])
        ]);

        const menuMap = Object.fromEntries(menuCounts.map((m) => [String(m._id), m]));
        const orderMap = Object.fromEntries(orderStats.map((o) => [String(o._id), o]));

        const result = vendors.map((v) => {
            const id = String(v._id);
            const normalized = normalizeVendorHours(v);
            const status = getVendorStatus(normalized);
            return {
                ...normalized,
                isOpen: status.isOpen,
                statusMessage: status.message,
                hoursDisplay: formatVendorHoursRange(normalized.openTime, normalized.closeTime),
                menuItemCount: menuMap[id]?.count || 0,
                menuAvailableCount: menuMap[id]?.available || 0,
                paidOrderCount: orderMap[id]?.orders || 0,
                totalRevenue: orderMap[id]?.revenue || 0
            };
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách gian hàng', error: error.message });
    }
};

// 4. [GET] LẤY DANH SÁCH QUẦY CHỜ DUYỆT
const getPendingVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find()
            .populate('owner', 'name email phone avatar isApproved role createdAt');
        
        const pendingVendors = vendors.filter(v => 
            v.owner && 
            v.owner.isApproved === false && 
            v.owner.role === 'vendor_owner'
        );

        const normalized = pendingVendors.map((v) => {
            const doc = normalizeVendorHours(v);
            return {
                ...doc,
                hoursDisplay: formatVendorHoursRange(doc.openTime, doc.closeTime)
            };
        });
        res.status(200).json(normalized);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách chờ duyệt', error: error.message });
    }
};

// 4. [PUT] DUYỆT QUẦY (MỞ KHÓA TÀI KHOẢN)
const approveVendor = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByIdAndUpdate(userId, { isApproved: true }, { returnDocument: 'after' });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản chủ quầy!' });

        await logAudit({
            actor: req.user.id,
            actorRole: 'admin',
            action: 'VENDOR_APPROVED',
            entityType: 'User',
            entityId: userId
        });

        res.status(200).json({ message: '🎉 Đã duyệt gian hàng thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi duyệt quầy', error: error.message });
    }
};

// 5. [DELETE] TỪ CHỐI (XÓA LUÔN YÊU CẦU)
const rejectVendor = async (req, res) => {
    try {
        const { userId } = req.params;
        
        await User.findByIdAndDelete(userId);
        await Vendor.findOneAndDelete({ owner: userId });

        await logAudit({
            actor: req.user.id,
            actorRole: 'admin',
            action: 'VENDOR_REJECTED',
            entityType: 'User',
            entityId: userId
        });

        res.status(200).json({ message: '🗑️ Đã từ chối và xóa yêu cầu đăng ký!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi từ chối yêu cầu', error: error.message });
    }
};

// 6. [PUT] LƯU THÔNG TIN NGÂN HÀNG
const updateAdminBankInfo = async (req, res) => {
    try {
        const { bankName, accountNumber, accountName } = req.body;
        
        const admin = await User.findById(req.user._id);
        if (!admin) return res.status(404).json({ message: 'Không tìm thấy tài khoản Admin!' });

        admin.bankAccount = { bankName, accountNumber, accountName };
        await admin.save();

        res.status(200).json({ message: 'Lưu cấu hình Ngân hàng thành công!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật ngân hàng', error: error.message });
    }
};

// 7. 🌟 [GET] LẤY DANH SÁCH THÔNG BÁO CHO ADMIN
const getAdminNotifications = async (req, res) => {
    try {
        // Lấy 50 thông báo mới nhất xếp lên đầu
        const adminFilter = { $or: [{ audience: 'admin' }, { audience: { $exists: false } }] };
        const notifications = await Notification.find(adminFilter).sort({ createdAt: -1 }).limit(50);
        const unreadCount = await Notification.countDocuments({ ...adminFilter, isRead: false });

        res.status(200).json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thông báo', error: error.message });
    }
};

// 8. 🌟 [PUT] ĐÁNH DẤU ĐÃ ĐỌC (1 CÁI HOẶC TẤT CẢ)
const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === 'all') {
            await Notification.updateMany(
                { isRead: false, $or: [{ audience: 'admin' }, { audience: { $exists: false } }] },
                { isRead: true }
            );
            return res.status(200).json({ message: 'Đã đánh dấu đọc tất cả!' });
        } else {
            await Notification.findByIdAndUpdate(id, { isRead: true });
            return res.status(200).json({ message: 'Đã đọc thông báo!' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xử lý thông báo', error: error.message });
    }
};

module.exports = { 
    getDashboardStats,
    getCashFlowChart,
    getDashboardActivity,
    getAdminBankInfo, 
    getAllVendorsAdmin,
    getPendingVendors,
    approveVendor,
    rejectVendor,
    updateAdminBankInfo,
    getAdminNotifications,    // 🌟 Xuất hàm thông báo
    markNotificationAsRead    // 🌟 Xuất hàm thông báo
};