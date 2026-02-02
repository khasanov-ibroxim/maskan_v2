// client/src/components/UsersTab.tsx (OPTIMIZED VERSION)
import { useState } from "react";
import { Plus, RefreshCw, Download, Pencil, Trash2, User, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { useToast } from "../hooks/use-toast";
import { useAppStore } from "../stores/useAppStore";
import {
    useUsers,
    useActiveSessions,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    useTelegramChats,
} from "../hooks/useQueries";
import api from "../utils/api";

interface UserFormData {
    username: string;
    password?: string;
    fullName: string;
    role: string;
    appScriptUrl?: string;
    telegramChatId?: string;
    telegramThemeId?: string;
    phone?: string;
}

interface UsersTabProps {
    onRefresh?: () => void;
}

export function UsersTab({ onRefresh }: UsersTabProps) {
    const { toast } = useToast();

    // Zustand state
    const {
        userModalVisible,
        setUserModalVisible,
        editingUser,
        setEditingUser,
    } = useAppStore();

    // React Query hooks
    const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers();
    const { data: sessions = [] } = useActiveSessions();
    const { data: telegramChats = [] } = useTelegramChats();

    const createUserMutation = useCreateUser();
    const updateUserMutation = useUpdateUser();
    const deleteUserMutation = useDeleteUser();

    // Local form state
    const [formData, setFormData] = useState<UserFormData>({
        username: '',
        password: '',
        fullName: '',
        role: 'user',
        appScriptUrl: '',
        telegramChatId: '',
        telegramThemeId: '',
        phone: ''
    });

    const handleAdd = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            password: '',
            fullName: '',
            role: 'user',
            appScriptUrl: '',
            telegramChatId: '',
            telegramThemeId: '',
            phone: ''
        });
        setUserModalVisible(true);
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            fullName: user.fullName,
            role: user.role,
            appScriptUrl: user.appScriptUrl || '',
            telegramChatId: user.telegram_chat_id || '',
            telegramThemeId: user.telegramThemeId || '',
            phone: user.phone || ''
        });
        setUserModalVisible(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Userni o'chirmoqchimisiz?")) return;

        await deleteUserMutation.mutateAsync(userId);
        onRefresh?.();
    };

    const handleSubmit = async () => {
        if (!formData.username || !formData.fullName) {
            toast({
                title: "Xato",
                description: "Username va to'liq ism majburiy!",
                variant: "destructive"
            });
            return;
        }

        if (!editingUser && !formData.password) {
            toast({
                title: "Xato",
                description: "Parol majburiy!",
                variant: "destructive"
            });
            return;
        }

        const payload: any = {
            username: formData.username,
            fullName: formData.fullName,
            role: formData.role
        };

        if (formData.password) {
            payload.password = formData.password;
        }

        if (formData.role === 'rieltor') {
            payload.appScriptUrl = formData.appScriptUrl;
            if (formData.telegramChatId && formData.telegramChatId !== 'none') {
                payload.telegramChatId = formData.telegramChatId;
            }
            if (formData.telegramThemeId) {
                payload.telegramThemeId = formData.telegramThemeId;
            }
        }

        if (formData.role === 'individual_rieltor') {
            if (!formData.phone || !/^\+998\d{9}$/.test(formData.phone)) {
                toast({
                    title: "Xato",
                    description: "Telefon formatida xato! (+998XXXXXXXXX)",
                    variant: "destructive"
                });
                return;
            }
            payload.phone = formData.phone;
            if (formData.telegramChatId && formData.telegramChatId !== 'none') {
                payload.telegramChatId = formData.telegramChatId;
            }
            if (formData.telegramThemeId) {
                payload.telegramThemeId = formData.telegramThemeId;
            }
        }

        if (editingUser) {
            await updateUserMutation.mutateAsync({ id: editingUser.id, data: payload });
        } else {
            await createUserMutation.mutateAsync(payload);
        }

        setUserModalVisible(false);
        onRefresh?.();
    };

    const handlePhoneChange = (value: string) => {
        let input = value.replace(/\D/g, '');
        if (!input.startsWith('998')) input = '998' + input;
        let formatted = '+' + input.substring(0, 12);
        setFormData({ ...formData, phone: formatted });
    };

    const handleDownloadBackup = async () => {
        try {
            toast({
                title: "Yuklanmoqda...",
                description: "Excel backup tayyorlanmoqda"
            });

            const response = await api.get('/api/excel/export', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast({
                title: "Muvaffaqiyatli",
                description: "Backup yuklandi"
            });
        } catch (error: any) {
            console.error('Error downloading backup:', error);
            toast({
                title: "Xato",
                description: "Yuklashda xato",
                variant: "destructive"
            });
        }
    };

    const isOnline = (userId: string) => {
        return sessions.some(s => s.userId === userId);
    };

    const getRoleConfig = (role: string) => {
        const configs: Record<string, { color: string; icon: string; label: string }> = {
            admin: { color: 'border-red-500 text-red-700', icon: '👑', label: 'ADMIN' },
            rieltor: { color: 'border-blue-500 text-blue-700', icon: '🏠', label: 'RIELTOR' },
            individual_rieltor: { color: 'border-purple-500 text-purple-700', icon: '📱', label: 'INDIVIDUAL_RIELTOR' },
            user: { color: 'border-green-500 text-green-700', icon: '👤', label: 'USER' }
        };
        return configs[role] || configs.user;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/90" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi User
                    </Button>
                    <Button variant="outline" onClick={() => refetchUsers()} disabled={usersLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                        Yangilash
                    </Button>
                    <Button variant="outline" onClick={handleDownloadBackup}>
                        <Download className="h-4 w-4 mr-2" />
                        Excel Backup
                    </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary border border-primary/30 rounded-md px-3 py-1.5">
                    <RefreshCw className="h-4 w-4" />
                    <span>Avtomatik yangilanish: har 10 daqiqada</span>
                </div>
            </div>

            {/* Table */}
            <div className="admin-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Username</TableHead>
                            <TableHead>To'liq ism</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user: any) => {
                            const roleConfig = getRoleConfig(user.role);
                            const online = isOnline(user.id);

                            return (
                                <TableRow key={user.id} className="hover:bg-muted/30">
                                    <TableCell className="font-medium text-primary">
                                        {user.username}
                                    </TableCell>
                                    <TableCell>{user.fullName}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${roleConfig.color} bg-transparent`}>
                                            <User className="h-3 w-3 mr-1" />
                                            {roleConfig.icon} {roleConfig.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={online
                                                ? "border-success text-success bg-success/5"
                                                : "border-muted-foreground text-muted-foreground"
                                            }
                                        >
                                            {online ? 'Online' : 'Offline'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                size="sm"
                                                className="action-btn-success h-8"
                                                onClick={() => handleEdit(user)}
                                                disabled={user.role === 'admin'}
                                            >
                                                <Pencil className="h-3 w-3 mr-1" />
                                                Tahrirlash
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="action-btn-danger h-8"
                                                onClick={() => handleDelete(user.id)}
                                                disabled={user.role === 'admin' || deleteUserMutation.isPending}
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

            {/* Modal */}
            {userModalVisible && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                {editingUser ? 'User Tahrirlash' : 'Yangi User'}
                            </h2>
                            <button onClick={() => setUserModalVisible(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>Username *</Label>
                                <Input
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="john_doe"
                                />
                            </div>

                            <div>
                                <Label>{editingUser ? 'Yangi parol (ixtiyoriy)' : 'Parol *'}</Label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingUser ? "Bo'sh qoldiring agar o'zgartirmasangiz" : "Kamida 5 ta belgi"}
                                />
                            </div>

                            <div>
                                <Label>To'liq ism *</Label>
                                <Input
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <Label>Role *</Label>
                                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">👤 User</SelectItem>
                                        <SelectItem value="rieltor">🏠 Rieltor</SelectItem>
                                        <SelectItem value="individual_rieltor">📱 Individual Rieltor</SelectItem>
                                        <SelectItem value="admin">👑 Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.role === 'rieltor' && (
                                <>
                                    <div>
                                        <Label>Telegram Chat</Label>
                                        <Select
                                            value={formData.telegramChatId || "none"}
                                            onValueChange={(value) => setFormData({ ...formData, telegramChatId: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chat tanlang (ixtiyoriy)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Bo'sh</SelectItem>
                                                {telegramChats.map((chat: any) => (
                                                    <SelectItem key={chat.id} value={chat.id}>
                                                        {chat.chat_name} ({chat.chat_id})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Telegram Theme ID</Label>
                                        <Input
                                            type="number"
                                            value={formData.telegramThemeId}
                                            onChange={(e) => setFormData({ ...formData, telegramThemeId: e.target.value })}
                                            placeholder="65 (ixtiyoriy)"
                                        />
                                    </div>

                                    <div>
                                        <Label>App Script URL *</Label>
                                        <Input
                                            value={formData.appScriptUrl}
                                            onChange={(e) => setFormData({ ...formData, appScriptUrl: e.target.value })}
                                            placeholder="https://script.google.com/..."
                                        />
                                    </div>
                                </>
                            )}

                            {formData.role === 'individual_rieltor' && (
                                <>
                                    <div>
                                        <Label>Telegram Chat</Label>
                                        <Select
                                            value={formData.telegramChatId || "none"}
                                            onValueChange={(value) => setFormData({ ...formData, telegramChatId: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chat tanlang (ixtiyoriy)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Bo'sh</SelectItem>
                                                {telegramChats.map((chat: any) => (
                                                    <SelectItem key={chat.id} value={chat.id}>
                                                        {chat.chat_name} ({chat.chat_id})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Telegram Theme ID</Label>
                                        <Input
                                            type="number"
                                            value={formData.telegramThemeId}
                                            onChange={(e) => setFormData({ ...formData, telegramThemeId: e.target.value })}
                                            placeholder="65 (ixtiyoriy)"
                                        />
                                    </div>

                                    <div>
                                        <Label>Telefon raqami *</Label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            placeholder="+998901234567"
                                            maxLength={13}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleSubmit}
                                    className="flex-1"
                                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                                >
                                    {editingUser ? 'Yangilash' : 'Yaratish'}
                                </Button>
                                <Button variant="outline" onClick={() => setUserModalVisible(false)} className="flex-1">
                                    Bekor qilish
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UsersTab;