import { useState, useEffect } from "react";
import {
    Search, RefreshCw, Plus, Pencil, Trash2, User, Home, Phone,
    MapPin, X
} from "lucide-react";
import { Button } from "./ui/button";
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
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";
import api from "../utils/api";

interface Client {
    id: string;
    full_name: string;
    phone: string;
    rooms: number[];
    floor_min: number | null;
    floor_max: number | null;
    total_floors_min: number | null;
    total_floors_max: number | null;
    price_min: number | null;
    price_max: number | null;
    notes: string;
    preferred_locations: Array<{ tuman: string; kvartils: string[] }>;
    assigned_realtor_id: string | null;
    assigned_realtor_name: string | null;
    assigned_objects: any[];
    status: string;
}

interface Realtor {
    id: string;
    full_name: string;
    username: string;
    role: string;
}

interface ClientsTabProps {
    onRefresh?: () => void;
}

export function ClientsTab({ onRefresh }: ClientsTabProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [realtors, setRealtors] = useState<Realtor[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        rooms: [] as number[],
        floorMin: null as number | null,
        floorMax: null as number | null,
        totalFloorsMin: null as number | null,
        totalFloorsMax: null as number | null,
        priceMin: null as number | null,
        priceMax: null as number | null,
        notes: '',
        preferredLocations: [] as Array<{ tuman: string; kvartils: string[] }>
    });

    useEffect(() => {
        loadClients();
        loadRealtors();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/clients');
            if (response.data.success) {
                setClients(response.data.data || []);
            }
        } catch (error: any) {
            console.error('Error loading clients:', error);
            toast({
                title: "Xato",
                description: "Clientlarni yuklashda xato",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const loadRealtors = async () => {
        try {
            const response = await api.get('/api/users/realtors');
            if (response.data.success) {
                setRealtors(response.data.realtors || []);
            }
        } catch (error) {
            console.error('Error loading realtors:', error);
        }
    };

    const handleAdd = () => {
        setEditingClient(null);
        setFormData({
            fullName: '',
            phone: '',
            rooms: [],
            floorMin: null,
            floorMax: null,
            totalFloorsMin: null,
            totalFloorsMax: null,
            priceMin: null,
            priceMax: null,
            notes: '',
            preferredLocations: []
        });
        setModalVisible(true);
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setFormData({
            fullName: client.full_name || '',
            phone: client.phone || '',
            rooms: client.rooms || [],
            floorMin: client.floor_min,
            floorMax: client.floor_max,
            totalFloorsMin: client.total_floors_min,
            totalFloorsMax: client.total_floors_max,
            priceMin: client.price_min,
            priceMax: client.price_max,
            notes: client.notes || '',
            preferredLocations: client.preferred_locations || []
        });
        setModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Clientni o'chirmoqchimisiz?")) return;

        try {
            await api.delete(`/api/clients/${id}`);
            toast({
                title: "Muvaffaqiyatli",
                description: "Client o'chirildi"
            });
            loadClients();
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error('Error deleting client:', error);
            toast({
                title: "Xato",
                description: error.response?.data?.error || "O'chirishda xato",
                variant: "destructive"
            });
        }
    };

    const handleSubmit = async () => {
        if (!formData.fullName || !formData.phone) {
            toast({
                title: "Xato",
                description: "Ism va telefon majburiy!",
                variant: "destructive"
            });
            return;
        }

        if (!/^\+998\d{9}$/.test(formData.phone)) {
            toast({
                title: "Xato",
                description: "Telefon formatida xato! (+998XXXXXXXXX)",
                variant: "destructive"
            });
            return;
        }

        try {
            const payload = {
                fullName: formData.fullName,
                phone: formData.phone,
                rooms: formData.rooms,
                floorMin: formData.floorMin,
                floorMax: formData.floorMax,
                totalFloorsMin: formData.totalFloorsMin,
                totalFloorsMax: formData.totalFloorsMax,
                priceMin: formData.priceMin,
                priceMax: formData.priceMax,
                notes: formData.notes,
                preferredLocations: formData.preferredLocations || []
            };

            if (editingClient) {
                await api.put(`/api/clients/${editingClient.id}`, payload);
                toast({
                    title: "Muvaffaqiyatli",
                    description: "Client yangilandi"
                });
            } else {
                await api.post('/api/clients', payload);
                toast({
                    title: "Muvaffaqiyatli",
                    description: "Client qo'shildi"
                });
            }

            setModalVisible(false);
            loadClients();
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error('Error saving client:', error);
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Saqlashda xato",
                variant: "destructive"
            });
        }
    };

    const handleAssignRealtor = async (clientId: string, realtorId: string) => {
        try {
            // Handle "none" as null
            const assignId = realtorId === "none" ? null : realtorId;

            await api.post(`/api/clients/${clientId}/assign-realtor`, {
                realtorId: assignId
            });

            toast({
                title: "Muvaffaqiyatli",
                description: assignId ? "Rieltor biriktirildi" : "Rieltor ajratildi"
            });

            loadClients();
        } catch (error: any) {
            console.error('Error assigning realtor:', error);
            toast({
                title: "Xato",
                description: error.response?.data?.error || "Xato yuz berdi",
                variant: "destructive"
            });
        }
    };

    const handlePhoneChange = (value: string) => {
        let input = value.replace(/\D/g, '');
        if (!input.startsWith('998')) input = '998' + input;
        let formatted = '+' + input.substring(0, 12);
        setFormData({ ...formData, phone: formatted });
    };

    const filteredClients = clients.filter(client =>
        client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="admin-card p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Qidirish (ism, telefon...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                        Tozalash
                    </Button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/80" onClick={handleAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi Client
                    </Button>
                    <Button className="bg-primary hover:bg-primary/80" onClick={loadClients}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Yangilash
                    </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                    Jami: <strong>{filteredClients.length}</strong>
                </span>
            </div>

            {/* Table */}
            <div className="admin-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>F.I.O</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Xonalar</TableHead>
                            <TableHead>Narx oralig'i</TableHead>
                            <TableHead>Manzillar</TableHead>
                            <TableHead>Rieltor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClients.map((client) => (
                            <TableRow key={client.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <strong>{client.full_name}</strong>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        {client.phone}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {(client.rooms || []).map(r => (
                                            <Badge key={r} variant="outline" className="border-primary text-primary">
                                                {r}-xona
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {client.price_min && client.price_max ? (
                                        <div className="text-sm">
                                            <div>${client.price_min.toLocaleString()}</div>
                                            <div className="text-muted-foreground">- ${client.price_max.toLocaleString()}</div>
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell>
                                    {client.preferred_locations && client.preferred_locations.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {client.preferred_locations.slice(0, 2).map((loc, idx) => (
                                                <Badge key={idx} variant="outline" className="border-purple-500 text-purple-700">
                                                    <MapPin className="h-3 w-3 mr-1" />
                                                    {loc.tuman}
                                                </Badge>
                                            ))}
                                            {client.preferred_locations.length > 2 && (
                                                <Badge variant="outline">+{client.preferred_locations.length - 2}</Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <Badge variant="outline">Belgilanmagan</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={client.assigned_realtor_id || "none"}
                                        onValueChange={(value) => handleAssignRealtor(client.id, value)}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Rieltor tanlang" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Bo'sh</SelectItem>
                                            {realtors.map(r => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={
                                        client.status === 'active'
                                            ? 'border-success text-success'
                                            : 'border-muted-foreground'
                                    }>
                                        {client.status === 'active' ? 'Faol' : 'Faol emas'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            className="p-1.5 rounded hover:bg-muted transition-colors"
                                            onClick={() => handleEdit(client)}
                                        >
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <button
                                            className="p-1.5 rounded hover:bg-muted transition-colors"
                                            onClick={() => handleDelete(client.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Modal */}
            {modalVisible && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                {editingClient ? 'Client Tahrirlash' : 'Yangi Client'}
                            </h2>
                            <button onClick={() => setModalVisible(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>To'liq ism *</Label>
                                <Input
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Ali Valiyev"
                                />
                            </div>

                            <div>
                                <Label>Telefon raqam *</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    placeholder="+998901234567"
                                    maxLength={13}
                                />
                            </div>

                            <div>
                                <Label>Narx oralig'i ($)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Min"
                                        value={formData.priceMin || ''}
                                        onChange={(e) => setFormData({ ...formData, priceMin: e.target.value ? Number(e.target.value) : null })}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Max"
                                        value={formData.priceMax || ''}
                                        onChange={(e) => setFormData({ ...formData, priceMax: e.target.value ? Number(e.target.value) : null })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Izohlar</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Qo'shimcha ma'lumotlar..."
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleSubmit} className="flex-1">
                                    {editingClient ? 'Yangilash' : 'Qo\'shish'}
                                </Button>
                                <Button variant="outline" onClick={() => setModalVisible(false)} className="flex-1">
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

export default ClientsTab;