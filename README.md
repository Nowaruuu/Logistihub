# Logistics OS — Backend

Multi-tenant Node.js/Express backend for the Logistics OS platform.

## Project Structure

```
logistics-os-backend/
├── server.js              # Entry point — starts Express
├── package.json
├── .env.example           # Copy to .env and fill in values
├── .gitignore
│
├── config/
│   ├── db.js              # MySQL pool + tenant isolation helpers
│   └── mailer.js          # Nodemailer (invitation + welcome emails)
│
├── middleware/
│   └── auth.js            # JWT guards: superadmin / admin / user
│
├── routes/
│   ├── pages.js           # HTML page serving (injects tenant context)
│   ├── superadmin.js      # /api/superadmin/* — platform management
│   ├── onboarding.js      # /api/onboarding/* — invite + account creation
│   ├── admin.js           # /:slug/api/admin/* — tenant admin API
│   └── user.js            # /:slug/api/* — user registration + login
│
└── views/                 # Your HTML files go here
    ├── superadmin.html
    ├── superadmin-login.html   (create a simple login form)
    ├── admin-onboarding.html
    ├── admin-dashboard.html
    └── user-register.html
```

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials, JWT secrets, and mail settings
```

### 3. Set up the database
Create a MySQL database and run the schema:
```bash
mysql -u root -p -e "CREATE DATABASE logistics_os CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p logistics_os < logistics_schema.sql
```

### 4. Copy your HTML files into /views
```
views/superadmin.html
views/admin-onboarding.html
views/admin-dashboard.html
views/user-register.html
```

### 5. Run in development
```bash
npm run dev       # uses nodemon for auto-restart
```

### 6. Test it
- Superadmin panel:        http://localhost:3000/superadmin
- Onboarding (with token): http://localhost:3000/onboarding?invite=<token>
- After tenant is created: http://localhost:3000/your-slug/admin
- User registration:       http://localhost:3000/your-slug/register

---

## API Reference

### Superadmin
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/superadmin/login | Login |
| POST | /api/superadmin/logout | Logout |
| GET | /api/superadmin/overview | Platform stats |
| GET | /api/superadmin/tenants | List all tenants |
| POST | /api/superadmin/tenants/invite | Send invite email |
| PATCH | /api/superadmin/tenants/:id/status | Suspend/reactivate |
| GET | /api/superadmin/subscriptions | All subscriptions |

### Onboarding
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/onboarding/verify-invite | Validate invite token |
| POST | /api/onboarding/create | Create tenant + admin account |

### Admin (all routes scoped to /:slug — JWT must match slug)
| Method | Path | Description |
|--------|------|-------------|
| POST | /:slug/api/admin/login | Admin login |
| GET | /:slug/api/admin/stats | Dashboard stats |
| GET | /:slug/api/admin/shipments | List shipments |
| POST | /:slug/api/admin/shipments | Create shipment |
| PATCH | /:slug/api/admin/shipments/:dn/status | Update status |
| GET/POST/DELETE | /:slug/api/admin/staff | Staff management |
| GET/POST/DELETE | /:slug/api/admin/vehicles | Fleet management |
| GET/POST/DELETE | /:slug/api/admin/clients | Client management |
| GET/POST/DELETE | /:slug/api/admin/routes | Route management |
| GET/POST/PATCH | /:slug/api/admin/payments | Payment management |
| GET/POST | /:slug/api/admin/pod | Proof of delivery |
| GET | /:slug/api/admin/users | View registered users |

### User (tenant-scoped)
| Method | Path | Description |
|--------|------|-------------|
| POST | /:slug/api/register | Register account |
| POST | /:slug/api/login | Login |
| GET | /:slug/api/me | Get own profile |
| POST | /:slug/api/logout | Logout |

---

## Deploying to Railway

1. Push this folder to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **MySQL** plugin to the project
4. Go to Variables and add all values from `.env.example`
5. In the MySQL plugin, open the query editor and run `logistics_schema.sql`
6. Railway auto-deploys on every push

### Custom domain
1. In Railway → your service → Settings → Domains → Add custom domain
2. Point your domain's DNS CNAME to the Railway-provided URL

---

## Multi-Tenant Isolation Summary

- Every tenant has a unique `slug` (e.g. `kyoob`, `elmo-delivery`)
- Admin dashboard: `yourdomain.com/kyoob/admin`
- User registration: `yourdomain.com/kyoob/register`
- **The user registration page only exists once the tenant admin has completed setup**
- Every database query is scoped by `tenant_id` — no cross-tenant data access is possible
- The JWT for admin contains the `slug`; the `requireSlugMatch` middleware enforces that the URL slug matches the JWT slug on every request
- `APP_USER.tenant_id` is set automatically from the URL slug — users never supply it
