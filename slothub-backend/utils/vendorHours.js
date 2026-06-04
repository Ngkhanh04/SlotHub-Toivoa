const timeToMinutes = (timeStr) => {
    const [h, m] = String(timeStr || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

/** Quầy có đang trong khung giờ mở cửa không (hỗ trợ qua đêm, VD 22:00–06:00) */
const isVendorOpenNow = (openTime, closeTime, now = new Date()) => {
    const current = now.getHours() * 60 + now.getMinutes();
    const open = timeToMinutes(openTime);
    const close = timeToMinutes(closeTime);

    if (open === close) return true;
    if (open < close) return current >= open && current <= close;
    return current >= open || current <= close;
};

/** Khung giờ nhận món [rangeStart, rangeEnd] có nằm trong giờ mở cửa quầy không */
const isVendorOpenForTimeRange = (openTime, closeTime, rangeStart, rangeEnd) => {
    const open = timeToMinutes(openTime);
    const close = timeToMinutes(closeTime);
    const s = timeToMinutes(rangeStart);
    const e = timeToMinutes(rangeEnd);

    const overlaps = (segStart, segEnd) => s < segEnd && e > segStart;

    if (open === close) return true;
    if (open < close) return overlaps(open, close);
    return overlaps(open, 24 * 60) || overlaps(0, close);
};

const getVendorStatus = (vendor, options = {}) => {
    const { slotStart, slotEnd } = options;
    if (!vendor) {
        return { isOpen: false, message: 'Không tìm thấy thông tin quầy.' };
    }
    if (vendor.isActive === false) {
        return {
            isOpen: false,
            message: `Quầy "${vendor.name}" tạm ngưng nhận đơn.`
        };
    }
    const isOpen = slotStart && slotEnd
        ? isVendorOpenForTimeRange(vendor.openTime, vendor.closeTime, slotStart, slotEnd)
        : isVendorOpenNow(vendor.openTime, vendor.closeTime);
    const slotLabel = slotStart && slotEnd ? `${slotStart} – ${slotEnd}` : null;
    return {
        isOpen,
        message: isOpen
            ? (slotLabel ? `Mở cửa trong khung ${slotLabel}` : 'Đang mở cửa')
            : slotLabel
                ? `Quầy "${vendor.name}" không phục vụ khung ${slotLabel}. Giờ quầy: ${vendor.openTime} – ${vendor.closeTime}.`
                : `Quầy "${vendor.name}" đã đóng cửa. Giờ phục vụ: ${vendor.openTime} – ${vendor.closeTime}.`
    };
};

const assertVendorsOpen = async (vendorIds, Vendor) => {
    const uniqueIds = [...new Set(vendorIds.filter(Boolean).map(String))];
    for (const id of uniqueIds) {
        const vendor = await Vendor.findById(id);
        const status = getVendorStatus(vendor);
        if (!status.isOpen) {
            return status;
        }
    }
    return { isOpen: true, message: '' };
};

module.exports = {
    timeToMinutes,
    isVendorOpenNow,
    isVendorOpenForTimeRange,
    getVendorStatus,
    assertVendorsOpen
};
