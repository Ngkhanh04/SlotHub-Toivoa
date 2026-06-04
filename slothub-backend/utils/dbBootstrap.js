const Category = require('../models/Category');
const TimeSlot = require('../models/TimeSlot');

const DEFAULT_CATEGORIES = [
    { name: 'Cơm', description: 'Cơm tấm, cơm rang, cơm hộp' },
    { name: 'Bún/Phở', description: 'Bún, phở, hủ tiếu' },
    { name: 'Đồ ăn vặt', description: 'Ăn vặt, snack' },
    { name: 'Đồ uống', description: 'Trà, cà phê, nước ép' },
    { name: 'Tráng miệng', description: 'Chè, yaourt, tráng miệng' },
    { name: 'Combo', description: 'Combo tiết kiệm' }
];

const DEFAULT_SLOTS = [
    { startTime: '10:00', endTime: '10:30', maxCapacity: 80 },
    { startTime: '10:30', endTime: '11:00', maxCapacity: 80 },
    { startTime: '11:00', endTime: '11:30', maxCapacity: 100 },
    { startTime: '11:30', endTime: '12:00', maxCapacity: 100 },
    { startTime: '12:00', endTime: '12:30', maxCapacity: 100 },
    { startTime: '17:00', endTime: '17:30', maxCapacity: 80 },
    { startTime: '17:30', endTime: '18:00', maxCapacity: 80 }
];

/** Đăng ký model + seed dữ liệu nền nếu collection trống */
const bootstrapDatabase = async () => {
    require('../models/User');
    require('../models/Vendor');
    require('../models/MenuItem');
    require('../models/MenuItemReview');
    require('../models/Order');
    require('../models/OrderStatusLog');
    require('../models/Cart');
    require('../models/Transaction');
    require('../models/StudentWalletLog');
    require('../models/Notification');
    require('../models/TimeSlot');
    require('../models/Category');
    require('../models/Review');
    require('../models/Report');
    require('../models/Conversation');
    require('../models/Message');
    require('../models/PickupVerification');
    require('../models/AuditLog');

    const catCount = await Category.countDocuments();
    if (catCount === 0) {
        await Category.insertMany(DEFAULT_CATEGORIES);
        console.log('📁 [DB] Đã seed collection categories');
    }

    const slotCount = await TimeSlot.countDocuments();
    if (slotCount === 0) {
        await TimeSlot.insertMany(DEFAULT_SLOTS);
        console.log('📁 [DB] Đã seed collection timeslots');
    }

    console.log('📦 [DB] Collections SlotHub đã sẵn sàng');
};

module.exports = { bootstrapDatabase };
