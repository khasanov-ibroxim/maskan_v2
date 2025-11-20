// api.jsx
import axios from 'axios';

// Base URL - Ngrok URL yoki local
const BASE_URL = import.meta.env.VITE_API_URL ;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' // Ngrok uchun
    },
    withCredentials: true // Session cookies uchun
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Session ID'ni headerga qo'shish
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            config.headers['x-session-id'] = sessionId;
        }

        console.log('📤 Request:', config.method.toUpperCase(), config.url);
        return config;
    },
    (error) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log('✅ Response:', response.status, response.config.url);
        return response;
    },
    (error) => {
        if (error.response) {
            console.error('❌ Response error:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('❌ Network error:', error.message);
        } else {
            console.error('❌ Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/api/auth/login', credentials),
    logout: () => api.post('/api/auth/logout'),
    getMe: () => api.get('/api/auth/me')
};