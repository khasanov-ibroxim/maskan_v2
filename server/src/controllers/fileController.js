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
        const baseDir = path.join(process.cwd(), UPLOADS_DIR);
        const fullPath = path.join(baseDir, requestedPath);

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

        if (stats.isFile()) {
            return res.sendFile(fullPath);
        }

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
                        user-select: none;
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
                        border: 3px solid transparent;
                    }
                    .item:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    }
                    .item.selected {
                        border-color: #667eea;
                        background: #e8ecff;
                    }
                    .item.directory {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .item-icon {
                        font-size: 48px;
                        margin-bottom: 10px;
                        text-align: center;
                        pointer-events: none;
                    }
                    .item-name {
                        font-weight: 600;
                        margin-bottom: 5px;
                        word-break: break-word;
                        pointer-events: none;
                    }
                    .item-size {
                        font-size: 12px;
                        opacity: 0.7;
                        pointer-events: none;
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
                        cursor: pointer;
                        border: 3px solid transparent;
                    }
                    .list-item:hover {
                        background: #e9ecef;
                    }
                    .list-item.selected {
                        border-color: #667eea;
                        background: #e8ecff;
                    }
                    
                    /* Modal styles */
                    .modal {
                        display: none;
                        position: fixed;
                        z-index: 1000;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.9);
                        animation: fadeIn 0.3s;
                    }
                    .modal.active {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .modal-content {
                        position: relative;
                        max-width: 90%;
                        max-height: 90%;
                        background: white;
                        border-radius: 12px;
                        padding: 20px;
                        animation: slideIn 0.3s;
                    }
                    .modal-image {
                        max-width: 100%;
                        max-height: 80vh;
                        display: block;
                        margin: 0 auto;
                        border-radius: 8px;
                    }
                    .modal-text {
                        width: 800px;
                        max-width: 90vw;
                        max-height: 70vh;
                        overflow: auto;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        line-height: 1.6;
                        white-space: pre-wrap;
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        user-select: text;
                        cursor: text;
                    }
                    .modal-close {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: #e74c3c;
                        color: white;
                        border: none;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: 0.3s;
                        z-index: 10;
                    }
                    .modal-close:hover {
                        background: #c0392b;
                        transform: rotate(90deg);
                    }
                    .modal-copy {
                        position: absolute;
                        top: 10px;
                        right: 60px;
                        background: #10b981;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: 0.3s;
                    }
                    .modal-copy:hover {
                        background: #059669;
                    }
                    .modal-preview-btn {
                        position: absolute;
                        top: 10px;
                        right: 180px;
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: 0.3s;
                    }
                    .modal-preview-btn:hover {
                        background: #5568d3;
                    }
                    .modal-title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 15px;
                        color: #333;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideIn {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    
                    @media (max-width: 768px) {
                        .grid {
                            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                            gap: 10px;
                        }
                        .modal-content {
                            max-width: 95%;
                            padding: 15px;
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
                                <div class="grid" id="imageGrid">
                                    ${imageFiles.map((item, idx) => `
                                        <div class="item selectable-item" 
                                             data-path="/browse/${encodeURIComponent(item.path)}"
                                             data-type="image"
                                             data-name="${item.name}"
                                             data-index="${idx}">
                                            <img 
                                                src="/browse/${encodeURIComponent(item.path)}" 
                                                class="image-preview" 
                                                alt="${item.name}"
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
                                <div class="list-view" id="textList">
                                    ${textFiles.map((item, idx) => `
                                        <div class="list-item selectable-item" 
                                             data-path="/browse/${encodeURIComponent(item.path)}"
                                             data-type="text"
                                             data-name="${item.name}"
                                             data-index="${idx}">
                                            <div class="item-icon">📄</div>
                                            <div style="flex: 1;">
                                                <div class="item-name">${item.name}</div>
                                                <div class="item-size">${(item.size / 1024).toFixed(2)} KB</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${otherFiles.length > 0 ? `
                            <div class="section">
                                <h2>📎 Boshqa fayllar (${otherFiles.length})</h2>
                                <div class="list-view" id="otherList">
                                    ${otherFiles.map((item, idx) => `
                                        <div class="list-item selectable-item" 
                                             data-path="/browse/${encodeURIComponent(item.path)}"
                                             data-type="other"
                                             data-name="${item.name}"
                                             data-index="${idx}">
                                            <div class="item-icon">📎</div>
                                            <div style="flex: 1;">
                                                <div class="item-name">${item.name}</div>
                                                <div class="item-size">${(item.size / 1024).toFixed(2)} KB</div>
                                            </div>
                                            <button class="btn btn-primary" onclick="event.stopPropagation(); window.open('/browse/${encodeURIComponent(item.path)}', '_blank')">Yuklab olish</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${items.length === 0 ? '<p style="text-align: center; color: #999; padding: 50px;">🔭 Bu papka bo\'sh</p>' : ''}
                    </div>
                </div>

                <!-- Modal -->
                <div id="previewModal" class="modal">
                    <div class="modal-content">
                        <button class="modal-close" onclick="closeModal()">×</button>
                        <button class="modal-preview-btn" id="modalPreviewBtn" style="display: none;" onclick="openInNewTab()">🔗 Yangi oynada ochish</button>
                        <button class="modal-copy" id="modalCopyBtn" style="display: none;" onclick="copyText()">📋 Nusxa olish</button>
                        <div id="modalBody"></div>
                    </div>
                </div>

                <script>
                    let selectedItems = new Set();
                    let lastSelectedIndex = null;
                    let isDragging = false;
                    let dragStartX, dragStartY;
                    let currentPreviewPath = '';

                    // Selection handlers
                    document.addEventListener('DOMContentLoaded', function() {
                        const items = document.querySelectorAll('.selectable-item');
                        
                        items.forEach((item, index) => {
                            // Click selection
                            item.addEventListener('click', function(e) {
                                // Agar directory bo'lsa, sahifaga o'tish
                                if (item.classList.contains('directory')) {
                                    return;
                                }
                                
                                // Agar download tugmasiga bosilgan bo'lsa, hech narsa qilma
                                if (e.target.classList.contains('btn')) {
                                    return;
                                }
                                
                                if (e.ctrlKey || e.metaKey) {
                                    // Ctrl/Cmd: toggle selection
                                    toggleSelection(item);
                                } else if (e.shiftKey && lastSelectedIndex !== null) {
                                    // Shift: range selection
                                    selectRange(lastSelectedIndex, index);
                                } else {
                                    // Regular click: select only this item
                                    clearSelection();
                                    toggleSelection(item);
                                }
                                lastSelectedIndex = index;
                            });

                            // Double click for preview
                            item.addEventListener('dblclick', function(e) {
                                if (item.classList.contains('directory')) return;
                                
                                const type = item.dataset.type;
                                if (type === 'text') {
                                    previewFile(item.dataset.path, type, item.dataset.name);
                                }
                            });

                            // Mouse drag selection
                            item.addEventListener('mousedown', function(e) {
                                if (e.button === 0 && !e.ctrlKey && !e.shiftKey) {
                                    isDragging = true;
                                    dragStartX = e.clientX;
                                    dragStartY = e.clientY;
                                }
                            });
                        });

                        document.addEventListener('mousemove', function(e) {
                            if (isDragging) {
                                const dx = Math.abs(e.clientX - dragStartX);
                                const dy = Math.abs(e.clientY - dragStartY);
                                if (dx > 5 || dy > 5) {
                                    // Drag detected
                                }
                            }
                        });

                        document.addEventListener('mouseup', function() {
                            isDragging = false;
                        });
                    });

                    function toggleSelection(item) {
                        const path = item.dataset.path;
                        if (selectedItems.has(path)) {
                            selectedItems.delete(path);
                            item.classList.remove('selected');
                        } else {
                            selectedItems.add(path);
                            item.classList.add('selected');
                        }
                        updateSelection();
                    }

                    function clearSelection() {
                        selectedItems.clear();
                        document.querySelectorAll('.selectable-item').forEach(item => {
                            item.classList.remove('selected');
                        });
                        updateSelection();
                    }

                    function selectRange(start, end) {
                        const items = Array.from(document.querySelectorAll('.selectable-item'));
                        const min = Math.min(start, end);
                        const max = Math.max(start, end);
                        
                        for (let i = min; i <= max; i++) {
                            if (items[i] && !items[i].classList.contains('directory')) {
                                selectedItems.add(items[i].dataset.path);
                                items[i].classList.add('selected');
                            }
                        }
                        updateSelection();
                    }

                    function updateSelection() {
                        document.getElementById('selectedCount').textContent = selectedItems.size;
                        document.getElementById('downloadBtn').disabled = selectedItems.size === 0;
                    }

                    function selectAll() {
                        document.querySelectorAll('.selectable-item').forEach(item => {
                            if (!item.classList.contains('directory')) {
                                selectedItems.add(item.dataset.path);
                                item.classList.add('selected');
                            }
                        });
                        updateSelection();
                    }

                    function deselectAll() {
                        clearSelection();
                    }

                    // Preview functions
                    async function previewFile(path, type, name) {
                        const modal = document.getElementById('previewModal');
                        const modalBody = document.getElementById('modalBody');
                        const copyBtn = document.getElementById('modalCopyBtn');
                        const previewBtn = document.getElementById('modalPreviewBtn');
                        
                        currentPreviewPath = path;
                        
                        if (type === 'text') {
                            try {
                                const response = await fetch(path);
                                const text = await response.text();
                                modalBody.innerHTML = \`
                                    <div class="modal-title">\${name}</div>
                                    <div class="modal-text" id="textContent">\${escapeHtml(text)}</div>
                                \`;
                                copyBtn.style.display = 'block';
                                previewBtn.style.display = 'block';
                            } catch (error) {
                                modalBody.innerHTML = \`
                                    <div class="modal-title">\${name}</div>
                                    <p style="color: #e74c3c; padding: 20px;">❌ Faylni yuklashda xato yuz berdi</p>
                                \`;
                                copyBtn.style.display = 'none';
                                previewBtn.style.display = 'none';
                            }
                        }
                        
                        modal.classList.add('active');
                    }

                    function openInNewTab() {
                        if (currentPreviewPath) {
                            window.open(currentPreviewPath, '_blank');
                        }
                    }

                    function closeModal() {
                        const modal = document.getElementById('previewModal');
                        modal.classList.remove('active');
                    }

                    function copyText() {
                        const textContent = document.getElementById('textContent');
                        if (textContent) {
                            const selection = window.getSelection();
                            const selectedText = selection.toString();
                            
                            // Agar matn tanlangan bo'lsa, faqat tanlangan qismni ko'chir
                            const textToCopy = selectedText || textContent.innerText;
                            
                            navigator.clipboard.writeText(textToCopy).then(() => {
                                const btn = document.getElementById('modalCopyBtn');
                                const originalText = btn.innerHTML;
                                if (selectedText) {
                                    btn.innerHTML = '✅ Tanlangan qism nusxa olindi!';
                                } else {
                                    btn.innerHTML = '✅ Nusxa olindi!';
                                }
                                setTimeout(() => {
                                    btn.innerHTML = originalText;
                                }, 2000);
                            });
                        }
                    }

                    function escapeHtml(text) {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    }

                    // Close modal on outside click
                    document.getElementById('previewModal').addEventListener('click', function(e) {
                        if (e.target === this) {
                            closeModal();
                        }
                    });

                    // Close modal on Escape key
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'Escape') {
                            closeModal();
                        }
                    });

                    async function downloadSelected() {
                        const files = Array.from(selectedItems);

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