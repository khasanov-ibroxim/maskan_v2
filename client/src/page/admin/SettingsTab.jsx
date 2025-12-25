import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, message, Space, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
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
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentCategory, setCurrentCategory] = useState('kvartil');
    const [form] = Form.useForm();

    useEffect(() => {
        loadSettings();
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
                    Form'dagi barcha tanlov qiymatlarini boshqaring
                </p>
            </div>

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