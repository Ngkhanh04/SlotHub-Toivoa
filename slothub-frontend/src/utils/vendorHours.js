export const timeToMinutes = (timeStr) => {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const isVendorOpenNow = (openTime, closeTime, now = new Date()) => {
  const current = now.getHours() * 60 + now.getMinutes();
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  if (open === close) return true;
  if (open < close) return current >= open && current <= close;
  return current >= open || current <= close;
};

/** Khung nhận món có nằm trong giờ mở cửa quầy không */
export const isVendorOpenForTimeRange = (openTime, closeTime, rangeStart, rangeEnd) => {
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  const s = timeToMinutes(rangeStart);
  const e = timeToMinutes(rangeEnd);

  const overlaps = (segStart, segEnd) => s < segEnd && e > segStart;

  if (open === close) return true;
  if (open < close) return overlaps(open, close);
  return overlaps(open, 24 * 60) || overlaps(0, close);
};

export const getVendorStatusForSlot = (vendor, slot) => {
  if (!vendor) return { isOpen: false, message: 'Quán không khả dụng.' };
  if (vendor.isActive === false) {
    return { isOpen: false, message: `Quầy "${vendor.name}" tạm ngưng nhận đơn.` };
  }
  if (!slot) {
    const open = isVendorOpenNow(vendor.openTime, vendor.closeTime);
    return {
      isOpen: open,
      message: open
        ? 'Đang mở cửa'
        : `Quầy "${vendor.name}" đã đóng cửa (${vendor.openTime} – ${vendor.closeTime}).`,
    };
  }
  const open = isVendorOpenForTimeRange(
    vendor.openTime,
    vendor.closeTime,
    slot.startTime,
    slot.endTime
  );
  const label = `${slot.startTime} – ${slot.endTime}`;
  return {
    isOpen: open,
    message: open
      ? `Mở cửa trong khung ${label}`
      : `Quầy không phục vụ khung ${label} (giờ quầy: ${vendor.openTime} – ${vendor.closeTime}).`,
  };
};

export const getVendorClosedMessage = (vendor) => {
  if (!vendor) return 'Quán không khả dụng.';
  if (vendor.isActive === false) return `Quầy "${vendor.name}" tạm ngưng nhận đơn.`;
  return `Quầy "${vendor.name}" đã đóng cửa (${vendor.openTime} – ${vendor.closeTime}).`;
};

/** Chọn slot mặc định: khung sắp tới, hoặc khung cuối trong ngày */
export const pickDefaultSlotId = (slots) => {
  if (!slots?.length) return '';
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const upcoming = slots.find((s) => timeToMinutes(s.startTime) >= nowMin);
  return (upcoming || slots[slots.length - 1])._id;
};

/** Khung giờ nhận món thật — chỉ dùng ở Checkout */
export const PICKUP_SLOT_STORAGE_KEY = 'slothub_pickup_slot';

/** Khung giờ xem menu / lọc quầy mở — chỉ dùng ở Home */
export const MENU_VIEW_SLOT_STORAGE_KEY = 'slothub_menu_view_slot';
