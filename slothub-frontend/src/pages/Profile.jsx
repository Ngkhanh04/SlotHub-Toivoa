import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/LanguageToggle';
import { 
  ArrowLeft, UserSquare2, Building, CreditCard,
  Save, Loader2, ShieldCheck, Mail, User, Phone
} from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user, fetchBalance, setUser } = useContext(AuthContext);
  const { t } = useLocale();

  const [loading, setLoading] = useState(false);
  
  // State Thông tin cá nhân
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // State Ngân hàng (Lấy từ DB qua AuthContext)
  const [bankName, setBankName] = useState(user?.bankAccount?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(user?.bankAccount?.accountNumber || '');
  const [accountName, setAccountName] = useState(user?.bankAccount?.accountName || '');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setBankName(user.bankAccount?.bankName || '');
      setAccountNumber(user.bankAccount?.accountNumber || '');
      setAccountName(user.bankAccount?.accountName || '');
    }
  }, [user]);

  const isStudent = user.role === 'student';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const phoneTrim = phone.trim();
    if (isStudent && !phoneTrim) {
      alert(t('profile.phoneRequired'));
      setLoading(false);
      return;
    }

    if (isStudent) {
      const bn = bankName.trim();
      const acc = accountNumber.replace(/\D/g, '');
      const accName = accountName.trim();
      if (!bn || !acc || acc.length < 6 || !accName) {
        alert(t('profile.bankRequired'));
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        name: name.trim(),
        phone: phoneTrim,
      };
      if (isStudent) {
        payload.bankAccount = {
          bankName: bankName.trim(),
          accountNumber: accountNumber.replace(/\D/g, ''),
          accountName: accountName.toUpperCase().trim()
        };
      }

      const res = await api.put('/auth/profile', payload);

      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
      }
      await fetchBalance();
      alert(res.data.message || t('profile.updated'));
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật hồ sơ!');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-20 font-sans text-gray-800">
      <header className="bg-white px-8 py-4 shadow-sm sticky top-0 z-40 flex items-center gap-4 border-b border-gray-100 w-full">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-50 hover:bg-orange-50 hover:text-[#F27124] rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-800">{t('profile.title')}</h1>
        <LanguageToggle className="ml-auto" />
      </header>

      <div className="max-w-2xl mx-auto mt-8 px-4 flex flex-col gap-6">
        
        {/* THÔNG TIN TÓM TẮT */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#F27124] to-[#ff985e] rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-200 shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-800 line-clamp-1">{user.name}</h2>
            <p className="text-gray-500 font-medium flex items-center gap-1.5 mt-1"><Mail size={14}/> {user.email}</p>
            {user.phone && (
              <p className="text-gray-500 font-medium flex items-center gap-1.5 mt-0.5"><Phone size={14}/> {user.phone}</p>
            )}
            <span className="inline-block mt-2 bg-orange-100 text-[#F27124] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              {t('profile.role')}: {user.role}
            </span>
          </div>
        </div>

        {/* FORM NHẬP LIỆU */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 md:p-8">
          
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-[#F27124]" /> {t('profile.contact')}
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700">{t('profile.name')}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#F27124] focus:ring-2 focus:ring-orange-50 transition-all font-medium" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone size={14} className="text-[#F27124]" />
                  {t('profile.phone')}
                  {user.role === 'student' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="VD: 0912345678"
                  required={user.role === 'student'}
                  maxLength={11}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#F27124] focus:ring-2 focus:ring-orange-50 transition-all font-medium"
                />
                <p className="text-[11px] text-gray-500">{t('profile.phoneHint')}</p>
              </div>
            </div>
          </div>

          {isStudent ? (
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-800 mb-2 flex items-center gap-2">
              <ShieldCheck size={20} className="text-green-600" /> Tài khoản ngân hàng của bạn
            </h3>
            <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
              Mỗi sinh viên phải liên kết <strong>một STK riêng</strong> — không dùng chung với bạn khác. STK này dùng khi rút tiền từ ví SlotHub về ngân hàng của bạn.
            </p>
            
            <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Building size={14}/> Tên ngân hàng (Mã viết tắt)</label>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value.toUpperCase())} placeholder="VD: MB, VCB, TPB..." required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#F27124] text-sm font-medium uppercase" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><CreditCard size={14}/> Số tài khoản</label>
                <input type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="Chỉ nhập số — STK cá nhân của bạn" required minLength={6} maxLength={20} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#F27124] text-sm font-medium" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><UserSquare2 size={14}/> Tên chủ tài khoản</label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value.toUpperCase())} placeholder="VD: NGUYEN VAN A" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#F27124] text-sm font-medium uppercase" />
              </div>
            </div>
          </div>
          ) : (
          <div className="mb-8 p-5 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-gray-600">
            <p className="font-bold text-gray-800 mb-1">Tài khoản ngân hàng</p>
            <p>Chủ quầy / Admin cấu hình STK trong mục Cài đặt quầy hoặc Cài đặt hệ thống — không dùng chung form sinh viên.</p>
          </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#F27124] hover:bg-[#D95F1B] text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> LƯU THÔNG TIN HỒ SƠ</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;