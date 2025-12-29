import React, { useEffect, useState } from "react";
import {
    Form,
    Input,
    Button,
    Select,
    message,
    Row,
    Col,
    InputNumber,
    Progress,
    Upload,
    Alert,
    Spin,
} from "antd";
import { InboxOutlined, WifiOutlined, DisconnectOutlined } from "@ant-design/icons";
import axios from "axios";
import "./form_maskan.css"
import api from '../../utils/api.jsx';
import {getRealtors} from "../../utils/api.jsx";

const { Option } = Select;

// SERVER URL
const SERVER_URL = import.meta.env.VITE_API_URL;


/* ----------------- helper functions ----------------- */

const compressImage = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                let width = img.width;
                let height = img.height;
                const maxSize = 800;
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error("Blob yaratilmadi"));
                        resolve(blob);
                    },
                    "image/webp",
                    0.7
                );
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const formatDateToDDMMYYYY = (isoDate) => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const simulateProgress = (setter, duration = 2000) =>
    new Promise((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setter(Math.min(progress, 90));
            if (progress >= 90) {
                clearInterval(interval);
                resolve();
            }
        }, duration / 10);
    });

/* ----------------- main component ----------------- */

const FormMaskan = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileList, setFileList] = useState([]);
    const [realtors, setRealtors] = useState([]);
    const [loadingRealtors, setLoadingRealtors] = useState(false);
    const [settings, setSettings] = useState({});
    const [loadingSettings, setLoadingSettings] = useState(false);


    useEffect(() => {
        const userData =
            localStorage.getItem("userData") || sessionStorage.getItem("userData");
        if (!userData) {
            message.warning("Iltimos, tizimga kiring!");
            window.location.href = "/login";
        }

        loadRealtors();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoadingSettings(true);
        try {
            const response = await api.get('/api/settings');
            if (response.data.success) {
                setSettings(response.data.data);
                console.log('✅ Settings yuklandi:', response.data.data);
            }
        } catch (error) {
            console.error('❌ Settings yuklashda xato:', error);
            message.error('Sozlamalarni yuklashda xato');
        } finally {
            setLoadingSettings(false);
        }
    };
    // ✅ Realtor'larni serverdan yuklash
    const loadRealtors = async () => {
        setLoadingRealtors(true);
        try {
            console.log('📥 Realtor\'lar yuklanmoqda...');

            // ✅ Yangi endpoint
            const response = await api.get('/api/users/realtors');
            console.log(response)
            if (response.data.success) {
                setRealtors(response.data.realtors);
                console.log('✅ Realtor\'lar yuklandi:', response.data.realtors.length);

                if (response.data.realtors.length === 0) {
                    message.warning('⚠️ Hozircha realtor\'lar mavjud emas');
                }
            } else {
                throw new Error(response.data.error || 'Xato yuz berdi');
            }
        } catch (error) {
            console.error('❌ Realtor\'larni yuklashda xato:', error);
            message.error('Realtor\'larni yuklashda xato. Iltimos, sahifani yangilang.');
            setRealtors([]);
        } finally {
            setLoadingRealtors(false);
        }
    };


    useEffect(() => {
        const savedSheet = localStorage.getItem("selectedSheetName");
        const savedSheetType = localStorage.getItem("selectedSheetType");
        if (savedSheet) {
            form.setFieldsValue({ sheetName: savedSheet, sheetType: savedSheetType });
        }
    }, [form]);

    const onFinish = async (values) => {

        setLoading(true);
        setUploadProgress(0);

        try {
            // 1) Build standard fields
            const now = new Date();
            const currentDateTime = `${String(now.getDate()).padStart(2, "0")}.${String(
                now.getMonth() + 1
            ).padStart(2, "0")}.${now.getFullYear()} ${String(now.getHours()).padStart(
                2,
                "0"
            )}:${String(now.getMinutes()).padStart(2, "0")}`;

            const xet = `${values.xona}/${values.etaj}/${values.etajnost}`;

            let osmotir = "";
            if (values.osmotir_sana || values.osmotir_vaqt) {
                const sana = values.osmotir_sana
                    ? formatDateToDDMMYYYY(values.osmotir_sana)
                    : "";
                const vaqt = values.osmotir_vaqt || "";
                osmotir = (sana + (sana && vaqt ? " " : "") + vaqt).trim();
            }

            // 2) Compress images to base64
            const rasmlar = fileList || [];
            const rasmlarBase64 = await Promise.all(
                rasmlar.map(async (f) => {
                    if (f.base64) return f.base64;
                    if (f.originFileObj) {
                        const blob = await compressImage(f.originFileObj);
                        const b64 = await blobToBase64(blob);
                        f.base64 = b64;
                        return b64;
                    }
                    return null;
                })
            );

            // 3) Prepare data
            const userData = (() => {
                try {
                    const u = localStorage.getItem("userData");
                    return u ? JSON.parse(u) : null;
                } catch {
                    return null;
                }
            })();
            const xodim = userData?.username || "";

            const dataToSend = {
                sheetName: values.sheetName.replace(/\s*xona\s*/gi, '').trim(),
                sheetType: values.sheetType,
                kvartil: values.kvartil,
                xet,
                tell: values.tell,
                m2: values.m2 || "",
                opisaniya: values.opisaniya || "",
                narx: values.narx || "",
                fio: values.fio || "",
                id: values.id || "",
                rieltor: values.rieltor,
                sana: currentDateTime,
                xodim,
                rasmlar: rasmlarBase64.filter(Boolean),
                uy_turi: values.uy_turi || "",
                planirovka: values.planirovka || "",
                xolati: values.xolati || "",
                torets: values.torets || "",
                balkon: values.balkon || "",
                osmotir: osmotir || "",
                dom: values.dom || "",
                kvartira: values.kvartira || "",
            };

            console.log("📤 Serverga yuborilmoqda:", dataToSend);

            // 4) Send to Node.js server
            const formData = new FormData();
            formData.append("data", JSON.stringify(dataToSend));
            rasmlar.forEach((f) => {
                if (f.originFileObj) formData.append("images", f.originFileObj);
            });

            const progressPromise = simulateProgress(setUploadProgress, 1500);

            const serverResponse = await axios.post(`${SERVER_URL}/api/send-data`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 60000,
            });

            await progressPromise;
            setUploadProgress(100);

            console.log("✅ Server javobi:", serverResponse.data);

            if (serverResponse.data.success) {
                message.success("✅ Ma'lumotlar muvaffaqiyatli yuborildi!");
                message.info("📊 Ma'lumotlar navbatda qayta ishlanmoqda (Telegram, Excel)");
            } else {
                message.error("❌ Server xatosi: " + (serverResponse.data.error || "Noma'lum xato"));
            }

            // Reset form
            form.resetFields();
            setFileList([]);

            const savedSheet = localStorage.getItem("selectedSheetName");
            const savedSheetType = localStorage.getItem("selectedSheetType");
            if (savedSheet) {
                form.setFieldsValue({ sheetName: savedSheet, sheetType: savedSheetType });
            }

            setTimeout(() => setUploadProgress(0), 1500);

        } catch (err) {
            console.error("❌ Xatolik:", err);

            if (err.response) {
                message.error(`❌ Server xatosi: ${err.response.data?.error || err.message}`);
            } else if (err.request) {
                message.error("❌ Server javob bermadi. Internetni tekshiring!");
            } else {
                message.error(`❌ Xatolik: ${err.message}`);
            }

            setUploadProgress(0);
        } finally {
            setLoading(false);
        }
    };

    const uploadProps = {
        multiple: true,
        accept: "image/*",
        beforeUpload: () => false, // avtomatik upload bloklanadi
        onChange: ({ fileList: newList }) => {
            if (newList.length > 10) {
                message.warning("Maksimal 10 ta rasm yuklaysiz!");
                newList = newList.slice(0, 10); // ortiqchasini kesib tashlaymiz
            }
            setFileList(newList);
        },
        fileList,
        listType: "picture",
    };


    const handleSheetChange = (value) => {
        localStorage.setItem("selectedSheetName", value);
        form.setFieldsValue({ sheetName: value });
    };

    const handleSheetTypeChange = (value) => {
        localStorage.setItem("selectedSheetType", value);
        form.setFieldsValue({ sheetType: value });
    };


    return (
        <div className={"form_maskan"}>
            <div
                style={{
                    maxWidth: 500,
                    margin: "40px auto",
                    padding: 24,
                    borderRadius: 16,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    background: "#fff",
                }}
            >
                <h2 style={{textAlign: "center", marginBottom: 20}}>🏠 Uy ma'lumotlari</h2>


                <Form form={form} autoComplete="off" layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Sotuv yoki Ijara"
                        name="sheetType"
                        rules={[{required: true, message: "Turini tanlang!"}]}
                    >
                        <Select placeholder="Turini tanlang" onChange={handleSheetTypeChange}>
                            <Option value="Sotuv">Sotuv</Option>
                            <Option value="Arenda">Arenda</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Xona turi"
                        name="sheetName"
                        rules={[{required: true, message: "Xona turini tanlang!"}]}
                    >
                        <Select placeholder="Xona turini tanlang" onChange={handleSheetChange}>
                            <Option value="1 xona">1 xona</Option>
                            <Option value="2 xona">2 xona</Option>
                            <Option value="3 xona">3 xona</Option>
                            <Option value="4 xona">4 xona</Option>
                            <Option value="5 xona">5 xona</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Kvartil"
                        name="kvartil"
                        rules={[{required: true, message: "Kvartilni tanlang!"}]}
                    >
                        <Select
                            placeholder="Kvartilni tanlang"
                            loading={loadingSettings}
                            showSearch
                        >
                            {(settings.kvartil || []).map(item => (
                                <Option key={item.id} value={item.value}>
                                    {item.value}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="X/E/ET (xona / etaj / etajnost)" required>
                        <Input.Group compact style={{display: "flex", gap: 8, alignItems: "center"}}>
                            <Form.Item
                                name="xona"
                                style={{marginBottom: 0}}
                                rules={[
                                    {required: true, message: "Xona!"},
                                    ({getFieldValue}) => ({
                                        validator(_, value) {
                                            const selected = getFieldValue("sheetName");
                                            if (!selected || !value) return Promise.resolve();
                                            const max = parseInt(selected);
                                            const current = parseInt(value);
                                            if (isNaN(current)) return Promise.reject("Faqat raqam kiriting!");
                                            if (current > max) return Promise.reject(`❌ ${selected} dan katta xona kiritmang!`);
                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <Input placeholder="2" type={"tel"} maxLength={2}
                                       style={{width: 60, textAlign: "center"}}/>
                            </Form.Item>

                            <span style={{fontSize: 20, fontWeight: "bold"}}>/</span>

                            <Form.Item name="etaj" style={{marginBottom: 0}}
                                       rules={[{required: true, message: "Etaj!"}]}>
                                <Input placeholder="3" type="tel" maxLength={2}
                                       style={{width: 60, textAlign: "center"}}/>
                            </Form.Item>

                            <span style={{fontSize: 20, fontWeight: "bold"}}>/</span>

                            <Form.Item name="etajnost" style={{marginBottom: 0}}
                                       rules={[{required: true, message: "Etajnost!"}]}>
                                <Input placeholder="9" type="tel" maxLength={2}
                                       style={{width: 60, textAlign: "center"}}/>
                            </Form.Item>
                        </Input.Group>
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item label="Dom" name="dom">
                                <InputNumber style={{width: "100%"}} type={"tel"} controls={false} placeholder={"1"}/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Kvartira" name="kvartira">
                                <InputNumber style={{width: "100%"}} type={"tel"} controls={false}/>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label="M² (Maydon)" name="m2" rules={[{required: true, message: "Maydon kiriting!"}]}>
                        <Input placeholder="65" type="tel"/>
                    </Form.Item>

                    <Form.Item label={`Narxi (USD)`} name="narx" rules={[{required: true, message: "Narx yozing!"}]}>
                        <Input
                            placeholder="75000"
                            style={{width: "100%"}}
                            type="tel"
                            suffix={"$"}
                            value={form.getFieldValue("narx")}
                            onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "");
                                if (!value) value = "";
                                const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                                form.setFieldsValue({narx: formatted});
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Telefon raqami"
                        name="tell"
                        rules={[
                            {required: true, message: "Telefon raqamini kiriting!"},
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.reject("Telefon raqamini kiriting!");
                                    const digits = value.replace(/\D/g, "");
                                    if (digits.length !== 12 || !digits.startsWith("998")) {
                                        return Promise.reject("To'g'ri raqam kiriting, masalan +998 90 123 45 67");
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <Input
                            placeholder="+998 90 123 45 67"
                            maxLength={17}
                            autoComplete="off"
                            type="tel"
                            onChange={(e) => {
                                let input = e.target.value.replace(/\D/g, "");
                                if (!input.startsWith("998")) input = "998" + input;
                                let formatted = "+998";
                                if (input.length > 3) formatted += " " + input.substring(3, 5);
                                if (input.length > 5) formatted += " " + input.substring(5, 8);
                                if (input.length > 8) formatted += " " + input.substring(8, 10);
                                if (input.length > 10) formatted += " " + input.substring(10, 12);
                                form.setFieldsValue({tell: formatted});
                            }}
                        />
                    </Form.Item>

                    {/* ✅ Realtor select - serverdan olingan list */}
                    <Form.Item
                        label="Rielter"
                        name="rieltor"
                        rules={[{required: true, message: "Rielter tanlang!"}]}
                    >
                        <Select
                            placeholder="Rielter tanlang"
                            loading={loadingRealtors}
                            notFoundContent={
                                loadingRealtors ? (
                                    <div style={{textAlign: 'center', padding: '10px'}}>
                                        <Spin size="small" />
                                        <div>Yuklanmoqda...</div>
                                    </div>
                                ) : (
                                    <div style={{textAlign: 'center', padding: '10px'}}>
                                        Realtor topilmadi
                                    </div>
                                )
                            }
                            showSearch
                            filterOption={(input, option) =>
                                option.children.toLowerCase().includes(input.toLowerCase())
                            }
                            suffixIcon={loadingRealtors ? <Spin size="small" /> : undefined}
                        >
                            {realtors.map((realtor) => (
                                <Option value={realtor.username} key={realtor.id}>
                                    {realtor.full_name} ({realtor.username})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {/* Agar realtor'lar yuklanmagan bo'lsa, reload tugmasi */}
                    {!loadingRealtors && realtors.length === 0 && (
                        <Alert
                            message="Realtor'lar topilmadi"
                            description={
                                <span>
                                    Realtor'lar yuklanmadi.
                                    <Button
                                        type="link"
                                        size="small"
                                        onClick={loadRealtors}
                                        style={{padding: 0, marginLeft: 5}}
                                    >
                                        Qayta urinish
                                    </Button>
                                </span>
                            }
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    <Form.Item label="Primichaniya (Izohlash)" name="opisaniya">
                        <Input.TextArea placeholder="Remont yaxshi, mebel bor..." rows={3}/>
                    </Form.Item>

                    <Form.Item label="F.I.O (Egasining ismi)" name="fio">
                        <Input placeholder="Aliyev Vali"/>
                    </Form.Item>

                    <Form.Item label="ID" name="id">
                        <Input placeholder="12345" type="tel"/>
                    </Form.Item>

                    <Form.Item label="Uy turi" name="uy_turi">
                        <Select placeholder="Uy turi" loading={loadingSettings}>
                            {(settings.uy_turi || []).map(item => (
                                <Option key={item.id} value={item.value}>
                                    {item.value}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Planirovka" name="planirovka">
                        <Select placeholder="Planirovka" loading={loadingSettings}>
                            {(settings.planirovka || []).map(item => (
                                <Option key={item.id} value={item.value}>
                                    {item.value}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Xolati" name="xolati">
                        <Select placeholder="Xolati" loading={loadingSettings}>
                            {(settings.xolati || []).map(item => (
                                <Option key={item.id} value={item.value}>
                                    {item.value}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Torets" name="torets">
                        <Select placeholder="Torets" loading={loadingSettings}>
                            {(settings.torets || []).map(item => (
                                <Option key={item.id} value={item.value}>
                                    {item.value}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Balkon" name="balkon">
                        <Select placeholder="Balkon" loading={loadingSettings}>
                            {(settings.balkon || []).map(item => (
                                <Option key={item.id} value={item.value}>
                                    {item.value}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Osmotir vaqti" style={{marginBottom: 8}}>
                        <div className="osmotir-row">
                            <Form.Item name="osmotir_sana" noStyle>
                                <input className="osmotir-input osmotir-date" type="date"/>
                            </Form.Item>

                            <Form.Item name="osmotir_vaqt" noStyle>
                                <input className="osmotir-input osmotir-time" type="time" step="60"/>
                            </Form.Item>
                        </div>
                    </Form.Item>
                    <Row justify="center">
                        <Col span={20}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                disabled={loading}
                                style={{
                                    borderRadius: 8,
                                    padding: "0 100px",
                                    margin: "20px 0",
                                    width: "100%",
                                }}
                            >
                                {loading ? "Yuborilmoqda..." : "Yuborish"}
                            </Button>
                        </Col>
                    </Row>

                    {loading && uploadProgress > 0 && (
                        <div style={{marginBottom: 20}}>
                            <Progress
                                percent={uploadProgress}
                                status={uploadProgress === 100 ? "success" : "active"}
                                strokeColor={{"0%": "#108ee9", "100%": "#87d068"}}
                            />
                            <p style={{textAlign: "center", marginTop: 8, color: "#666"}}>
                                {uploadProgress < 50 && "Rasmlar yuklanmoqda..."}
                                {uploadProgress >= 50 && uploadProgress < 100 && "Serverga yuborilmoqda..."}
                                {uploadProgress === 100 && "✅ Bajarildi!"}
                            </p>
                        </div>
                    )}
                    <Form.Item label="Rasmlar" name="rasmlar">
                        <Upload.Dragger {...uploadProps}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined/>
                            </p>
                            <p className="ant-upload-text">Rasmlarni bu yerga tashlang yoki tanlang</p>
                            <p className="ant-upload-hint">PNG, JPG yoki JPEG fayllar qo'llanadi</p>
                        </Upload.Dragger>
                    </Form.Item>
                </Form>
            </div>
        </div>
    );
};

export default FormMaskan;