import { useState, useEffect } from "react";
import {
    Settings, MessageCircle, MapPin, LayoutGrid, Home, Layout, Tag,
    Truck, Plus, Pencil, Trash2, Eye, EyeOff, Save, X, ChevronDown
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import api from "../utils/api";

type SubTab = "telegram" | "tuman" | "balkon" | "uy-turi" | "planirovka" | "xolati" | "torets";

const subTabs = [
    { id: "telegram", label: "Telegram Chatlar", icon: MessageCircle },
    { id: "tuman", label: "Tuman va Kvartillar", icon: MapPin },
    { id: "balkon", label: "Balkon", icon: LayoutGrid },
    { id: "uy-turi", label: "Uy turi", icon: Home },
    { id: "planirovka", label: "Planirovka", icon: Layout },
    { id: "xolati", label: "Xolati", icon: Tag },
    { id: "torets", label: "Torets", icon: Truck },
] as const;

const LANGUAGES = [
    { key: 'uz', label: "O'zbekcha", flag: '🇺🇿', column: 'value_uz' },
    { key: 'ru', label: 'Русский', flag: '🇷🇺', column: 'value_ru' },
    { key: 'en', label: 'English', flag: '🇬🇧', column: 'value_en' },
    { key: 'uz_cy', label: 'Ўзбекча', flag: '🇺🇿', column: 'value_uz_cy' }
];

interface TelegramChat {
    id: string;
    chat_name: string;
    chat_id: string;
    display_order: number;
}

interface Setting {
    id: string;
    category: string;
    value: string;
    display_order: number;
    parent_id: string | null;
    translations: {
        uz: string;
        ru: string;
        en: string;
        uz_cy: string;
    };
}

interface CascaderItem {
    id: string;
    value: string;
    label: string;
    display_order: number;
    translations: any;
    children?: CascaderItem[];
}

export function SettingsTab() {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("telegram");
    const [showToken, setShowToken] = useState(false);
    const [currentLang, setCurrentLang] = useState('uz');
    const [loading, setLoading] = useState(false);

    // Global config
    const [globalConfig, setGlobalConfig] = useState({
        telegram_bot_token: '',
        glavniy_app_script_url: '',
        company_phone: '',
        default_telegram_chat_id: ''
    });

    // Data states
    const [telegramChats, setTelegramChats] = useState<TelegramChat[]>([]);
    const [cascaderData, setCascaderData] = useState<CascaderItem[]>([]);
    const [settings, setSettings] = useState<Record<string, Setting[]>>({});
    const [tumanList, setTumanList] = useState<CascaderItem[]>([]);

    // Modal states
    const [chatModalVisible, setChatModalVisible] = useState(false);
    const [kvartilModalVisible, setKvartilModalVisible] = useState(false);
    const [settingModalVisible, setSettingModalVisible] = useState(false);

    const [editingChat, setEditingChat] = useState<TelegramChat | null>(null);
    const [editingKvartil, setEditingKvartil] = useState<Setting | null>(null);
    const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
    const [currentCategory, setCurrentCategory] = useState('balkon');

    // Form states
    const [chatForm, setChatForm] = useState({
        chatName: '',
        chatId: '',
        display_order: 0
    });

    const [kvartilForm, setKvartilForm] = useState({
        value_uz: '',
        value_ru: '',
        value_en: '',
        value_uz_cy: '',
        display_order: 0,
        parentId: null as string | null
    });

    const [settingForm, setSettingForm] = useState({
        value_uz: '',
        value_ru: '',
        value_en: '',
        value_uz_cy: '',
        display_order: 0
    });

    useEffect(() => {
        loadGlobalConfig();
        loadTelegramChats();
        loadCascaderData();
        loadSettings();
    }, []);

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
            console.error('Error loading global config:', error);
        }
    };

    const loadTelegramChats = async () => {
        try {
            const response = await api.get('/api/telegram-chats');
            if (response.data.success) {
                setTelegramChats(response.data.data || []);
            }
        } catch (error) {
            console.error('Error loading telegram chats:', error);
        }
    };

    const loadCascaderData = async () => {
        try {
            const response = await api.get('/api/settings/cascader');
            if (response.data.success) {
                setCascaderData(response.data.data || []);

                const tumans = response.data.data.map((item: CascaderItem) => ({
                    id: item.id,
                    value: item.value,
                    label: item.label,
                    translations: item.translations,
                    display_order: item.display_order,
                }));
                setTumanList(tumans);
            }
        } catch (error) {
            console.error('Error loading cascader data:', error);
        }
    };

    const loadSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/settings');
            if (response.data.success) {
                setSettings(response.data.data || {});
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalConfigChange = (field: string, value: string) => {
        setGlobalConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePhoneChange = (value: string) => {
        let input = value.replace(/\D/g, '');
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
            alert('Telegram Bot Token kiriting!');
            return;
        }
        if (!globalConfig.glavniy_app_script_url) {
            alert('Glavniy App Script URL kiriting!');
            return;
        }
        if (!globalConfig.company_phone || !/^\+998\d{9}$/.test(globalConfig.company_phone)) {
            alert('Telefon raqamini to\'g\'ri formatda kiriting (+998XXXXXXXXX)');
            return;
        }
        if (!globalConfig.default_telegram_chat_id) {
            alert('Default Telegram Chat ID kiriting!');
            return;
        }

        try {
            const response = await api.put('/api/settings/global-config', globalConfig);
            if (response.data.success) {
                alert('Global sozlamalar saqlandi!');
                loadGlobalConfig();
            }
        } catch (error: any) {
            console.error('Error saving global config:', error);
            alert(error.response?.data?.error || 'Saqlashda xato');
        }
    };

    // Telegram Chat handlers
    const handleAddChat = () => {
        setEditingChat(null);
        setChatForm({ chatName: '', chatId: '', display_order: 0 });
        setChatModalVisible(true);
    };

    const handleEditChat = (chat: TelegramChat) => {
        setEditingChat(chat);
        setChatForm({
            chatName: chat.chat_name,
            chatId: chat.chat_id,
            display_order: chat.display_order
        });
        setChatModalVisible(true);
    };

    const handleDeleteChat = async (chatId: string) => {
        if (!confirm("Chat o'chirmoqchimisiz?")) return;

        try {
            await api.delete(`/api/telegram-chats/${chatId}`);
            loadTelegramChats();
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };

    const handleSubmitChat = async () => {
        if (!chatForm.chatName || !chatForm.chatId) {
            alert('Barcha maydonlarni to\'ldiring!');
            return;
        }

        try {
            if (editingChat) {
                await api.put(`/api/telegram-chats/${editingChat.id}`, chatForm);
            } else {
                await api.post('/api/telegram-chats', chatForm);
            }
            setChatModalVisible(false);
            loadTelegramChats();
        } catch (error: any) {
            console.error('Error saving chat:', error);
            alert(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    // Kvartil handlers
    const handleAddKvartil = () => {
        setEditingKvartil(null);
        setKvartilForm({
            value_uz: '',
            value_ru: '',
            value_en: '',
            value_uz_cy: '',
            display_order: 0,
            parentId: null
        });
        setKvartilModalVisible(true);
    };

    const handleEditKvartil = (item: Setting) => {
        setEditingKvartil(item);
        const translations = item.translations || {};
        setKvartilForm({
            value_uz: translations.uz || item.value,
            value_ru: translations.ru || '',
            value_en: translations.en || '',
            value_uz_cy: translations.uz_cy || '',
            display_order: item.display_order,
            parentId: item.parent_id
        });
        setKvartilModalVisible(true);
    };

    const handleDeleteKvartil = async (id: string) => {
        if (!confirm("O'chirmoqchimisiz?")) return;

        try {
            await api.delete(`/api/settings/${id}`);
            loadCascaderData();
        } catch (error) {
            console.error('Error deleting kvartil:', error);
        }
    };

    const handleSubmitKvartil = async () => {
        if (!kvartilForm.value_uz.trim()) {
            alert('Kamida bitta til kiritilishi kerak!');
            return;
        }

        try {
            const payload = {
                category: 'kvartil',
                translations: {
                    uz: kvartilForm.value_uz.trim(),
                    ru: kvartilForm.value_ru.trim(),
                    en: kvartilForm.value_en.trim(),
                    uz_cy: kvartilForm.value_uz_cy.trim()
                },
                display_order: kvartilForm.display_order || 0,
                parentId: kvartilForm.parentId || null
            };

            if (editingKvartil) {
                const updatePayload = {
                    value_uz: payload.translations.uz,
                    value_ru: payload.translations.ru,
                    value_en: payload.translations.en,
                    value_uz_cy: payload.translations.uz_cy,
                    display_order: payload.display_order,
                    parentId: payload.parentId
                };
                await api.put(`/api/settings/${editingKvartil.id}`, updatePayload);
            } else {
                await api.post('/api/settings', payload);
            }

            setKvartilModalVisible(false);
            setTimeout(() => {
                loadCascaderData();
                loadSettings();
            }, 500);
        } catch (error: any) {
            console.error('Error saving kvartil:', error);
            alert(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    // Settings handlers (balkon, uy_turi, etc.)
    const handleAddSetting = (category: string) => {
        setCurrentCategory(category);
        setEditingSetting(null);
        setSettingForm({
            value_uz: '',
            value_ru: '',
            value_en: '',
            value_uz_cy: '',
            display_order: 0
        });
        setSettingModalVisible(true);
    };

    const handleEditSetting = (item: Setting, category: string) => {
        setCurrentCategory(category);
        setEditingSetting(item);
        const translations = item.translations || {};
        setSettingForm({
            value_uz: translations.uz || item.value,
            value_ru: translations.ru || '',
            value_en: translations.en || '',
            value_uz_cy: translations.uz_cy || '',
            display_order: item.display_order
        });
        setSettingModalVisible(true);
    };

    const handleDeleteSetting = async (id: string) => {
        if (!confirm("O'chirmoqchimisiz?")) return;

        try {
            await api.delete(`/api/settings/${id}`);
            loadSettings();
        } catch (error) {
            console.error('Error deleting setting:', error);
        }
    };

    const handleSubmitSetting = async () => {
        if (!settingForm.value_uz.trim()) {
            alert('Kamida bitta til kiritilishi kerak!');
            return;
        }

        try {
            const payload = {
                category: currentCategory,
                translations: {
                    uz: settingForm.value_uz.trim(),
                    ru: settingForm.value_ru.trim(),
                    en: settingForm.value_en.trim(),
                    uz_cy: settingForm.value_uz_cy.trim()
                },
                display_order: settingForm.display_order || 0
            };

            if (editingSetting) {
                const updatePayload = {
                    value_uz: payload.translations.uz,
                    value_ru: payload.translations.ru,
                    value_en: payload.translations.en,
                    value_uz_cy: payload.translations.uz_cy,
                    display_order: payload.display_order
                };
                await api.put(`/api/settings/${editingSetting.id}`, updatePayload);
            } else {
                await api.post('/api/settings', payload);
            }

            setSettingModalVisible(false);
            loadSettings();
        } catch (error: any) {
            console.error('Error saving setting:', error);
            alert(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const getFlattenedKvartilData = () => {
        const flattened: any[] = [];

        cascaderData.forEach(tuman => {
            flattened.push({
                id: tuman.id,
                value: tuman.value,
                display_order: tuman.display_order ?? 0,
                parent_id: null,
                translations: tuman.translations
            });

            if (tuman.children) {
                tuman.children.forEach(kvartil => {
                    flattened.push({
                        id: kvartil.id,
                        value: kvartil.value,
                        display_order: kvartil.display_order ?? 0,
                        parent_id: tuman.id,
                        translations: kvartil.translations
                    });
                });
            }
        });

        return flattened;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Global Settings Card */}
            <div className="admin-card p-6 border-l-4 border-primary">
                <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Sozlamalar</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    🌐 Ko'p tilni qo'llab-quvvatlovchi tizim sozlamalari
                </p>

                <div className="space-y-6">
                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="h-4 w-4" />
                            <h4 className="font-medium">Global Sozlamalar</h4>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    🤖 Telegram Bot Token
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showToken ? "text" : "password"}
                                        value={globalConfig.telegram_bot_token}
                                        onChange={(e) => handleGlobalConfigChange('telegram_bot_token', e.target.value)}
                                        className="pr-10"
                                    />
                                    <button
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                        {showToken ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    📊 Glavniy App Script URL
                                </Label>
                                <Input
                                    value={globalConfig.glavniy_app_script_url}
                                    onChange={(e) => handleGlobalConfigChange('glavniy_app_script_url', e.target.value)}
                                />
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    📱 Kompaniya Telefon Raqami
                                </Label>
                                <Input
                                    value={globalConfig.company_phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    maxLength={13}
                                />
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    💬 Default Telegram Chat ID
                                </Label>
                                <Input
                                    value={globalConfig.default_telegram_chat_id}
                                    onChange={(e) => handleGlobalConfigChange('default_telegram_chat_id', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Agar rielterga chat biriktirilmagan bo'lsa, bu chatga yuboriladi
                                </p>
                            </div>

                            <Button className="bg-primary hover:bg-primary/90" onClick={handleGlobalConfigSave}>
                                <Save className="h-4 w-4 mr-2" />
                                Global Sozlamalarni Saqlash
                            </Button>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-warning/10 rounded-lg border border-warning/30">
                        <p className="text-sm">
                            💡 <strong>Ma'lumot:</strong><br />
                            <strong>Telegram Bot Token:</strong> Telegram xabarlari uchun bot tokeni<br />
                            <strong>Glavniy App Script URL:</strong> Asosiy Google Sheets uchun script URL<br />
                            <strong>Kompaniya Telefon:</strong> Oddiy rieltor uchun ishlatiladi<br />
                            <strong>Default Chat ID:</strong> Asosiy Telegram chat
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="admin-card">
                <div className="border-b">
                    <div className="flex gap-1 p-2 overflow-x-auto">
                        {subTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id as SubTab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                                    activeSubTab === tab.id
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {/* TELEGRAM CHATS TAB */}
                    {activeSubTab === "telegram" && (
                        <TelegramChatsContent
                            telegramChats={telegramChats}
                            onAdd={handleAddChat}
                            onEdit={handleEditChat}
                            onDelete={handleDeleteChat}
                        />
                    )}

                    {/* TUMAN VA KVARTILLAR TAB */}
                    {activeSubTab === "tuman" && (
                        <TumanKvartilContent
                            data={getFlattenedKvartilData()}
                            currentLang={currentLang}
                            onLangChange={setCurrentLang}
                            onAdd={handleAddKvartil}
                            onEdit={handleEditKvartil}
                            onDelete={handleDeleteKvartil}
                        />
                    )}

                    {/* BALKON TAB */}
                    {activeSubTab === "balkon" && (
                        <SettingsCategoryContent
                            category="balkon"
                            title="🏗️ Balkon"
                            description="🌐 Balkon turlari"
                            data={settings.balkon || []}
                            currentLang={currentLang}
                            onLangChange={setCurrentLang}
                            onAdd={() => handleAddSetting('balkon')}
                            onEdit={(item) => handleEditSetting(item, 'balkon')}
                            onDelete={handleDeleteSetting}
                        />
                    )}

                    {/* Other settings tabs */}
                    {(activeSubTab === "uy-turi" || activeSubTab === "planirovka" ||
                        activeSubTab === "xolati" || activeSubTab === "torets") && (
                        <SettingsCategoryContent
                            category={activeSubTab.replace('-', '_')}
                            title={subTabs.find(t => t.id === activeSubTab)?.label || ''}
                            description="Sozlamalar"
                            data={settings[activeSubTab.replace('-', '_')] || []}
                            currentLang={currentLang}
                            onLangChange={setCurrentLang}
                            onAdd={() => handleAddSetting(activeSubTab.replace('-', '_'))}
                            onEdit={(item) => handleEditSetting(item, activeSubTab.replace('-', '_'))}
                            onDelete={handleDeleteSetting}
                        />
                    )}
                </div>
            </div>

            {/* Telegram Chat Modal */}
            {chatModalVisible && (
                <Modal
                    title={editingChat ? '✏️ Chat Tahrirlash' : '➕ Yangi Chat Qo\'shish'}
                    onClose={() => setChatModalVisible(false)}
                    onSubmit={handleSubmitChat}
                >
                    <div className="space-y-4">
                        <div>
                            <Label>Chat Nomi *</Label>
                            <Input
                                value={chatForm.chatName}
                                onChange={(e) => setChatForm({ ...chatForm, chatName: e.target.value })}
                                placeholder="Masalan: Marketing Chat"
                            />
                        </div>
                        <div>
                            <Label>Chat ID *</Label>
                            <Input
                                value={chatForm.chatId}
                                onChange={(e) => setChatForm({ ...chatForm, chatId: e.target.value })}
                                placeholder="-1003298985470"
                            />
                        </div>
                        <div>
                            <Label>Tartib raqami *</Label>
                            <Input
                                type="number"
                                value={chatForm.display_order}
                                onChange={(e) => setChatForm({ ...chatForm, display_order: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Kvartil Modal */}
            {kvartilModalVisible && (
                <Modal
                    title={editingKvartil ? '✏️ Tahrirlash' : '➕ Yangi Qo\'shish'}
                    onClose={() => setKvartilModalVisible(false)}
                    onSubmit={handleSubmitKvartil}
                >
                    <div className="space-y-4">
                        <div>
                            <Label>🇺🇿 O'zbekcha (Lotin) *</Label>
                            <Input
                                value={kvartilForm.value_uz}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_uz: e.target.value })}
                                placeholder="Masalan: Yunusobod"
                            />
                        </div>
                        <div>
                            <Label>🇷🇺 Русский</Label>
                            <Input
                                value={kvartilForm.value_ru}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_ru: e.target.value })}
                                placeholder="Например: Юнусабад"
                            />
                        </div>
                        <div>
                            <Label>🇬🇧 English</Label>
                            <Input
                                value={kvartilForm.value_en}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_en: e.target.value })}
                                placeholder="Example: Yunusabad"
                            />
                        </div>
                        <div>
                            <Label>🇺🇿 Ўзбекча (Кирилл)</Label>
                            <Input
                                value={kvartilForm.value_uz_cy}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_uz_cy: e.target.value })}
                                placeholder="Масалан: Юнусобод"
                            />
                        </div>
                        <div>
                            <Label>Turi</Label>
                            <Select
                                value={kvartilForm.parentId || ""}
                                onValueChange={(value) => setKvartilForm({ ...kvartilForm, parentId: value || null })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tuman tanlang (Kvartil bo'lsa)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">TUMAN</SelectItem>
                                    {tumanList.map(tuman => (
                                        <SelectItem key={tuman.id} value={tuman.id}>
                                            {tuman.value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                                Bo'sh qoldiring = TUMAN, Tanlang = KVARTIL
                            </p>
                        </div>
                        <div>
                            <Label>Tartib raqami *</Label>
                            <Input
                                type="number"
                                value={kvartilForm.display_order}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, display_order: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Settings Modal */}
            {settingModalVisible && (
                <Modal
                    title={editingSetting ? '✏️ Tahrirlash' : '➕ Yangi qo\'shish'}
                    onClose={() => setSettingModalVisible(false)}
                    onSubmit={handleSubmitSetting}
                >
                    <div className="space-y-4">
                        <div>
                            <Label>🇺🇿 O'zbekcha (Lotin) *</Label>
                            <Input
                                value={settingForm.value_uz}
                                onChange={(e) => setSettingForm({ ...settingForm, value_uz: e.target.value })}
                                placeholder="Masalan: Panel"
                            />
                        </div>
                        <div>
                            <Label>🇷🇺 Русский</Label>
                            <Input
                                value={settingForm.value_ru}
                                onChange={(e) => setSettingForm({ ...settingForm, value_ru: e.target.value })}
                                placeholder="Например: Панель"
                            />
                        </div>
                        <div>
                            <Label>🇬🇧 English</Label>
                            <Input
                                value={settingForm.value_en}
                                onChange={(e) => setSettingForm({ ...settingForm, value_en: e.target.value })}
                                placeholder="Example: Panel"
                            />
                        </div>
                        <div>
                            <Label>🇺🇿 Ўзбекча (Кирилл)</Label>
                            <Input
                                value={settingForm.value_uz_cy}
                                onChange={(e) => setSettingForm({ ...settingForm, value_uz_cy: e.target.value })}
                                placeholder="Масалан: Панел"
                            />
                        </div>
                        <div>
                            <Label>Tartib raqami *</Label>
                            <Input
                                type="number"
                                value={settingForm.display_order}
                                onChange={(e) => setSettingForm({ ...settingForm, display_order: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// Helper Components
interface ModalProps {
    title: string;
    onClose: () => void;
    onSubmit: () => void;
    children: React.ReactNode;
}

function Modal({ title, onClose, onSubmit, children }: ModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {children}

                <div className="flex gap-2 pt-4">
                    <Button onClick={onSubmit} className="flex-1">
                        Saqlash
                    </Button>
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Bekor qilish
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface TelegramChatsContentProps {
    telegramChats: TelegramChat[];
    onAdd: () => void;
    onEdit: (chat: TelegramChat) => void;
    onDelete: (id: string) => void;
}

function TelegramChatsContent({ telegramChats, onAdd, onEdit, onDelete }: TelegramChatsContentProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium flex items-center gap-2">
                        💬 Telegram Guruh Chatlari
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        Xabarlar uchun Telegram chatlar
                    </p>
                </div>
                <Button className="bg-success hover:bg-success/90" onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yangi Chat Qo'shish
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead>Chat Nomi</TableHead>
                        <TableHead>Chat ID</TableHead>
                        <TableHead>Tartib</TableHead>
                        <TableHead className="text-center">Amallar</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {telegramChats.map((chat) => (
                        <TableRow key={chat.id}>
                            <TableCell>
                                <Badge variant="outline" className="border-primary text-primary">
                                    💬 {chat.chat_name}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <code className="bg-muted px-2 py-1 rounded text-sm">
                                    {chat.chat_id}
                                </code>
                            </TableCell>
                            <TableCell>{chat.display_order}</TableCell>
                            <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                    <Button size="sm" className="action-btn-success h-8" onClick={() => onEdit(chat)}>
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Tahrirlash
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="action-btn-danger h-8"
                                        onClick={() => onDelete(chat.id)}
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        O'chirish
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

interface TumanKvartilContentProps {
    data: any[];
    currentLang: string;
    onLangChange: (lang: string) => void;
    onAdd: () => void;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

function TumanKvartilContent({ data, currentLang, onLangChange, onAdd, onEdit, onDelete }: TumanKvartilContentProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium flex items-center gap-2 text-destructive">
                        📍 Tuman va Kvartillar
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        🌐 Har bir tuman/kvartil 4 ta tilda saqlanadi
                    </p>
                </div>
                <Button className="bg-success hover:bg-success/90" onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yangi Qo'shish
                </Button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <Label>Tuman / Kvartil</Label>
                <Select value={currentLang} onValueChange={onLangChange}>
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LANGUAGES.map(lang => (
                            <SelectItem key={lang.key} value={lang.key}>
                                {lang.flag} {lang.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead>Tuman / Kvartil</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead>Tartib</TableHead>
                        <TableHead className="text-center">Amallar</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => {
                        const translations = item.translations || {};
                        const currentValue = translations[currentLang] || item.value;

                        return (
                            <TableRow key={item.id} className={item.parent_id ? "bg-muted/20" : ""}>
                                <TableCell>
                                    <div>
                                        {item.parent_id ? (
                                            <span style={{ paddingLeft: 24 }}>↳ {currentValue}</span>
                                        ) : (
                                            <strong>{currentValue}</strong>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {">"} 🔄 Barcha tarjimalar
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={
                                        item.parent_id ? "border-blue-500 text-blue-700" : "border-green-500 text-green-700"
                                    }>
                                        {item.parent_id ? 'Kvartil' : 'Tuman'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{item.display_order}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button size="sm" className="action-btn-success h-8" onClick={() => onEdit(item)}>
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Tahrirlash
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="action-btn-danger h-8"
                                            onClick={() => onDelete(item.id)}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            O'chirish
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

interface SettingsCategoryContentProps {
    category: string;
    title: string;
    description: string;
    data: Setting[];
    currentLang: string;
    onLangChange: (lang: string) => void;
    onAdd: () => void;
    onEdit: (item: Setting) => void;
    onDelete: (id: string) => void;
}

function SettingsCategoryContent({
                                     category, title, description, data, currentLang, onLangChange, onAdd, onEdit, onDelete
                                 }: SettingsCategoryContentProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium flex items-center gap-2">
                        {title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        🌐 {description}
                    </p>
                </div>
                <Button className="bg-success hover:bg-success/90" onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yangi qo'shish
                </Button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <Label>Qiymat</Label>
                <Select value={currentLang} onValueChange={onLangChange}>
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LANGUAGES.map(lang => (
                            <SelectItem key={lang.key} value={lang.key}>
                                {lang.flag} {lang.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead>Qiymat</TableHead>
                        <TableHead>Tartib</TableHead>
                        <TableHead className="text-center">Amallar</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => {
                        const translations = item.translations || {};
                        const currentValue = translations[currentLang] || item.value;

                        return (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div>
                                        <strong>{currentValue}</strong>
                                        <p className="text-xs text-muted-foreground">
                                            {">"} 🔄 Barcha tarjimalar
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>{item.display_order}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button size="sm" className="action-btn-success h-8" onClick={() => onEdit(item)}>
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Tahrirlash
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="action-btn-danger h-8"
                                            onClick={() => onDelete(item.id)}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            O'chirish
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}