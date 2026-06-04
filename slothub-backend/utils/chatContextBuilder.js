const MenuItem = require('../models/MenuItem');
const { getVendorStatus } = require('./vendorHours');

const formatReviews = (reviews = [], limit = 2) => {
    if (!reviews.length) return 'Chưa có đánh giá';
    return reviews
        .slice(-limit)
        .reverse()
        .map((r) => `"${(r.comment || '').slice(0, 80)}" — ${r.name || 'SV'} (${r.rating}★)`)
        .join(' | ');
};

/** Xây dựng ngữ cảnh menu + quầy + review + calo cho SlotAI */
const buildChatKnowledgeContext = async () => {
    const menuItems = await MenuItem.find({})
        .populate('vendor', 'name description openTime closeTime isActive category imageUrl')
        .lean();

    if (!menuItems.length) {
        return {
            contextText: 'Hiện chưa có món nào trên hệ thống.',
            stats: { vendors: 0, items: 0 },
        };
    }

    const vendorMap = new Map();

    menuItems.forEach((item) => {
        const v = item.vendor;
        const vid = v?._id ? String(v._id) : 'unknown';
        if (!vendorMap.has(vid)) {
            const status = getVendorStatus(v);
            vendorMap.set(vid, {
                vendor: v,
                status,
                items: [],
            });
        }
        vendorMap.get(vid).items.push(item);
    });

    const withCalories = menuItems.filter((i) => i.calories > 0);
    const lowCalSorted = [...withCalories].sort((a, b) => a.calories - b.calories);
    const topRated = menuItems
        .filter((i) => i.rating > 0 && (i.numReviews || 0) > 0)
        .sort((a, b) => b.rating - a.rating || (b.numReviews || 0) - (a.numReviews || 0))
        .slice(0, 15);

    let contextText = '';

    contextText += '=== TỔNG QUAN HỆ THỐNG ===\n';
    contextText += `- Số gian hàng: ${vendorMap.size}\n`;
    contextText += `- Tổng món trên menu: ${menuItems.length}\n`;
    contextText += `- Món đang bán (isAvailable): ${menuItems.filter((i) => i.isAvailable !== false).length}\n`;
    contextText += `- Món có ghi calories: ${withCalories.length}\n\n`;

    if (topRated.length) {
        contextText += '=== MÓN ĐƯỢC ĐÁNH GIÁ CAO (ưu tiên gợi ý) ===\n';
        topRated.forEach((item, idx) => {
            const vName = item.vendor?.name || 'Quầy';
            contextText += `${idx + 1}. ${item.name} @ ${vName} | ★${item.rating.toFixed(1)} (${item.numReviews || 0} lượt) | ${item.price?.toLocaleString('vi-VN')}đ`;
            if (item.calories) contextText += ` | ~${item.calories} kcal`;
            contextText += ` | ${formatReviews(item.reviews)}\n`;
        });
        contextText += '\n';
    }

    if (lowCalSorted.length) {
        contextText += '=== MÓN ÍT CALO (sắp xếp tăng dần kcal — gợi ý ăn healthy) ===\n';
        lowCalSorted.slice(0, 12).forEach((item, idx) => {
            const vName = item.vendor?.name || 'Quầy';
            contextText += `${idx + 1}. ${item.name} @ ${vName} | ${item.calories} kcal | ${item.price?.toLocaleString('vi-VN')}đ`;
            if (item.rating > 0) contextText += ` | ★${item.rating.toFixed(1)}`;
            contextText += '\n';
        });
        contextText += '\n';
    }

    const noCalorieItems = menuItems.filter((i) => !i.calories || i.calories <= 0);
    if (noCalorieItems.length) {
        contextText += `=== MÓN CHƯA GHI CALORIES (${noCalorieItems.length} món) ===\n`;
        contextText += 'Khi sinh viên hỏi calo món này, hãy ƯỚC LƯỢNG hợp lý dựa tên/mô tả/danh mục (VD: salad/súp ~150-300, cơm phần ~500-700, đồ chiên ~600-900, trà sữa ~250-450) và nói rõ là "ước lượng".\n\n';
    }

    contextText += '=== CHI TIẾT TỪNG GIAN HÀNG & MENU ===\n';

    for (const [, { vendor, status, items }] of vendorMap) {
        const vName = vendor?.name || 'Quầy chưa đặt tên';
        contextText += `\n--- GIAN HÀNG: ${vName} ---\n`;
        contextText += `Loại: ${vendor?.category || 'Đa dạng'} | Giờ: ${vendor?.openTime || '?'} – ${vendor?.closeTime || '?'}\n`;
        contextText += `Trạng thái: ${status.isOpen ? 'ĐANG MỞ (nhận đơn)' : 'ĐÓNG CỬA'} | ${status.message}\n`;
        if (vendor?.description) contextText += `Mô tả quầy: ${vendor.description}\n`;

        items.forEach((item, idx) => {
            const stock = item.isAvailable === false || (item.countInStock != null && item.countInStock <= 0)
                ? 'HẾT/TẠM NGƯNG'
                : 'CÒN BÁN';
            contextText += `  ${idx + 1}. ${item.name} [${stock}]\n`;
            contextText += `     Giá: ${item.price?.toLocaleString('vi-VN')}đ | Danh mục: ${item.category || 'Khác'}`;
            if (item.calories) contextText += ` | Calories: ${item.calories} kcal`;
            else contextText += ` | Calories: chưa có (cần ước lượng)`;
            if (item.rating > 0) {
                contextText += ` | Đánh giá: ★${item.rating.toFixed(1)} (${item.numReviews || 0} lượt)`;
            }
            contextText += '\n';
            if (item.description) contextText += `     Mô tả: ${item.description}\n`;
            contextText += `     Review SV: ${formatReviews(item.reviews, 3)}\n`;
        });
    }

    return {
        contextText,
        stats: { vendors: vendorMap.size, items: menuItems.length },
    };
};

module.exports = { buildChatKnowledgeContext };
