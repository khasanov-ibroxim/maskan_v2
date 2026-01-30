import { useState, useEffect } from 'react';
import api from '../utils/api';

// Type definitions
interface Realtor {
    id: number;
    username: string;
    full_name: string;
    role: string;
}

interface SettingItem {
    id: number;
    value: string;
}

interface Settings {
    uy_turi?: SettingItem[];
    planirovka?: SettingItem[];
    xolati?: SettingItem[];
    torets?: SettingItem[];
    balkon?: SettingItem[];
}

interface CascaderOption {
    value: string;
    label: string;
    children?: CascaderOption[];
}

// Realtor'larni yuklash hook'i
export const useRealtors = () => {
    const [realtors, setRealtors] = useState<Realtor[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const loadRealtors = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('📥 Realtor\'lar yuklanmoqda...');
            const response = await api.get('/api/users/realtors');

            if (response.data.success) {
                setRealtors(response.data.realtors);
                console.log('✅ Realtor\'lar yuklandi:', response.data.realtors.length);
            } else {
                throw new Error(response.data.error || 'Xato yuz berdi');
            }
        } catch (err) {
            console.error('❌ Realtor\'larni yuklashda xato:', err);
            setError('Realtor\'larni yuklashda xato');
            setRealtors([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRealtors();
    }, []);

    return { realtors, loading, error, reload: loadRealtors };
};

// Settings yuklash hook'i
export const useSettings = () => {
    const [settings, setSettings] = useState<Settings>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const loadSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/settings');
            if (response.data.success) {
                setSettings(response.data.data);
                console.log('✅ Settings yuklandi:', response.data.data);
            }
        } catch (err) {
            console.error('❌ Settings yuklashda xato:', err);
            setError('Sozlamalarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    return { settings, loading, error, reload: loadSettings };
};

// Cascader data (Tuman -> Kvartil) yuklash hook'i
export const useCascaderData = () => {
    const [cascaderData, setCascaderData] = useState<CascaderOption[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const loadCascaderData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('📥 Cascader data yuklanmoqda...');
            const response = await api.get('/api/settings/cascader');

            if (response.data.success) {
                setCascaderData(response.data.data);
                console.log('✅ Cascader yuklandi:', response.data.data);
            } else {
                throw new Error(response.data.error || 'Xato yuz berdi');
            }
        } catch (err) {
            console.error('❌ Cascader yuklashda xato:', err);
            setError('Tuman va kvartillarni yuklashda xato');
            setCascaderData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCascaderData();
    }, []);

    return { cascaderData, loading, error, reload: loadCascaderData };
};

// User data hook'i
interface UserData {
    username: string;
    fullName?: string;
    full_name?: string;
    role: string;
}

export const useUserData = () => {
    const [userData, setUserData] = useState<UserData | null>(null);

    useEffect(() => {
        const data = localStorage.getItem('userData');
        if (data) {
            try {
                setUserData(JSON.parse(data));
            } catch (err) {
                console.error('UserData parse error:', err);
            }
        }
    }, []);

    return userData;
};