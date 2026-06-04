const Vendor = require('../models/Vendor');
const Order = require('../models/Order'); 
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

const isVendorRole = (role) => ['vendor', 'vendor_owner'].includes(role);
const { getVendorStatus } = require('../utils/vendorHours');
const { normalizeTimeString, normalizeVendorHours } = require('../utils/timeFormat');
const { PLATFORM_FEE_RATE } = require('../utils/settleOrderPayment');
const VENDOR_SHARE = 1 - PLATFORM_FEE_RATE;

// ========================================================
// PHẦN 1: QUẢN LÝ THÔNG TIN GIAN HÀNG (PROFILE QUÁN)
// ========================================================

const getAllVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find()
            .select('name openTime closeTime isActive category imageUrl description')
            .sort({ isActive: -1, name: 1 });

        const updatedVendors = vendors.map(vendor => {
            const normalized = normalizeVendorHours(vendor);
            const status = getVendorStatus(normalized);
            return {
                ...normalized,
                isOpen: status.isOpen,
                statusMessage: status.isOpen ? 'Đang mở cửa 🟢' : 'Hiện đã đóng cửa 🔴'
            };
        });

        res.status(200).json(updatedVendors);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách gian hàng', error: error.message });
    }
};

const getVendorDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id);
        
        if (!vendor) return res.status(404).json({ message: 'Không tìm thấy gian hàng' });

        const stats = await Order.aggregate([
            { $match: { vendor: new mongoose.Types.ObjectId(id), status: 'Completed' } },
            { $group: { 
                _id: null, 
                totalRevenue: { $sum: "$totalPrice" }, 
                totalOrders: { $sum: 1 } 
            }}
        ]);

        res.status(200).json({
            vendor,
            analytics: {
                revenue: stats.length > 0 ? stats[0].totalRevenue : 0,
                orders: stats.length > 0 ? stats[0].totalOrders : 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy chi tiết gian hàng', error: error.message });
    }
};

const createVendor = async (req, res) => {
    try {
        const { name, description, imageUrl, openTime, closeTime, category } = req.body;

        const existingVendor = await Vendor.findOne({ owner: req.user.id });
        if (existingVendor && req.user.role !== 'admin') {
            return res.status(400).json({ message: 'Bạn đã sở hữu một gian hàng trên hệ thống rồi!' });
        }

        const newVendor = new Vendor({
            name, description, imageUrl,
            openTime: normalizeTimeString(openTime, '07:00'),
            closeTime: normalizeTimeString(closeTime, '21:00'),
            category,
            owner: req.user.id 
        });

        await newVendor.save();
        res.status(201).json({ message: 'Chào mừng bạn gia nhập SlotHub!', vendor: newVendor });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo gian hàng', error: error.message });
    }
};

// Gian hàng của chủ quầy đang đăng nhập
const getMyStore = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới truy cập được!' });
        }
        const vendor = await Vendor.findOne({ owner: req.user.id });
        const owner = await User.findById(req.user.id).select('name email phone walletBalance bankAccount role');
        res.status(200).json({ vendor, owner });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy thông tin gian hàng', error: error.message });
    }
};

