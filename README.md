# GuardianLens – Traffic Surveillance System

A comprehensive government traffic surveillance and monitoring platform built for the Ministry of Road Transport, Government of India.

## Overview

GuardianLens provides real-time traffic monitoring, vehicle tracking, violation detection, and gate access management through an integrated dashboard.

## Features

- **Dashboard** – Real-time overview of system activity with live stats, charts, and map visualization
- **Vehicle Management** – Track registered vehicles, manage blacklists, and organize vehicles into groups
- **Violation Detection** – Monitor and manage traffic violations (helmet, seatbelt, triple riding, mobile phone usage, wrong way, red light, illegal parking, overloading)
- **Camera Management** – Configure and monitor ANPR/surveillance cameras with RTSP feeds
- **Gate & Access Control** – Manage entry/exit gates with time-based, whitelist, and blacklist access rules
- **User Management** – Role-based access control (Admin, Operator, Viewer)
- **Reports** – Generate and export reports (PDF/Excel)
- **Real-time Notifications** – Live alerts for new violations and gate entries
- **Global Vehicle Search** – Instant plate number lookup across the system

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Lovable Cloud (Supabase) – PostgreSQL, Auth, Realtime, Edge Functions
- **Maps**: Leaflet
- **Charts**: Recharts
- **Reports**: jsPDF, xlsx

## Roles & Permissions

| Role     | Access                                              |
| -------- | --------------------------------------------------- |
| Admin    | Full access – manage users, cameras, gates, data    |
| Operator | Manage vehicles, violations, assigned cameras/gates |
| Viewer   | Read-only access to dashboards and reports          |

## Getting Started

```sh
git clone <YOUR_GIT_URL>
cd guardianlens
npm install
npm run dev
```

## Deployment

Published at: [guardianlens.lovable.app](https://guardianlens.lovable.app)

## License

Proprietary – Government of India
