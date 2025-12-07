// ============================================
// server/src/services/localExcelService.js
// ✅ FIXED: Ustma-ust yozilmasligi va saralash qo'shildi
// ============================================

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const EXCEL_DIR = path.join(__dirname, '../../storage/excel');
const EXCEL_FILE = path.join(EXCEL_DIR, 'backup_database.xlsx');

console.log('\n📂 EXCEL KONFIGURATSIYASI:');
console.log('  Excel dir:', EXCEL_DIR);
console.log('  Excel file:', EXCEL_FILE);

// Excel papkasini yaratish
if (!fs.existsSync(EXCEL_DIR)) {
    fs.mkdirSync(EXCEL_DIR, { recursive: true });
    console.log('✅ Excel papka yaratildi:', EXCEL_DIR);
} else {
    console.log('✅ Excel papka mavjud');
}

/**
 * ✅ Kvartil tartiblash funksiyasi (Google Sheets kabi)
 */
function getKvartilOrder(kvartil) {
    kvartil = String(kvartil || '').trim();

    if (!kvartil || kvartil === '') {
        return { group: 9999, number: 0 };
    }

    // Yunusobod-N
    if (/^Yunusobod\s*-\s*\d+$/i.test(kvartil)) {
        const match = kvartil.match(/\d+/);
        const num = match ? parseInt(match[0]) : 999;

        if (num === 0) {
            return { group: 1, number: 9999 };
        }

        if (num >= 1 && num <= 19) {
            return { group: 1, number: num };
        }

        return { group: 1, number: num };
    }

    // Ц-N
    if (/^Ц\s*-\s*\d+$/i.test(kvartil)) {
        const match = kvartil.match(/\d+/);
        return { group: 2, number: match ? parseInt(match[0]) : 0 };
    }

    // Bodomzor
    if (/^Bodomzor$/i.test(kvartil)) {
        return { group: 3, number: 0 };
    }

    // Minor
    if (/^Minor$/i.test(kvartil)) {
        return { group: 4, number: 0 };
    }

    // Ll-N
    if (/^Ll\s*-\s*\d+$/i.test(kvartil)) {
        const match = kvartil.match(/\d+/);
        return { group: 5, number: match ? parseInt(match[0]) : 0 };
    }

    return { group: 999, number: 0 };
}

/**
 * ✅ XET bo'yicha saralash (1/2/3 format)
 */
function parseXET(xet) {
    const cleanXet = String(xet || '').replace(/^'/, '').trim();
    const parts = cleanXet.split('/').map(s => parseInt(s) || 0);
    return {
        xona: parts[0] || 0,
        etaj: parts[1] || 0,
        etajnost: parts[2] || 0
    };
}

/**
 * ✅ Barcha ma'lumotlarni saralash
 */
function sortExcelData(data) {
    console.log('🔄 Ma\'lumotlarni saralash boshlandi...');

    return data.sort((a, b) => {
        // 1. Kvartil bo'yicha
        const orderA = getKvartilOrder(a.kvartil);
        const orderB = getKvartilOrder(b.kvartil);

        if (orderA.group !== orderB.group) {
            return orderA.group - orderB.group;
        }
        if (orderA.number !== orderB.number) {
            return orderA.number - orderB.number;
        }

        // 2. XET bo'yicha
        const xetA = parseXET(a.xet);
        const xetB = parseXET(b.xet);

        if (xetA.xona !== xetB.xona) return xetA.xona - xetB.xona;
        if (xetA.etaj !== xetB.etaj) return xetA.etaj - xetB.etaj;
        return xetA.etajnost - xetB.etajnost;
    });
}

/**
 * Excel faylni yaratish yoki ochish
 */
async function getWorkbook() {
    try {
        if (fs.existsSync(EXCEL_FILE)) {
            console.log('📖 Mavjud Excel faylni ochish...');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(EXCEL_FILE);
            console.log('✅ Excel fayl ochildi');
            return workbook;
        } else {
            console.log('📝 Yangi Excel fayl yaratish...');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Ma\'lumotlar');

            // Header yaratish
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 15 },
                { header: 'Sana', key: 'sana', width: 20 },
                { header: 'Kvartil', key: 'kvartil', width: 20 },
                { header: 'X/E/T', key: 'xet', width: 15 },
                { header: 'Telefon', key: 'tell', width: 15 },
                { header: 'M²', key: 'm2', width: 10 },
                { header: 'Narxi ($)', key: 'narx', width: 12 },
                { header: 'F.I.O', key: 'fio', width: 20 },
                { header: 'Uy turi', key: 'uy_turi', width: 15 },
                { header: 'Xolati', key: 'xolati', width: 15 },
                { header: 'Planirovka', key: 'planirovka', width: 15 },
                { header: 'Balkon', key: 'balkon', width: 10 },
                { header: 'Torets', key: 'torets', width: 10 },
                { header: 'Dom', key: 'dom', width: 15 },
                { header: 'Kvartira', key: 'kvartira', width: 15 },
                { header: 'Osmotir', key: 'osmotir', width: 20 },
                { header: 'Opisaniya', key: 'opisaniya', width: 30 },
                { header: 'Rieltor', key: 'rieltor', width: 15 },
                { header: 'Xodim', key: 'xodim', width: 15 },
                { header: 'Sheet Type', key: 'sheetType', width: 12 },
                { header: 'Rasmlar URL', key: 'rasmlar', width: 50 }
            ];

            // Header styling
            worksheet.getRow(1).font = { bold: true, size: 12 };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4285F4' }
            };
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

            await workbook.xlsx.writeFile(EXCEL_FILE);
            console.log('✅ Yangi Excel fayl yaratildi:', EXCEL_FILE);

            return workbook;
        }
    } catch (error) {
        console.error('❌ Workbook olishda xato:', error.message);
        throw error;
    }
}

