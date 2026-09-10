# BAO CAO KY THUAT MINI-PROJECT

**Hoc phan:** Phat trien ung dung di dong da nen tang (VKU)  
**Ten Mini-Project:** Ung dung kiem tra co so vat chat VKU ngoai tuyen  


## 2. BANG KIEM TRA TINH NANG

| # | Tinh nang bat buoc | Trang thai | Chi tiet trien khai va muc do hoan thanh |
|:---:|---|:---:|---|
| 1 | Cai dat PWA doc lap | Hoan thanh | Manifest dung che do standalone, mau chu dao `#0284c7`, icon tao tu `logo.png`. |
| 2 | Mo app nhanh khi ngoai tuyen | Hoan thanh | Service Worker cache app shell va tai nguyen GET de reload khi mat mang. |
| 3 | Luu form ngoai tuyen | Hoan thanh | Nhap form nhieu buoc duoc luu vao IndexedDB thong qua `localforage`. |
| 4 | Hang cho ngoai tuyen va tu dong bo | Hoan thanh | Phieu gui co UUID/thoi gian/trang thai va tu dong bo khi mang tro lai. |
| 5 | Bang danh gia | Hoan thanh | Dashboard hien thi phieu cho/da dong bo, co filter trang thai/hang muc va panel chi tiet. |
| 6 | Luu tru PostgreSQL da thiet bi | Hoan thanh | Backend Express API luu va doc phieu kiem tra tu PostgreSQL de nhieu may xem chung. |
| 7 | Tich hop Android bang Capacitor | Hoan thanh | Project Android tich hop Camera va Network plugin de dong goi app native. |

---

## 3. KIEN TRUC KY THUAT VA CAU TRUC DU AN

Ung dung duoc xay dung bang React, Vite, TypeScript, Capacitor, localforage, Express va PostgreSQL. Giao dien gom form kiem tra nhieu buoc, hang cho dong bo, lich su dong bo va dashboard xem chi tiet phieu danh gia.

- `src/App.tsx`: giao dien chinh, autosave nhap, thao tac hang cho, phan ung voi trang thai mang.
- `src/storage.ts`: cac store IndexedDB cho nhap, hang cho va lich su.
- `src/sync.ts`: gui du lieu mo phong, dong bo tuan tu hang cho, dang ky Background Sync.
- `server/server.js`: API Express voi endpoint `GET/POST /api/inspections`, tu tao bang PostgreSQL.
- `src/camera.ts`: wrapper cho Capacitor Camera.
- `public/sw.js`: Service Worker cache-first va cau noi thong diep dong bo.
- `android/`: project Android native do Capacitor tao.

Chien luoc xu ly loi tap trung vao bao toan du lieu kiem tra: neu gui online that bai, phieu khong bi mat ma duoc giu lai trong hang cho ngoai tuyen.

---

## 4. MINH CHUNG THUC NGHIEM VA ANH CHUP MAN HINH

Chen 3-4 anh chup co chu thich truoc khi nop:

1. PWA da cai dat hoac giao dien mobile.
2. Form kiem tra khi ngoai tuyen voi nhap da luu.
3. Hang cho dong bo khi mat mang.
4. Dashboard xem chi tiet mot phieu kiem tra.
5. Dong bo thanh cong hoac APK chay tren thiet bi/emulator Android.

---

## 5. THACH THUC KY THUAT VA CACH GIAI QUYET

**Chong mat du lieu khi ngoai tuyen:** Khi refresh trinh duyet, state trong bo nho co the mat. Giai phap la luu moi thay doi cua ban nhap vao IndexedDB bang localforage.

**Dong bo khi mang tro lai:** Moi truong browser va mobile cung cap trang thai mang theo cac cach khac nhau. Ung dung ket hop `window.online`, Capacitor Network va Background Sync khi duoc ho tro de thu gui lai cac phieu dang cho.
