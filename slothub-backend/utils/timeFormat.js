/** Chuẩn hóa "7:00" / "07:00" → "07:00" */
const normalizeTimeString = (value, fallback = null) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    const s = String(value).trim();
    const match = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return fallback;
    const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatVendorHoursRange = (openTime, closeTime) => {
    const open = normalizeTimeString(openTime);
    const close = normalizeTimeString(closeTime);
    if (!open || !close) return '—';
    return `${open} – ${close}`;
};

const normalizeVendorHours = (vendor) => {
    if (!vendor) return vendor;
    const doc = typeof vendor.toObject === 'function' ? vendor.toObject() : { ...vendor };
    doc.openTime = normalizeTimeString(doc.openTime, '07:00');
    doc.closeTime = normalizeTimeString(doc.closeTime, '21:00');
    return doc;
};

module.exports = {
    normalizeTimeString,
    formatVendorHoursRange,
    normalizeVendorHours
};
