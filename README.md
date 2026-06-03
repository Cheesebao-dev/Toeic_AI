# TOEIC Tracker AI

Ứng dụng full-stack để theo dõi luyện đề TOEIC, lưu nhật ký học, quản lý sổ tay lỗi sai và dùng Gemini để phân tích câu hỏi.

## Chạy dự án

```bash
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:8787
```

## Cấu hình AI

Tạo file `.env` ở thư mục gốc:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=postgresql://user:password@host:5432/database
APP_PASSWORD=change_this_password
```

Không đưa `.env` lên Git. Frontend không đọc trực tiếp API key; mọi request AI đi qua backend Express.

## Lưu dữ liệu backend

App đồng bộ dữ liệu qua backend endpoint `/api/data`.

- Nếu có `DATABASE_URL`, backend lưu dữ liệu vào Postgres.
- Nếu chưa có `DATABASE_URL`, backend lưu tạm vào file `data/app-state.json` khi chạy local.
- Khi deploy cloud, nên dùng Postgres thật như Supabase hoặc Neon. Không nên dựa vào file local trên Render Free vì filesystem có thể mất khi redeploy/restart.

Với app cá nhân, nên đặt `APP_PASSWORD` trên môi trường deploy để người khác không đọc/sửa dữ liệu hoặc dùng quota Gemini của bạn.

## Tính năng

- Dashboard tổng quan điểm ước tính, accuracy, lỗi chưa khắc phục.
- Nhật ký luyện đề theo Part 1-7.
- Sổ tay lỗi sai có lọc theo Part, loại lỗi, trạng thái.
- AI phân tích câu hỏi từ text hoặc file ảnh/PDF/Word.
- Báo cáo Markdown bằng AI.
- Lưu dữ liệu qua backend, có cache trình duyệt bằng `localStorage`.
- Xuất/nhập dữ liệu JSON.

## Deploy đề xuất trên Render

Tạo Render Web Service từ repo GitHub:

```text
Build Command: npm install && npm run build
Start Command: npm start
```

Environment Variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=your_postgres_connection_string
APP_PASSWORD=your_private_app_password
```

Database nên dùng Supabase hoặc Neon Postgres free tier cho nhu cầu cá nhân.

## API backend

```text
GET /api/health
GET /api/data
PUT /api/data
POST /api/ai/analyze
POST /api/ai/report
```

`/api/ai/analyze` nhận `multipart/form-data` gồm `part`, `userAnswer`, `questionText` và optional `file`.
