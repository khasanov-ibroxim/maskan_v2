import { useState } from "react";
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
  Hash
} from "lucide-react";
import { cn } from "../lib/utils";

const PropertyForm = () => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [dragActive, setDragActive] = useState(false);

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
    // Handle file drop logic here
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 py-4">
        <Home className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Uy ma'lumotlari</h1>
      </div>

      {/* Form */}
      <form className="space-y-5">
        {/* Sotuv yoki Ijara */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="text-primary">*</span> Sotuv yoki Ijara
          </Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sotuv">Sotuv</SelectItem>
              <SelectItem value="ijara">Ijara</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Xona turi */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="text-primary">*</span> Xona turi
          </Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Xona turini tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 xona</SelectItem>
              <SelectItem value="2">2 xona</SelectItem>
              <SelectItem value="3">3 xona</SelectItem>
              <SelectItem value="4">4 xona</SelectItem>
              <SelectItem value="5+">5+ xona</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tuman va Kvartil */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-primary">*</span> Tuman va Kvartil
          </Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Tumanni va kvartilni tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yunusobod">Yunusobod</SelectItem>
              <SelectItem value="chilonzor">Chilonzor</SelectItem>
              <SelectItem value="mirzo-ulugbek">Mirzo Ulug'bek</SelectItem>
              <SelectItem value="sergeli">Sergeli</SelectItem>
              <SelectItem value="yakkasaroy">Yakkasaroy</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Avval tumanni, keyin kvartilni tanlang</p>
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
              className="h-12 w-16 text-center bg-card border-border rounded-xl"
            />
            <span className="text-2xl text-muted-foreground font-light">/</span>
            <Input
              type="number"
              placeholder="3"
              className="h-12 w-16 text-center bg-card border-border rounded-xl"
            />
            <span className="text-2xl text-muted-foreground font-light">/</span>
            <Input
              type="number"
              placeholder="9"
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
              className="h-12 bg-card border-border rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Kvartira</Label>
            <Input
              type="text"
              placeholder="12"
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
              type="number"
              placeholder="75000"
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
            className="h-12 bg-card border-border rounded-xl"
          />
        </div>

        {/* Rielter */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="text-primary">*</span> Rielter
          </Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Rielter tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rielter1">Aliyev Sardor</SelectItem>
              <SelectItem value="rielter2">Karimov Jasur</SelectItem>
              <SelectItem value="rielter3">Toshmatov Ulug'bek</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primichaniya */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Primichaniya (Izohlash)
          </Label>
          <Textarea
            placeholder="Remont yaxshi, mebel bor..."
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
            className="h-12 bg-card border-border rounded-xl"
          />
        </div>

        {/* Uy turi */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Uy turi</Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Uy turi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novostroyка">Novostroyka</SelectItem>
              <SelectItem value="vtorichka">Vtorichka</SelectItem>
              <SelectItem value="xovli">Xovli uy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Planirovka */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Planirovka</Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Planirovka" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standart">Standart</SelectItem>
              <SelectItem value="uluchshennaya">Uluchshennaya</SelectItem>
              <SelectItem value="individualnaya">Individual'naya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Xolati */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Xolati</Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Xolati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yaxshi">Yaxshi</SelectItem>
              <SelectItem value="orta">O'rta</SelectItem>
              <SelectItem value="yomon">Remont kerak</SelectItem>
              <SelectItem value="evro">Evro remont</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Torets */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Torets</Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Torets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ha">Ha</SelectItem>
              <SelectItem value="yoq">Yo'q</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Balkon */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Balkon</Label>
          <Select>
            <SelectTrigger className="w-full h-12 bg-card border-border rounded-xl">
              <SelectValue placeholder="Balkon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 ta</SelectItem>
              <SelectItem value="2">2 ta</SelectItem>
              <SelectItem value="yoq">Yo'q</SelectItem>
              <SelectItem value="lodjiya">Lodjiya</SelectItem>
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-14 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25"
        >
          Yuborish
        </Button>

        {/* Image Upload */}
        <div className="space-y-2 pt-2">
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
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              Rasmlarni bu yerga tashlang yoki tanlang
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG yoki JPEG fayllar qo'llanadi
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PropertyForm;
