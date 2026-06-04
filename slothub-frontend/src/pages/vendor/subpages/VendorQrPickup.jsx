import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../../api/axios';
import {
  QrCode, Camera, CameraOff, Loader2, CheckCircle2, XCircle,
  User, Package, Hash
} from 'lucide-react';

const QR_REGION_ID = 'vendor-qr-scanner-region';

const statusLabel = {
  Pending: 'Chờ xác nhận',
  Processing: 'Đang làm',
  Ready: 'Sẵn sàng',
  Completed: 'Đã nhận món',
  Cancelled: 'Đã hủy',
};

const VendorQrPickup = ({ onOrdersRefresh }) => {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [lastError, setLastError] = useState('');
  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const verifyPickup = useCallback(async (payload) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setVerifying(true);
    setLastError('');
    setLastResult(null);

    try {
      const res = await api.post('/orders/vendor/verify-pickup', payload);
      setLastResult(res.data);
      onOrdersRefresh?.();
    } catch (err) {
      setLastError(err.response?.data?.message || 'Không xác nhận được đơn hàng.');
    } finally {
      setVerifying(false);
      setTimeout(() => {
        processingRef.current = false;
      }, 2000);
    }
  }, [onOrdersRefresh]);

  const handleScan = useCallback((decodedText) => {
    if (!decodedText || processingRef.current) return;
    verifyPickup({ qrData: decodedText });
  }, [verifyPickup]);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        /* ignore */
      }
    }
    scannerRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setCameraOn(true);
  }, []);

  useEffect(() => {
    if (!cameraOn) return undefined;

    let cancelled = false;
    const html5QrCode = new Html5Qrcode(QR_REGION_ID);
    scannerRef.current = html5QrCode;

    const run = async () => {
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          (text) => {
            if (!cancelled) handleScan(text);
          },
          () => {}
        );
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err?.message?.includes('NotAllowed')
              ? 'Cần cấp quyền camera để quét QR.'
              : 'Không mở được camera. Thử nhập mã OTP bên dưới.'
          );
          setCameraOn(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
      }
    };
  }, [cameraOn, handleScan]);

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    const code = otpInput.trim();
    if (!code) return;
    if (/^[a-fA-F0-9]{24}$/.test(code)) {
      verifyPickup({ orderId: code });
    } else {
      verifyPickup({ otpCode: code });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0f172a] rounded-3xl border border-[var(--portal-border)] p-6 md:p-8">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <QrCode className="text-[#F27124]" size={28} />
          Quét mã nhận món
        </h2>
        <p className="portal-muted text-sm mt-2">
          Sinh viên mở <strong className="portal-text-secondary">Mã nhận món</strong> — mã có hiệu lực <strong className="text-orange-300">2 giờ</strong> sau khi thanh toán.
        </p>
      </div>

      <div className="portal-card border rounded-3xl border border-[var(--portal-border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--portal-border)] flex justify-between items-center gap-3">
          <span className="text-sm font-bold portal-text-secondary">Camera quét QR</span>
          {cameraOn ? (
            <button
              type="button"
              onClick={stopCamera}
              className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-2 rounded-xl hover:bg-red-500/20"
            >
              <CameraOff size={16} /> Tắt camera
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              disabled={verifying}
              className="flex items-center gap-2 text-xs font-bold bg-[#F27124] px-4 py-2 rounded-xl hover:bg-[#D95F1B] disabled:opacity-50"
            >
              <Camera size={16} /> Bật camera
            </button>
          )}
        </div>

        <div className="p-4 flex flex-col items-center">
          <div
            id={QR_REGION_ID}
            className={`w-full max-w-sm overflow-hidden rounded-2xl ${cameraOn ? 'min-h-[280px]' : 'min-h-[120px] flex items-center justify-center bg-[var(--portal-table-head)]'}`}
          >
            {!cameraOn && (
              <p className="portal-muted text-sm text-center px-4">
                Nhấn <strong className="portal-muted">Bật camera</strong> để quét mã QR của sinh viên
              </p>
            )}
          </div>
          {cameraError && (
            <p className="text-red-400 text-xs mt-3 text-center">{cameraError}</p>
          )}
          {verifying && (
            <p className="text-[#F27124] text-sm font-bold mt-4 flex items-center gap-2">
              <Loader2 className="animate-spin" size={18} /> Đang xác nhận đơn...
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleOtpSubmit} className="portal-card border rounded-3xl border border-[var(--portal-border)] p-6">
        <h3 className="font-black flex items-center gap-2 mb-2">
          <Hash size={18} className="text-[#F27124]" /> Nhập thủ công
        </h3>
        <p className="text-xs portal-muted mb-4">Mã OTP 4 số hoặc mã đơn (24 ký tự) nếu không quét được</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            placeholder="VD: 4829 hoặc mã đơn"
            className="flex-1 bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 font-mono text-[var(--portal-text)] text-sm outline-none focus:border-[#F27124]"
            disabled={verifying}
          />
          <button
            type="submit"
            disabled={verifying || !otpInput.trim()}
            className="bg-[#F27124] font-bold px-5 rounded-xl hover:bg-[#D95F1B] disabled:opacity-50 shrink-0"
          >
            Xác nhận
          </button>
        </div>
      </form>

      {lastError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex gap-3 items-start">
          <XCircle className="text-red-400 shrink-0" size={24} />
          <div>
            <p className="font-black text-red-400">Không hợp lệ</p>
            <p className="text-sm text-red-300/90 mt-1">{lastError}</p>
          </div>
        </div>
      )}

      {lastResult?.order && (
        <div className={`rounded-2xl p-5 border flex gap-3 items-start ${
          lastResult.alreadyCompleted
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          <CheckCircle2 className={lastResult.alreadyCompleted ? 'text-amber-400' : 'text-green-400'} size={24} />
          <div className="flex-1 min-w-0">
            <p className={`font-black ${lastResult.alreadyCompleted ? 'text-amber-400' : 'text-green-400'}`}>
              {lastResult.message}
            </p>
            <p className="font-bold mt-2 flex items-center gap-2">
              <User size={16} className="portal-muted" />
              {lastResult.order.user?.name || 'Sinh viên'}
            </p>
            <p className="text-xs portal-muted mt-1">
              Đơn #{lastResult.order._id.slice(-6)} · {statusLabel[lastResult.order.status] || lastResult.order.status}
              {lastResult.order.otpCode && ` · OTP ${lastResult.order.otpCode}`}
            </p>
            <ul className="mt-3 space-y-1">
              {lastResult.order.items?.map((item, i) => (
                <li key={i} className="text-sm portal-text-secondary flex justify-between gap-2">
                  <span className="flex items-center gap-1 truncate">
                    <Package size={14} className="text-[#F27124] shrink-0" />
                    {item.quantity}x {item.menuItem?.name || 'Món'}
                  </span>
                  <span className="portal-muted shrink-0">
                    {(item.price * item.quantity).toLocaleString()}đ
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[#F27124] font-black mt-2">
              Tổng: {lastResult.order.totalPrice?.toLocaleString()}đ
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorQrPickup;
