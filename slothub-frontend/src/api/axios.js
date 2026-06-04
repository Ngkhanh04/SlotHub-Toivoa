import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Đảm bảo cổng này khớp với Backend của bạn
});

// Tự động đính kèm Token khi gọi API
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;