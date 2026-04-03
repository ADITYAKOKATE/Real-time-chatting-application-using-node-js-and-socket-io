# 🚀 WhatsApp - Real-Time Chat & Collaboration Platform

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

A high-performance, horizontally scalable, and secure real-time messaging application. Built with the **MERN** stack and **Socket.io**, this project implements advanced engineering patterns such as **End-to-End Encryption (E2EE)**, **Redis-backed horizontal scaling**, and **automated media processing**.

---

## ✨ Advanced Features

### 🔐 Security & Privacy
- **End-to-End Encryption (E2EE)**: Bidirectional secure messaging using **ECDH** (Elliptic Curve Diffie-Hellman) for key exchange and **AES-GCM** (256-bit) for encryption.
- **Passphrase-based Backups**: Encrypted private key backups using **PBKDF2** key derivation, allowing secure history recovery across devices.
- **Visual Verification**: 🛡️ Shield and 🔒 lock indicators for cryptographically verified conversations.

### ⚡ Real-Time & Scaling
- **Horizontal Scaling**: Redis-backed Socket.io adapter enables communication across multiple server instances behind a load balancer.
- **Presence & Heartbeats**: Real-time status tracking (Online/Offline/Away) with 30s heartbeats and 5s disconnect grace periods.
- **Typing Indicators**: debounced typing events for fluid user feedback.
- **Read Receipts**: Message-level read tracking with per-user read cursors in channels.

### 📁 Messaging & Media
- **Infinite Scroll**: Cursor-based pagination (`before=messageId`) for seamless history loading.
- **Automated Media Processing**: 
    - **Thumbnails**: Instant `.webp` thumbnail generation for images using **Sharp**.
    - **Video Metadata**: Automated extraction of duration/dimensions using **FFmpeg**.
- **Rich Messages**: Support for **Markdown-lite** (bold, italic, code), emoji reactions, and link previews (OG scraping).
- **Threads**: Support for replies and message threading.

---

## 🛠️ Technological Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router 7, Socket.io Client, Lucide React, Web Crypto API |
| **Backend** | Node.js, Express, Socket.io, JWT, Mongoose |
| **Bases** | MongoDB (Storage), Redis (Scaling/Presence) |
| **Processing**| Sharp (Images), FFmpeg (Video), Cheerio (Previews) |

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v18+)
- **Docker Desktop** (for DBs)
- **FFmpeg** (installed on host for video processing)

### 1️⃣ Spin up Infrastructure
```bash
docker-compose up -d
```
*Starts MongoDB (27017) and Redis (6379) in the background.*

### 2️⃣ Backend Setup
```bash
cd backend
npm install
cp .env.example .env # Configure JWT_SECRET & MONGO_URI
npm run dev
```

### 3️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🏗️ Project Architecture

```text
.
├── backend/
│   ├── src/
│   │   ├── socket/      # Redis adapter, Namespaces (/chat, /notif)
│   │   ├── utils/       # media processing, OG scraping, E2EE helpers
│   │   ├── models/      # Mongoose schemas (Message with FTS index)
│   │   └── routes/      # REST API for auth, channels, and key management
│   └── uploads/         # Local file storage (original + thumbnails)
├── frontend/
│   ├── src/
│   │   ├── contexts/    # Crypto, Socket, and Auth providers
│   │   ├── hooks/       # useMessages (infinite scroll), usePresence
│   │   └── components/  # Workspace, ChatHeader, RichMedia
└── docker-compose.yml   # Infrastructure orchestration
```

---

## 🎥 Preview

<div align="center">
  <img src="Screenshot 2025-03-05 124848.png" width="800" alt="Application Dashboard">
</div>

---

## 📜 License
This project is licensed under the ISC License.