const updateMyStore = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới cập nhật được!' });
        }

        const { name, description, imageUrl, openTime, closeTime, category, bankAccount } = req.body;
        let vendor = await Vendor.findOne({ owner: req.user.id });

        if (!vendor) {
            if (!name?.trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập tên gian hàng để tạo quầy!' });
            }
            vendor = await Vendor.create({
                name: name.trim(),
                description: description || '',
                imageUrl: imageUrl || '',
                openTime: normalizeTimeString(openTime, '07:00'),
                closeTime: normalizeTimeString(closeTime, '21:00'),
                category: category || 'Cơm',
                owner: req.user.id
            });
        } else {
            const updates = {};
            if (name !== undefined) updates.name = name.trim();
            if (description !== undefined) updates.description = description;
            if (imageUrl !== undefined) updates.imageUrl = imageUrl;
            if (openTime !== undefined) updates.openTime = normalizeTimeString(openTime, '07:00');
            if (closeTime !== undefined) updates.closeTime = normalizeTimeString(closeTime, '21:00');
            if (category !== undefined) updates.category = category;
            vendor = await Vendor.findByIdAndUpdate(vendor._id, updates, { returnDocument: 'after', runValidators: true });
        }

        if (bankAccount !== undefined && bankAccount !== null) {
            const bankName = String(bankAccount.bankName || '').trim().toUpperCase();
            const accountNumber = String(bankAccount.accountNumber || '').trim();
            const accountName = String(bankAccount.accountName || '').trim().toUpperCase();
            if (accountNumber && (!bankName || !accountName)) {
                return res.status(400).json({
                    message: 'Vui lòng nhập đủ mã ngân hàng, số TK và tên chủ TK để nhận tiền rút.'
                });
            }
            await User.findByIdAndUpdate(req.user.id, {
                bankAccount: { bankName, accountNumber, accountName }
            });
        }

        const owner = await User.findById(req.user.id).select('name email phone walletBalance bankAccount');
        res.status(200).json({
            message: 'Cập nhật gian hàng thành công!',
            vendor: normalizeVendorHours(vendor),
            owner
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật gian hàng', error: error.message });
    }
};

const getMyDashboard = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới truy cập được!' });
        }

        const vendor = await Vendor.findOne({ owner: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Bạn chưa thiết lập gian hàng. Vào Cài đặt để tạo quầy!' });
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const vendorId = vendor._id;

        const [
            ordersToday,
            pendingOrders,
            revenueTodayAgg,
            revenueAllAgg,
            completedOrders,
            menuItems,
            recentOrders,
            owner,
            bestSellingThisMonth
        ] = await Promise.all([
            Order.countDocuments({ vendor: vendorId, createdAt: { $gte: startOfToday } }),
            Order.countDocuments({ vendor: vendorId, status: { $in: ['Pending', 'Processing', 'Ready'] } }),
            Order.aggregate([
                { $match: { vendor: vendorId, paymentStatus: 'Paid', createdAt: { $gte: startOfToday } } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),
            Order.aggregate([
                { $match: { vendor: vendorId, paymentStatus: 'Paid' } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),
            Order.countDocuments({ vendor: vendorId, status: 'Completed' }),
            MenuItem.countDocuments({ vendor: vendorId }),
            Order.find({ vendor: vendorId })
                .populate('user', 'name')
                .sort({ createdAt: -1 })
                .limit(6),
            User.findById(req.user.id).select('walletBalance name'),
            Order.aggregate([
                {
                    $match: {
                        vendor: vendorId,
                        paymentStatus: 'Paid',
                        status: { $ne: 'Cancelled' },
                        createdAt: { $gte: startOfMonth }
                    }
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.menuItem',
                        quantitySold: { $sum: '$items.quantity' },
                        revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                    }
                },
                { $sort: { quantitySold: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'menuitems',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'menuItem'
                    }
                },
                { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        menuItemId: '$_id',
                        name: { $ifNull: ['$menuItem.name', 'Món đã xóa'] },
                        imageUrl: '$menuItem.imageUrl',
                        price: '$menuItem.price',
                        category: '$menuItem.category',
                        quantitySold: 1,
                        revenue: 1
                    }
                }
            ])
        ]);

        const status = getVendorStatus(vendor);

        res.status(200).json({
            vendor: { ...normalizeVendorHours(vendor), isOpen: status.isOpen },
            stats: {
                ordersToday,
                pendingOrders,
                revenueToday: revenueTodayAgg[0]?.total || 0,
                revenueAllTime: revenueAllAgg[0]?.total || 0,
                vendorShareToday: Math.round((revenueTodayAgg[0]?.total || 0) * 0.95),
                walletBalance: owner?.walletBalance || 0,
                completedOrders,
                menuItems
            },
            recentOrders,
            bestSellingThisMonth,
            salesPeriod: {
                month: startOfMonth.getMonth() + 1,
                year: startOfMonth.getFullYear(),
                from: startOfMonth.toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi tải tổng quan', error: error.message });
    }
};

const updateVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: 'Không tìm thấy gian hàng' });

        if (vendor.owner.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa gian hàng này!' });
        }

        if (req.user.role !== 'admin') {
            delete req.body.isFeatured;
            delete req.body.isActive;
        }

        const updatedVendor = await Vendor.findByIdAndUpdate(
            req.params.id, { $set: req.body }, { returnDocument: 'after', runValidators: true }
        );

        res.status(200).json({ message: 'Cập nhật thành công', vendor: updatedVendor });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật', error: error.message });
    }
};


// ========================================================
// PHẦN 2: QUẢN LÝ THỰC ĐƠN (MENU CỦA QUÁN)
// ========================================================

const getMyMenu = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ owner: req.user.id });
        if (!vendor) return res.status(404).json({ message: 'Bạn chưa có gian hàng!' });

        // 🌟 ĐÃ SỬA LỖI: Trả lại vendor._id (ObjectId) để MongoDB tìm kiếm chính xác 100%
        const menu = await MenuItem.find({ vendor: vendor._id }).sort({ createdAt: -1 });
        res.status(200).json(menu);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thực đơn', error: error.message });
    }
};

