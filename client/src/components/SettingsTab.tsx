// client/src/components/SettingsTab.tsx - REACT QUERY VERSION
import { useState, useEffect } from "react";
import {
    Settings, MessageCircle, MapPin, LayoutGrid, Home, Layout, Tag,
    Truck, Plus, Pencil, Trash2, Eye, EyeOff, Save, X
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
import { useToast } from "../hooks/use-toast";
import {
    useSettingsQuery,
    useTelegramChats,
    useGlobalConfig,
    useUpdateGlobalConfig,
    useCascaderDataQuery,
} from "../hooks/useQueries";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
    { key: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
    { key: 'ru', label: 'Русский', flag: '🇷🇺' },
    { key: 'en', label: 'English', flag: '🇬🇧' },
    { key: 'uz_cy', label: 'Ўзбекча', flag: '🇺🇿' }
];

export function SettingsTab() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [activeSubTab, setActiveSubTab] = useState<SubTab>("telegram");
    const [showToken, setShowToken] = useState(false);
    const [currentLang, setCurrentLang] = useState('uz');

    // React Query hooks
    const { data: settings = {} } = useSettingsQuery();
    const { data: telegramChats = [] } = useTelegramChats();
    const { data: cascaderData = [] } = useCascaderDataQuery();
    const { data: globalConfigData } = useGlobalConfig();

    const updateGlobalConfigMutation = useUpdateGlobalConfig();

    // Local state
    const [globalConfig, setGlobalConfig] = useState({
        telegram_bot_token: '',
        glavniy_app_script_url: '',
        company_phone: '',
        default_telegram_chat_id: ''
    });

    // Modal states
    const [chatModalVisible, setChatModalVisible] = useState(false);
    const [kvartilModalVisible, setKvartilModalVisible] = useState(false);
    const [settingModalVisible, setSettingModalVisible] = useState(false);

    const [editingChat, setEditingChat] = useState<any>(null);
    const [editingKvartil, setEditingKvartil] = useState<any>(null);
    const [editingSetting, setEditingSetting] = useState<any>(null);
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

    // Load global config
    useEffect(() => {
        if (globalConfigData) {
            setGlobalConfig({
                telegram_bot_token: globalConfigData.telegram_bot_token || '',
                glavniy_app_script_url: globalConfigData.glavniy_app_script_url || '',
                company_phone: globalConfigData.company_phone || '',
                default_telegram_chat_id: globalConfigData.default_telegram_chat_id || ''
            });
        }
    }, [globalConfigData]);

    // Mutations
    const createChatMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post('/api/telegram-chats', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['telegram-chats'] });
            toast({ title: "Muvaffaqiyatli", description: "Chat qo'shildi" });
        },
        onError: (error: any) => {
            toast({ title: "Xato", description: error.response?.data?.error || "Xato", variant: "destructive" });
        }
    });

    const updateChatMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.put(`/api/telegram-chats/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['telegram-chats'] });
            toast({ title: "Muvaffaqiyatli", description: "Chat yangilandi" });
        }
    });

    const deleteChatMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/telegram-chats/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['telegram-chats'] });
            toast({ title: "Muvaffaqiyatli", description: "Chat o'chirildi" });
        }
    });

    const createSettingMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post('/api/settings', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['cascader'] });
            toast({ title: "Muvaffaqiyatli", description: "Qo'shildi" });
        }
    });

    const updateSettingMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await api.put(`/api/settings/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['cascader'] });
            toast({ title: "Muvaffaqiyatli", description: "Yangilandi" });
        }
    });

    const deleteSettingMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/settings/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['cascader'] });
            toast({ title: "Muvaffaqiyatli", description: "O'chirildi" });
        }
    });

    const handleGlobalConfigSave = async () => {
        if (!globalConfig.telegram_bot_token) {
            toast({ title: "Xato", description: "Telegram Bot Token kiriting!", variant: "destructive" });
            return;
        }
        if (!globalConfig.company_phone || !/^\+998\d{9}$/.test(globalConfig.company_phone)) {
            toast({ title: "Xato", description: "Telefon formatida xato!", variant: "destructive" });
            return;
        }

        await updateGlobalConfigMutation.mutateAsync(globalConfig);
    };

    const handlePhoneChange = (value: string) => {
        let input = value.replace(/\D/g, '');
        if (!input.startsWith('998')) input = '998' + input;
        let formatted = '+' + input.substring(0, 12);
        setGlobalConfig({ ...globalConfig, company_phone: formatted });
    };

    const handleSubmitChat = async () => {
        if (!chatForm.chatName || !chatForm.chatId) {
            toast({ title: "Xato", description: "Barcha maydonlarni to'ldiring!", variant: "destructive" });
            return;
        }

        if (editingChat) {
            await updateChatMutation.mutateAsync({ id: editingChat.id, data: chatForm });
        } else {
            await createChatMutation.mutateAsync(chatForm);
        }
        setChatModalVisible(false);
    };

    const handleSubmitKvartil = async () => {
        if (!kvartilForm.value_uz.trim()) {
            toast({ title: "Xato", description: "Kamida bitta til kiriting!", variant: "destructive" });
            return;
        }

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
            await updateSettingMutation.mutateAsync({
                id: editingKvartil.id,
                data: {
                    value_uz: payload.translations.uz,
                    value_ru: payload.translations.ru,
                    value_en: payload.translations.en,
                    value_uz_cy: payload.translations.uz_cy,
                    display_order: payload.display_order,
                    parentId: payload.parentId
                }
            });
        } else {
            await createSettingMutation.mutateAsync(payload);
        }
        setKvartilModalVisible(false);
    };

    const handleSubmitSetting = async () => {
        if (!settingForm.value_uz.trim()) {
            toast({ title: "Xato", description: "Kamida bitta til kiriting!", variant: "destructive" });
            return;
        }

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
            await updateSettingMutation.mutateAsync({
                id: editingSetting.id,
                data: {
                    value_uz: payload.translations.uz,
                    value_ru: payload.translations.ru,
                    value_en: payload.translations.en,
                    value_uz_cy: payload.translations.uz_cy,
                    display_order: payload.display_order
                }
            });
        } else {
            await createSettingMutation.mutateAsync(payload);
        }
        setSettingModalVisible(false);
    };

    const tumanList = cascaderData.map((item: any) => ({
        id: item.id,
        value: item.value,
        label: item.label,
        translations: item.translations,
        display_order: item.display_order
    }));

    const getFlattenedKvartilData = () => {
        const flattened: any[] = [];
        cascaderData.forEach((tuman: any) => {
            flattened.push({
                id: tuman.id,
                value: tuman.value,
                display_order: tuman.display_order ?? 0,
                parent_id: null,
                translations: tuman.translations
            });
            if (tuman.children) {
                tuman.children.forEach((kvartil: any) => {
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
            {/* Global Settings */}
            <div className="admin-card p-6 border-l-4 border-primary">
                <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Sozlamalar</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    🌐 Ko'p tilni qo'llab-quvvatlovchi tizim sozlamalari
                </p>

                <div className="space-y-4">
                    <div>
                        <Label className="flex items-center gap-2 mb-2">
                            🤖 Telegram Bot Token
                        </Label>
                        <div className="relative">
                            <Input
                                type={showToken ? "text" : "password"}
                                value={globalConfig.telegram_bot_token}
                                onChange={(e) => setGlobalConfig({ ...globalConfig, telegram_bot_token: e.target.value })}
                            />
                            <button
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <Label>📊 Glavniy App Script URL</Label>
                        <Input
                            value={globalConfig.glavniy_app_script_url}
                            onChange={(e) => setGlobalConfig({ ...globalConfig, glavniy_app_script_url: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label>📱 Kompaniya Telefon Raqami</Label>
                        <Input
                            value={globalConfig.company_phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            maxLength={13}
                        />
                    </div>

                    <div>
                        <Label>💬 Default Telegram Chat ID</Label>
                        <Input
                            value={globalConfig.default_telegram_chat_id}
                            onChange={(e) => setGlobalConfig({ ...globalConfig, default_telegram_chat_id: e.target.value })}
                        />
                    </div>

                    <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={handleGlobalConfigSave}
                        disabled={updateGlobalConfigMutation.isPending}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Global Sozlamalarni Saqlash
                    </Button>
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
                    {/* Content will be rendered based on activeSubTab */}
                    {activeSubTab === "telegram" && (
                        <TelegramChatsContent
                            telegramChats={telegramChats}
                            onAdd={() => {
                                setEditingChat(null);
                                setChatForm({ chatName: '', chatId: '', display_order: 0 });
                                setChatModalVisible(true);
                            }}
                            onEdit={(chat) => {
                                setEditingChat(chat);
                                setChatForm({
                                    chatName: chat.chat_name,
                                    chatId: chat.chat_id,
                                    display_order: chat.display_order
                                });
                                setChatModalVisible(true);
                            }}
                            onDelete={(id) => deleteChatMutation.mutate(id)}
                        />
                    )}

                    {activeSubTab === "tuman" && (
                        <TumanKvartilContent
                            data={getFlattenedKvartilData()}
                            currentLang={currentLang}
                            onLangChange={setCurrentLang}
                            onAdd={() => {
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
                            }}
                            onEdit={(item) => {
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
                            }}
                            onDelete={(id) => deleteSettingMutation.mutate(id)}
                            tumanList={tumanList}
                        />
                    )}

                    {(activeSubTab === "balkon" || activeSubTab === "uy-turi" ||
                        activeSubTab === "planirovka" || activeSubTab === "xolati" ||
                        activeSubTab === "torets") && (
                        <SettingsCategoryContent
                            category={activeSubTab.replace('-', '_')}
                            title={subTabs.find(t => t.id === activeSubTab)?.label || ''}
                            data={settings[activeSubTab.replace('-', '_')] || []}
                            currentLang={currentLang}
                            onLangChange={setCurrentLang}
                            onAdd={() => {
                                setCurrentCategory(activeSubTab.replace('-', '_'));
                                setEditingSetting(null);
                                setSettingForm({
                                    value_uz: '',
                                    value_ru: '',
                                    value_en: '',
                                    value_uz_cy: '',
                                    display_order: 0
                                });
                                setSettingModalVisible(true);
                            }}
                            onEdit={(item) => {
                                setCurrentCategory(activeSubTab.replace('-', '_'));
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
                            }}
                            onDelete={(id) => deleteSettingMutation.mutate(id)}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            {chatModalVisible && (
                <Modal
                    title={editingChat ? '✏️ Chat Tahrirlash' : '➕ Yangi Chat'}
                    onClose={() => setChatModalVisible(false)}
                    onSubmit={handleSubmitChat}
                >
                    <div className="space-y-4">
                        <div>
                            <Label>Chat Nomi *</Label>
                            <Input
                                value={chatForm.chatName}
                                onChange={(e) => setChatForm({ ...chatForm, chatName: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Chat ID *</Label>
                            <Input
                                value={chatForm.chatId}
                                onChange={(e) => setChatForm({ ...chatForm, chatId: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Tartib</Label>
                            <Input
                                type="number"
                                value={chatForm.display_order}
                                onChange={(e) => setChatForm({ ...chatForm, display_order: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {kvartilModalVisible && (
                <Modal
                    title={editingKvartil ? '✏️ Tahrirlash' : '➕ Yangi Qo\'shish'}
                    onClose={() => setKvartilModalVisible(false)}
                    onSubmit={handleSubmitKvartil}
                >
                    <div className="space-y-4">
                        <div>
                            <Label>🇺🇿 O'zbekcha *</Label>
                            <Input
                                value={kvartilForm.value_uz}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_uz: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>🇷🇺 Русский</Label>
                            <Input
                                value={kvartilForm.value_ru}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_ru: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>🇬🇧 English</Label>
                            <Input
                                value={kvartilForm.value_en}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_en: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>🇺🇿 Ўзбекча</Label>
                            <Input
                                value={kvartilForm.value_uz_cy}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, value_uz_cy: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Turi</Label>
                            <Select
                                value={kvartilForm.parentId || "none"}
                                onValueChange={(value) => setKvartilForm({ ...kvartilForm, parentId: value === "none" ? null : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tuman tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">TUMAN</SelectItem>
                                    {tumanList.map(tuman => (
                                        <SelectItem key={tuman.id} value={tuman.id}>{tuman.value}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tartib</Label>
                            <Input
                                type="number"
                                value={kvartilForm.display_order}
                                onChange={(e) => setKvartilForm({ ...kvartilForm, display_order: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {settingModalVisible && (
                <Modal
                    title={editingSetting ? '✏️ Tahrirlash' : '➕ Yangi qo\'shish'}
                    onClose={() => setSettingModalVisible(false)}
                    onSubmit={handleSubmitSetting}
                >
                    <div className="space-y-4">
                        <div>
                            <Label>🇺🇿 O'zbekcha *</Label>
                            <Input
                                value={settingForm.value_uz}
                                onChange={(e) => setSettingForm({ ...settingForm, value_uz: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>🇷🇺 Русский</Label>
                            <Input
                                value={settingForm.value_ru}
                                onChange={(e) => setSettingForm({ ...settingForm, value_ru: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>🇬🇧 English</Label>
                            <Input
                                value={settingForm.value_en}
                                onChange={(e) => setSettingForm({ ...settingForm, value_en: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>🇺🇿 Ўзбекча</Label>
                            <Input
                                value={settingForm.value_uz_cy}
                                onChange={(e) => setSettingForm({ ...settingForm, value_uz_cy: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Tartib</Label>
                            <Input
                                type="number"
                                value={settingForm.display_order}
                                onChange={(e) => setSettingForm({ ...settingForm, display_order: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// Helper Components
function Modal({ title, onClose, onSubmit, children }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose}><X className="h-5 w-5" /></button>
                </div>
                {children}
                <div className="flex gap-2 pt-4">
                    <Button onClick={onSubmit} className="flex-1">Saqlash</Button>
                    <Button variant="outline" onClick={onClose} className="flex-1">Bekor qilish</Button>
                </div>
            </div>
        </div>
    );
}

function TelegramChatsContent({ telegramChats, onAdd, onEdit, onDelete }: any) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-medium">💬 Telegram Guruh Chatlari</h4>
                <Button className="bg-success hover:bg-success/90" onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yangi Chat
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
                    {telegramChats.map((chat: any) => (
                        <TableRow key={chat.id}>
                            <TableCell>
                                <Badge variant="outline" className="border-primary text-primary">
                                    💬 {chat.chat_name}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <code className="bg-muted px-2 py-1 rounded text-sm">{chat.chat_id}</code>
                            </TableCell>
                            <TableCell>{chat.display_order}</TableCell>
                            <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                    <Button size="sm" onClick={() => onEdit(chat)}>
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Tahrirlash
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="action-btn-danger"
                                        onClick={() => {
                                            if (confirm("O'chirmoqchimisiz?")) onDelete(chat.id);
                                        }}
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

function TumanKvartilContent({ data, currentLang, onLangChange, onAdd, onEdit, onDelete, tumanList }: any) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium">📍 Tuman va Kvartillar</h4>
                    <div className="flex items-center gap-3 mt-2">
                        <Label>Til:</Label>
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
                </div>
                <Button className="bg-success hover:bg-success/90" onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yangi Qo'shish
                </Button>
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
                    {data.map((item: any) => {
                        const translations = item.translations || {};
                        const currentValue = translations[currentLang] || item.value;
                        return (
                            <TableRow key={item.id} className={item.parent_id ? "bg-muted/20" : ""}>
                                <TableCell>
                                    {item.parent_id ? (
                                        <span style={{ paddingLeft: 24 }}>↳ {currentValue}</span>
                                    ) : (
                                        <strong>{currentValue}</strong>
                                    )}
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
                                        <Button size="sm" onClick={() => onEdit(item)}>
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Tahrirlash
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="action-btn-danger"
                                            onClick={() => {
                                                if (confirm("O'chirmoqchimisiz?")) onDelete(item.id);
                                            }}
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

function SettingsCategoryContent({ category, title, data, currentLang, onLangChange, onAdd, onEdit, onDelete }: any) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium">{title}</h4>
                    <div className="flex items-center gap-3 mt-2">
                        <Label>Til:</Label>
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
                </div>
                <Button className="bg-success hover:bg-success/90" onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Yangi qo'shish
                </Button>
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
                    {data.map((item: any) => {
                        const translations = item.translations || {};
                        const currentValue = translations[currentLang] || item.value;
                        return (
                            <TableRow key={item.id}>
                                <TableCell><strong>{currentValue}</strong></TableCell>
                                <TableCell>{item.display_order}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button size="sm" onClick={() => onEdit(item)}>
                                            <Pencil className="h-3 w-3 mr-1" />
                                            Tahrirlash
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="action-btn-danger"
                                            onClick={() => {
                                                if (confirm("O'chirmoqchimisiz?")) onDelete(item.id);
                                            }}
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