// Login.jsx
import { useState } from 'react';
import api, { authAPI } from '../../utils/api.jsx';

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
        <form onSubmit={handleLogin}>
            {error && <div className="error">{error}</div>}

            <input
                type="text"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({
                    ...credentials,
                    username: e.target.value
                })}
                required
            />

            <input
                type="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({
                    ...credentials,
                    password: e.target.value
                })}
                required
            />

            <button type="submit" disabled={loading}>
                {loading ? 'Kirish...' : 'Kirish'}
            </button>
        </form>
    );
};

export default Login;