const parseCaloriesInput = (value) => {
    if (value === undefined || value === null || value === '') {
        return { ok: true, calories: undefined };
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
        return { ok: false, message: 'Calo phải là số không âm (kcal).' };
    }
    if (n > 5000) {
        return { ok: false, message: 'Calo không hợp lệ (tối đa 5000 kcal).' };
    }
    return { ok: true, calories: Math.round(n) };
};

const addMenuItem = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ owner: req.user.id });
        if (!vendor) return res.status(404).json({ message: 'Bạn chưa có gian hàng!' });

        const { name, price, description, imageUrl, category } = req.body;
        const cal = parseCaloriesInput(req.body.calories);
        if (!cal.ok) return res.status(400).json({ message: cal.message });

        const newItem = new MenuItem({
            vendor: vendor._id,
            name,
            price,
            description,
            imageUrl,
            category,
            isAvailable: true,
            ...(cal.calories !== undefined && { calories: cal.calories })
        });

        await newItem.save();
        res.status(201).json({ message: 'Thêm món mới thành công!', item: newItem });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thêm món', error: error.message });
    }
};

const updateMenuItem = async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ owner: req.user.id });
        if (!vendor) return res.status(404).json({ message: 'Bạn chưa có gian hàng!' });

        const item = await MenuItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
        if (item.vendor.toString() !== vendor._id.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền sửa món này!' });
        }

        const setFields = {};
        const unsetFields = {};
        const allowed = ['name', 'price', 'description', 'imageUrl', 'category', 'isAvailable', 'countInStock', 'dailyQuota'];
        for (const key of allowed) {
            if (req.body[key] !== undefined) setFields[key] = req.body[key];
        }
        if (req.body.calories !== undefined) {
            const cal = parseCaloriesInput(req.body.calories);
            if (!cal.ok) return res.status(400).json({ message: cal.message });
            if (cal.calories === undefined) {
                unsetFields.calories = 1;
            } else {
                setFields.calories = cal.calories;
            }
        }

        let updateQuery = setFields;
        if (Object.keys(unsetFields).length) {
            updateQuery = { $set: setFields, $unset: unsetFields };
        }

        const updatedItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            updateQuery,
            { returnDocument: 'after', runValidators: true }
        );
        res.status(200).json({ message: 'Cập nhật món thành công!', item: updatedItem });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật món', error: error.message });
    }
};

