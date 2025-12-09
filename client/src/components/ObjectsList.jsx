// client/src/components/ObjectsList.jsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Tooltip } from 'antd';
import {
    FolderOpenOutlined,
    ShopOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    SyncOutlined
} from '@ant-design/icons';
import api from '../utils/api.jsx';
import { DownloadOutlined } from '@ant-design/icons';

const ObjectsList = () => {
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [queueStatus, setQueueStatus] = useState({ queue: [], queueLength: 0 });
    const [postingId, setPostingId] = useState(null);

    useEffect(() => {
        loadObjects();
        loadQueueStatus();
        const interval = setInterval(loadQueueStatus, 300000);
        return () => clearInterval(interval);
    }, []);


    const handleDownloadUploads = async () => {
        try {
            message.loading('Uploads papka yuklanmoqda... (Bu biroz vaqt olishi mumkin)', 0);

            const response = await api.get('/download-uploads-zip', {
                responseType: 'blob',
                timeout: 300000 // 5 daqiqa
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `uploads_backup_${Date.now()}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            message.destroy();
            message.success('Uploads papka muvaffaqiyatli yuklandi! 📦');

        } catch (error) {
            message.destroy();
            console.error('Uploads yuklab olishda xato:', error);
            message.error('Xato: ' + (error.response?.data?.error || error.message));
        }
    };

    const loadObjects = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/excel/objects');
            if (response.data.success) {
                setObjects(response.data.objects);
            }
        } catch (error) {
            console.error('Obyektlarni yuklashda xato:', error);
            message.error('Obyektlarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    const loadQueueStatus = async () => {
        try {
            const response = await api.get('/api/excel/queue-status');
            if (response.data.success) {
                setQueueStatus(response.data);
            }
        } catch (error) {
            console.error('Navbat statusini olishda xato:', error);
        }
    };

    const handlePostAd = async (objectId) => {
        setPostingId(objectId);
        try {
            const response = await api.post('/api/excel/post-ad', { objectId });

            if (response.data.success) {
                message.success(
                    `✅ Elon navbatga qo'shildi! Navbatda: ${response.data.queuePosition}`
                );
                await loadObjects();
                await loadQueueStatus();
            }
        } catch (error) {
            console.error('Elon berishda xato:', error);
            message.error(error.response?.data?.error || 'Elon berishda xato');
        } finally {
            setPostingId(null);
        }
    };

    const openFolder = (url) => {
        if (!url || url === "Yo'q") {
            message.warning('Fayl topilmadi');
            return;
        }
        window.open(url, '_blank');
    };

    const getStatusTag = (status) => {
        const statusConfig = {
            waiting: { color: 'default', icon: <ClockCircleOutlined />, text: 'Kutilmoqda' },
            processing: { color: 'processing', icon: <SyncOutlined spin />, text: 'Jarayonda' },
            posted: { color: 'success', icon: <CheckCircleOutlined />, text: 'Berildi' }
        };

        const config = statusConfig[status] || statusConfig.waiting;
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
    };

    const columns = [
        {
            title: 'Kvartil',
            dataIndex: 'kvartil',
            key: 'kvartil',
            width: 150,
            fixed: 'left'
        },
        {
            title: 'X/E/ET',
            dataIndex: 'xet',
            key: 'xet',
            width: 100
        },
        {
            title: 'M²',
            dataIndex: 'm2',
            key: 'm2',
            width: 80
        },
        {
            title: 'Narx ($)',
            dataIndex: 'narx',
            key: 'narx',
            width: 120,
            render: (narx) => <span style={{ fontWeight: 'bold' }}>{narx}</span>
        },
        {
            title: 'Telefon',
            dataIndex: 'tell',
            key: 'tell',
            width: 140
        },
        {
            title: 'Rieltor',
            dataIndex: 'rieltor',
            key: 'rieltor',
            width: 120
        },
        {
            title: 'Status',
            key: 'status',
            width: 120,
            render: (_, record) => getStatusTag(record.elonStatus)
        },
        {
            title: 'Amallar',
            key: 'actions',
            width: 180,
            fixed: 'right',
            render: (_, record) => {
                const isInQueue = queueStatus.queue.includes(record.id);
                const isPosted = record.elonStatus === 'posted';
                const isPosting = postingId === record.id || isInQueue;

                return (
                    <Space size="small">
                        <Button
                            type="default"
                            size="small"
                            icon={<FolderOpenOutlined />}
                            onClick={() => openFolder(record.rasmlar)}
                            disabled={!record.rasmlar || record.rasmlar === "Yo'q"}
                        />

                        <Button
                            type="primary"
                            size="small"
                            icon={<ShopOutlined />}
                            onClick={() => handlePostAd(record.id)}
                            loading={isPosting}
                            disabled={isPosted || isPosting}
                        >
                            E'lon
                        </Button>
                    </Space>
                );
            }
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadObjects}
                        loading={loading}
                    >
                        Yangilash
                    </Button>

                    {queueStatus.queueLength > 0 && (
                        <Tag color="processing" icon={<SyncOutlined spin />}>
                            Navbatda: {queueStatus.queueLength}
                        </Tag>
                    )}
                </Space>
                <Space style={{marginBottom: 16}}>

                    {/* ✅ YANGI: Uploads Backup */}
                    <Button
                        type="default"
                        icon={<FolderOpenOutlined/>}
                        onClick={handleDownloadUploads}
                        style={{
                            background: '#52c41a',
                            color: 'white',
                            borderColor: '#52c41a'
                        }}
                    >
                        Uploads Papka (ZIP)
                    </Button>
                </Space>
                <div>
                    <span style={{ color: '#666' }}>Jami: </span>
                    <span style={{ fontWeight: 'bold', fontSize: 16 }}>{objects.length}</span>
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={objects}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `Jami: ${total}`
                }}
                scroll={{ x: 1200 }}
                size="small"
            />
        </div>
    );
};

export default ObjectsList;