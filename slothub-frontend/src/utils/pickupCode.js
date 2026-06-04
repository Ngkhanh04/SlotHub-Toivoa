const PICKUP_CODE_TTL_MS = 2 * 60 * 60 * 1000;

export const getPickupCodeExpiresAt = (order) => {
  if (!order) return null;
  if (order.pickupCodeExpiresAt) {
    return new Date(order.pickupCodeExpiresAt);
  }
  if (order.paymentStatus === 'Paid' && order.createdAt) {
    return new Date(new Date(order.createdAt).getTime() + PICKUP_CODE_TTL_MS);
  }
  return null;
};

export const isPickupCodeExpired = (order, now = new Date()) => {
  const expiresAt = getPickupCodeExpiresAt(order);
  if (!expiresAt) return true;
  return now.getTime() > expiresAt.getTime();
};

export const getPickupCodeRemainingMs = (order, now = new Date()) => {
  const expiresAt = getPickupCodeExpiresAt(order);
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt.getTime() - now.getTime());
};

export const formatRemainingTime = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}g ${m}p`;
  if (m > 0) return `${m}p ${s}s`;
  return `${s}s`;
};
