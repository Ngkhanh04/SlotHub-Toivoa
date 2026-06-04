import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { Save, Building, CreditCard, UserSquare2, Loader2, Settings } from 'lucide-react';

const AdminSettings = () => {
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // 🌟 GỌI API LẤY DATA NGAY LẬP TỨC KHI VÀO TRANG HOẶC F5
  useEffect(() => {
    const fetchBankInfo = async () => {
      try {
        const res = await api.get('/admin/bank-info');
        setBankName(res.data.bankName || '');
        setAccountNumber(res.data.accountNumber || '');
        setAccountName(res.data.accountName || '');
      } catch (error) {
        console.error("Lỗi lấy thông tin:", error);
      } finally {
        setLoadingInit(false);
      }
    };
    fetchBankInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 🌟 GỌI API RIÊNG CỦA ADMIN ĐỂ LƯU
      const res = await api.put('/admin/bank-info', {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.toUpperCase().trim()
      });
      alert(res.data.message || 'Cập nhật Ngân hàng Admin thành công!');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi cập nhật!');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInit) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-[#F27124]" size={40}/></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="portal-card border p-8 rounded-[2rem] border border-[var(--portal-border)] shadow-sm max-w-3xl">
        <h3 className="text-xl font-black mb-2 flex items-center gap-2">
          <Settings className="text-[#F27124]" /> Cấu hình Ngân hàng Nhận tiền (Quỹ SlotHub)
        </h3>
        <p className="portal-muted text-sm mb-6">Đây là số tài khoản sẽ được gen thành Mã QR hiển thị cho tất cả Sinh viên khi họ nạp tiền vào hệ thống.</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold portal-muted flex items-center gap-2"><Building size={16}/> Tên Ngân Hàng (Mã viết tắt, VD: MB, TPB, VCB)</label>
            <input type="text" required value={bankName} onChange={e=>setBankName(e.target.value)} className="bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 outline-none text-[var(--portal-text)] focus:border-[#F27124] uppercase transition-all" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold portal-muted flex items-center gap-2"><CreditCard size={16}/> Số Tài Khoản Quỹ</label>
            <input type="text" required value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} className="bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 outline-none text-[var(--portal-text)] focus:border-[#F27124] transition-all" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold portal-muted flex items-center gap-2"><UserSquare2 size={16}/> Tên Chủ Tài Khoản (Viết hoa không dấu)</label>
            <input type="text" required value={accountName} onChange={e=>setAccountName(e.target.value)} className="bg-[var(--portal-input-bg)] border border-[var(--portal-border)] rounded-xl px-4 py-3 outline-none text-[var(--portal-text)] focus:border-[#F27124] uppercase transition-all" />
          </div>

          <button type="submit" disabled={saving} className="mt-4 bg-[#F27124] hover:bg-[#D95F1B] font-black px-8 py-3.5 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin inline mr-2" size={20} /> : <Save className="inline mr-2" size={20} />}
            LƯU CẤU HÌNH NGÂN HÀNG
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;