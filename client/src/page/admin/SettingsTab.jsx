import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, message, Space, Popconfirm, InputNumber, Divider, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, SaveOutlined, MessageOutlined } from '@ant-design/icons';
import api from '../../utils/api';

const { TabPane } = Tabs;
const { Option } = Select;

const categories = [
    { key: 'balkon', label: '🏗️ Balkon', description: 'Balkon turlari' },
    { key: 'uy_turi', label: '🏠 Uy turi', description: 'Bino turlari' },
    { key: 'planirovka', label: '📐 Planirovka', description: 'Uy rejasi turlari' },
    { key: 'xolati', label: '🔧 Xolati', description: 'Ta\'mir holati' },
    { key: 'torets', label: '🚗 Torets', description: 'Parkovka turlari' }
];

const SettingsTab = () => {
    const [settings, setSettings] = useState({});
    const [telegramChats, setTelegramChats] = useState([]);
    const [cascaderData, setCascaderData] = useState([]);
    const [tumanList, setTumanList] = useState([]);
    const [globalConfig, setGlobalConfig] = useState({
        telegram_bot_token: '',
        glavniy_app_script_url: '',
        company_phone: '',
        default_telegram_chat_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [chatModalVisible, setChatModalVisible] = useState(false);
    const [kvartilModalVisible, setKvartilModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editingChat, setEditingChat] = useState(null);
    const [editingKvartil, setEditingKvartil] = useState(null);
    const [currentCategory, setCurrentCategory] = useState('kvartil');
    const [form] = Form.useForm();
    const [chatForm] = Form.useForm();
    const [kvartilForm] = Form.useForm();

    useEffect(() => {
        loadSettings();
        loadGlobalConfig();
        loadTelegramChats();
        loadCascaderData();
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
                    company_phone: response.data.data.company_phone || '',
                    default_telegram_chat_id: response.data.data.default_telegram_chat_id || ''
                });
            }
        } catch (error) {
            console.error('Global config yuklashda xato:', error);
        }
    };

    const loadTelegramChats = async () => {
        try {
            const response = await api.get('/api/telegram-chats');
            if (response.data.success) {
                setTelegramChats(response.data.data);
            }
        } catch (error) {
            console.error('Telegram chatlar yuklashda xato:', error);
        }
    };

    const loadCascaderData = async () => {
        try {
            const response = await api.get('/api/settings/cascader');
            if (response.data.success) {
                setCascaderData(response.data.data);

                const tumans = response.data.data.map(item => ({
                    id: item.id,
                    value: item.value,
                    label: item.label
                }));
                setTumanList(tumans);

                console.log('✅ Cascader data yuklandi:', response.data.data);
            }
        } catch (error) {
            console.error('Cascader yuklashda xato:', error);
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
        if (!globalConfig.default_telegram_chat_id) {
            message.error('Default Telegram Chat ID kiriting!');
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

    const handleAddChat = () => {
        setEditingChat(null);
        chatForm.resetFields();
        setChatModalVisible(true);
    };

    const handleEditChat = (chat) => {
        setEditingChat(chat);
        chatForm.setFieldsValue({
            chatName: chat.chat_name,
            chatId: chat.chat_id,
            displayOrder: chat.display_order
        });
        setChatModalVisible(true);
    };

    const handleDeleteChat = async (chatId) => {
        try {
            await api.delete(`/api/telegram-chats/${chatId}`);
            message.success('Chat o\'chirildi');
            loadTelegramChats();
        } catch (error) {
            message.error('O\'chirishda xato');
        }
    };

    const handleSubmitChat = async (values) => {
        try {
            if (editingChat) {
                await api.put(`/api/telegram-chats/${editingChat.id}`, values);
                message.success('Chat yangilandi');
            } else {
                await api.post('/api/telegram-chats', values);
                message.success('Chat qo\'shildi');
            }
            setChatModalVisible(false);
            chatForm.resetFields();
            loadTelegramChats();
        } catch (error) {
            message.error(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const handleAddKvartil = () => {
        setEditingKvartil(null);
        kvartilForm.resetFields();
        setKvartilModalVisible(true);
    };

    const handleEditKvartil = (item) => {
        setEditingKvartil(item);
        kvartilForm.setFieldsValue({
            value: item.value,
            displayOrder: item.display_order,
            parentId: item.parent_id
        });
        setKvartilModalVisible(true);
    };

    const handleDeleteKvartil = async (id) => {
        try {
            await api.delete(`/api/settings/${id}`);
            message.success('O\'chirildi');
            loadCascaderData();
        } catch (error) {
            message.error('O\'chirishda xato');
        }
    };

    const handleSubmitKvartil = async (values) => {
        try {
            if (editingKvartil) {
                await api.put(`/api/settings/${editingKvartil.id}`, {
                    value: values.value,
                    displayOrder: values.displayOrder,
                    parentId: values.parentId
                });
                message.success('Yangilandi');
            } else {
                await api.post('/api/settings', {
                    category: 'kvartil',
                    value: values.value,
                    displayOrder: values.displayOrder,
                    parentId: values.parentId
                });
                message.success('Qo\'shildi');
            }
            setKvartilModalVisible(false);
            kvartilForm.resetFields();
            loadCascaderData();
        } catch (error) {
            message.error(error.response?.data?.error || 'Xato yuz berdi');
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

    const categoryColumns = (category) => [
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
                        <Button danger size="small" icon={<DeleteOutlined />}>
                            O'chirish
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const kvartilColumns = [
        {
            title: 'Tuman / Kvartil',
            dataIndex: 'value',
            key: 'value',
            width: '50%',
            render: (value, record) => {
                if (record.parent_id) {
                    return <span style={{ paddingLeft: 24 }}>↳ {value}</span>;
                }
                return <strong>{value}</strong>;
            }
        },
        {
            title: 'Turi',
            key: 'type',
            width: '15%',
            render: (_, record) => (
                <Tag color={record.parent_id ? 'blue' : 'green'}>
                    {record.parent_id ? 'Kvartil' : 'Tuman'}
                </Tag>
            )
        },
        {
            title: 'Tartib',
            dataIndex: 'display_order',
            key: 'display_order',
            width: '15%',
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
                        onClick={() => handleEditKvartil(record)}
                    >
                        Tahrirlash
                    </Button>
                    <Popconfirm
                        title="O'chirmoqchimisiz?"
                        onConfirm={() => handleDeleteKvartil(record.id)}
                        okText="Ha"
                        cancelText="Yo'q"
                    >
                        <Button danger size="small" icon={<DeleteOutlined />}>
                            O'chirish
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const chatColumns = [
        {
            title: 'Chat Nomi',
            dataIndex: 'chat_name',
            key: 'chat_name',
            width: '30%',
            render: (name) => <Tag color="blue"><MessageOutlined /> {name}</Tag>
        },
        {
            title: 'Chat ID',
            dataIndex: 'chat_id',
            key: 'chat_id',
            width: '30%',
            render: (id) => <code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>{id}</code>
        },
        {
            title: 'Tartib',
            dataIndex: 'display_order',
            key: 'display_order',
            width: '15%',
            render: (order) => <span style={{ color: '#888' }}>{order}</span>
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: '25%',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditChat(record)}
                    >
                        Tahrirlash
                    </Button>
                    <Popconfirm
                        title="O'chirmoqchimisiz?"
                        onConfirm={() => handleDeleteChat(record.id)}
                        okText="Ha"
                        cancelText="Yo'q"
                    >
                        <Button danger size="small" icon={<DeleteOutlined />}>
                            O'chirish
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const getFlattenedKvartilData = () => {
        const flattened = [];

        cascaderData.forEach(tuman => {
            flattened.push({
                id: tuman.id,
                value: tuman.value,
                display_order: 0,
                parent_id: null
            });

            if (tuman.children) {
                tuman.children.forEach(kvartil => {
                    flattened.push({
                        id: kvartil.id,
                        value: kvartil.value,
                        display_order: 0,
                        parent_id: tuman.id
                    });
                });
            }
        });

        return flattened;
    };

    return (
        <Card>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>⚙️ Sozlamalar</h2>
                <p style={{ color: '#666', marginTop: 8 }}>
                    Tizim sozlamalari va form tanlovlari
                </p>
            </div>

            <Card
                style={{ marginBottom: 24, background: '#f6f8fa' }}
                title={<span><SettingOutlined /> Global Sozlamalar</span>}
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

                <div style={{ marginBottom: 16 }}>
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

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        💬 Default Telegram Chat ID
                    </label>
                    <Input
                        value={globalConfig.default_telegram_chat_id}
                        onChange={(e) => handleGlobalConfigChange('default_telegram_chat_id', e.target.value)}
                        placeholder="-1003298985470"
                        autoComplete="off"
                    />
                    <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                        Agar rielterga chat biriktirilmagan bo'lsa, bu chatga yuboriladi
                    </p>
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
                        <li><strong>Kompaniya Telefon:</strong> Oddiy rieltor uchun ishlatiladi</li>
                        <li><strong>Default Chat ID:</strong> Asosiy Telegram chat</li>
                    </ul>
                </div>
            </Card>

            <Tabs defaultActiveKey="chats">
                <TabPane tab={<span><MessageOutlined /> Telegram Chatlar</span>} key="chats">
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>💬 Telegram Guruh Chatlari</h3>
                            <p style={{ color: '#888', margin: 0 }}>Xabarlar uchun Telegram chatlar</p>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddChat}>
                            Yangi Chat Qo'shish
                        </Button>
                    </div>

                    <Table
                        columns={chatColumns}
                        dataSource={telegramChats}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 10, showTotal: (total) => `Jami: ${total}`, showSizeChanger: true }}
                    />
                </TabPane>

                <TabPane tab={<span>📍 Tuman va Kvartillar</span>} key="kvartil">
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>📍 Tuman va Kvartillar</h3>
                            <p style={{ color: '#888', margin: 0 }}>
                                Avval TUMAN yarating, keyin unga KVARTILLAR qo'shing
                            </p>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddKvartil}>
                            Yangi Qo'shish
                        </Button>
                    </div>

                    <Table
                        columns={kvartilColumns}
                        dataSource={getFlattenedKvartilData()}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 20, showTotal: (total) => `Jami: ${total}`, showSizeChanger: true }}
                    />
                </TabPane>

                {categories.map(cat => (
                    <TabPane tab={cat.label} key={cat.key}>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{cat.label}</h3>
                                <p style={{ color: '#888', margin: 0 }}>{cat.description}</p>
                            </div>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(cat.key)}>
                                Yangi qo'shish
                            </Button>
                        </div>

                        <Table
                            columns={categoryColumns(cat.key)}
                            dataSource={settings[cat.key] || []}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 20, showTotal: (total) => `Jami: ${total}`, showSizeChanger: true }}
                        />
                    </TabPane>
                ))}
            </Tabs>

            <Modal
                title={editingChat ? '✏️ Chat Tahrirlash' : '➕ Yangi Chat Qo\'shish'}
                open={chatModalVisible}
                onCancel={() => { setChatModalVisible(false); chatForm.resetFields(); }}
                footer={null}
                width={500}
            >
                <Form form={chatForm} layout="vertical" onFinish={handleSubmitChat}>
                    <Form.Item name="chatName" label="Chat Nomi" rules={[{ required: true, message: 'Chat nomini kiriting!' }, { min: 2, message: 'Kamida 2 ta belgi' }]}>
                        <Input placeholder="Masalan: Marketing Chat" />
                    </Form.Item>
                    <Form.Item name="chatId" label="Chat ID" rules={[{ required: true, message: 'Chat ID kiriting!' }, { pattern: /^-?\d+$/, message: 'Faqat raqamlar' }]}>
                        <Input placeholder="-1003298985470" />
                    </Form.Item>
                    <Form.Item name="displayOrder" label="Tartib raqami" rules={[{ required: true, message: 'Tartib kiriting!' }]} initialValue={0}>
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => { setChatModalVisible(false); chatForm.resetFields(); }}>Bekor qilish</Button>
                            <Button type="primary" htmlType="submit">{editingChat ? 'Yangilash' : 'Qo\'shish'}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingKvartil ? '✏️ Tahrirlash' : '➕ Yangi Qo\'shish'}
                open={kvartilModalVisible}
                onCancel={() => { setKvartilModalVisible(false); kvartilForm.resetFields(); }}
                footer={null}
                width={500}
            >
                <Form form={kvartilForm} layout="vertical" onFinish={handleSubmitKvartil}>
                    <Form.Item name="value" label="Nomi" rules={[{ required: true, message: 'Nomini kiriting!' }, { min: 1, message: 'Kamida 1 ta belgi' }]}>
                        <Input placeholder="Masalan: Yunusobod yoki Yunusobod - 1" />
                    </Form.Item>
                    <Form.Item name="parentId" label="Turi" extra={<span style={{ fontSize: 12, color: '#666' }}>Bo'sh qoldiring = TUMAN, Tanlang = KVARTIL</span>}>
                        <Select placeholder="Tuman tanlang (Kvartil bo'lsa)" allowClear>
                            {tumanList.map(tuman => (
                                <Option key={tuman.id} value={tuman.id}>{tuman.value}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="displayOrder" label="Tartib raqami" rules={[{ required: true, message: 'Tartib kiriting!' }]} initialValue={0}>
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => { setKvartilModalVisible(false); kvartilForm.resetFields(); }}>Bekor qilish</Button>
                            <Button type="primary" htmlType="submit">{editingKvartil ? 'Yangilash' : 'Qo\'shish'}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingItem ? '✏️ Tahrirlash' : '➕ Yangi qo\'shish'}
                open={modalVisible}
                onCancel={() => { setModalVisible(false); form.resetFields(); }}
                footer={null}
                width={500}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="value" label="Qiymat" rules={[{ required: true, message: 'Qiymat kiriting!' }, { min: 1, message: 'Kamida 1 ta belgi' }]}>
                        <Input placeholder="Masalan: Yunusobod - 20" />
                    </Form.Item>
                    <Form.Item name="displayOrder" label="Tartib raqami" rules={[{ required: true, message: 'Tartib kiriting!' }]} initialValue={0}>
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => { setModalVisible(false); form.resetFields(); }}>Bekor qilish</Button>
                            <Button type="primary" htmlType="submit">{editingItem ? 'Yangilash' : 'Qo\'shish'}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default SettingsTab;