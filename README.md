# GuardianLens – AI-Powered Traffic Surveillance & Enforcement Platform

> **India's fastest, most intelligent traffic enforcement platform** – built for scale, speed, and zero-tolerance enforcement.

---

## 🧭 Versions

| Version | URL | What it is |
|---|---|---|
| **v1** | `/` (sign in at `/login`, app at `/dashboard`) | The full enforcement platform: dashboard, upload and detect, eChallan, payments, vehicles, cameras, gates, reports |
| **v2** | `/v2` (sign in at `/v2/login`) | The next-generation AI layer: multi-frame analysis, cross-frame verification, evidence fingerprinting. See [Guardian Lens v2](#-guardian-lens-v2) |

Both versions ship in the same build and use the same accounts. v1 routes and pages are unchanged by v2.

### v1 vs v2 at a glance

| | v1 | v2 |
|---|---|---|
| **URL** | `/dashboard` | `/v2` |
| **Purpose** | Day-to-day enforcement: detect, issue challan, collect payment | AI verification layer: make sure a detection is right before it is trusted |
| **AI analysis** | One AI read of one image | Several frames analysed separately, then cross-checked |
| **Video evidence** | Not analysed frame by frame | Sampled into frames (5 by default) |
| **Photo sets** | Each photo handled on its own | Up to 5 photos treated as one incident |
| **Device camera capture** | ❌ | ✅ 3-frame burst with time and GPS |
| **Plate reading** | As returned by the AI, editable by the operator | OCR repair, character-by-character voting across frames, Indian format validation |
| **Violation decision** | As returned by the AI | "Confirmed" only when repeated across frames; otherwise flagged for review |
| **Confidence** | AI plate confidence | Consistency score (0–100) plus plain-language review flags |
| **Evidence integrity** | Stored in private bucket | SHA-256 fingerprint per file and frame, downloadable evidence record |
| **eChallan, SMS, payment** | ✅ | 🔜 Planned (use v1 today) |
| **Dashboard, vehicles, cameras, gates, reports** | ✅ | Uses v1 |
| **Configuration** | Fixed backend settings | Fully environment-driven, runtime overrides, optional dedicated backend |
| **Accounts** | Admin / Operator / Viewer | Same accounts and roles |

---

# Guardian Lens v1

## 🏛️ Overview

GuardianLens is a production-grade traffic surveillance and enforcement platform designed for government-level deployment. It combines **AI-powered violation detection**, **real-time multi-camera monitoring**, **automated eChallan generation**, and **instant digital payment collection** into a single unified dashboard.

Built with modern web technologies and serverless architecture, GuardianLens processes traffic evidence in seconds – from image upload to eChallan delivery.

---

## 🚀 Key Highlights

| Capability | Details |
|---|---|
| **AI Detection** | Google Gemini 2.5 Flash vision model, uploads processed in parallel |
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
- **AI model**: Google Gemini 2.5 Flash via the Lovable AI Gateway (the gateway also offers OpenAI GPT models; the model is set in `process-evidence`)
- **Still images**: v1 analyses one image per upload. For video evidence use v2, which samples and cross-checks several frames
- **Batch processing**: Upload multiple evidence files, all processed concurrently
- **Per-upload timing**: AI analysis duration tracked and displayed

### 📋 Automated eChallan System
- **State-specific fines**: Rajasthan & Telangana fine schedules with section references
- **Vehicle registration lookup**: RTO data via RapidAPI when `RAPIDAPI_KEY` is set; returns clearly marked demo data otherwise
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
- Camera registry with RTSP URLs and an HLS.js player (browsers cannot play RTSP directly, so live viewing needs an RTSP-to-HLS gateway in front of the cameras)
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
| **AI** | Lovable AI Gateway (Google Gemini 2.5 Flash) |
| **Maps** | Leaflet + React-Leaflet |
| **Charts** | Recharts |
| **Video** | HLS.js player (HLS streams) |
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

Indicative figures; actual times depend on image size, network and AI gateway load.

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
npm install --legacy-peer-deps
npm run dev          # http://localhost:8080
```

`--legacy-peer-deps` is needed because `react-leaflet@5` declares a React 19 peer dependency while the app runs on React 18.

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

### Environment

The project uses Lovable Cloud (Supabase) for its backend. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are auto-configured on Lovable; on any other host set them yourself. `.env.example` lists every variable, including the optional v2 ones.

Edge function secrets (set in the backend, never in the frontend): `LOVABLE_API_KEY` (AI), `RAPIDAPI_KEY` (RTO lookup), plus the Razorpay and MSG91 keys.

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

| Host | URL |
|---|---|
| Production | [guardianlens.meitcybersolutions.com](https://guardianlens.meitcybersolutions.com/) (v2 at [/v2](https://guardianlens.meitcybersolutions.com/v2)) |
| Lovable | [guardianlens.lovable.app](https://guardianlens.lovable.app) |

The app is a single-page application, so the host must serve `index.html` for every path. Build with `npm run build`, serve `dist/` and add this fallback in Nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

# 🚀 Guardian Lens v2

v2 adds a verification layer on top of the AI: instead of trusting one AI read of one picture, it analyses several frames of the same incident and only trusts what the frames agree on.

## What v2 does today

### Evidence Lab (`/v2/evidence`)

| Input | How it is analysed |
|---|---|
| **Video** | Sampled into evenly spaced frames in the browser (5 by default); every frame is analysed separately |
| **Photo set** | Up to 5 photos selected together are treated as one incident |
| **Single photo** | Analysed as one frame and always marked for review |
| **Field capture** | 3-frame burst from the device camera, tagged with time and GPS location |

### Cross-frame verification

- **Plate repair**: common OCR mix-ups are fixed using the fixed layout of Indian plates (`O`/`0`, `I`/`1`, `B`/`8`, `S`/`5` and similar)
- **Plate voting**: reads of the same vehicle are grouped and voted character by character, weighted by AI confidence
- **Format validation**: checked against standard state-series and Bharat (BH) series formats
- **Violation confirmation**: a violation is "confirmed" only when it repeats in at least 2 frames and in at least 60% of that vehicle's sightings
- **Consistency score (0–100)**: combines AI confidence, plate agreement, format validity and frame coverage. It measures how consistent the reads are, and a single frame is capped at 70
- **Review flags**: plain-language reasons a case needs an officer's eye

### Evidence fingerprint

- SHA-256 hash of the original file and of every analysed frame
- Downloadable evidence record (JSON) with operator, time, location, hashes, per-frame AI output and the consensus result

## v2 roadmap

| Module | Status |
|---|---|
| Multi-frame analysis, cross-frame verification, evidence fingerprint | ✅ Live |
| Field capture from device camera | ✅ Live |
| Officer review queue and challan issue from v2 | 🔜 Planned |
| Camera zone editor (stop lines, lanes, no-parking zones) | 🔜 Planned |
| AI assistant search | 🔜 Planned |
| Live video engine (vehicle tracking on camera streams, self-hosted) | 🔜 Planned |

## v2 configuration

Every v2 setting is optional and read from the environment at build time.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_V2_SUPABASE_URL` | same as v1 | Point v2 at its own backend |
| `VITE_V2_SUPABASE_PUBLISHABLE_KEY` | same as v1 | Key for that backend |
| `VITE_V2_EVIDENCE_BUCKET` | `evidence` | Storage bucket for frames |
| `VITE_V2_DETECT_FUNCTION` | `process-evidence` | Edge function that analyses one frame |
| `VITE_V2_FRAMES_PER_VIDEO` | `5` | Frames sampled per video (1–12) |
| `VITE_V2_AI_CONCURRENCY` | `3` | Parallel AI calls (1–8) |
| `VITE_V2_CONFIRM_THRESHOLD` | `0.6` | Share of sightings needed to confirm a violation |

The same values can be changed without a rebuild by defining `window.__GL_CONFIG__` before the app loads (keys as in `src/v2/config.ts`), which is useful on a VPS.

When v2 shares the v1 backend, both versions share one login session. With a dedicated v2 backend, v2 keeps its own session.

## v2 code layout

```
src/v2/
  config.ts               environment-driven settings
  lib/backend.ts          backend client (shared with v1 or dedicated)
  lib/auth.tsx            v2 session and role
  lib/frames.ts           frame sampling from video, photo and camera
  lib/analyze.ts          upload and AI call per frame, worker pool
  lib/consensus.ts        plate repair, voting, validation, scoring
  lib/hash.ts             SHA-256 fingerprint
  components/             layout, camera capture
  pages/                  sign-in, overview, Evidence Lab
```

`src/v2/lib/consensus.test.ts` covers the verification logic; run it with `npm test`.

## Notes

- Analysis needs an **admin** or **operator** account; viewers can open v2 but cannot run AI.
- Frames are stored under `v2/<date>/<run>/` in the evidence bucket.
- Video formats depend on the browser. MP4 (H.264) and WebM work in Chrome and Edge.

---

## 📜 License

Proprietary
