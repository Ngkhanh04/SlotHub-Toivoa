export const normalizeTimeString = (value, fallback = '') => {
  if (value === undefined || value === null || value === '') return fallback;
  const s = String(value).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const formatVendorHoursRange = (vendorOrOpen, closeTime) => {
  if (vendorOrOpen && typeof vendorOrOpen === 'object') {
    return formatVendorHoursRange(vendorOrOpen.openTime, vendorOrOpen.closeTime);
  }
  const open = normalizeTimeString(vendorOrOpen);
  const close = normalizeTimeString(closeTime);
  if (!open || !close) return '—';
  return `${open} – ${close}`;
};
