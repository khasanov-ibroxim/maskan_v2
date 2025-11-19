const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { UPLOADS_DIR } = require('../config/constants');

async function downloadZip(req, res) {
    try {
        const { files, folderName } = req.body;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "Fayllar ro'yxati bo'sh" });
        }

        console.log(`📦 ZIP yaratilmoqda: ${files.length} ta fayl`);

        const zipFileName = `${folderName || 'files'}_${Date.now()}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', (err) => {
            console.error('❌ ZIP xato:', err);
            res.status(500).json({ error: err.message });
        });

        archive.pipe(res);

        for (const fileUrl of files) {
            try {
                const relativePath = fileUrl.replace('/browse/', '');
                const decodedPath = decodeURIComponent(relativePath);
                const fullPath = path.join(UPLOADS_DIR, decodedPath);

                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                    const fileName = path.basename(fullPath);
                    archive.file(fullPath, { name: fileName });
                    console.log(`  ✅ Qo'shildi: ${fileName}`);
                } else {
                    console.log(`  ⚠️ Topilmadi: ${decodedPath}`);
                }
            } catch (err) {
                console.error(`  ❌ Xato: ${fileUrl}`, err.message);
            }
        }

        await archive.finalize();
        console.log(`✅ ZIP yaratildi: ${zipFileName}`);

    } catch (error) {
        console.error("❌ ZIP yaratishda xato:", error);
        res.status(500).json({ error: error.message });
    }
}

