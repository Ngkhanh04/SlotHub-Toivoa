import React, { useState, useEffect, useContext } from 'react';
import api from '../../../api/axios';
import { AuthContext } from '../../../context/AuthContext';
import UserAvatar from '../../../components/UserAvatar';
import {
  Store, Building, CreditCard, UserSquare2, Clock, Save, Loader2,
  Image as ImageIcon, FileText, Tag, ShieldCheck, Phone, User, Mail
} from 'lucide-react';
import { normalizeTimeString } from '../../../utils/timeFormat';

const VendorSettings = () => {
  const { user, fetchBalance } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasStore, setHasStore] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    category: 'Cơm',
    openTime: '07:00',
    closeTime: '21:00',
    bankName: '',
    accountNumber: '',
    accountName: '',
    ownerName: '',
    phone: '',
    ownerEmail: '',
    avatar: '',
  });

  const categories = ['Cơm', 'Bún/Phở', 'Đồ ăn vặt', 'Đồ uống', 'Tráng miệng', 'Combo'];

  const loadStore = async () => {
    try {
      const res = await api.get('/vendor/my-store');
      const { vendor, owner } = res.data;
      setHasStore(!!vendor);
      setForm({
        name: vendor?.name || '',
        description: vendor?.description || '',
        imageUrl: vendor?.imageUrl || '',
        category: vendor?.category || 'Cơm',
        openTime: normalizeTimeString(vendor?.openTime, '07:00'),
        closeTime: normalizeTimeString(vendor?.closeTime, '21:00'),
        bankName: owner?.bankAccount?.bankName || '',
        accountNumber: owner?.bankAccount?.accountNumber || '',
        accountName: owner?.bankAccount?.accountName || '',
        ownerName: owner?.name || user?.name || '',
        phone: owner?.phone || user?.phone || '',
        ownerEmail: owner?.email || user?.email || '',
        avatar: owner?.avatar || user?.avatar || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load một lần khi mở cài đặt
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Vui lòng nhập tên gian hàng!');
    if (!form.ownerName.trim()) return alert('Vui lòng nhập họ tên chủ quầy!');
    if (!form.phone.trim()) return alert('Vui lòng nhập số điện thoại liên hệ!');

    setSaving(true);
    try {
      const phoneTrim = form.phone.trim();
      await api.put('/auth/profile', {
        name: form.ownerName.trim(),
        phone: phoneTrim,
        avatar: form.avatar.trim(),
      });

      const res = await api.put('/vendor/my-store', {
        name: form.name.trim(),
        description: form.description,
        imageUrl: form.imageUrl,
        category: form.category,
        openTime: normalizeTimeString(form.openTime, '07:00'),
        closeTime: normalizeTimeString(form.closeTime, '21:00'),
        bankAccount: {
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          accountName: form.accountName.toUpperCase().trim(),
        },
      });
      setHasStore(true);
      const saved = res.data.vendor;
      if (res.data.owner) {
        setForm((prev) => ({
          ...prev,
          bankName: res.data.owner.bankAccount?.bankName || prev.bankName,
          accountNumber: res.data.owner.bankAccount?.accountNumber || prev.accountNumber,
          accountName: res.data.owner.bankAccount?.accountName || prev.accountName,
          openTime: normalizeTimeString(saved?.openTime, prev.openTime),
          closeTime: normalizeTimeString(saved?.closeTime, prev.closeTime),
        }));
      }
      if (fetchBalance) await fetchBalance();
      alert(res.data.message || 'Lưu cài đặt thành công!');
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lưu cài đặt!');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#F27124]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in duration-300">
      {!hasStore && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 text-orange-200 text-sm">
          <p className="font-bold text-orange-300 mb-1">Chưa có gian hàng</p>
          <p>Điền tên quầy và lưu để tạo gian hàng trên SlotHub.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin chủ quầy */}
        <section className="portal-card border rounded-3xl border border-[var(--portal-border)] p-6 md:p-8">
          <h3 className="text-lg font-black mb-2 flex items-center gap-2">
            <User className="text-[#F27124]" size={22} /> Thông tin liên hệ chủ quầy
          </h3>
          <p className="text-sm portal-muted mb-6">
            Số điện thoại để sinh viên và admin liên hệ khi có đơn hàng hoặc khiếu nại.
          </p>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-[var(--portal-input-bg)] rounded-2xl border border-[var(--portal-border)]">
              <UserAvatar
                user={{ name: form.ownerName, avatar: form.avatar, role: user?.role }}
                size="lg"
                className="!w-20 !h-20 text-2xl"
              />
              <div className="flex-1 w-full">
                <label className="text-xs font-bold portal-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ImageIcon size={14} className="text-[#F27124]" /> Ảnh đại diện (URL)
                </label>
                <input
                  type="url"
                  value={form.avatar}
                  onChange={(e) => handleChange('avatar', e.target.value)}
                  placeholder="https://... (link ảnh công khai)"
                  className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-sm focus:border-[#F27124] outline-none"
                />
                <p className="text-[11px] portal-muted mt-2">
                  Hiển thị trên tin nhắn và trang admin. Tài khoản Google giữ ảnh Google nếu không đổi.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold portal-muted uppercase tracking-wider mb-2 block">
                Họ và tên chủ quầy *
              </label>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={(e) => handleChange('ownerName', e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold portal-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                <Mail size={14} /> Email đăng nhập
              </label>
              <input
                type="email"
                value={form.ownerEmail}
                disabled
                className="w-full bg-[var(--portal-table-head)] border border-[var(--portal-border)] rounded-xl px-4 py-3 portal-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-bold portal-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                <Phone size={14} className="text-[#F27124]" /> Số điện thoại *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value.replace(/[^\d+]/g, ''))}
                placeholder="VD: 0912345678"
                maxLength={11}
                className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
              />
            </div>
          </div>
        </section>

        {/* Thông tin quầy */}
        <section className="portal-card border rounded-3xl border border-[var(--portal-border)] p-6 md:p-8">
          <h3 className="text-lg font-black mb-6 flex items-center gap-2">
            <Store className="text-[#F27124]" size={22} /> Thông tin gian hàng
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold portal-muted uppercase tracking-wider mb-2 block">
                Tên gian hàng *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="VD: Cơm Niêu Sài Gòn"
                className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold portal-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText size={14} /> Mô tả quầy
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Giới thiệu ngắn về quầy..."
                className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold portal-muted uppercase mb-2 flex items-center gap-1">
                  <Tag size={14} /> Loại hình
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold portal-muted uppercase mb-2 flex items-center gap-1">
                  <ImageIcon size={14} /> Ảnh bìa (URL)
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
                />
              </div>
            </div>
            <p className="text-xs portal-muted -mt-2 mb-3 leading-relaxed">
              <strong className="text-[var(--portal-text)]">Giờ mở / đóng cửa hàng ngày</strong> — dùng để sinh viên biết quầy
              còn phục vụ trong khung giờ xem menu (khác khung giờ nhận món ở Thanh toán). Nhấn <strong>Lưu</strong> sau khi chỉnh.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold portal-muted uppercase mb-2 flex items-center gap-1">
                  <Clock size={14} /> Mở cửa quầy
                </label>
                <input
                  type="time"
                  value={form.openTime}
                  onChange={(e) => handleChange('openTime', e.target.value)}
                  className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold portal-muted uppercase mb-2 flex items-center gap-1">
                  <Clock size={14} /> Đóng cửa quầy
                </label>
                <input
                  type="time"
                  value={form.closeTime}
                  onChange={(e) => handleChange('closeTime', e.target.value)}
                  className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Ngân hàng rút tiền */}
        <section className="portal-card border rounded-3xl border border-[var(--portal-border)] p-6 md:p-8">
          <h3 className="text-lg font-black mb-2 flex items-center gap-2">
            <ShieldCheck className="text-green-400" size={22} /> Tài khoản nhận tiền rút
          </h3>
          <p className="text-sm portal-muted mb-6">
            Chủ quầy tự cập nhật STK nhận tiền tại đây. Dùng khi rút doanh thu ở mục{' '}
            <strong className="portal-text-secondary">Ví & Doanh thu</strong> — Admin chuyển khoản sau khi duyệt lệnh.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold portal-muted flex items-center gap-2 mb-2">
                <Building size={16} /> Mã ngân hàng (MB, VCB, TPB...)
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="VD: MB"
                className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 uppercase text-[var(--portal-text)] focus:border-[#F27124] outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold portal-muted flex items-center gap-2 mb-2">
                <CreditCard size={16} /> Số tài khoản
              </label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                placeholder="0123456789"
                className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 text-[var(--portal-text)] focus:border-[#F27124] outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-bold portal-muted flex items-center gap-2 mb-2">
                <UserSquare2 size={16} /> Tên chủ TK (viết hoa, không dấu)
              </label>
              <input
                type="text"
                value={form.accountName}
                onChange={(e) => handleChange('accountName', e.target.value)}
                placeholder="NGUYEN VAN A"
                className="w-full bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 uppercase text-[var(--portal-text)] focus:border-[#F27124] outline-none"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F27124] hover:bg-[#D95F1B] font-black px-10 py-4 rounded-2xl shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all active:scale-95"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          LƯU CÀI ĐẶT GIAN HÀNG
        </button>
      </form>
    </div>
  );
};

export default VendorSettings;
