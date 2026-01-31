import { useState } from "react";
import { Settings, MessageCircle, MapPin, LayoutGrid, Home, Layout, Tag, Truck, Plus, Pencil, Trash2, Eye, EyeOff, Save } from "lucide-react";
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

const telegramChats = [
    { id: 1, name: "Asosiy Chat", chatId: "-1003298985470", tartib: 0 },
    { id: 2, name: "test", chatId: "-1003547346867", tartib: 0 },
];

const tumanlar = [
    { id: 1, name: "Bektemir tumani", turi: "Tuman", tartib: 0, children: [
            { id: 11, name: "Bektemir", turi: "Kvartil", tartib: 0 },
            { id: 12, name: "Iqbol", turi: "Kvartil", tartib: 1 },
            { id: 13, name: "Majnuntol", turi: "Kvartil", tartib: 2 },
        ]},
];

const balkonlar = [
    { id: 1, value: "2x6", tartib: 0 },
    { id: 2, value: "2x7", tartib: 1 },
    { id: 3, value: "1.5x6", tartib: 2 },
    { id: 4, value: "2x3", tartib: 3 },
];

export function SettingsTab() {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("telegram");
    const [showToken, setShowToken] = useState(false);

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
                                        value="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef"
                                        readOnly
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
                                    value="https://script.google.com/macros/s/AKfycbyq6gf1IN-H33h9BZ8wyNri3OXtCq-5jg84I1ZQd1b2iQLFwk29Gz7BayVJtgDCMu73/exec"
                                    readOnly
                                />
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    📱 Kompaniya Telefon Raqami
                                </Label>
                                <Input value="+998970850604" readOnly />
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    💬 Default Telegram Chat ID
                                </Label>
                                <Input value="-1003298985470" readOnly />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Agar rielterga chat biriktirilmagan bo'lsa, bu chatga yuboriladi
                                </p>
                            </div>

                            <Button className="bg-primary hover:bg-primary/90">
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
                    {activeSubTab === "telegram" && (
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
                                <Button className="bg-success hover:bg-success/90">
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
                                                    💬 {chat.name}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <code className="bg-muted px-2 py-1 rounded text-sm">
                                                    {chat.chatId}
                                                </code>
                                            </TableCell>
                                            <TableCell>{chat.tartib}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button size="sm" className="action-btn-success h-8">
                                                        <Pencil className="h-3 w-3 mr-1" />
                                                        Tahrirlash
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="action-btn-danger h-8">
                                                        <Trash2 className="h-3 w-3 mr-1" />
                                                        O'chirish
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Jami: {telegramChats.length}</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled>{"<"}</Button>
                                    <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
                                    <Button variant="outline" size="sm" disabled>{">"}</Button>
                                    <Select defaultValue="10">
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10 / page</SelectItem>
                                            <SelectItem value="20">20 / page</SelectItem>
                                            <SelectItem value="50">50 / page</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === "tuman" && (
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
                                <Button className="bg-success hover:bg-success/90">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Yangi Qo'shish
                                </Button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <Label>Tuman / Kvartil</Label>
                                <Select defaultValue="uz">
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="uz">uz O'zbekcha</SelectItem>
                                        <SelectItem value="ru">ru Русский</SelectItem>
                                        <SelectItem value="en">en English</SelectItem>
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
                                    {tumanlar.map((tuman) => (
                                        <>
                                            <TableRow key={tuman.id}>
                                                <TableCell>
                                                    <div>
                                                        <strong>{tuman.name}</strong>
                                                        <p className="text-xs text-muted-foreground">
                                                            {">"} 🔄 Barcha tarjimalar
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-primary text-primary">
                                                        {tuman.turi}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{tuman.tartib}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button size="sm" className="action-btn-success h-8">
                                                            <Pencil className="h-3 w-3 mr-1" />
                                                            Tahrirlash
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="action-btn-danger h-8">
                                                            <Trash2 className="h-3 w-3 mr-1" />
                                                            O'chirish
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {tuman.children?.map((child) => (
                                                <TableRow key={child.id} className="bg-muted/20">
                                                    <TableCell className="pl-8">
                                                        <div>
                                                            <span className="text-muted-foreground">↳</span> {child.name}
                                                            <p className="text-xs text-muted-foreground">
                                                                {">"} 🔄 Barcha tarjimalar
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="border-primary text-primary">
                                                            {child.turi}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{child.tartib}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button size="sm" className="action-btn-success h-8">
                                                                <Pencil className="h-3 w-3 mr-1" />
                                                                Tahrirlash
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="action-btn-danger h-8">
                                                                <Trash2 className="h-3 w-3 mr-1" />
                                                                O'chirish
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {activeSubTab === "balkon" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium flex items-center gap-2">
                                        🏗️ Balkon
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        🌐 Balkon turlari
                                    </p>
                                </div>
                                <Button className="bg-success hover:bg-success/90">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Yangi qo'shish
                                </Button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <Label>Qiymat</Label>
                                <Select defaultValue="uz">
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="uz">uz O'zbekcha</SelectItem>
                                        <SelectItem value="ru">ru Русский</SelectItem>
                                        <SelectItem value="en">en English</SelectItem>
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
                                    {balkonlar.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div>
                                                    <strong>{item.value}</strong>
                                                    <p className="text-xs text-muted-foreground">
                                                        {">"} 🔄 Barcha tarjimalar
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.tartib}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button size="sm" className="action-btn-success h-8">
                                                        <Pencil className="h-3 w-3 mr-1" />
                                                        Tahrirlash
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="action-btn-danger h-8">
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
                    )}

                    {(activeSubTab === "uy-turi" || activeSubTab === "planirovka" || activeSubTab === "xolati" || activeSubTab === "torets") && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Bu bo'lim {subTabs.find(t => t.id === activeSubTab)?.label} sozlamalarini o'z ichiga oladi</p>
                            <Button className="mt-4 bg-success hover:bg-success/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Yangi qo'shish
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
