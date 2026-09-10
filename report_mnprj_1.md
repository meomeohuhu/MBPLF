# Báo cáo đóng gói ứng dụng Android bằng Capacitor

## 1. Mục tiêu

Sử dụng Capacitor để chuyển ứng dụng web React/Vite hiện tại thành ứng dụng Android có thể cài đặt và sử dụng trên điện thoại.

## 2. Công nghệ sử dụng

- React + Vite cho giao diện web.
- Capacitor Android để tạo project native Android.
- Capacitor Camera và Network cho chức năng camera, kiểm tra kết nối mạng.
- Express API kết nối PostgreSQL trên Render.

## 3. Cấu hình API

Ứng dụng mobile không sử dụng `localhost`. File `.env` trỏ đến API đã deploy trên Render:

```env
VITE_API_BASE_URL=https://vku-facility-inspection.onrender.com
```

Nhờ đó, ứng dụng Android có thể gửi và đồng bộ dữ liệu kiểm tra với PostgreSQL từ nhiều thiết bị.

## 4. Quy trình đóng gói

Các lệnh được thực hiện tại thư mục gốc của project:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Lệnh `npm run build` tạo bản web production trong thư mục `dist`. Lệnh `cap sync android` chép bản build này vào project Android và cập nhật các plugin native.

## 5. Tạo APK

Tạo bản APK debug bằng Gradle:

```powershell
cd android
.\gradlew.bat assembleDebug
```

File APK được tạo tại:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

File này có thể chuyển sang điện thoại Android để cài đặt và kiểm thử.

## 6. Kết quả

Ứng dụng web đã được đóng gói thành ứng dụng Android. App hỗ trợ lưu dữ liệu offline, chụp ảnh minh chứng, đồng bộ khi có mạng và kết nối API Render/PostgreSQL.

Khi thay đổi mã nguồn web, cần chạy lại:

```bash
npm run cap:sync
```

Sau đó build lại APK để cập nhật phiên bản trên điện thoại.
