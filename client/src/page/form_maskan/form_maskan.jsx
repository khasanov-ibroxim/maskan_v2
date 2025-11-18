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
import { Rielter } from "./db/rielter.jsx";

const { Option } = Select;
import api from '../../utils/api.jsx';
// SERVER URL
const SERVER_URL = import.meta.env.VITE_API_URL;

/* ----------------- Internet tezligini tekshirish ----------------- */
const checkInternetSpeed = async () => {
    try {
        const fileSize = 500000; // 500 KB
        const testUrl = 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png';

        const startTime = performance.now();
        const response = await fetch(testUrl + '?t=' + Date.now(), {
            cache: 'no-store',
            mode: 'no-cors'
        });
        const endTime = performance.now();

        const durationInSeconds = (endTime - startTime) / 1000;
        const speedBps = fileSize / durationInSeconds;
        const speedMbps = (speedBps / (1024 * 1024)) * 8; // Convert to Mbps

        return speedMbps;
    } catch (error) {
        console.error('Internet tezligini tekshirishda xato:', error);
        return 0;
    }
};

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

    // Internet tezligi state
    const [internetSpeed, setInternetSpeed] = useState(null);
    const [isCheckingSpeed, setIsCheckingSpeed] = useState(false);
    const [speedCheckCount, setSpeedCheckCount] = useState(0);

    useEffect(() => {
        const userData =
            localStorage.getItem("userData") || sessionStorage.getItem("userData");
        if (!userData) {
            message.warning("Iltimos, tizimga kiring!");
            window.location.href = "/login";
        }
    }, []);
    useEffect(() => {
        checkSpeed();

        // Har 30 sekundda tekshirish
        const interval = setInterval(() => {
            checkSpeed();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const checkSpeed = async () => {
        setIsCheckingSpeed(true);
        try {
            const speed = await checkInternetSpeed();
            setInternetSpeed(speed);
            setSpeedCheckCount(prev => prev + 1);

            if (speed < 2) {
                message.warning(`⚠️ Internet tezligi juda past: ${speed.toFixed(2)} Mbps`);
            } else {
                console.log(`✅ Internet tezligi: ${speed.toFixed(2)} Mbps`);
            }
        } catch (error) {
            console.error('Tezlikni tekshirishda xato:', error);
            setInternetSpeed(0);
        } finally {
            setIsCheckingSpeed(false);
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
        // Internet tezligini qayta tekshirish
        if (internetSpeed === null || internetSpeed < 2) {
            message.warning("⏳ Internet tezligi tekshirilmoqda...");
            await checkSpeed();

            if (internetSpeed < 2) {
                message.error("❌ Internet tezligi juda past! Iltimos, internetni tekshiring.");
                return;
            }
        }

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

            const serverResponse = await axios.post(`${SERVER_URL}/send-data`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 60000, // 60 sekund
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
        beforeUpload: (file) => {
            return false;
        },
        onChange: ({ fileList: newList }) => {
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

    // Internet holati alertni render qilish
    const renderInternetAlert = () => {
        if (isCheckingSpeed) {
            return (
                <Alert
                    message={
                        <span>
                            <Spin size="small" style={{ marginRight: 8 }} />
                            Internet tezligi tekshirilmoqda...
                        </span>
                    }
                    type="info"
                    showIcon
                    icon={<WifiOutlined />}
                    style={{ marginBottom: 16 }}
                />
            );
        }

        if (internetSpeed === null) {
            return null;
        }

        if (internetSpeed < 2) {
            return (
                <Alert
                    message={`⚠️ Internet tezligi juda past: ${internetSpeed.toFixed(2)} Mbps`}
                    description="Yuklanishi sekin bo'lishi mumkin. Iltimos, internetni tekshiring yoki Wi-Fi ga ulaning."
                    type="error"
                    showIcon
                    icon={<DisconnectOutlined />}
                    action={
                        <Button size="small" onClick={checkSpeed}>
                            Qayta tekshirish
                        </Button>
                    }
                    style={{ marginBottom: 16 }}
                />
            );
        }

        return (
            <Alert
                message={`✅ Internet tezligi: ${internetSpeed.toFixed(2)} Mbps`}
                type="success"
                showIcon
                icon={<WifiOutlined />}
                closable
                style={{ marginBottom: 16 }}
            />
        );
    };

    // Button disabled logikasi
    const isSubmitDisabled = loading || internetSpeed < 2 || internetSpeed === null;

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

                {/* Internet holati */}
                {renderInternetAlert()}

                <Form form={form} autoComplete="off" layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Sotuv yoki arenda"
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
                        <Select placeholder="Kvartilni tanlang">
                            {[...Array(20)].map((_, i) => (
                                <Option key={i} value={`Yunusobod - ${i}`}>
                                    Yunusobod - {i}
                                </Option>
                            ))}
                            {[...Array(5)].map((_, i) => (
                                <Option key={`c${i}`} value={`Ц - ${i + 1}`}>
                                    Ц - {i + 1}
                                </Option>
                            ))}
                            <Option value={`Bodomzor`}>Bodomzor</Option>
                            <Option value={`Minor`}>Minor</Option>
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

                    <Form.Item label="Rielter" name="rieltor" rules={[{required: true, message: "Rielter tanlang!"}]}>
                        <Select placeholder="Rielter tanlang">
                            {Rielter.map((item, index) => (
                                <Option value={item.name} key={index}>
                                    {item.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

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
                        <Select placeholder="Uy turi">
                            <Option value="Kirpich">Kirpich</Option>
                            <Option value="Panel">Panel</Option>
                            <Option value="Beton">Beton</Option>
                            <Option value="Monolitniy/B">Monolitniy/B</Option>
                            <Option value="Gaza/b">Gaza/b</Option>
                            <Option value="Pena/b">Pena/b</Option>
                            <Option value="Boshqa">Boshqa</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="Planirovka" name="planirovka">
                        <Select placeholder="Planirovka">
                            <Option value="Tashkent">Tashkent</Option>
                            <Option value="Fransuzkiy">Fransuzkiy</Option>
                            <Option value="Uluchshiniy 2ta zal">Uluchshiniy+2 ta zal</Option>
                            <Option value="Uluchshiniy">Uluchshiniy</Option>
                            <Option value="Galareyka">Galareyka</Option>
                            <Option value="Navastroyka">Navastroyka</Option>
                            <Option value="Xrushovka">Xrushovka</Option>
                            <Option value="Boshqa">Boshqa</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="Xolati" name="xolati">
                        <Select placeholder="Xolati">
                            <Option value="Kapitalniy">Kapitalniy</Option>
                            <Option value="Ortacha">Ortacha</Option>
                            <Option value="Toza">Toza</Option>
                            <Option value="Yevro remont">Yevro remont</Option>
                            <Option value="Kosmetichiskiy">Kosmetichiskiy</Option>
                            <Option value="Bez remont">Bez remont</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="Torets" name="torets">
                        <Select placeholder="Torets">
                            <Option value="Torets">Torets</Option>
                            <Option value="Ne Torets">Ne Torets</Option>
                            <Option value="Boshqa">Boshqa</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="Balkon" name="balkon">
                        <Select placeholder="Balkon">
                            <Option value="2x6">2x6</Option>
                            <Option value="2x7">2x7</Option>
                            <Option value="1.5X6">1.5x6</Option>
                            <Option value="2x3">2x3</Option>
                            <Option value="2x3 + 2x3">2x3 + 2x3</Option>
                            <Option value="1x7">1x7</Option>
                            <Option value="2x4.5 + 1x1.5">2x4.5 + 1x1.5</Option>
                            <Option value="2x9">2x9</Option>
                            <Option value="Yo'q">Yo'q</Option>
                            <Option value="Boshqa">Boshqa</Option>
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
                                disabled={isSubmitDisabled}
                                style={{
                                    backgroundColor: isSubmitDisabled ? "#d9d9d9" : "#1677ff",
                                    borderRadius: 8,
                                    padding: "0 100px",
                                    margin: "20px 0",
                                    width: "100%",
                                }}
                            >
                                {loading ? "Yuborilmoqda..." :
                                    internetSpeed < 2 ? "Internet tezligi pastroq" :
                                        "Yuborish"}
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