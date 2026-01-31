import { useState } from "react";
import { Search, RefreshCw, Upload, Pencil, Trash2, FolderOpen, Megaphone } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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

const mockObjects = [
    {
        id: 1,
        uuid: "c8aeca5a-ce2c-4478-a26c-80cae5239d4f",
        kvartil: "Yunusobod - 7",
        xet: "2/1/4",
        m2: 55,
        narx: 500,
        turi: "Arenda",
        telefon: "+998 97 766 67 19",
        rieltor: "Javohir",
    },
    {
        id: 2,
        uuid: "d7bfdb6b-df3d-5589-b37d-91dbf6340e5g",
        kvartil: "Chilonzor - 12",
        xet: "3/2/5",
        m2: 72,
        narx: 85000,
        turi: "Sotish",
        telefon: "+998 90 123 45 67",
        rieltor: "Laziz",
    },
    {
        id: 3,
        uuid: "e8cgec7c-eg4e-6690-c48e-02ecg7451f6h",
        kvartil: "Sergeli - 3",
        xet: "1/1/2",
        m2: 45,
        narx: 350,
        turi: "Arenda",
        telefon: "+998 91 234 56 78",
        rieltor: "Ahmad",
    },
];

export function ObjectsTab() {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="admin-card p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Qidirish (kvartil, telefon, rieltor...)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Input placeholder="ID" className="w-24" />
                    <Select>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Kvartil" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="yunusobod">Yunusobod</SelectItem>
                            <SelectItem value="chilonzor">Chilonzor</SelectItem>
                            <SelectItem value="sergeli">Sergeli</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Rieltor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="javohir">Javohir</SelectItem>
                            <SelectItem value="laziz">Laziz</SelectItem>
                            <SelectItem value="ahmad">Ahmad</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger className="w-28">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Faol</SelectItem>
                            <SelectItem value="inactive">Nofaol</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input placeholder="Min narx" className="w-28" type="number" />
                    <Input placeholder="Max narx" className="w-28" type="number" />
                    <Button variant="outline" size="sm">
                        Tozalash
                    </Button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/80">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Yangilash
                    </Button>
                    <Button className="bg-[#F59F0A] hover:bg-[#F59F0A]/80">
                        <Upload className="h-4 w-4 mr-2" />
                        Uploads Backup (ZIP)
                    </Button>
                </div>
                <span className="text-sm text-muted-foreground">
          Ko'rsatilmoqda: <strong>20</strong> / {mockObjects.length}
        </span>
            </div>

            {/* Table */}
            <div className="admin-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-12">№</TableHead>
                            <TableHead className="w-32">№</TableHead>
                            <TableHead>Kvartil</TableHead>
                            <TableHead>X/E/T</TableHead>
                            <TableHead>M²</TableHead>
                            <TableHead>Narx ($)</TableHead>
                            <TableHead>Turi</TableHead>
                            <TableHead>Telefon</TableHead>
                            <TableHead>Rieltor</TableHead>
                            <TableHead className="text-center">Amallar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockObjects.map((obj) => (
                            <TableRow key={obj.id} className="hover:bg-muted/30">
                                <TableCell className="text-primary font-medium">{obj.id}</TableCell>
                                <TableCell className="text-xs text-muted-foreground font-mono">
                                    {obj.uuid.slice(0, 8)}...
                                </TableCell>
                                <TableCell>{obj.kvartil}</TableCell>
                                <TableCell>{obj.xet}</TableCell>
                                <TableCell>{obj.m2}</TableCell>
                                <TableCell className="text-success font-semibold">${obj.narx}</TableCell>
                                <TableCell>{obj.turi}</TableCell>
                                <TableCell>{obj.telefon}</TableCell>
                                <TableCell>{obj.rieltor}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors">
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <button className="p-1.5 rounded hover:bg-muted transition-colors">
                                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <Button size="sm" className="bg-primary hover:bg-primary/80 h-7 px-2">
                                            <Megaphone className="h-3 w-3 mr-1" />
                                            E'lon
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
