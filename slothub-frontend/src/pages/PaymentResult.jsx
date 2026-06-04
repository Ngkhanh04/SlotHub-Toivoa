import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/LanguageToggle';

const PaymentResult = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLocale();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        setMessage(t('paymentResult.processing'));
        const searchParams = location.search;
        
        if (!searchParams) {
            setStatus('failed');
            setMessage(t('paymentResult.invalid'));
            return;
        }

        const verifyPayment = async () => {
            try {
                // Gửi nguyên cái đuôi URL đó về Backend để nó kiểm tra chữ ký
                const res = await api.get(`/payment/vnpay_return${searchParams}`);
                setStatus('success');
                setMessage(res.data.message || t('payment.success'));
                
                // Tiện tay xóa luôn giỏ hàng ở FE
                await api.delete('/cart/clear').catch(()=>console.log('Cart clear info'));

            } catch (error) {
                setStatus('failed');
                setMessage(error.response?.data?.message || 'Giao dịch thất bại hoặc đã bị hủy!');
            }
        };

        verifyPayment();
    }, [location, t]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] p-4 font-sans text-gray-800">
            <div className="absolute top-4 right-4"><LanguageToggle /></div>
        <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                
                {status === 'loading' && (
                    <>
                        <Loader2 size={64} className="text-[#F27124] animate-spin mb-6" />
                        <h2 className="text-2xl font-black text-gray-800 mb-2">{t('paymentResult.loadingTitle')}</h2>
                        <p className="text-gray-500 font-medium">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 mb-2">{t('paymentResult.successTitle')}</h2>
                        <p className="text-gray-500 font-medium mb-8">
                            {t('paymentResult.successDesc')}
                        </p>
                        <button 
                            onClick={() => navigate('/orders')}
                            className="w-full bg-[#F27124] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-200 hover:bg-[#D95F1B] transition-colors"
                        >
                            {t('paymentResult.viewPickup')} <ArrowRight size={20} />
                        </button>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                            <XCircle size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 mb-2">{t('paymentResult.failTitle')}</h2>
                        <p className="text-gray-500 font-medium mb-8">
                            {message}<br/>{t('paymentResult.failHint')}
                        </p>
                        <button 
                            onClick={() => navigate('/checkout')}
                            className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors"
                        >
                            {t('paymentResult.backCheckout')}
                        </button>
                    </>
                )}

            </div>
        </div>
    );
};

export default PaymentResult;