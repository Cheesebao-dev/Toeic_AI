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
```

Không đưa `.env` lên Git. Frontend không đọc trực tiếp API key; mọi request AI đi qua backend Express.

## Tính năng

- Dashboard tổng quan điểm ước tính, accuracy, lỗi chưa khắc phục.
- Nhật ký luyện đề theo Part 1-7.
- Sổ tay lỗi sai có lọc theo Part, loại lỗi, trạng thái.
- AI phân tích câu hỏi từ text hoặc file ảnh/PDF/Word.
- Báo cáo Markdown bằng AI.
- Lưu dữ liệu trong trình duyệt bằng `localStorage`.
- Xuất/nhập dữ liệu JSON.

## API backend

```text
GET /api/health
POST /api/ai/analyze
POST /api/ai/report
```

`/api/ai/analyze` nhận `multipart/form-data` gồm `part`, `userAnswer`, `questionText` và optional `file`.

