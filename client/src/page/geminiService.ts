import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// CRITICAL: process.env.API_KEY is handled by the environment
const ai = new GoogleGenAI({ apiKey: "AIzaSyCV92wriNsJrDj4KvlOwUaywC4PolB6G7I" });

export const sendMessageToGemini = async (
  message: string,
  contextData: any[]
): Promise<string> => {
  try {
    const modelId = "gemini-2.5-flash"; // Fast and efficient for data analysis

    // Simplify context data to save tokens and improve focus
    const simplifiedContext = contextData.map(obj => ({
      location: obj.kvartil,
      narx: obj.narx,
      rooms: obj.xet,
      m2: obj.m2,
      realtor: obj.rieltor,
      phone: obj.tell,
      description: obj.opisaniya,
      status: obj.elonStatus,
      sheet_type: obj.sheet_type,
      uy_turi: obj.uy_turi,
      xolati: obj.xolati,
      torets: obj.torets,
      balkon: obj.balkon,
      rasimlar: obj.rasimlar,
    }));

    const systemInstruction = `
      Siz "Real Estate Manager" tizimining aqlli yordamchisisiz. 
      Sizning vazifangiz foydalanuvchiga ko'chmas mulk obyektlari bo'yicha yordam berishdir.
      
      Quyida hozirgi vaqtda jadvalda ko'rsatilgan uylar ro'yxati (JSON formatida) keltirilgan.
      Foydalanuvchi savollariga FAQAT shu ma'lumotlarga asoslanib javob bering.
      
      Agar foydalanuvchi narxlar, o'rtacha narx, eng qimmat yoki eng arzon uyni so'rasa, hisoblab chiqing.
      Javoblarni o'zbek tilida, samimiy va professional tarzda bering.
      
      Sen professional real estate assistant sifatida ishlaysan. Men senga obyekt haqida ma’lumot yuboraman. Ma’lumotlar quyidagi maydonlardan iborat bo‘ladi:

- sana
- m2 (kvadrat metr)
- narx
- fio
- uy_turi
- xolati
- planirovka
- balkon
- torets
- dom
- kvartira
- osmotir
- opisaniya
- rieltor
- xodim
- sheet_type (Sotuv yoki Arenda)
- rasmlar (array yoki son)
- xet (xona/etaj/etajnist — masalan “2/5/9”)

Sen har bir obyektni 0 dan 10 gacha ball bilan baholaysan va OLX-ga chiqarishga arziydimi-yo‘qligini aniqlaysan.
barchasida ham toliq malumot bolmasligi mumkun agar bosh bolsa 0 ball berasa
===============================================
🏠 BAHOLASH KRITERIYALARI (0–10 ball)
===============================================

1) Narx m² — 0–3 ball
   Agar sheet_type = “Sotuv” bo‘lsa:
      - Narx bozorga nisbatan juda yuqori → 0–1 ball
      - O‘rtacha → 2 ball
      - Arzon yoki yaxshi taklif → 3 ball

   Agar sheet_type = “Arenda” bo‘lsa:
      - Tuman bo‘yicha ijaraga nisbatan qimmat → 0–1 ball
      - O‘rtacha → 2 ball
      - Arzon / sifatiga mos → 3 ball

2) Holati (xolati) — 0–2 ball
   - Kapital remont / juda yomon → 0
   - Sredniy → 1
   - Yaxshi / remont → 2

3) Etaj / Xona (xet) — 0–2 ball
   Xet formatini o‘qi: xona/etaj/etajnist
   - 1-etaj yoki oxirgi etaj + minus → 0
   - O‘rtacha → 1
   - Optimal (2–3 xona, etaj 2–8) → 2

4) Rasmlar (rasmlar) — 0–2 ball
   - 0–2 ta rasm → 0
   - 3–4 ta rasm → 1
   - 5+ rasm → 2

5) Balkon / Torets — 0–1 ball
   - torets = ha → 0
   - balkon = ha va torets = yo‘q → 1

===============================================
📊 YAKUNIY QOIDA
===============================================
8+ ball  → "OLX ga chiqar"
6–7 ball → "Kelishilgan holda chiqar"
0–5 ball → "Vaqt sarflama"

===============================================
📌 NATIJA FORMAT
===============================================
Obyektni quydagicha formatda bahola:

{
  "narx_m2": X "m2",
  "holati": X "holati",
  "etaj_xona": X "xona/etaj/etajnist",
  "rasmlar": X "rasmlar",
  "balkon_torets": X "balkon_torets",
  "jami_ball": X ,
  "xulosa": "..."
}

Agar kerakli ma’lumot yetarli bo‘lmasa — aniqlash uchun savol ber.

      Ma'lumotlar:
      ${JSON.stringify(simplifiedContext).slice(0, 30000)} // Limit context size if necessary
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Kechirasiz, javobni ololmadim.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring yoki API kalitini tekshiring.";
  }
};