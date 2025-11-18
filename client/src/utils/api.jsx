// src/utils/api.jsx
import axios from 'axios';
import { message } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

console.log('🌐 API URL:', API_URL);

// Axios instance yaratish
const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 soniya
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // CORS uchun muhim!
});

// Request interceptor - har bir so'rovga sessionId qo'shish
api.interceptors.request.use(
    (config) => {
        const sessionId = localStorage.getItem('sessionId');

        if (sessionId) {
            config.headers['x-session-id'] = sessionId;
            console.log('📤 Request:', config.method?.toUpperCase(), config.url, '(Session ID qo\'shildi)');
        } else {
            console.log('📤 Request:', config.method?.toUpperCase(), config.url, '(Session ID yo\'q)');
        }

        return config;
    },
    (error) => {
        console.error('❌ Request interceptor xato:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - xatolarni tutish
api.interceptors.response.use(
    (response) => {
        // Success response
        console.log('✅ Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
        return response;
    },
    (error) => {
        const currentPath = window.location.pathname;

        // Network xatolari (server ishlamayapti)
        if (!error.response) {
            console.error('🌐 Network xatosi:', error.message);

            if (error.code === 'ECONNABORTED') {
                message.error('Request timeout! Server javob bermadi.');
            } else if (error.code === 'ERR_NETWORK') {
                message.error('Serverga ulanib bo\'lmadi! Backend ishga tushganligini tekshiring.');
            } else {
                message.error('Network xatosi. Internetni tekshiring!');
            }

            return Promise.reject(error);
        }

        const { status, data } = error.response;
        console.error(`❌ Response xato [${status}]:`, error.config.url, data);

        // 401 - Autentifikatsiya xatosi
        if (status === 401) {
            console.log('🔒 401 xato: Autentifikatsiya talab qilinadi');

            // Agar login sahifasida bo'lmasa
            if (currentPath !== '/login') {
                localStorage.removeItem('sessionId');
                localStorage.removeItem('userData');

                const errorMsg = data?.error || 'Session tugagan. Qaytadan kiring!';
                message.error(errorMsg);

                // Timeout bilan redirect qilish
                setTimeout(() => {
                    console.log('🔄 Login sahifasiga yo\'naltirilmoqda...');
                    window.location.href = '/login';
                }, 1500);
            }
        }

        // 403 - Ruxsat yo'q
        else if (status === 403) {
            const errorMsg = data?.error || 'Bu amalni bajarish uchun ruxsatingiz yo\'q!';
            message.error(errorMsg);
        }

        // 404 - Topilmadi
        else if (status === 404) {
            const errorMsg = data?.error || 'Ma\'lumot topilmadi!';
            message.error(errorMsg);
        }

        // 400 - Bad request
        else if (status === 400) {
            const errorMsg = data?.error || 'Noto\'g\'ri so\'rov!';
            message.error(errorMsg);
        }

        // 500 - Server xatosi
        else if (status === 500) {
            const errorMsg = data?.error || 'Server xatosi yuz berdi!';
            message.error(errorMsg);
        }

        // Boshqa xatolar
        else {
            const errorMsg = data?.error || `Xatolik yuz berdi (${status})`;
            message.error(errorMsg);
        }

        return Promise.reject(error);
    }
);

export default api;