/**
 * ✅ FIXED: Ma'lumotni Excel'ga saqlash (Saralash bilan)
 */
async function saveToLocalExcel(data, folderLink) {
    console.log('\n' + '='.repeat(60));
    console.log('💾 LOKAL EXCEL\'GA SAQLASH BOSHLANDI');
    console.log('='.repeat(60));

    try {
        // 1. Ma'lumotlarni tekshirish
        console.log('1️⃣ Ma\'lumotlarni tekshirish:');
        console.log('  Kvartil:', data.kvartil || 'YO\'Q');
        console.log('  XET:', data.xet || 'YO\'Q');
        console.log('  Folder Link:', folderLink || 'YO\'Q');

        if (!data.kvartil || !data.xet) {
            throw new Error('Minimal ma\'lumotlar topilmadi (kvartil yoki xet)');
        }

        // 2. Workbook olish
        console.log('\n2️⃣ Workbook olish...');
        const workbook = await getWorkbook();

        // 3. Worksheet olish
        console.log('\n3️⃣ Worksheet olish...');
        let worksheet = workbook.getWorksheet('Ma\'lumotlar');

        if (!worksheet) {
            throw new Error('Worksheet "Ma\'lumotlar" topilmadi');
        }

        const currentRows = worksheet.rowCount;
        console.log('  Joriy qatorlar soni:', currentRows);

        // 4. Rasmlar URL ni to'g'ri saqlash
        let rasmlarUrl = folderLink || '';
        if (!rasmlarUrl || rasmlarUrl === 'null' || rasmlarUrl === 'undefined') {
            rasmlarUrl = 'Yo\'q';
        }

        // 5. ✅ Yangi ma'lumot yaratish
        console.log('\n5️⃣ Yangi ma\'lumot yaratish...');
        const newEntry = {
            id: Date.now().toString(),
            sana: data.sana || new Date().toLocaleString('uz-UZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            kvartil: data.kvartil || '',
            xet: data.xet || '',
            tell: data.tell || '',
            m2: data.m2 || '',
            narx: data.narx || '',
            fio: data.fio || '',
            uy_turi: data.uy_turi || '',
            xolati: data.xolati || '',
            planirovka: data.planirovka || '',
            balkon: data.balkon || '',
            torets: data.torets || '',
            dom: data.dom || '',
            kvartira: data.kvartira || '',
            osmotir: data.osmotir || '',
            opisaniya: data.opisaniya || '',
            rieltor: data.rieltor || '',
            xodim: data.xodim || '',
            sheetType: data.sheetType || 'Sotuv',
            rasmlar: rasmlarUrl
        };

        // 6. ✅ Eski ma'lumotlarni o'qish
        console.log('\n6️⃣ Eski ma\'lumotlarni o\'qish...');
        const existingData = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Header'ni o'tkazish

            existingData.push({
                id: row.getCell(1).value,
                sana: row.getCell(2).value,
                kvartil: row.getCell(3).value,
                xet: row.getCell(4).value,
                tell: row.getCell(5).value,
                m2: row.getCell(6).value,
                narx: row.getCell(7).value,
                fio: row.getCell(8).value,
                uy_turi: row.getCell(9).value,
                xolati: row.getCell(10).value,
                planirovka: row.getCell(11).value,
                balkon: row.getCell(12).value,
                torets: row.getCell(13).value,
                dom: row.getCell(14).value,
                kvartira: row.getCell(15).value,
                osmotir: row.getCell(16).value,
                opisaniya: row.getCell(17).value,
                rieltor: row.getCell(18).value,
                xodim: row.getCell(19).value,
                sheetType: row.getCell(20).value,
                rasmlar: row.getCell(21).value
            });
        });

        console.log(`  Mavjud ma'lumotlar: ${existingData.length} ta`);

        // 7. ✅ Yangi ma'lumotni qo'shish
        existingData.push(newEntry);
        console.log(`\n7️⃣ Jami ma'lumotlar: ${existingData.length} ta`);

        // 8. ✅ Saralash
        console.log('\n8️⃣ Saralash boshlandi...');
        const sortedData = sortExcelData(existingData);
        console.log('  ✅ Saralash tugadi');

        // 9. ✅ Worksheet'ni tozalash va qayta yozish
        console.log('\n9️⃣ Worksheet\'ni qayta yozish...');

        // Eski worksheet'ni o'chirish
        workbook.removeWorksheet(worksheet.id);

        // Yangi worksheet yaratish
        worksheet = workbook.addWorksheet('Ma\'lumotlar');

        // Header qo'shish
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Sana', key: 'sana', width: 20 },
            { header: 'Kvartil', key: 'kvartil', width: 20 },
            { header: 'X/E/T', key: 'xet', width: 15 },
            { header: 'Telefon', key: 'tell', width: 15 },
            { header: 'M²', key: 'm2', width: 10 },
            { header: 'Narxi ($)', key: 'narx', width: 12 },
            { header: 'F.I.O', key: 'fio', width: 20 },
            { header: 'Uy turi', key: 'uy_turi', width: 15 },
            { header: 'Xolati', key: 'xolati', width: 15 },
            { header: 'Planirovka', key: 'planirovka', width: 15 },
            { header: 'Balkon', key: 'balkon', width: 10 },
            { header: 'Torets', key: 'torets', width: 10 },
            { header: 'Dom', key: 'dom', width: 15 },
            { header: 'Kvartira', key: 'kvartira', width: 15 },
            { header: 'Osmotir', key: 'osmotir', width: 20 },
            { header: 'Opisaniya', key: 'opisaniya', width: 30 },
            { header: 'Rieltor', key: 'rieltor', width: 15 },
            { header: 'Xodim', key: 'xodim', width: 15 },
            { header: 'Sheet Type', key: 'sheetType', width: 12 },
            { header: 'Rasmlar URL', key: 'rasmlar', width: 50 }
        ];

        // Header styling
        worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4285F4' }
        };

        // ✅ Saralangan ma'lumotlarni yozish
        sortedData.forEach(row => {
            worksheet.addRow(row);
        });

        console.log(`  ✅ ${sortedData.length} ta qator yozildi`);

        // 10. ✅ Faylga saqlash
        console.log('\n🔟 Faylga saqlash...');
        await workbook.xlsx.writeFile(EXCEL_FILE);

        // 11. Tekshirish
        console.log('\n1️⃣1️⃣ Saqlash tekshiruvi:');
        const fileExists = fs.existsSync(EXCEL_FILE);
        console.log('  Fayl mavjudmi:', fileExists ? '✅ HA' : '❌ YO\'Q');

        if (fileExists) {
            const stats = fs.statSync(EXCEL_FILE);
            console.log('  Fayl hajmi:', (stats.size / 1024).toFixed(2), 'KB');
            console.log('  Oxirgi o\'zgarish:', stats.mtime.toLocaleString('uz-UZ'));
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅✅✅ EXCEL\'GA MUVAFFAQIYATLI SAQLANDI!');
        console.log('  Jami:', sortedData.length, 'ta qator');
        console.log('  Yangi ma\'lumot ID:', newEntry.id);
        console.log('='.repeat(60) + '\n');

        return true;

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌❌❌ EXCEL\'GA SAQLASHDA XATO:');
        console.error('='.repeat(60));
        console.error('  Message:', error.message);
        console.error('  Stack:', error.stack);
        console.error('='.repeat(60) + '\n');

        throw error;
    }
}

