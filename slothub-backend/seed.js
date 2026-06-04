// seed.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. Cấu hình để nạp file .env chính xác
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Import các Models
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const Vendor = require('./models/Vendor');
const Transaction = require('./models/Transaction');

// 3. Kiểm tra biến môi trường
const dbUri = process.env.MONGODB_URI;

if (!dbUri) {
    console.error("❌ Lỗi: Không tìm thấy MONGODB_URI trong file .env!");
    console.log("Mẹo: Kiểm tra lại file .env xem đã đặt tên là MONGODB_URI chưa.");
    process.exit(1);
}

// 4. Kết nối và Đổ dữ liệu
mongoose.connect(dbUri)
    .then(async () => {
        console.log("✅ Kết nối Database thành công!");
        console.log("🚀 Đang khởi tạo dữ liệu mẫu cho SlotHub...");

        // Làm sạch dữ liệu cũ
        await User.deleteMany();
        await MenuItem.deleteMany();
        await Vendor.deleteMany();
        await Transaction.deleteMany();

        // --- TẠO USER MẪU ---
        const student = await User.create({
            name: "Huy Diep An",
            email: "an.hd@fpt.edu.vn",
            password: "password123",
            role: "student",
            walletBalance: 1000000, 
            isActive: true,
            studentId: "SE170488"
        });

        // --- TẠO GIAN HÀNG MẪU ---
        const vendor = await Vendor.create({
            name: "Canteen FPT - Quầy Bún Chả",
            description: "Bún chả gia truyền, thơm ngon nức mũi sinh viên",
            owner: student._id,
            imageUrl: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=800", // Ảnh quán
            openTime: "07:00",
            closeTime: "18:00",
            isActive: true
        });

        // --- TẠO DANH SÁCH MÓN ĂN ĐÃ BỔ SUNG IMAGE URL ---
        // ... (code tạo User và Vendor giữ nguyên)

// --- TẠO DANH SÁCH MÓN ĂN ĐÃ CÓ CALO ---
const items = await MenuItem.create([
    {
        name: "Bún Chả Đặc Biệt",
        price: 45000,
        description: "Nhiều chả, nhiều bún, nước dùng đậm đà",
        imageUrl: "https://images.unsplash.com/photo-1582878826629-29b7ad1cb461?w=800",
        calories: 650, // 👈 Thêm lượng Calo ước tính
        countInStock: 20, 
        dailyQuota: 50,
        vendor: vendor._id,
        category: "Bún/Phở",
        isAvailable: true
    },
    {
        name: "Trà Chanh Giã Tay",
        price: 15000,
        description: "Mát lạnh, giải nhiệt mùa hè",
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800",
        calories: 120, // 👈 Trà chanh ít calo
        countInStock: 5, 
        dailyQuota: 100,
        vendor: vendor._id,
        category: "Đồ uống",
        isAvailable: true
    },
    {
        name: "Cơm Gà Xối Mỡ",
        price: 35000,
        description: "Gà giòn rụm, cơm dẻo thơm",
        imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
        calories: 850, // 👈 Cơm gà nhiều calo
        countInStock: 0, 
        dailyQuota: 30,
        vendor: vendor._id,
        category: "Cơm",
        isAvailable: false
    }
]);

        console.log("------------------------------------------");
        console.log("🎉 ĐÃ ĐỔ DỮ LIỆU MẪU THÀNH CÔNG!");
        console.log(`👤 User: ${student.email} | Ví: ${student.walletBalance.toLocaleString()}đ`);
        console.log(`🏪 Vendor: ${vendor.name}`);
        console.log(`🍱 Món ăn: Đã tạo ${items.length} món ăn (Kèm ảnh đầy đủ!).`);
        console.log("------------------------------------------");

        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Lỗi kết nối Mongoose:", err.message);
        process.exit(1);
    });