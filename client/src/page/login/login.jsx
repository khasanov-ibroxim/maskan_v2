// Login.jsx
import { useState } from 'react';
import api, { authAPI } from '../../utils/api.jsx';
import {Button, Input} from "antd";

const Login = () => {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('🔐 Attempting login...');
            console.log('API URL:', import.meta.env.VITE_API_URL);

            const response = await authAPI.login(credentials);

            console.log('✅ Login successful:', response.data);

            // Session ID'ni saqlash
            if (response.data.sessionId) {
                localStorage.setItem('sessionId', response.data.sessionId);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            // Redirect
            window.location.href = '/';

        } catch (err) {
            console.error('❌ Login error:', err);

            if (err.response) {
                setError(err.response.data?.error || 'Login xatosi');
            } else if (err.request) {
                setError('Serverga ulanib bo\'lmadi. Internetni tekshiring.');
            } else {
                setError('Noma\'lum xato yuz berdi');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin}   style={{
            maxWidth: 350,
            margin: "100px auto",
            padding: 24,
            borderRadius: 12,
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            background: "#fff",
            display:"flex",
            gap:"20px",
            flexDirection:"column"
        }}>
            {error && <div className="error">{error}</div>}

            <Input
                type="text"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({
                    ...credentials,
                    username: e.target.value
                })}
                required
            />

            <Input
                type="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({
                    ...credentials,
                    password: e.target.value
                })}
                required
            />

            <Button type="primary" htmlType="submit" block disabled={loading}>
                {loading ? 'Kirish...' : 'Kirish'}
            </Button>
        </form>
    );
};

export default Login;