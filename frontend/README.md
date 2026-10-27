# FraudLens Frontend

A standalone, decoupled financial fraud detection and analytics dashboard built with **React 19**, **TypeScript**, **Vite**, **TanStack Router**, and **Tailwind CSS**.

## Features & Highlights

- **Standard Vite SPA**: Clean client-side Single Page Application without SSR complexity or external platform locks.
- **Modern Routing**: Type-safe, file-based routing powered by TanStack Router (`@tanstack/router-plugin/vite`).
- **Design System**: Accessible UI primitives powered by Radix UI, Lucide icons, and Tailwind CSS.
- **Configurable Environment**: Clean separation of environment variables via `VITE_API_BASE_URL` with fallback to localhost.

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

## Getting Started

### 1. Install Dependencies

Install all dependencies cleanly using the locked `package-lock.json`:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend/` directory (or use `.env.example`):

```bash
VITE_API_BASE_URL=http://localhost:8000
```

> **Security Note:** Only variables prefixed with `VITE_` are exposed to the client bundle. Never place database credentials, API secret keys, or private certificates in client-side environment files.

### 3. Development Server

Start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

### 4. Quality Checks

Run TypeScript compiler validation:
```bash
npm run typecheck
```

Run ESLint rules:
```bash
npm run lint
```

Format codebase:
```bash
npm run format
```

### 5. Production Build & Preview

Compile and optimize the SPA bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Static Hosting & SPA Fallback Configuration

Because FraudLens Frontend is a client-side SPA, direct navigation or browser refresh on nested routes (such as `/transactions/DEMO-TX-104921`, `/dashboard`, or `/analyze`) requires your static web server to route non-asset requests to `index.html`.

### Nginx

```nginx
server {
    listen 80;
    server_name fraudlens.example.com;
    root /var/www/fraudlens/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Caddy

```caddy
fraudlens.example.com {
    root * /var/www/fraudlens/dist
    file_server
    try_files {path} /index.html
}
```

### Netlify

Create `public/_redirects`:
```text
/*    /index.html   200
```

### Vercel

Create `vercel.json` in `frontend/`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### FastAPI Integration (StaticFiles mount)

When serving the frontend through FastAPI's production mount:

```python
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from fastapi.responses import FileResponse

app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    return FileResponse("frontend/dist/index.html")
```
