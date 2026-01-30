import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { format } from "date-fns";
import {
  Home,
  Upload,
  CalendarIcon,
  Clock,
  DollarSign,
  Phone,
  User,
  MapPin,
  Building,
  FileText,
  Hash,
  X,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useRealtors, useSettings, useCascaderData } from "../hooks/useApi";
import api from "../utils/api";

// Helper functions
const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
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
          ctx?.drawImage(img, 0, 0, width, height);
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

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

interface UploadedImage {
  file: File;
  preview: string;
  base64?: string;
}

interface FormData {
  sheetType: string;
  sheetName: string;
  tuman: string;
  kvartil: string;
  xona: string;
  etaj: string;
  etajnost: string;
  dom: string;
  kvartira: string;
  m2: string;
  narx: string;
  tell: string;
  rieltor: string;
  opisaniya: string;
  fio: string;
  id: string;
  uy_turi: string;
  planirovka: string;
  xolati: string;
  torets: string;
  balkon: string;
}

const PropertyForm = () => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form data
  const [formData, setFormData] = useState<Partial<FormData>>({});

  // API hooks
  const { realtors, loading: realtorsLoading, error: realtorsError, reload: reloadRealtors } = useRealtors();
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();
  const { cascaderData, loading: cascaderLoading, error: cascaderError, reload: reloadCascader } = useCascaderData();

  // Load saved sheet from localStorage
  useEffect(() => {
    const savedSheet = localStorage.getItem("selectedSheetName");
    const savedSheetType = localStorage.getItem("selectedSheetType");
    if (savedSheet || savedSheetType) {
      setFormData(prev => ({
        ...prev,
        sheetName: savedSheet || undefined,
        sheetType: savedSheetType || undefined
      }));
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: FileList) => {
    const validFiles = Array.from(files).filter(
        (file) => file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/jpg"
    );

    if (uploadedImages.length + validFiles.length > 10) {
      alert("Maksimal 10 ta rasm yuklash mumkin!");
      return;
    }

    const newImages = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setUploadedImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const formatPhoneNumber = (value: string) => {
    let input = value.replace(/\D/g, "");
    if (!input.startsWith("998")) input = "998" + input;
    let formatted = "+998";
    if (input.length > 3) formatted += " " + input.substring(3, 5);
    if (input.length > 5) formatted += " " + input.substring(5, 8);
    if (input.length > 8) formatted += " " + input.substring(8, 10);
    if (input.length > 10) formatted += " " + input.substring(10, 12);
    return formatted;
  };

  const formatPrice = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sheetType || !formData.sheetName || !formData.tuman || !formData.kvartil ||
        !formData.xona || !formData.etaj || !formData.etajnost || !formData.m2 ||
        !formData.narx || !formData.tell || !formData.rieltor) {
      alert("Iltimos, barcha majburiy maydonlarni to'ldiring!");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Build data
      const now = new Date();
      const currentDateTime = `${String(now.getDate()).padStart(2, "0")}.${String(
          now.getMonth() + 1
      ).padStart(2, "0")}.${now.getFullYear()} ${String(now.getHours()).padStart(
          2,
          "0"
      )}:${String(now.getMinutes()).padStart(2, "0")}`;

      const xet = `${formData.xona}/${formData.etaj}/${formData.etajnost}`;

      let osmotir = "";
      if (date || time) {
        const sana = date ? format(date, "dd.MM.yyyy") : "";
        osmotir = (sana + (sana && time ? " " : "") + time).trim();
      }

      // Compress images
      setUploadProgress(20);
      const rasmlarBase64 = await Promise.all(
          uploadedImages.map(async (img) => {
            if (img.base64) return img.base64;
            const blob = await compressImage(img.file);
            const b64 = await blobToBase64(blob);
            img.base64 = b64;
            return b64;
          })
      );

      setUploadProgress(50);

      const userData = (() => {
        try {
          const u = localStorage.getItem("userData");
          return u ? JSON.parse(u) : null;
        } catch {
          return null;
        }
      })();

      const dataToSend = {
        sheetName: formData.sheetName?.replace(/\s*xona\s*/gi, '').trim(),
        sheetType: formData.sheetType,
        kvartil: formData.kvartil,
        xet,
        tell: formData.tell,
        m2: formData.m2 || "",
        opisaniya: formData.opisaniya || "",
        narx: formData.narx?.replace(/\s/g, "") || "",
        fio: formData.fio || "",
        id: formData.id || "",
        rieltor: formData.rieltor,
        sana: currentDateTime,
        xodim: userData?.username || "",
        rasmlar: rasmlarBase64.filter(Boolean),
        uy_turi: formData.uy_turi || "",
        planirovka: formData.planirovka || "",
        xolati: formData.xolati || "",
        torets: formData.torets || "",
        balkon: formData.balkon || "",
        osmotir: osmotir || "",
        dom: formData.dom || "",
        kvartira: formData.kvartira || "",
      };

      console.log("📤 Serverga yuborilmoqda:", dataToSend);

      setUploadProgress(70);

      const formDataToSend = new FormData();
      formDataToSend.append("data", JSON.stringify(dataToSend));
      uploadedImages.forEach((img) => {
        formDataToSend.append("images", img.file);
      });

      const response = await api.post('/api/send-data', formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      setUploadProgress(100);

      console.log("✅ Server javobi:", response.data);

      if (response.data.success) {
        alert("✅ Ma'lumotlar muvaffaqiyatli yuborildi!");

        // Reset form
        setFormData({
          sheetName: formData.sheetName,
          sheetType: formData.sheetType
        });
        setUploadedImages([]);
        setDate(undefined);
        setTime("");
      } else {
        alert("❌ Server xatosi: " + (response.data.error || "Noma'lum xato"));
      }

      setTimeout(() => setUploadProgress(0), 1500);

    } catch (err: any) {
      console.error("❌ Xatolik:", err);
      alert(`❌ Xatolik: ${err.response?.data?.error || err.message}`);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Get Tuman options
  const tumanOptions = cascaderData.map(item => ({
    value: item.value,
    label: item.label
  }));

  // Get Kvartil options based on selected Tuman
  const kvartilOptions = formData.tuman
      ? (cascaderData.find(t => t.value === formData.tuman)?.children || [])
      : [];

  return (
      <div className="w-full max-w-lg mx-auto p-4 pb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-4">
          <Home className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Uy ma'lumotlari</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Sotuv yoki Ijara */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="text-primary">*</span> Sotuv yoki Ijara
            </Label>
            <Select
                value={formData.sheetType}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, sheetType: value }));
                  localStorage.setItem("selectedSheetType", value);
                }}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sotuv">Sotuv</SelectItem>
                <SelectItem value="Arenda">Ijara</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Xona turi */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="text-primary">*</span> Xona turi
            </Label>
            <Select
                value={formData.sheetName}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, sheetName: value }));
                  localStorage.setItem("selectedSheetName", value);
                }}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder="Xona turini tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 xona">1 xona</SelectItem>
                <SelectItem value="2 xona">2 xona</SelectItem>
                <SelectItem value="3 xona">3 xona</SelectItem>
                <SelectItem value="4 xona">4 xona</SelectItem>
                <SelectItem value="5 xona">5 xona</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tuman */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-primary">*</span> Tuman
            </Label>
            <Select
                value={formData.tuman}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, tuman: value, kvartil: "" }));
                }}
                disabled={cascaderLoading}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder={cascaderLoading ? "Yuklanmoqda..." : "Tumanni tanlang"} />
              </SelectTrigger>
              <SelectContent>
                {tumanOptions.map((tuman) => (
                    <SelectItem key={tuman.value} value={tuman.value}>
                      {tuman.label}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cascaderError && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>{cascaderError}</span>
                  <button
                      type="button"
                      onClick={reloadCascader}
                      className="underline hover:no-underline"
                  >
                    Qayta yuklash
                  </button>
                </div>
            )}
          </div>

          {/* Kvartil */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="text-primary">*</span> Kvartil
            </Label>
            <Select
                value={formData.kvartil}
                onValueChange={(value) => setFormData(prev => ({ ...prev, kvartil: value }))}
                disabled={!formData.tuman}
            >
              <SelectTrigger className={`w-full h-12 bg-card border-border rounded-xl ${!formData.tuman ? 'opacity-50' : ''}`}>
                <SelectValue placeholder={formData.tuman ? "Kvartilni tanlang" : "Avval tumanni tanlang"} />
              </SelectTrigger>
              <SelectContent>
                {kvartilOptions.map((kvartil) => (
                    <SelectItem key={kvartil.value} value={kvartil.value}>
                      {kvartil.label}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.tuman && (
                <p className="text-xs text-muted-foreground">
                  {tumanOptions.find(t => t.value === formData.tuman)?.label} tumaniga tegishli kvartillar
                </p>
            )}
          </div>

          {/* X/E/ET */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="text-primary">*</span> X/E/ET (xona / etaj / etajnost)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                  type="number"
                  placeholder="2"
                  value={formData.xona || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, xona: e.target.value }))}
                  className="h-12 w-16 text-center bg-card border-border rounded-xl"
                  max={formData.sheetName ? parseInt(formData.sheetName) : undefined}
              />
              <span className="text-2xl text-muted-foreground font-light">/</span>
              <Input
                  type="number"
                  placeholder="3"
                  value={formData.etaj || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, etaj: e.target.value }))}
                  className="h-12 w-16 text-center bg-card border-border rounded-xl"
              />
              <span className="text-2xl text-muted-foreground font-light">/</span>
              <Input
                  type="number"
                  placeholder="9"
                  value={formData.etajnost || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, etajnost: e.target.value }))}
                  className="h-12 w-16 text-center bg-card border-border rounded-xl"
              />
            </div>
          </div>

          {/* Dom va Kvartira */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> Dom
              </Label>
              <Input
                  type="text"
                  placeholder="1"
                  value={formData.dom || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, dom: e.target.value }))}
                  className="h-12 bg-card border-border rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Kvartira</Label>
              <Input
                  type="text"
                  placeholder="12"
                  value={formData.kvartira || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, kvartira: e.target.value }))}
                  className="h-12 bg-card border-border rounded-xl"
              />
            </div>
          </div>

          {/* M² (Maydon) */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="text-primary">*</span> M² (Maydon)
            </Label>
            <Input
                type="number"
                placeholder="65"
                value={formData.m2 || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, m2: e.target.value }))}
                className="h-12 bg-card border-border rounded-xl"
            />
          </div>

          {/* Narxi (USD) */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="text-primary">*</span> Narxi (USD)
            </Label>
            <div className="relative">
              <Input
                  type="text"
                  placeholder="75000"
                  value={formData.narx || ""}
                  onChange={(e) => {
                    const formatted = formatPrice(e.target.value);
                    setFormData(prev => ({ ...prev, narx: formatted }));
                  }}
                  className="h-12 bg-card border-border rounded-xl pr-10"
              />
              <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Telefon raqami */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              <span className="text-primary">*</span> Telefon raqami
            </Label>
            <Input
                type="tel"
                placeholder="+998 90 123 45 67"
                value={formData.tell || ""}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setFormData(prev => ({ ...prev, tell: formatted }));
                }}
                maxLength={17}
                className="h-12 bg-card border-border rounded-xl"
            />
          </div>

          {/* Rielter */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <span className="text-primary">*</span> Rielter
            </Label>
            <Select
                value={formData.rieltor}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rieltor: value }))}
                disabled={realtorsLoading}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder={realtorsLoading ? "Yuklanmoqda..." : "Rielter tanlang"} />
              </SelectTrigger>
              <SelectContent>
                {realtors.map((realtor) => (
                    <SelectItem key={realtor.id} value={realtor.username}>
                      {realtor.full_name} ({realtor.username})
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {realtorsError && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>{realtorsError}</span>
                  <button
                      type="button"
                      onClick={reloadRealtors}
                      className="underline hover:no-underline"
                  >
                    Qayta yuklash
                  </button>
                </div>
            )}
          </div>

          {/* Primichaniya */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Primichaniya (Izohlash)
            </Label>
            <Textarea
                placeholder="Remont yaxshi, mebel bor..."
                value={formData.opisaniya || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, opisaniya: e.target.value }))}
                className="min-h-[100px] bg-card border-border rounded-xl resize-none"
            />
          </div>

          {/* F.I.O */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> F.I.O (Egasining ismi)
            </Label>
            <Input
                type="text"
                placeholder="Aliyev Vali"
                value={formData.fio || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, fio: e.target.value }))}
                className="h-12 bg-card border-border rounded-xl"
            />
          </div>

          {/* ID */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" /> ID
            </Label>
            <Input
                type="text"
                placeholder="12345"
                value={formData.id || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                className="h-12 bg-card border-border rounded-xl"
            />
          </div>

          {/* Uy turi */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Uy turi</Label>
            <Select
                value={formData.uy_turi}
                onValueChange={(value) => setFormData(prev => ({ ...prev, uy_turi: value }))}
                disabled={settingsLoading}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder="Uy turi" />
              </SelectTrigger>
              <SelectContent>
                {(settings.uy_turi || []).map((item: any) => (
                    <SelectItem key={item.id} value={item.value}>
                      {item.value}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Planirovka */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Planirovka</Label>
            <Select
                value={formData.planirovka}
                onValueChange={(value) => setFormData(prev => ({ ...prev, planirovka: value }))}
                disabled={settingsLoading}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder="Planirovka" />
              </SelectTrigger>
              <SelectContent>
                {(settings.planirovka || []).map((item: any) => (
                    <SelectItem key={item.id} value={item.value}>
                      {item.value}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Xolati */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Xolati</Label>
            <Select
                value={formData.xolati}
                onValueChange={(value) => setFormData(prev => ({ ...prev, xolati: value }))}
                disabled={settingsLoading}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder="Xolati" />
              </SelectTrigger>
              <SelectContent>
                {(settings.xolati || []).map((item: any) => (
                    <SelectItem key={item.id} value={item.value}>
                      {item.value}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Torets */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Torets</Label>
            <Select
                value={formData.torets}
                onValueChange={(value) => setFormData(prev => ({ ...prev, torets: value }))}
                disabled={settingsLoading}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder="Torets" />
              </SelectTrigger>
              <SelectContent>
                {(settings.torets || []).map((item: any) => (
                    <SelectItem key={item.id} value={item.value}>
                      {item.value}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balkon */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Balkon</Label>
            <Select
                value={formData.balkon}
                onValueChange={(value) => setFormData(prev => ({ ...prev, balkon: value }))}
                disabled={settingsLoading}
            >
              <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
                <SelectValue placeholder="Balkon" />
              </SelectTrigger>
              <SelectContent>
                {(settings.balkon || []).map((item: any) => (
                    <SelectItem key={item.id} value={item.value}>
                      {item.value}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Osmotir vaqti */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" /> Osmotir vaqti
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                      variant="outline"
                      className={cn(
                          "h-12 w-full justify-start text-left font-normal bg-card border-border rounded-xl",
                          !date && "text-muted-foreground"
                      )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Sana"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <div className="relative">
                <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="--:--"
                    className="h-12 bg-card border-border rounded-xl pr-10"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {uploadProgress < 50 && "Rasmlar yuklanmoqda..."}
                  {uploadProgress >= 50 && uploadProgress < 100 && "Serverga yuborilmoqda..."}
                  {uploadProgress === 100 && "✅ Bajarildi!"}
                </p>
              </div>
          )}

          {/* Submit Button */}
          <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25"
          >
            {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Yuborilmoqda...
                </>
            ) : (
                "Yuborish"
            )}
          </Button>

          {/* Image Upload */}
          <div className="space-y-3 pt-2">
            <Label className="text-sm text-muted-foreground">Rasmlar</Label>

            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                    "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer",
                    dragActive
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                )}
            >
              <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                Rasmlarni bu yerga tashlang yoki tanlang
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG yoki JPEG fayllar qo'llanadi (maks. 10 ta)
              </p>
            </div>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-card border border-border">
                        <img
                            src={image.preview}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive/90 rounded-full hover:bg-destructive transition-colors"
                        >
                          <X className="h-3 w-3 text-destructive-foreground" />
                        </button>
                      </div>
                  ))}
                </div>
            )}
          </div>
        </form>
      </div>
  );
};

export default PropertyForm;