const deleteMenuItem = async (req, res) => {
    try {
        await MenuItem.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Đã xóa món ăn khỏi thực đơn!' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa món', error: error.message });
    }
};

// ========================================================
// THÔNG BÁO CHỦ QUẦY
// ========================================================

const getVendorNotifications = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới truy cập được!' });
        }

        const ownerId = req.user._id || req.user.id;
        const filter = { audience: 'vendor', recipientId: ownerId };

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

        res.status(200).json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy thông báo', error: error.message });
    }
};

/** Doanh thu theo ngày — quản lý các ngày trước (7 / 14 / 30 ngày) */
const getVendorRevenueHistory = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới truy cập được!' });
        }

        const vendor = await Vendor.findOne({ owner: req.user.id });
        if (!vendor) {
            return res.status(404).json({ message: 'Bạn chưa thiết lập gian hàng!' });
        }

        const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 7), 90);
        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        start.setHours(0, 0, 0, 0);

        const labelMap = {};
        for (let i = 0; i < days; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
            const label = d.toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh'
            });
            labelMap[key] = {
                date: key,
                label,
                revenue: 0,
                orders: 0,
                completed: 0,
                cancelled: 0,
                vendorShare: 0
            };
        }

        const rows = await Order.aggregate([
            {
                $match: {
                    vendor: vendor._id,
                    paymentStatus: 'Paid',
                    createdAt: { $gte: start }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    revenue: { $sum: '$totalPrice' },
                    orders: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
                    }
                }
            }
        ]);

        rows.forEach((row) => {
            if (!labelMap[row._id]) return;
            const revenue = row.revenue || 0;
            labelMap[row._id].revenue = revenue;
            labelMap[row._id].orders = row.orders || 0;
            labelMap[row._id].completed = row.completed || 0;
            labelMap[row._id].cancelled = row.cancelled || 0;
            labelMap[row._id].vendorShare = Math.round(revenue * VENDOR_SHARE);
        });

        const daily = Object.values(labelMap).sort((a, b) => b.date.localeCompare(a.date));
        const chart = [...daily].reverse();

        const summary = daily.reduce(
            (acc, d) => ({
                revenue: acc.revenue + d.revenue,
                orders: acc.orders + d.orders,
                completed: acc.completed + d.completed,
                vendorShare: acc.vendorShare + d.vendorShare
            }),
            { revenue: 0, orders: 0, completed: 0, vendorShare: 0 }
        );

        res.status(200).json({
            days,
            from: start.toISOString(),
            vendorShareRate: VENDOR_SHARE,
            summary,
            chart,
            daily
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy lịch sử doanh thu', error: error.message });
    }
};

const markVendorNotificationRead = async (req, res) => {
    try {
        if (!isVendorRole(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ chủ quầy mới truy cập được!' });
        }

        const ownerId = req.user._id || req.user.id;
        const { id } = req.params;

        if (id === 'all') {
            await Notification.updateMany(
                { audience: 'vendor', recipientId: ownerId, isRead: false },
                { isRead: true }
            );
            return res.status(200).json({ message: 'Đã đánh dấu đọc tất cả!' });
        }

        const noti = await Notification.findOneAndUpdate(
            { _id: id, audience: 'vendor', recipientId: ownerId },
            { isRead: true },
            { returnDocument: 'after' }
        );
        if (!noti) return res.status(404).json({ message: 'Không tìm thấy thông báo' });

        res.status(200).json({ message: 'Đã đọc thông báo', notification: noti });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xử lý thông báo', error: error.message });
    }
};

module.exports = { 
    getAllVendors, getVendorDetail, createVendor, updateVendor,
    getMyStore, updateMyStore, getMyDashboard, getVendorRevenueHistory,
    getMyMenu, addMenuItem, updateMenuItem, deleteMenuItem,
    getVendorNotifications,
    markVendorNotificationRead
};