const MenuItem = require('../models/MenuItem');
const Vendor = require('../models/Vendor');
const TimeSlot = require('../models/TimeSlot');
const { getVendorStatus } = require('../utils/vendorHours');
const { notifyVendorNewReview } = require('../utils/vendorNotify');
const { persistMenuItemReview } = require('../utils/persistence');

const getAllMenuItems = async (req, res) => {
    try {
        let slotOpts = {};
        if (req.query.slotId) {
            const slot = await TimeSlot.findById(req.query.slotId);
            if (slot?.isActive !== false) {
                slotOpts = { slotStart: slot.startTime, slotEnd: slot.endTime };
            }
        }

        const menu = await MenuItem.find({ isAvailable: true }).populate('vendor', 'name openTime closeTime isActive');
        const result = menu.map((item) => {
            const statusNow = getVendorStatus(item.vendor);
            const statusInSlot = slotOpts.slotStart
                ? getVendorStatus(item.vendor, slotOpts)
                : statusNow;
            return {
                ...item.toObject(),
                vendorIsOpen: statusInSlot.isOpen,
                vendorOpenNow: statusNow.isOpen,
                vendorStatusMessage: statusInSlot.message,
                vendorStatusNowMessage: statusNow.message,
                ...(slotOpts.slotStart && {
                    pickupSlotLabel: `${slotOpts.slotStart} – ${slotOpts.slotEnd}`
                })
            };
        });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách món', error: error.message });
    }
};

const getVendorMenu = async (req, res) => {
    try {
        const menu = await MenuItem.find({ vendor: req.params.vendorId, isAvailable: true });
        res.status(200).json(menu);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy menu', error: error.message });
    }
};

const getMenuItemById = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id).populate('vendor', 'name openTime closeTime isActive');
        if (!item) return res.status(404).json({ message: 'Không tìm thấy món ăn này!' });
        const status = getVendorStatus(item.vendor);
        res.status(200).json({
            ...item.toObject(),
            vendorIsOpen: status.isOpen,
            vendorStatusMessage: status.message
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy chi tiết món', error: error.message });
    }
};

const createMenuItem = async (req, res) => {
    try {
        const { vendorId, name, price, description, imageUrl, category, dailyQuota } = req.body;
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ message: 'Gian hàng không tồn tại' });
        
        if (vendor.owner.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bạn không phải chủ gian hàng này!' });
        }

        const newItem = new MenuItem({
            vendor: vendorId, name, price, description, imageUrl, category, dailyQuota
        });

        await newItem.save();
        res.status(201).json({ message: 'Đã thêm món mới vào Menu!', item: newItem });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi thêm món', error: error.message });
    }
};

const toggleItemAvailability = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.itemId).populate('vendor');
        if (!item) return res.status(404).json({ message: 'Không tìm thấy món' });

        if (item.vendor.owner.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        item.isAvailable = !item.isAvailable; 
        await item.save();

        res.status(200).json({ 
            message: `Đã chuyển trạng thái món thành: ${item.isAvailable ? 'Còn bán' : 'Hết món'}`, 
            item 
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật món', error: error.message });
    }
};

const createMenuItemReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const menuItemId = req.params.id;

        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) return res.status(404).json({ message: 'Không tìm thấy món ăn này!' });

        const alreadyReviewed = menuItem.reviews.find(r => r.user.toString() === req.user.id.toString());
        if (alreadyReviewed) return res.status(400).json({ message: 'Bạn đã đánh giá món ăn này rồi!' });

        const review = {
            user: req.user.id,
            name: req.user.name,
            avatar: req.user.avatar, 
            rating: Number(rating),
            comment: comment
        };

        menuItem.reviews.push(review);
        menuItem.numReviews = menuItem.reviews.length;
        const totalStars = menuItem.reviews.reduce((acc, item) => item.rating + acc, 0);
        menuItem.rating = totalStars / menuItem.numReviews;

        await menuItem.save();
        const updatedItem = await MenuItem.findById(menuItemId).populate('vendor', 'name');

        await persistMenuItemReview({
            menuItem,
            user: req.user,
            rating,
            comment
        });
        await notifyVendorNewReview(req, menuItem, review, req.user);

        res.status(201).json({ message: '🎉 Cảm ơn bạn đã đánh giá món ăn!', menuItem: updatedItem });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi gửi đánh giá', error: error.message });
    }
};

module.exports = { 
    getAllMenuItems, getVendorMenu, getMenuItemById, 
    createMenuItem, toggleItemAvailability, createMenuItemReview 
};