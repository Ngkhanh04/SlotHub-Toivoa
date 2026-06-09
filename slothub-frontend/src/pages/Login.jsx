import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Store, UserRound, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios'; 
import { useGoogleLogin } from '@react-oauth/google';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/LanguageToggle';

const Login = () => {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  /** login | register | forgot | reset */
  const [partnerView, setPartnerView] = useState('login');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [regData, setRegData] = useState({
    ownerName: '',
    vendorName: '',
    regEmail: '',
    regPassword: '',
    confirmPassword: ''
  });

  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext); 

  const handleLoginSuccess = (data) => {
    const { token, user } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (setUser) setUser(user);

    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'vendor' || user.role === 'vendor_owner') navigate('/vendor');
    else navigate('/');
  };

  const handleTraditionalLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      handleLoginSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác!');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setError('');
        const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
        handleLoginSuccess(res.data);
      } catch (err) {
        setError(err.response?.data?.message || t('login.googleError'));
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => setError('Đăng nhập Google thất bại!')
  });

  const handleRegisterVendor = async (e) => {
    e.preventDefault();
    setError('');

    if (regData.regPassword !== regData.confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp!');
    }
    if (regData.regPassword.length < 6) {
      return setError('Mật khẩu phải có ít nhất 6 ký tự!');
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register-vendor', {
        name: regData.ownerName,
        vendorName: regData.vendorName,
        email: regData.regEmail,
        password: regData.regPassword,
        role: 'vendor_owner' 
      });
      
      alert('🎉 Đăng ký mở quầy thành công! Yêu cầu của bạn đang chờ Admin phê duyệt. Vui lòng quay lại đăng nhập sau nhé!');
      setPartnerView('login');
      setEmail(regData.regEmail);
      setRegData({ ownerName: '', vendorName: '', regEmail: '', regPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Email này đã được sử dụng hoặc có lỗi xảy ra!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const switchPartnerView = (view) => {
    clearMessages();
    setPartnerView(view);
    if (view === 'login') {
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgotpassword', { email: email.trim() });
      setSuccessMessage(res.data.message || t('login.forgotSubtitle'));
      setPartnerView('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Không gửi được mã. Kiểm tra email hoặc thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (newPassword !== confirmNewPassword) {
      return setError(t('login.passwordMismatch') || 'Mật khẩu xác nhận không khớp!');
    }
    if (newPassword.length < 6) {
      return setError(t('login.passwordMin') || 'Mật khẩu phải có ít nhất 6 ký tự!');
    }
    if (!/^\d{6}$/.test(resetToken.trim())) {
      return setError('Mã xác nhận phải đủ 6 chữ số.');
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/resetpassword', {
        resetToken: resetToken.trim(),
        newPassword
      });
      setSuccessMessage(res.data.message || t('login.resetSuccess'));
      setPassword('');
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPartnerView('login');
    } catch (err) {
      setError(err.response?.data?.message || 'Không đổi được mật khẩu. Kiểm tra mã hoặc thử gửi lại mã.');
    } finally {
      setIsLoading(false);
    }
  };

  const partnerTitles = {
    login: { title: 'Xin chào! 👋', subtitle: 'Nền tảng đặt đồ ăn nhanh chóng & tiện lợi dành cho sinh viên và khách hàng.' },
    register: { title: 'Hợp tác cùng SlotHub 🚀', subtitle: 'Đăng ký gian hàng ngay hôm nay để tiếp cận hàng ngàn khách hàng.' },
    forgot: { title: t('login.forgotTitle') || 'Khôi phục mật khẩu', subtitle: t('login.forgotSubtitle') || 'Nhập email để nhận mã xác nhận' },
    reset: { title: t('login.resetTitle') || 'Tạo mật khẩu mới', subtitle: t('login.resetSubtitle') || 'Nhập mã gồm 6 chữ số' }
  };
  const { title: pageTitle, subtitle: pageSubtitle } = partnerTitles[partnerView] || partnerTitles.login;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] font-sans selection:bg-[#F27124] selection:text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F27124] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full lg:w-[55%] flex flex-col justify-center items-center p-6 sm:p-12 md:p-20 relative z-10 overflow-y-auto">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-20">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-500 py-10">
          
          <Link to="/" className="inline-block mb-8">
            <BrandLogo size="lg" />
          </Link>

          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 tracking-tight">
            {pageTitle}
          </h2>
          <p className="text-gray-500 font-medium mb-8">
            {pageSubtitle}
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center shadow-sm animate-in shake">
               <ShieldCheck size={18} className="mr-2 shrink-0" /> {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center shadow-sm">
              <ShieldCheck size={18} className="mr-2 shrink-0" /> {successMessage}
            </div>
          )}

          {partnerView === 'login' ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="mb-8">
                {/* 🌟 ĐÃ ÉP CỨNG CHỮ Ở ĐÂY, GỠ BỎ HÀM T() 🌟 */}
                <button type="button" onClick={() => loginWithGoogle()} disabled={isLoading} className="w-full flex justify-center items-center py-4 bg-white border border-gray-200 shadow-sm rounded-2xl hover:bg-gray-50 font-black text-gray-700 transition-all duration-300 disabled:opacity-50 hover:shadow-md active:scale-95">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-6 w-6 mr-3" alt="Google" /> 
                  Đăng nhập bằng tài khoản Google
                </button>
                <p className="text-center text-xs text-gray-400 font-medium mt-3">Dành cho Sinh viên & Khách hàng</p>
              </div>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest text-gray-400"><span className="px-4 bg-[#F9FAFB]">Dành cho Đối tác</span></div>
              </div>

              <form onSubmit={handleTraditionalLogin} className="space-y-5 bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Email đối tác</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#F27124] transition-colors" /></div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm" placeholder="Nhập email..." required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Mật khẩu</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#F27124] transition-colors" /></div>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm" placeholder="••••••••" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => switchPartnerView('forgot')}
                      className="text-xs font-bold text-[#F27124] hover:underline"
                    >
                      {t('login.forgotPassword') || 'Quên mật khẩu?'}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-lg shadow-gray-900/20 hover:bg-black transition-all flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95 mt-2">
                  {isLoading ? <Loader2 className="animate-spin" size={20}/> : <>Đăng nhập hệ thống <ArrowRight size={18}/></>}
                </button>
                
                <div className="text-center mt-6 pt-6 border-t border-dashed border-gray-100">
                  <p className="text-sm text-gray-500 font-medium">Chưa có gian hàng trên SlotHub?</p>
                  <button type="button" onClick={() => switchPartnerView('register')} className="text-[#F27124] font-black hover:underline mt-1">Đăng ký mở quầy ngay</button>
                </div>
              </form>
            </div>
          ) : partnerView === 'forgot' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <form onSubmit={handleForgotPassword} className="space-y-5 bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Email đối tác</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#F27124] transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm"
                      placeholder="Email đã đăng ký quầy..."
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#F27124] text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:bg-[#D95F1B] transition-all flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><KeyRound size={18} /> {t('login.sendResetCode') || 'Gửi mã khôi phục'}</>}
                </button>
                <button
                  type="button"
                  onClick={() => switchPartnerView('login')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 py-2"
                >
                  <ArrowLeft size={16} /> {t('login.backToLogin') || 'Quay lại đăng nhập'}
                </button>
              </form>
            </div>
          ) : partnerView === 'reset' ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <form onSubmit={handleResetPassword} className="space-y-4 bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 font-medium bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                  Mã gửi tới: <strong className="text-gray-800">{email}</strong>
                </p>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">{t('login.resetCode') || 'Mã xác nhận (6 số)'}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-[#F27124] transition-colors" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-black text-lg tracking-[0.3em] text-center"
                      placeholder="000000"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">{t('login.newPassword') || 'Mật khẩu mới'}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#F27124] transition-colors" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm"
                      placeholder="••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">{t('login.confirmNewPassword') || 'Xác nhận lại mật khẩu'}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#F27124] transition-colors" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm"
                      placeholder="••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : t('login.resetSubmit') || 'Lưu mật khẩu mới'}
                </button>
                <button
                  type="button"
                  onClick={() => switchPartnerView('forgot')}
                  className="w-full text-xs font-bold text-[#F27124] hover:underline py-1"
                >
                  Không nhận được mã? Gửi lại
                </button>
                <button
                  type="button"
                  onClick={() => switchPartnerView('login')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 py-2"
                >
                  <ArrowLeft size={16} /> {t('login.backToLogin') || 'Quay lại đăng nhập'}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <form onSubmit={handleRegisterVendor} className="space-y-4 bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Họ và tên Chủ quán</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><UserRound className="h-4 w-4 text-gray-400 group-focus-within:text-[#F27124] transition-colors" /></div>
                    <input type="text" name="ownerName" value={regData.ownerName} onChange={handleRegChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm" placeholder="VD: Nguyễn Văn A" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Tên gian hàng (Thương hiệu)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Store className="h-4 w-4 text-gray-400 group-focus-within:text-[#F27124] transition-colors" /></div>
                    <input type="text" name="vendorName" value={regData.vendorName} onChange={handleRegChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm" placeholder="VD: Cơm Tấm Chú Ba" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Email đăng nhập</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-gray-400 group-focus-within:text-[#F27124] transition-colors" /></div>
                    <input type="email" name="regEmail" value={regData.regEmail} onChange={handleRegChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm" placeholder="VD: chuba@gmail.com" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Mật khẩu</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400 group-focus-within:text-[#F27124]" /></div>
                      <input type="password" name="regPassword" value={regData.regPassword} onChange={handleRegChange} className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm" placeholder="••••••" required minLength={6} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 ml-1">Xác nhận MK</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400 group-focus-within:text-[#F27124]" /></div>
                      <input type="password" name="confirmPassword" value={regData.confirmPassword} onChange={handleRegChange} className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#F27124] outline-none transition-all font-medium text-sm" placeholder="••••••" required minLength={6} />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-[#F27124] text-white font-black py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:bg-[#D95F1B] transition-all flex justify-center items-center gap-2 disabled:opacity-50 active:scale-95 mt-4">
                  {isLoading ? <Loader2 className="animate-spin" size={20}/> : 'Gửi yêu cầu mở quầy'}
                </button>
                
                <div className="text-center mt-6 pt-5 border-t border-dashed border-gray-100">
                  <p className="text-sm text-gray-500 font-medium">Đã có tài khoản đối tác?</p>
                  <button type="button" onClick={() => switchPartnerView('login')} className="text-gray-900 font-black hover:underline mt-1">Quay lại Đăng nhập</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:block lg:w-[45%] relative bg-[#111827] overflow-hidden p-4">
        <div className="absolute inset-0 m-4 rounded-[3rem] overflow-hidden shadow-2xl">
            <img src="https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=80" alt="Delicious food" className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-[10s]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/90 via-[#111827]/10 to-transparent"></div>
            
            <div className="absolute bottom-16 left-12 right-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] text-white shadow-2xl">
                <img src={`${process.env.PUBLIC_URL}/logo-mark.svg`} alt="SlotHub" className="w-12 h-12 mb-6 drop-shadow-lg" />
                <h3 className="text-3xl font-black mb-3 leading-tight">Hương vị đích thực,<br/>Giao tận tay bạn.</h3>
                <p className="text-gray-300 leading-relaxed font-medium text-sm w-5/6">
                  Trải nghiệm ẩm thực tuyệt vời được giao ngay đến bạn chỉ với vài cú chạm. Tránh xa hàng dài chờ đợi!
                </p>
                <div className="flex gap-3 mt-6">
                  <span className="bg-white/20 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md">🚀 Nhanh chóng</span>
                  <span className="bg-white/20 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md">💳 Tiện lợi</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;