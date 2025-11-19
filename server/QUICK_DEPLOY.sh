#!/bin/bash

# 🚀 Maskan Lux - Quick Deploy Script
# Bu skriptni root papkada saqlang va ishga tushiring

echo "=================================="
echo "🚀 MASKAN LUX - QUICK DEPLOY"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Git tekshirish
echo -e "${BLUE}📋 Git tekshirilmoqda...${NC}"
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Git repository topilmadi!${NC}"
    echo "Git init qilinmoqda..."
    git init
    echo -e "${GREEN}✅ Git initialized${NC}"
fi

# 2. .gitignore yaratish
echo ""
echo -e "${BLUE}📋 .gitignore tekshirilmoqda...${NC}"
if [ ! -f ".gitignore" ]; then
    echo "node_modules/
.env
.env.local
.vercel
server/uploads/
server/temp/
server/src/data/*.json
client/dist/
client/build/" > .gitignore
    echo -e "${GREEN}✅ .gitignore yaratildi${NC}"
else
    echo -e "${GREEN}✅ .gitignore mavjud${NC}"
fi

# 3. Backend vercel.json tekshirish
echo ""
echo -e "${BLUE}📋 Backend konfiguratsiya tekshirilmoqda...${NC}"
if [ ! -f "server/vercel.json" ]; then
    echo '{
  "version": 2,
  "builds": [{"src": "index.js", "use": "@vercel/node"}],
  "routes": [{"src": "/(.*)", "dest": "index.js"}]
}' > server/vercel.json
    echo -e "${GREEN}✅ server/vercel.json yaratildi${NC}"
else
    echo -e "${GREEN}✅ server/vercel.json mavjud${NC}"
fi

# 4. Frontend vercel.json tekshirish
echo ""
echo -e "${BLUE}📋 Frontend konfiguratsiya tekshirilmoqda...${NC}"
if [ ! -f "client/vercel.json" ]; then
    echo '{
  "rewrites": [{"source": "/(.*)", "destination": "/index.html"}]
}' > client/vercel.json
    echo -e "${GREEN}✅ client/vercel.json yaratildi${NC}"
else
    echo -e "${GREEN}✅ client/vercel.json mavjud${NC}"
fi

# 5. Git add va commit
echo ""
echo -e "${BLUE}📦 Fayllar commit qilinmoqda...${NC}"
git add .

# Commit message so'rash
echo ""
read -p "Commit message kiriting (Enter = default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Deploy: Vercel ready - $(date +'%Y-%m-%d %H:%M')"
fi

git commit -m "$commit_msg"
echo -e "${GREEN}✅ Commit qilindi${NC}"

# 6. Remote tekshirish
echo ""
echo -e "${BLUE}📡 GitHub remote tekshirilmoqda...${NC}"
if ! git remote | grep -q 'origin'; then
    echo ""
    echo -e "${RED}⚠️ GitHub remote yo'q!${NC}"
    echo "GitHub'da yangi repository yarating va URL'ni kiriting:"
    read -p "GitHub repo URL: " repo_url
    git remote add origin "$repo_url"
    echo -e "${GREEN}✅ Remote qo'shildi${NC}"
else
    echo -e "${GREEN}✅ Remote mavjud${NC}"
fi

# 7. Push
echo ""
echo -e "${BLUE}📤 GitHub'ga push qilinmoqda...${NC}"
git branch -M main
if git push -u origin main; then
    echo -e "${GREEN}✅ GitHub'ga yuklandi!${NC}"
else
    echo -e "${RED}❌ Push xato! Iltimos manual push qiling:${NC}"
    echo "git push -u origin main"
fi

# 8. Vercel instructions
echo ""
echo "=================================="
echo -e "${GREEN}✅ TAYYOR!${NC}"
echo "=================================="
echo ""
echo "Keyingi qadamlar:"
echo ""
echo "1️⃣ Vercel'ga kiring: https://vercel.com"
echo ""
echo "2️⃣ BACKEND Deploy:"
echo "   - New Project → GitHub repo tanlang"
echo "   - Root Directory: ${BLUE}server${NC}"
echo "   - Environment Variables qo'shing"
echo "   - Deploy qiling"
echo ""
echo "3️⃣ FRONTEND Deploy:"
echo "   - New Project → Yana shu repo"
echo "   - Root Directory: ${BLUE}client${NC}"
echo "   - VITE_API_URL qo'shing (backend URL)"
echo "   - Deploy qiling"
echo ""
echo "=================================="
echo ""