/**
 * Excel fayldan ma'lumotlarni o'qish
 */
async function readFromLocalExcel() {
    try {
        if (!fs.existsSync(EXCEL_FILE)) {
            console.log('ℹ️ Excel fayl topilmadi');
            return [];
        }

        const workbook = await getWorkbook();
        const worksheet = workbook.getWorksheet('Ma\'lumotlar');

        if (!worksheet) {
            return [];
        }

        const data = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Header'ni o'tkazib yuborish

            const rowData = {
                id: row.getCell(1).value,
                sana: row.getCell(2).value,
                kvartil: row.getCell(3).value,
                xet: row.getCell(4).value,
                tell: row.getCell(5).value,
                m2: row.getCell(6).value,
                narx: row.getCell(7).value,
                fio: row.getCell(8).value,
                uy_turi: row.getCell(9).value,
                xolati: row.getCell(10).value,
                planirovka: row.getCell(11).value,
                balkon: row.getCell(12).value,
                torets: row.getCell(13).value,
                dom: row.getCell(14).value,
                kvartira: row.getCell(15).value,
                osmotir: row.getCell(16).value,
                opisaniya: row.getCell(17).value,
                rieltor: row.getCell(18).value,
                xodim: row.getCell(19).value,
                sheetType: row.getCell(20).value,
                rasmlar: row.getCell(21).value
            };

            data.push(rowData);
        });

        console.log(`📊 Excel'dan ${data.length} ta qator o'qildi`);
        return data;

    } catch (error) {
        console.error('❌ Excel\'dan o\'qishda xato:', error.message);
        return [];
    }
}

