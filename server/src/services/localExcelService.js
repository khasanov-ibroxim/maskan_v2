// src/services/localExcelService.js
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const EXCEL_DIR = path.join(__dirname, '../../storage/excel');
const EXCEL_FILE = path.join(EXCEL_DIR, 'backup_database.xlsx');

// Excel papkasini yaratish
if (!fs.existsSync(EXCEL_DIR)) {
    fs.mkdirSync(EXCEL_DIR, { recursive: true });
    console.log('📁 Excel papka yaratildi:', EXCEL_DIR);
}

/**
 * Excel faylni yaratish yoki ochish
 */
async function getWorkbook() {
    if (fs.existsSync(EXCEL_FILE)) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(EXCEL_FILE);
        return workbook;
    } else {
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
}

/**
 * ✅ FIXED: Ma'lumotni Excel'ga saqlash
 */
async function saveToLocalExcel(data, folderLink) {
    try {
        console.log('\n💾 Lokal Excel\'ga saqlash boshlandi...');
        console.log('  Folder Link:', folderLink || 'Yo\'q');

        const workbook = await getWorkbook();
        const worksheet = workbook.getWorksheet('Ma\'lumotlar');

        if (!worksheet) {
            throw new Error('Worksheet topilmadi');
        }

        // ✅ CRITICAL FIX: Rasmlar URL ni to'g'ri saqlash
        let rasmlarUrl = folderLink || '';

        // Bo'sh yoki null bo'lsa, "Yo'q" deb belgilash
        if (!rasmlarUrl || rasmlarUrl === 'null' || rasmlarUrl === 'undefined') {
            rasmlarUrl = 'Yo\'q';
        }

        console.log('  Saqlanadigan URL:', rasmlarUrl);

        // Yangi qator qo'shish
        const newRow = {
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
            rasmlar: rasmlarUrl  // ✅ To'g'ri URL
        };

        worksheet.addRow(newRow);

        // Saqlash
        await workbook.xlsx.writeFile(EXCEL_FILE);

        console.log('✅ Lokal Excel\'ga saqlandi');
        console.log('   Fayl:', EXCEL_FILE);
        console.log('   Qatorlar:', worksheet.rowCount);
        console.log('   URL:', rasmlarUrl);

        return true;

    } catch (error) {
        console.error('❌ Lokal Excel\'ga saqlashda xato:', error.message);
        console.error('   Stack:', error.stack);
        throw error;
    }
}

/**
 * Excel fayldan ma'lumotlarni o'qish
 */
async function readFromLocalExcel() {
    try {
        if (!fs.existsSync(EXCEL_FILE)) {
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
 * Excel faylni tozalash (faqat header qoldirish)
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

        // Yangi fayl yaratish (faqat header bilan)
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