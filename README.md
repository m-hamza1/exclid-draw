# ExclidDraw - Collaborative Real-Time Hand-Drawn Whiteboard

A high-performance virtual whiteboard application built with **Next.js (App Router)**, **Rough.js**, **HTML5 Dual-Canvas Engine**, **Fastify WebSocket Hub**, and **MySQL**.

---

## 🏗️ Architecture Overview

- **Frontend (`/client`)**:
  - **Framework**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS.
  - **Dual-Canvas Engine**:
    - **Static Canvas**: Caches and renders committed shapes with deterministic Rough.js seeds (no jiggling).
    - **Interactive Canvas**: High-frequency 60 FPS drawing previews, selection bounding box, 8 resize handles, and marquee selection box.
  - **Tools**: Selection/Move, Hand/Pan, Rectangle, Diamond, Ellipse, Arrow (with stylized arrowhead), Line, Freehand Pencil, Inline Multiline Text, Eraser.
  - **Styling**: Stroke color, fill color, fill styles (hachure, solid, cross-hatch, dots), stroke width, roughness (clean, artist, sloppy), opacity.
  - **Productivity**: Undo / Redo history stack (`Ctrl+Z`, `Ctrl+Y`), keyboard shortcuts, delete key support, zoom / pan with trackpad/wheel.
  - **Exporting**: High-resolution PNG (white or transparent) and JSON schema format.

- **Backend (`/server`)**:
  - **Framework**: Fastify with `@fastify/websocket` and `@fastify/cors`.
  - **Realtime Protocol**: High-throughput, low-overhead WebSocket message router.
  - **Presence & Multiplayer**: Live cursor tracking, collaborator avatars, user presence.
  - **Persistence**: Debounced auto-save to MySQL (with automatic graceful fallback to memory store if database is offline).

---

## 🚀 Getting Started

### 1. Start the Real-Time WebSocket Server
```bash
cd server
npm run dev
```
*Server will start on `http://localhost:4000` and WebSocket listener at `ws://localhost:4000/ws`.*

### 2. Start the Next.js Client
```bash
cd client
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## ⚡ Real-Time Collaboration Testing
Open two browser tabs (or share the room link `http://localhost:3000?room=room-123`) to see live cursor presence and multi-user drawing synchronization in real time.
