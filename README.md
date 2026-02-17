# GuardianLens – AI-Powered Traffic Surveillance & Enforcement Platform

> **India's fastest, most intelligent traffic enforcement platform** – built for scale, speed, and zero-tolerance enforcement.

---

## 🏛️ Overview

GuardianLens is a production-grade traffic surveillance and enforcement platform designed for government-level deployment. It combines **AI-powered violation detection**, **real-time multi-camera monitoring**, **automated eChallan generation**, and **instant digital payment collection** into a single unified dashboard.

Built with modern web technologies and serverless architecture, GuardianLens processes traffic evidence in seconds – from image upload to eChallan delivery.

---

## 🚀 Key Highlights

| Capability | Details |
|---|---|
| **AI Detection** | Multi-model AI (Gemini / GPT) with parallel processing |
| **Processing Speed** | < 5 seconds per frame via concurrent edge functions |
| **eChallan Delivery** | Instant SMS + public payment link + QR code |
| **Payment Collection** | One-click online payment via Razorpay |
| **Architecture** | Serverless edge functions – auto-scaling, stateless |
| **Real-time Updates** | WebSocket-based live subscriptions |
| **Access Control** | RBAC – Admin / Operator / Viewer with scoped data |
| **Security** | Server-side JWT auth, RLS on all tables, role-enforced edge functions |

---

## ✨ Features

### 🎯 AI-Powered Violation Detection
- **9 violation types**: Helmet, helmet (pillion), seatbelt, triple riding, mobile phone, wrong way, red light, illegal parking, overloading
- **Multi-model support**: Google Gemini & OpenAI GPT via Lovable AI Gateway
- **Batch processing**: Upload multiple evidence files, all processed concurrently
- **Per-upload timing**: AI analysis duration tracked and displayed

### 📋 Automated eChallan System
- **State-specific fines**: Rajasthan & Telangana fine schedules with section references
- **Vehicle registration lookup**: Real-time RTO data via RapidAPI
- **Public payment portal**: Receipt-style eChallan with QR code
- **PDF download**: Vehicle owners can save/print their eChallan
- **SMS delivery**: Automated challan notification via MSG91

### 📊 Real-time Dashboard
- Live stats with WebSocket-powered auto-refresh
- Violation trend charts (daily, weekly)
- Traffic flow visualization (hourly entries/exits)
- Camera and gate operational status
- Interactive location map (Leaflet)

### 🚗 Vehicle Management
- ANPR-based plate tracking
- Blacklist management
- Vehicle groups with color coding
- Owner information and contact details

### 🎥 Camera & Gate Management
- RTSP feed monitoring with HLS.js
- Camera assignment to operators
- Gate access rules (whitelist, blacklist, time-based, group)
- Entry/exit logging with evidence capture

### 👥 Role-Based Access Control (RBAC)
- **Admin**: Full system access – manage users, cameras, gates, challans, settings
- **Operator**: Manage assigned cameras/gates, issue challans, process evidence
- **Viewer**: Read-only access to dashboards and reports
- **Data scope toggle**: Switch between "All Data" and "My Data" views

### 📊 Reports & Export
- PDF and Excel report generation
- Filterable by date range, violation type, status
- Challan collection analytics

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Lovable Cloud (PostgreSQL, Auth, Realtime, Edge Functions) |
| **AI** | Lovable AI Gateway (Google Gemini, OpenAI GPT) |
| **Maps** | Leaflet + React-Leaflet |
| **Charts** | Recharts |
| **Video** | HLS.js for RTSP streams |
| **Payments** | Razorpay |
| **SMS** | MSG91 |
| **Vehicle Data** | RapidAPI RTO Lookup |
| **Reports** | jsPDF + xlsx |
| **QR Codes** | qrcode.react |

---

## 🔒 Security

- **Server-side JWT authentication** on all edge functions via `getClaims()`
- **Role-based authorization** enforced server-side (admin/operator checks in edge functions)
- **Row-Level Security (RLS)** on every database table
- **Input validation** on all edge function endpoints (format, length, enum checks)
- **Generic error responses** – internal details never leaked to clients
- **Private storage** – evidence bucket restricted to authorized staff
- **Public challan tokens** – cryptographically random, non-guessable hex tokens
- **Service role isolation** – edge functions use service keys, frontend uses anon keys

---

## ⚡ Performance

| Metric | Value |
|---|---|
| AI detection per image | 2–5 seconds |
| Concurrent uploads | 10+ simultaneous |
| Edge function cold start | < 200ms |
| Real-time event propagation | < 100ms |
| eChallan generation | < 1 second |
| PDF generation | Instant (client-side) |

---

## 🚦 Getting Started

```sh
git clone <YOUR_GIT_URL>
cd guardianlens
npm install
npm run dev
```

### Environment

The project uses Lovable Cloud for its backend. Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are auto-configured.

### Edge Functions

All backend logic runs as serverless edge functions:

| Function | Purpose | Auth Required |
|---|---|---|
| `process-evidence` | AI-powered violation detection | ✅ Admin/Operator |
| `create-challan` | Generate eChallan with fines | ✅ Admin/Operator |
| `vehicle-lookup` | RTO vehicle registration lookup | ✅ Authenticated |
| `send-challan-sms` | Send SMS notification | ✅ Admin/Operator |
| `razorpay-payment` | Payment order & verification | ✅ Auth or public token |
| `public-challan` | Public challan viewer | ❌ Public |

---

## 🌐 Deployment

Published at: [guardianlens.lovable.app](https://guardianlens.lovable.app)

---

## 📜 License

Proprietary
