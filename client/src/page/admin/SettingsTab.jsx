import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, message, Space, Popconfirm, InputNumber, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../../utils/api';

const { TabPane } = Tabs;

const categories = [
    { key: 'kvartil', label: '📍 Kvartil', description: 'Tumanlar ro\'yxati' },
    { key: 'balkon', label: '🏗️ Balkon', description: 'Balkon turlari' },
    { key: 'uy_turi', label: '🏠 Uy turi', description: 'Bino turlari' },
    { key: 'planirovka', label: '📐 Planirovka', description: 'Uy rejasi turlari' },
    { key: 'xolati', label: '🔧 Xolati', description: 'Ta\'mir holati' },
    { key: 'torets', label: '🚗 Torets', description: 'Parkovka turlari' }
];

const SettingsTab = () => {
    const [settings, setSettings] = useState({});
    const [globalConfig, setGlobalConfig] = useState({
        telegram_bot_token: '',
        glavniy_app_script_url: '',
        company_phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentCategory, setCurrentCategory] = useState('kvartil');
    const [form] = Form.useForm();

    useEffect(() => {
        loadSettings();
        loadGlobalConfig();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/settings');
            if (response.data.success) {
                setSettings(response.data.data);
            }
        } catch (error) {
            message.error('Sozlamalarni yuklashda xato');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadGlobalConfig = async () => {
        try {
            const response = await api.get('/api/settings/global-config');
            if (response.data.success) {
                setGlobalConfig({
                    telegram_bot_token: response.data.data.telegram_bot_token || '',
                    glavniy_app_script_url: response.data.data.glavniy_app_script_url || '',
                    company_phone: response.data.data.company_phone || ''
                });
            }
        } catch (error) {
            console.error('Global config yuklashda xato:', error);
        }
    };

    const handleGlobalConfigChange = (field, value) => {
        setGlobalConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePhoneChange = (e) => {
        let input = e.target.value.replace(/\D/g, '');

        if (!input.startsWith('998')) {
            if (input.length > 0) {
                input = '998' + input;
            } else {
                input = '998';
            }
        }

        input = input.substring(0, 12);
        const formatted = input.length > 0 ? '+' + input : '';

        handleGlobalConfigChange('company_phone', formatted);
    };

    const handleGlobalConfigSave = async () => {
        // Validatsiya
        if (!globalConfig.telegram_bot_token) {
            message.error('Telegram Bot Token kiriting!');
            return;
        }
        if (!globalConfig.glavniy_app_script_url) {
            message.error('Glavniy App Script URL kiriting!');
            return;
        }
        if (!globalConfig.company_phone || !/^\+998\d{9}$/.test(globalConfig.company_phone)) {
            message.error('Telefon raqamini to\'g\'ri formatda kiriting (+998XXXXXXXXX)');
            return;
        }

        try {
            const response = await api.put('/api/settings/global-config', globalConfig);
            if (response.data.success) {
                message.success('Global sozlamalar saqlandi!');
                loadGlobalConfig();
            }
        } catch (error) {
            message.error('Saqlashda xato');
            console.error(error);
        }
    };

    const handleAdd = (category) => {
        setCurrentCategory(category);
        setEditingItem(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (item, category) => {
        setCurrentCategory(category);
        setEditingItem(item);
        form.setFieldsValue({
            value: item.value,
            displayOrder: item.display_order
        });
        setModalVisible(true);
    };

    const handleDelete = async (id, category) => {
        try {
            await api.delete(`/api/settings/${id}`);
            message.success('O\'chirildi');
            loadSettings();
        } catch (error) {
            message.error('O\'chirishda xato');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingItem) {
                await api.put(`/api/settings/${editingItem.id}`, values);
                message.success('Yangilandi');
            } else {
                await api.post('/api/settings', {
                    category: currentCategory,
                    ...values
                });
                message.success('Qo\'shildi');
            }
            setModalVisible(false);
            loadSettings();
        } catch (error) {
            message.error(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const columns = (category) => [
        {
            title: 'Qiymat',
            dataIndex: 'value',
            key: 'value',
            width: '60%'
        },
        {
            title: 'Tartib',
            dataIndex: 'display_order',
            key: 'display_order',
            width: '20%',
            render: (order) => <span style={{ color: '#888' }}>{order}</span>
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: '20%',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record, category)}
                    >
                        Tahrirlash
                    </Button>
                    <Popconfirm
                        title="O'chirmoqchimisiz?"
                        onConfirm={() => handleDelete(record.id, category)}
                        okText="Ha"
                        cancelText="Yo'q"
                    >
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                        >
                            O'chirish
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Card>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>⚙️ Sozlamalar</h2>
                <p style={{ color: '#666', marginTop: 8 }}>
                    Tizim sozlamalari va form tanlovlari
                </p>
            </div>

            {/* ✅ GLOBAL CONFIG SECTION */}
            <Card
                style={{ marginBottom: 24, background: '#f6f8fa' }}
                title={
                    <span>
                        <SettingOutlined /> Global Sozlamalar
                    </span>
                }
            >
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        🤖 Telegram Bot Token
                    </label>
                    <Input.Password
                        value={globalConfig.telegram_bot_token}
                        onChange={(e) => handleGlobalConfigChange('telegram_bot_token', e.target.value)}
                        placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                        style={{ fontFamily: 'monospace' }}
                        autoComplete="off"
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        📊 Glavniy App Script URL
                    </label>
                    <Input
                        value={globalConfig.glavniy_app_script_url}
                        onChange={(e) => handleGlobalConfigChange('glavniy_app_script_url', e.target.value)}
                        placeholder="https://script.google.com/macros/s/YOUR_SCRIPT/exec"
                        style={{ fontFamily: 'monospace' }}
                        autoComplete="off"
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        📱 Kompaniya Telefon Raqami
                    </label>
                    <Input
                        value={globalConfig.company_phone}
                        onChange={handlePhoneChange}
                        placeholder="+998970850604"
                        maxLength={13}
                        autoComplete="off"
                    />
                </div>

                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    size="large"
                    onClick={handleGlobalConfigSave}
                >
                    Global Sozlamalarni Saqlash
                </Button>

                <Divider />

                <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
                    <h4 style={{ marginTop: 0 }}>💡 Ma'lumot:</h4>
                    <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                        <li><strong>Telegram Bot Token:</strong> Telegram xabarlari uchun bot tokeni</li>
                        <li><strong>Glavniy App Script URL:</strong> Asosiy Google Sheets uchun script URL</li>
                        <li><strong>Kompaniya Telefon:</strong> Oddiy rieltor uchun ishlatiladi (individual rieltor o'z telefonini ishlatadi)</li>
                    </ul>
                </div>
            </Card>

            {/* ✅ EXISTING CATEGORY SETTINGS */}
            <Tabs defaultActiveKey="kvartil">
                {categories.map(cat => (
                    <TabPane tab={cat.label} key={cat.key}>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{cat.label}</h3>
                                <p style={{ color: '#888', margin: 0 }}>{cat.description}</p>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => handleAdd(cat.key)}
                            >
                                Yangi qo'shish
                            </Button>
                        </div>

                        <Table
                            columns={columns(cat.key)}
                            dataSource={settings[cat.key] || []}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                pageSize: 20,
                                showTotal: (total) => `Jami: ${total}`,
                                showSizeChanger: true
                            }}
                        />
                    </TabPane>
                ))}
            </Tabs>

            <Modal
                title={editingItem ? '✏️ Tahrirlash' : '➕ Yangi qo\'shish'}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="value"
                        label="Qiymat"
                        rules={[
                            { required: true, message: 'Qiymat kiriting!' },
                            { min: 1, message: 'Kamida 1 ta belgi' }
                        ]}
                    >
                        <Input placeholder="Masalan: Yunusobod - 20" />
                    </Form.Item>

                    <Form.Item
                        name="displayOrder"
                        label="Tartib raqami"
                        rules={[{ required: true, message: 'Tartib kiriting!' }]}
                        initialValue={0}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            placeholder="0"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => {
                                setModalVisible(false);
                                form.resetFields();
                            }}>
                                Bekor qilish
                            </Button>
                            <Button type="primary" htmlType="submit">
                                {editingItem ? 'Yangilash' : 'Qo\'shish'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default SettingsTab;