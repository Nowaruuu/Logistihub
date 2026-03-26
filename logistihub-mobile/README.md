# LogistiHub Mobile App

A multi-tenant client mobile web app for the LogistiHub logistics platform.  
Built with **React + Vite + TypeScript**, connects to your **AWS EC2 MySQL backend**.

---

## 📱 Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Workspace Entry | `/` | User enters their company slug to find their tenant |
| Login | `/:slug/login` | Tenant-branded login screen |
| Register | `/:slug/register` | 2-step client registration |
| Dashboard | `/:slug/dashboard` | Profile display + logout |

---

## 🏗️ Multi-Tenant Flow

```
User opens app
    ↓
Enters company slug (e.g. "fastship")
    ↓
App verifies slug → GET /fastship/api/tenant-info
    ↓
Redirected to /fastship/login  ← branded with company name
    ↓
Login/Register → POST /fastship/api/login
    ↓
Dashboard at /fastship/dashboard (tenant-aware)
```

Each tenant's users **only see their own company branding** and connect to **their own tenant's data** via the slug-scoped API.

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
cd logistihub-mobile
npm install
```

### 2. Start dev server
```bash
npm run dev
```

App runs at `http://localhost:5173`

### 3. Build for production
```bash
npm run build
```

Deploy the `dist/` folder to Nginx or S3.

---

## 🔗 Connecting to Your EC2 Backend

All API calls go to: `https://logistihub.ddns.net/:slug/api/...`

This is hardcoded in `src/lib/api.ts`. To change:
```ts
const BASE_URL = 'https://logistihub.ddns.net';
```

### Required Backend Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/:slug/api/tenant-info` | Public | Verify slug + return tenant info |
| `POST` | `/:slug/api/login` | Public | Returns `{ token, user }` |
| `POST` | `/:slug/api/register` | Public | Returns `{ token, user }` |
| `POST` | `/:slug/api/logout` | Bearer | Clears session |
| `GET` | `/:slug/api/me` | Bearer | Returns `{ user }` profile |

### ⚠️ Backend Changes Required

See `BACKEND_ADDITIONS.js` — add these 2 routes to your Express backend:
1. `GET /:slug/api/tenant-info` — **new route needed**
2. `GET /:slug/api/me` — **new route needed**

Then redeploy with:
```bash
~/update.sh
```

---

## 📂 Project Structure

```
logistihub-mobile/
├── src/
│   ├── pages/
│   │   ├── TenantEntry.tsx   ← Slug entry screen
│   │   ├── Login.tsx         ← Tenant-branded login
│   │   ├── Register.tsx      ← 2-step registration
│   │   └── Dashboard.tsx     ← Profile + logout
│   ├── hooks/
│   │   └── useAuth.tsx       ← Auth context (EC2 API)
│   ├── components/
│   │   └── AuthGuard.tsx     ← Protected route guard
│   ├── lib/
│   │   └── api.ts            ← All API calls
│   ├── types/
│   │   └── index.ts          ← TypeScript types
│   ├── App.tsx               ← Router
│   ├── main.tsx              ← Entry point
│   └── index.css             ← Global styles (DM Sans, navy theme)
├── BACKEND_ADDITIONS.js      ← Routes to add to Express
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🎨 Design

Matches the existing LogistiHub web design system:
- **Font**: DM Sans + DM Mono
- **Colors**: Navy `#0a1628` primary, Slate grays
- **Icons**: Google Material Symbols Outlined
- **Components**: Cards, badges, field groups — identical to superadmin/admin dashboards

---

## 🔐 Auth & Session

- JWT stored in `localStorage` under `lh_token`
- Slug stored under `lh_slug`
- User object cached under `lh_user`
- Tenant info cached under `lh_tenant`
- All cleared on logout
- `AuthGuard` redirects unauthenticated users to `/:slug/login`

---

## 📦 Deploying to Nginx (on your EC2)

After `npm run build`, copy `dist/` to your server:

```bash
# On your local machine:
scp -r dist/ ec2-user@your-ec2-ip:/home/ec2-user/logistics-os/logistics-backend/public/mobile/

# Or add to your update.sh script
```

Then in Nginx, serve the mobile app at a subpath or subdomain:
```nginx
location /app/ {
  alias /home/ec2-user/logistics-os/logistics-backend/public/mobile/;
  try_files $uri $uri/ /app/index.html;
}
```

Users access it at: `https://logistihub.ddns.net/app/`