function browsePath(req, res) {
    const requestedPath = req.params[0] || '';

    try {
        // Absolyut yo'l yaratish (process.cwd() dan boshlab)
        const baseDir = path.join(process.cwd(), UPLOADS_DIR);
        const fullPath = path.join(baseDir, requestedPath);

        // Xavfsizlik tekshiruvi
        if (!fullPath.startsWith(baseDir)) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).send(`
                <html>
                    <head>
                        <title>404 - Topilmadi</title>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial; padding: 50px; text-align: center; }
                            h1 { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <h1>❌ 404 - Papka topilmadi</h1>
                        <p>${requestedPath}</p>
                        <a href="/browse">← Bosh sahifa</a>
                    </body>
                </html>
            `);
        }

        const stats = fs.statSync(fullPath);

        // Agar fayl bo'lsa - yuklab berish (FIXED)
        if (stats.isFile()) {
            return res.sendFile(fullPath);
        }

        // Agar papka bo'lsa - HTML render
        if (stats.isDirectory()) {
            const files = fs.readdirSync(fullPath);

            const items = files.map(file => {
                const itemPath = path.join(fullPath, file);
                const itemStats = fs.statSync(itemPath);

                let relativePath = path
                    .relative(baseDir, itemPath)
                    .replace(/\\/g, '/')
                    .replace(/^\/+/, '');

                return {
                    name: file,
                    isDirectory: itemStats.isDirectory(),
                    size: itemStats.isFile() ? itemStats.size : null,
                    path: relativePath,
                    url: `/browse/${encodeURIComponent(relativePath)}`
                };
            });

            items.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });

            const breadcrumbs = requestedPath
                ? requestedPath.split('/').filter(Boolean)
                : [];

            let breadcrumbHTML = '<a href="/browse" style="color: #fff;">🏠 Bosh sahifa</a>';
            let currentPath = '';
            breadcrumbs.forEach(crumb => {
                currentPath += '/' + crumb;
                const decodedCrumb = decodeURIComponent(crumb);
                breadcrumbHTML += ` / <a href="/browse${encodeURI(currentPath)}" style="color: #fff;">${decodedCrumb}</a>`;
            });

            const imageFiles = items.filter(item => !item.isDirectory && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name));
            const textFiles = items.filter(item => !item.isDirectory && /\.(txt)$/i.test(item.name));
            const otherFiles = items.filter(item => !item.isDirectory && !imageFiles.includes(item) && !textFiles.includes(item));
            const directories = items.filter(item => item.isDirectory);

            const allFiles = items.filter(item => !item.isDirectory);

            return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>📁 ${requestedPath || 'Bosh sahifa'}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        padding: 20px;
                    }
                    .container {
                        max-width: 1400px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                    }
                    .header h1 {
                        font-size: 32px;
                        margin-bottom: 15px;
                    }
                    .breadcrumbs {
                        font-size: 14px;
                        opacity: 0.9;
                    }
                    .breadcrumbs a {
                        color: white;
                        text-decoration: none;
                        padding: 5px 10px;
                        border-radius: 5px;
                        transition: 0.3s;
                    }
                    .breadcrumbs a:hover {
                        background: rgba(255,255,255,0.2);
                    }
                    .content {
                        padding: 30px;
                    }
                    .actions {
                        margin-bottom: 20px;
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    }
                    .btn {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: 0.3s;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .btn-primary {
                        background: #667eea;
                        color: white;
                    }
                    .btn-primary:hover {
                        background: #5568d3;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                    }
                    .btn-success {
                        background: #10b981;
                        color: white;
                    }
                    .btn-success:hover {
                        background: #059669;
                    }
                    .btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .section {
                        margin-bottom: 30px;
                    }
                    .section h2 {
                        color: #333;
                        font-size: 20px;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #667eea;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                        gap: 20px;
                    }
                    .item {
                        background: #f8f9fa;
                        border-radius: 12px;
                        padding: 15px;
                        transition: 0.3s;
                        cursor: pointer;
                        position: relative;
                    }
                    .item:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    }
                    .item.directory {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .item-icon {
                        font-size: 48px;
                        margin-bottom: 10px;
                        text-align: center;
                    }
                    .item-name {
                        font-weight: 600;
                        margin-bottom: 5px;
                        word-break: break-word;
                    }
                    .item-size {
                        font-size: 12px;
                        opacity: 0.7;
                    }
                    .checkbox-wrapper {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                    }
                    .checkbox-wrapper input[type="checkbox"] {
                        width: 20px;
                        height: 20px;
                        cursor: pointer;
                    }
                    .image-preview {
                        width: 100%;
                        height: 150px;
                        object-fit: cover;
                        border-radius: 8px;
                        margin-bottom: 10px;
                    }
                    .list-view {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .list-item {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        transition: 0.3s;
                    }
                    .list-item:hover {
                        background: #e9ecef;
                    }
                    @media (max-width: 768px) {
                        .grid {
                            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                            gap: 10px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📁 File Browser</h1>
                        <div class="breadcrumbs">${breadcrumbHTML}</div>
                    </div>
                    
                    <div class="content">
                        ${allFiles.length > 0 ? `
                            <div class="actions">
                                <button class="btn btn-primary" onclick="selectAll()">
                                    ✅ Barchasini tanlash
                                </button>
                                <button class="btn btn-primary" onclick="deselectAll()">
                                    ❌ Tanlashni bekor qilish
                                </button>
                                <button class="btn btn-success" id="downloadBtn" onclick="downloadSelected()" disabled>
                                    📦 ZIP yuklab olish (<span id="selectedCount">0</span>)
                                </button>
                            </div>
                        ` : ''}

                        ${directories.length > 0 ? `
                            <div class="section">
                                <h2>📁 Papkalar (${directories.length})</h2>
                                <div class="grid">
                                    ${directories.map(item => `
                                        <div class="item directory" onclick="window.location.href='${item.url}'">
                                            <div class="item-icon">📁</div>
                                            <div class="item-name">${item.name}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                    

${imageFiles.length > 0 ? `
    <div class="section">
        <h2>🖼️ Rasmlar (${imageFiles.length})</h2>
        <div class="grid">
            ${imageFiles.map(item => `
                <div class="item">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" class="file-checkbox" value="/browse/${encodeURIComponent(item.path)}" onchange="updateSelection()">
                    </div>
                   
                    <img 
                        src="/browse/${encodeURIComponent(item.path)}" 
                        class="image-preview" 
                        alt="${item.name}" 
                        onclick="window.open('/browse/${encodeURIComponent(item.path)}', '_blank')"
                        onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCBmaWxsPSIjZGRkIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjx0ZXh0IGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';"
                    >
                    <div class="item-name">${item.name}</div>
                    <div class="item-size">${(item.size / 1024).toFixed(2)} KB</div>
                </div>
            `).join('')}
        </div>
    </div>
` : ''}


                        ${textFiles.length > 0 ? `
                            <div class="section">
                                <h2>📄 Matn fayllar (${textFiles.length})</h2>
                                <div class="list-view">
                                    ${textFiles.map(item => `
                                        <div class="list-item">
                                            <input type="checkbox" class="file-checkbox" value="/browse/${encodeURIComponent(item.path)}" onchange="updateSelection()">
                                            <div class="item-icon">📄</div>
                                            <div style="flex: 1;">
                                                <div class="item-name">${item.name}</div>
                                                <div class="item-size">${(item.size / 1024).toFixed(2)} KB</div>
                                            </div>
                                            <button class="btn btn-primary" onclick="window.open('/browse/${encodeURIComponent(item.path)}', '_blank')">Ko'rish</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${otherFiles.length > 0 ? `
                            <div class="section">
                                <h2>📎 Boshqa fayllar (${otherFiles.length})</h2>
                                <div class="list-view">
                                    ${otherFiles.map(item => `
                                        <div class="list-item">
                                            <input type="checkbox" class="file-checkbox" value="/browse/${encodeURIComponent(item.path)}" onchange="updateSelection()">
                                            <div class="item-icon">📎</div>
                                            <div style="flex: 1;">
                                                <div class="item-name">${item.name}</div>
                                                <div class="item-size">${(item.size / 1024).toFixed(2)} KB</div>
                                            </div>
                                            <button class="btn btn-primary" onclick="window.open('/browse/${encodeURIComponent(item.path)}', '_blank')">Yuklab olish</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${items.length === 0 ? '<p style="text-align: center; color: #999; padding: 50px;">🔭 Bu papka bo\'sh</p>' : ''}
                    </div>
                </div>

                <script>
                    function updateSelection() {
                        const checkboxes = document.querySelectorAll('.file-checkbox');
                        const selected = Array.from(checkboxes).filter(cb => cb.checked);
                        document.getElementById('selectedCount').textContent = selected.length;
                        document.getElementById('downloadBtn').disabled = selected.length === 0;
                    }

                    function selectAll() {
                        document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = true);
                        updateSelection();
                    }

                    function deselectAll() {
                        document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
                        updateSelection();
                    }

                    async function downloadSelected() {
                        const checkboxes = document.querySelectorAll('.file-checkbox:checked');
                        const files = Array.from(checkboxes).map(cb => cb.value);

                        if (files.length === 0) {
                            alert('⚠️ Hech qanday fayl tanlanmagan!');
                            return;
                        }

                        const btn = document.getElementById('downloadBtn');
                        btn.disabled = true;
                        btn.innerHTML = '⏳ Yuklanmoqda...';

                        try {
                            const folderName = '${decodeURIComponent(requestedPath).replace(/\//g, '_') || 'files'}';
                            
                            const response = await fetch('/download-zip', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ files, folderName })
                            });

                            if (!response.ok) {
                                throw new Error('Yuklab olishda xato');
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = folderName + '_' + Date.now() + '.zip';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);

                            alert('✅ Fayllar muvaffaqiyatli yuklandi!');
                        } catch (error) {
                            console.error('Xato:', error);
                            alert('❌ Xato yuz berdi: ' + error.message);
                        } finally {
                            btn.disabled = false;
                            btn.innerHTML = '📦 ZIP yuklab olish (<span id="selectedCount">' + files.length + '</span>)';
                        }
                    }
                </script>
            </body>
            </html>
        `);
        }

    } catch (error) {
        console.error("❌ Browse xato:", error);
        res.status(500).send(`
        <html>
            <head>
                <title>500 - Xato</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial; padding: 50px; text-align: center; }
                    h1 { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1>❌ Server xatosi</h1>
                <p>${error.message}</p>
                <a href="/browse">← Bosh sahifa</a>
            </body>
        </html>
    `);
    }
}

module.exports = {
    downloadZip,
    browsePath
};