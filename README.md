# VKU Kiem Tra Co So Vat Chat Ngoai Tuyen

Ung dung PWA va Android bang Capacitor danh cho kiem tra phong hoc, thiet bi va co so vat chat tai VKU trong dieu kien co hoac khong co mang.

## Tinh nang

- PWA co the cai dat voi che do hien thi doc lap, icon tu logo VKU va mau chu dao `#0284c7`.
- Service Worker dung chien luoc cache-first de mo app nhanh khi ngoai tuyen.
- Form kiem tra nhieu buoc: toa nha, tang, phong, hang muc, danh gia sao, ghi chu loi va anh minh chung.
- Bang danh gia co bo loc trang thai/hang muc va man hinh xem chi tiet tung phieu.
- Nhieu thiet bi co the xem chung du lieu khi cau hinh PostgreSQL API.
- Luu nhap theo thoi gian thuc vao IndexedDB thong qua `localforage`.
- Hang cho ngoai tuyen co UUID, thoi gian tao va trang thai `PENDING_SYNC`.
- Tu dong bo qua `window.online`, Capacitor Network va Background Sync khi trinh duyet ho tro.
- Du an Android Capacitor da tich hop Camera va Network plugin.

## Cai dat va chay thu

```bash
npm install
cp .env.example .env
npm run dev:all
```

Dia chi chay local:

```text
http://127.0.0.1:5173
```

Backend API PostgreSQL chay tai:

```text
http://127.0.0.1:3001
```

## Cau hinh PostgreSQL

Sua file `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/vku_inspect
DATABASE_SSL=false
API_PORT=3001
VITE_API_BASE_URL=
```

Neu dung PostgreSQL cloud nhu Supabase/Neon, dat:

```env
DATABASE_SSL=true
```

Backend se tu tao bang `inspections` khi khoi dong.

## Chia se demo qua Cloudflare Tunnel mien phi

Chay app local:

```bash
npm run dev
```

O terminal khac, chay tunnel HTTPS:

```bash
npm run tunnel
```

Terminal se in ra link `https://...trycloudflare.com`. Link nay dung duoc tren ca PC va dien thoai neu may local van dang bat. Xem them huong dan trong `CLOUDFLARE_TUNNEL.md`.

Khi dung Cloudflare Tunnel, frontend goi `/api` ve Vite, sau do Vite proxy den API PostgreSQL local. Vi vay cac may khac nhau se thay chung du lieu trong PostgreSQL neu cung mo cung link tunnel.

## Build PWA

```bash
npm run build
npm run preview
```

Ban build production nam trong thu muc `dist/`.

## Deploy len Render cung PostgreSQL

Du an da co san file `render.yaml`. Sau khi day source code len GitHub:

1. Vao Render Dashboard, chon **New > Blueprint** va ket noi repository.
2. Chon file `render.yaml`, sau do deploy.
3. Render se tao mot Web Service Node.js va mot PostgreSQL, tu gan `DATABASE_URL` vao service.
4. Mo URL `https://<ten-service>.onrender.com`. Kiem tra API tai `/api/health`.

Frontend va API dung cung mot domain nen khong can dat `VITE_API_BASE_URL` khi deploy Render. File `render.yaml` dang dung free plan; PostgreSQL free cua Render het han sau 30 ngay, nen nang cap database neu can luu du lieu lau dai.

## Quy trinh build APK Android

```bash
npm run cap:sync
npm run cap:android
```

Sau do build APK bang Android Studio hoac Gradle trong thu muc `android/`.

Neu build APK de dung PostgreSQL that ngoai may local, can build voi API HTTPS cong khai:

```bash
VITE_API_BASE_URL=https://your-api-domain.com npm run cap:sync
```

Neu dung Quick Tunnel cho ca web va API local, co the dat `VITE_API_BASE_URL` bang link tunnel dang chay truoc khi build APK. Cach nay chi phu hop demo vi link tunnel co the doi.

## Ghi chu dong bo ngoai tuyen

Mini-project nay dang dung co che gui du lieu mo phong trong `src/sync.ts`. Khi thiet bi truc tuyen, cac phieu trong hang cho duoc danh dau `SYNCED` sau mot khoang tre ngan. Khi ngoai tuyen, phieu van nam trong IndexedDB voi trang thai `PENDING_SYNC` hoac `FAILED` va duoc thu dong bo lai khi mang tro lai.

Neu can backend that, thay ham `submitInspection()` bang request `fetch("/api/inspections", { method: "POST", body: JSON.stringify(record) })` va giu nguyen co che hang cho.

## Goi nop bai

- Live Demo URL: deploy thu muc `dist/` len Vercel hoac Cloudflare Pages.
- GitHub Repository: public source code kem README nay.
- Bao cao ky thuat: dung `TECHNICAL_REPORT.md` hoac ban PDF da xuat.
