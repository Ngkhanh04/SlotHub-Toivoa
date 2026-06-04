const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const Vendor = require('../models/Vendor');
const { getVendorStatus } = require('../utils/vendorHours');

const CART_POPULATE = {
    path: 'items.menuItem',
    populate: { path: 'vendor', select: 'name openTime closeTime isActive' }
};

const buildCartResponse = (cart) => {
    let totalPrice = 0;
    let vendorOpen = true;
    let vendorStatusMessage = '';

    cart.items.forEach((i) => {
        if (i.menuItem?.price) totalPrice += i.menuItem.price * i.quantity;
    });

    const seen = new Set();
    for (const i of cart.items) {
        const v = i.menuItem?.vendor;
        if (!v || typeof v !== 'object') continue;
        const vid = String(v._id);
        if (seen.has(vid)) continue;
        seen.add(vid);
        const status = getVendorStatus(v);
        if (!status.isOpen) {
            vendorOpen = false;
            vendorStatusMessage = status.message;
            break;
        }
    }

    return { ...cart.toObject(), totalPrice, vendorOpen, vendorStatusMessage };
};

// 1. Lấy giỏ hàng của tôi
exports.getCart = async (req, res) => {
    try {
        // Đã thêm 'imageUrl' vào danh sách populate để load được hình ảnh ở giỏ hàng (nếu cần)
        let cart = await Cart.findOne({ user: req.user.id }).populate(CART_POPULATE);
        
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
            return res.status(200).json({ items: [], totalPrice: 0, vendorOpen: true, vendorStatusMessage: '' });
        }

        res.status(200).json(buildCartResponse(cart));
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy giỏ hàng', error: error.message });
    }
};

// 2. Thêm món vào giỏ (Xử lý thông minh: Trùng món thì tăng số lượng)
exports.addToCart = async (req, res) => {
    try {
        const { menuItemId, quantity } = req.body;
        const item = await MenuItem.findById(menuItemId);

        if (!item) return res.status(404).json({ message: 'Không tìm thấy món ăn!' });
        if (item.countInStock < quantity) return res.status(400).json({ message: 'Kho không đủ số lượng!' });

        const vendor = await Vendor.findById(item.vendor);
        const vendorStatus = getVendorStatus(vendor);
        if (!vendorStatus.isOpen) {
            return res.status(400).json({ message: vendorStatus.message });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) cart = new Cart({ user: req.user.id, items: [] });

        // Kiểm tra xem món này đã có trong giỏ chưa
        const itemIndex = cart.items.findIndex(p => p.menuItem.toString() === menuItemId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ menuItem: menuItemId, quantity });
        }

        await cart.save();

        // 🌟 FIX LỖI: Phải POPULATE lại dữ liệu để Frontend có Tên và Giá hiển thị
        await cart.populate(CART_POPULATE);

        res.status(200).json({ 
            message: 'Đã thêm vào giỏ hàng!', 
            cart: buildCartResponse(cart)
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi thêm món', error: error.message });
    }
};

// 3. Xóa 1 món khỏi giỏ
exports.removeFromCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        cart.items = cart.items.filter(item => item.menuItem.toString() !== req.params.itemId);
        await cart.save();

        // 🌟 FIX LỖI: POPULATE lại sau khi xóa
        await cart.populate(CART_POPULATE);

        res.status(200).json({ 
            message: 'Đã xóa món ăn', 
            cart: buildCartResponse(cart)
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa món', error: error.message });
    }
};

// 4. Làm trống giỏ hàng (Sau khi thanh toán thành công)
exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        cart.items = [];
        await cart.save();
        
        res.status(200).json({ 
            message: 'Giỏ hàng đã được làm sạch',
            cart: { ...cart.toObject(), totalPrice: 0 }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi làm sạch giỏ hàng' });
    }
};