/**
 * Excel faylni tozalash
 */
async function clearLocalExcel() {
    try {
        console.log('🧹 Excel faylni tozalash boshlandi...');

        if (!fs.existsSync(EXCEL_FILE)) {
            console.log('ℹ️ Excel fayl topilmadi');
            return false;
        }

        // Backup yaratish
        const backupFile = EXCEL_FILE.replace('.xlsx', `_backup_${Date.now()}.xlsx`);
        fs.copyFileSync(EXCEL_FILE, backupFile);
        console.log('💾 Backup yaratildi:', backupFile);

        // Faylni o'chirish
        fs.unlinkSync(EXCEL_FILE);

        // Yangi fayl yaratish
        await getWorkbook();

        console.log('✅ Excel fayl tozalandi');
        return true;

    } catch (error) {
        console.error('❌ Excel tozalashda xato:', error.message);
        return false;
    }
}

/**
 * Excel statistikasini olish
 */
async function getExcelStats() {
    try {
        const data = await readFromLocalExcel();

        const stats = {
            totalRows: data.length,
            byKvartil: {},
            byRieltor: {},
            bySheetType: {},
            lastEntry: data[data.length - 1] || null,
            fileSize: fs.existsSync(EXCEL_FILE)
                ? (fs.statSync(EXCEL_FILE).size / 1024).toFixed(2) + ' KB'
                : '0 KB'
        };

        // Kvartil bo'yicha
        data.forEach(row => {
            const kvartil = row.kvartil || 'Noma\'lum';
            stats.byKvartil[kvartil] = (stats.byKvartil[kvartil] || 0) + 1;
        });

        // Rieltor bo'yicha
        data.forEach(row => {
            const rieltor = row.rieltor || 'Noma\'lum';
            stats.byRieltor[rieltor] = (stats.byRieltor[rieltor] || 0) + 1;
        });

        // Sheet type bo'yicha
        data.forEach(row => {
            const type = row.sheetType || 'Sotuv';
            stats.bySheetType[type] = (stats.bySheetType[type] || 0) + 1;
        });

        return stats;

    } catch (error) {
        console.error('❌ Statistika olishda xato:', error.message);
        return null;
    }
}

module.exports = {
    saveToLocalExcel,
    readFromLocalExcel,
    clearLocalExcel,
    getExcelStats
};