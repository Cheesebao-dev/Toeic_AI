# Ứng dụng Theo dõi luyện đề TOEIC - Đặc tả bổ sung

## 1. Mục tiêu ứng dụng

Ứng dụng giúp người học TOEIC theo dõi quá trình luyện đề, ghi lại lỗi sai, phân tích nguyên nhân sai và đề xuất kế hoạch cải thiện để tiến gần mục tiêu điểm số, ví dụ 990 TOEIC.

Ứng dụng không chỉ là nơi ghi điểm, mà còn là hệ thống học tập cá nhân gồm:

- Theo dõi tiến độ luyện đề theo ngày, theo Part và theo kỹ năng Listening/Reading.
- Lưu lại các câu sai thành sổ tay lỗi sai.
- Phân tích lỗi sai bằng AI hoặc ghi chú thủ công.
- Tạo báo cáo tổng quan về điểm mạnh, điểm yếu và kế hoạch học tiếp theo.
- Giữ dữ liệu sau khi tải lại trang, đóng trình duyệt hoặc quay lại app.

## 2. Phạm vi sản phẩm

### 2.1. Phiên bản MVP nên làm trước

Phiên bản đầu tiên nên tập trung vào các chức năng cốt lõi:

- Dashboard tổng quan.
- Nhật ký luyện đề.
- Sổ tay lỗi sai.
- Nhập câu hỏi/lỗi sai bằng văn bản.
- Lưu dữ liệu ổn định.
- Tính accuracy, số câu đúng/sai, tiến độ theo thời gian.
- Báo cáo học tập cơ bản.

AI có thể được thêm sau, hoặc chỉ tích hợp ở mức đơn giản trong MVP nếu ngân sách và thời gian cho phép.

### 2.2. Phiên bản nâng cao

Sau khi MVP ổn định, bổ sung:

- Đọc câu hỏi từ ảnh.
- Đọc tài liệu PDF, Word.
- Tự bóc tách nhiều câu hỏi.
- AI giải thích đáp án đúng/sai.
- AI phân loại lỗi sai.
- AI tạo kế hoạch học tập cá nhân.
- AI tạo quiz ôn lại từ lỗi cũ.

## 3. Cấu trúc giao diện chính

Ứng dụng gồm 3 khu vực chính, chuyển đổi qua lại bằng sidebar bên trái:

1. Tổng quan
2. Sổ tay lỗi sai
3. Nhật ký

Sidebar có thể thu gọn để tăng không gian cho nội dung chính.

Màu chủ đạo: xanh blue và đen. Giao diện nên gọn, rõ ràng, tập trung vào việc học, không quá trang trí. Các bảng, biểu đồ và bộ lọc cần dễ đọc trên cả laptop và màn hình nhỏ.

## 4. Màn Tổng quan

Màn Tổng quan dùng để xem nhanh tiến độ học và mức độ tiến gần mục tiêu.

### 4.1. Chỉ số cần hiển thị

- Điểm TOEIC mục tiêu, mặc định là 990.
- Điểm ước tính hiện tại.
- Điểm Listening ước tính.
- Điểm Reading ước tính.
- Tổng số buổi luyện.
- Tổng số đề đã làm.
- Tổng số câu đã làm.
- Tổng số câu đúng.
- Tổng số câu sai.
- Accuracy tổng.
- Accuracy theo từng Part 1-7.
- Số lỗi sai chưa khắc phục.
- Số lỗi sai đã khắc phục.
- Part yếu nhất.
- Loại lỗi lặp lại nhiều nhất.

### 4.2. Biểu đồ nên có

- Biểu đồ điểm ước tính theo thời gian.
- Biểu đồ accuracy theo từng Part.
- Biểu đồ số lỗi sai theo loại lỗi.
- Biểu đồ số buổi học theo tuần hoặc tháng.

### 4.3. Cách tính điểm

TOEIC không nên tính điểm bằng công thức tuyến tính đơn giản. Ứng dụng nên ghi rõ đây là điểm ước tính.

Cách tính đề xuất:

- Người dùng nhập số câu đúng Listening và Reading riêng.
- Ứng dụng dùng bảng quy đổi TOEIC ước lượng để suy ra điểm Listening và Reading.
- Tổng điểm = điểm Listening + điểm Reading.
- Nếu người dùng chỉ nhập tổng số câu đúng/sai, app chỉ tính accuracy, không kết luận điểm TOEIC chính xác.

Cần cho phép người dùng chỉnh điểm thật nếu có kết quả từ đề thi hoặc mock test. Điểm thật này nên được ưu tiên trong biểu đồ tiến độ.

### 4.4. Báo cáo học tập

Khu vực báo cáo có thể hiển thị Markdown, gồm:

- Tóm tắt tiến độ hiện tại.
- Điểm mạnh.
- Điểm yếu.
- Lỗi sai lặp lại.
- Nhận xét thái độ học tập dựa trên tần suất luyện.
- Kế hoạch hành động ngắn gọn cho tuần tiếp theo.

Báo cáo sau khi tạo phải được lưu lại và không mất khi tải lại trang.

## 5. Màn Sổ tay lỗi sai

Đây là tính năng cốt lõi của ứng dụng. Mục tiêu là giúp người học không chỉ biết mình sai câu nào, mà còn biết vì sao sai và cần ôn lại gì.

### 5.1. Cách nhập câu hỏi

Ứng dụng hỗ trợ 3 phương thức nhập:

1. Gõ hoặc dán văn bản.
2. Tải ảnh hoặc dán ảnh bằng Ctrl+V.
3. Tải file PDF, DOC hoặc DOCX.

Với bản MVP, nên ưu tiên nhập văn bản trước. Ảnh và file nên là tính năng nâng cao vì cần AI/OCR và xử lý tài liệu.

### 5.2. Thông tin cần nhập cho mỗi câu sai

- Ngày tạo.
- Part TOEIC, từ Part 1 đến Part 7.
- Kỹ năng: Listening hoặc Reading.
- Nguồn đề hoặc tên tài liệu.
- Nội dung câu hỏi.
- Các đáp án A/B/C/D nếu có.
- Đáp án người dùng chọn.
- Đáp án đúng.
- Trạng thái đúng/sai.
- Giải thích.
- Bản dịch tiếng Việt nếu cần.
- Loại lỗi sai.
- Ghi chú cá nhân.
- Trạng thái khắc phục.

### 5.3. Loại lỗi sai nên có

Ứng dụng nên có danh sách loại lỗi để thống kê:

- Từ vựng.
- Ngữ pháp.
- Chọn sai loại từ.
- Sai thì.
- Sai giới từ.
- Sai collocation.
- Không hiểu ngữ cảnh.
- Đọc thiếu thông tin.
- Suy luận sai.
- Bẫy đáp án.
- Nghe nhầm âm.
- Không bắt được keyword.
- Thiếu thời gian.
- Lỗi bất cẩn.
- Khác.

Người dùng có thể chỉnh loại lỗi nếu AI phân loại chưa đúng.

### 5.4. Trạng thái khắc phục lỗi

Mỗi lỗi sai nên có trạng thái:

- Chưa xử lý.
- Đang ôn lại.
- Đã hiểu.
- Đã khắc phục.
- Cần ôn lại sau.

Khi người dùng bấm "Khắc phục lỗi sai", ứng dụng không nên chỉ ẩn nội dung. Nên mở một luồng nhỏ:

1. Người dùng đọc lại giải thích.
2. Người dùng ghi bài học rút ra hoặc để AI gợi ý.
3. Người dùng chọn trạng thái mới.
4. Ứng dụng có thể thu nhỏ phần giải thích để giảm rối mắt.
5. Lỗi đã khắc phục được tính vào Tổng quan.

### 5.5. Bộ lọc và tìm kiếm

Sổ tay lỗi sai cần có:

- Tìm kiếm theo từ khóa.
- Lọc theo Part.
- Lọc theo kỹ năng Listening/Reading.
- Lọc theo loại lỗi.
- Lọc theo trạng thái khắc phục.
- Lọc theo nguồn đề.
- Sắp xếp theo ngày mới nhất, lỗi lặp lại nhiều nhất hoặc lỗi chưa xử lý.

## 6. Màn Giải thích chi tiết bằng AI

Khi người dùng nhập câu hỏi và bấm "Bắt đầu giải", AI có thể phân tích và trả về kết quả.

### 6.1. Kết quả hiển thị cho mỗi câu

Mỗi câu nên được hiển thị thành một card riêng, đặc biệt khi ảnh hoặc file chứa nhiều câu hỏi.

Mỗi card gồm:

- Số thứ tự câu.
- Đáp án đúng.
- Đáp án người dùng đã chọn.
- Đúng hay sai.
- Giải thích chi tiết.
- Phân tích các phương án sai.
- Bản dịch tiếng Việt.
- Loại lỗi của người dùng.
- Gợi ý cải thiện.
- Nút lưu vào sổ tay lỗi sai.
- Nút đánh dấu đã khắc phục.

### 6.2. AI nên trả về dữ liệu có cấu trúc

Không nên chỉ yêu cầu AI trả về Markdown tự do. App nên yêu cầu AI trả về JSON để dễ lưu và hiển thị.

Ví dụ dữ liệu AI nên trả:

```json
{
  "question_number": "101",
  "question_text": "...",
  "options": {
    "A": "...",
    "B": "...",
    "C": "...",
    "D": "..."
  },
  "user_answer": "B",
  "correct_answer": "C",
  "is_correct": false,
  "explanation": "...",
  "wrong_option_analysis": {
    "A": "...",
    "B": "...",
    "D": "..."
  },
  "vietnamese_translation": "...",
  "mistake_type": "Ngữ pháp",
  "improvement_tip": "...",
  "confidence_score": 0.92
}
```

Giao diện có thể dùng dữ liệu này để hiển thị đẹp. Phần báo cáo tổng quan vẫn có thể dùng Markdown.

### 6.3. Kiểm soát chất lượng AI

AI có thể sai, nên ứng dụng cần:

- Cho phép người dùng sửa đáp án đúng.
- Cho phép sửa loại lỗi.
- Cho phép sửa giải thích.
- Hiển thị cảnh báo rằng kết quả AI chỉ mang tính hỗ trợ học tập.
- Không tự động lưu kết quả nếu người dùng chưa xác nhận.

## 7. Màn Nhật ký

Nhật ký dùng để ghi lại hoạt động học mỗi ngày.

### 7.1. Thông tin cần nhập cho mỗi buổi học

- Ngày học.
- Tên đề hoặc tài liệu.
- Loại buổi học: Part riêng, Listening, Reading hoặc Full test.
- Part đã luyện: Part 1-7.
- Số câu đã làm.
- Số câu đúng.
- Số câu sai.
- Thời gian làm bài.
- Điểm ước tính nếu có.
- Ghi chú hôm nay đã học gì.
- Kinh nghiệm rút ra.
- Mức độ tập trung hoặc thái độ học tập.

### 7.2. Gộp dữ liệu vào Tổng quan

Dữ liệu từ Nhật ký phải tự động cập nhật Tổng quan:

- Cập nhật tổng số buổi học.
- Cập nhật tổng số câu đã làm.
- Cập nhật accuracy.
- Cập nhật biểu đồ tiến độ.
- Cập nhật thống kê theo Part.
- Cập nhật nhận xét học tập.

Người dùng có thể chỉnh sửa hoặc xóa từng mục nhật ký. Khi chỉnh sửa/xóa, Tổng quan phải tính lại theo dữ liệu mới.

### 7.3. AI hỗ trợ nhật ký

Ở mỗi mục nhật ký, AI có thể:

- Tóm tắt điều người học đã làm.
- Rút ra kinh nghiệm học tập.
- Gợi ý việc nên làm ở buổi tiếp theo.
- Nhắc lại lỗi sai lặp lại từ Sổ tay lỗi sai.

Người dùng vẫn có thể tự ghi kinh nghiệm thay vì dùng AI.

## 8. Lưu trữ dữ liệu

Yêu cầu quan trọng: dữ liệu không mất khi tải lại trang.

### 8.1. Nếu làm app cá nhân/local

Có thể lưu bằng:

- LocalStorage cho dữ liệu nhỏ.
- IndexedDB cho dữ liệu lớn hơn như ảnh, lịch sử nhiều câu hỏi, file.

Cần có chức năng xuất/nhập dữ liệu để tránh mất dữ liệu khi đổi máy hoặc xóa trình duyệt.

### 8.2. Nếu làm app dùng lâu dài/cloud

Nên dùng database như Supabase, Firebase hoặc backend riêng.

Các chức năng nên có:

- Đăng nhập.
- Đồng bộ dữ liệu nhiều thiết bị.
- Sao lưu dữ liệu.
- Phân quyền dữ liệu cá nhân.

### 8.3. Xuất dữ liệu

Nên hỗ trợ xuất:

- CSV hoặc Excel cho nhật ký.
- JSON để sao lưu toàn bộ dữ liệu.
- Markdown hoặc PDF cho báo cáo học tập.

## 9. AI API có cần thiết không?

AI API là cần thiết nếu muốn ứng dụng có khả năng phân tích thông minh.

Các chức năng cần AI/API:

- Đọc câu hỏi từ ảnh.
- Đọc file PDF/Word.
- Tách nhiều câu hỏi trong một ảnh hoặc tài liệu.
- Giải thích đáp án.
- Phân tích vì sao người dùng sai.
- Phân loại lỗi sai.
- Tạo báo cáo tiến độ.
- Đề xuất kế hoạch học.

Các chức năng không bắt buộc cần AI/API:

- Ghi nhật ký học tập.
- Nhập số câu đúng/sai.
- Tính accuracy.
- Hiển thị biểu đồ.
- Lưu sổ tay lỗi sai thủ công.
- Đánh dấu đã khắc phục.

Khuyến nghị: nên thiết kế app có kiến trúc cho phép bật/tắt AI. Nếu chưa có API key, app vẫn dùng được ở chế độ thủ công.

## 10. Yêu cầu xử lý file, ảnh và văn bản

### 10.1. Ảnh

- Hỗ trợ JPG, PNG.
- Có thể upload bằng nút chọn file.
- Có thể dán ảnh bằng Ctrl+V.
- Nên có preview ảnh trước khi gửi AI.
- Người dùng có thể xóa ảnh hoặc thay ảnh khác.

### 10.2. PDF/Word

- Hỗ trợ PDF, DOC, DOCX.
- Mỗi lần upload nên giới hạn tối đa 5 trang.
- Nếu file quá dài, app yêu cầu người dùng tách nhỏ.
- Sau khi đọc file, app nên cho người dùng xem lại nội dung đã trích xuất trước khi gửi AI.

### 10.3. Trường hợp AI đọc sai

Người dùng phải có quyền chỉnh sửa:

- Nội dung câu hỏi.
- Đáp án.
- Số thứ tự câu.
- Loại lỗi.
- Giải thích.

## 11. Cấu trúc dữ liệu đề xuất

### 11.1. StudySession

- id
- date
- title
- mode: Part, Listening, Reading, Full test
- parts
- totalQuestions
- correctCount
- wrongCount
- estimatedListeningScore
- estimatedReadingScore
- estimatedTotalScore
- durationMinutes
- notes
- reflection
- aiReflection
- createdAt
- updatedAt

### 11.2. MistakeItem

- id
- createdAt
- updatedAt
- sourceTitle
- part
- skill
- questionNumber
- questionText
- options
- userAnswer
- correctAnswer
- isCorrect
- explanation
- wrongOptionAnalysis
- vietnameseTranslation
- mistakeType
- improvementTip
- status
- personalNote
- aiConfidence

### 11.3. ProgressReport

- id
- createdAt
- markdownContent
- summary
- suggestedActions
- basedOnSessionIds
- basedOnMistakeIds

## 12. Tiêu chí nghiệm thu

Ứng dụng được xem là đạt yêu cầu cơ bản nếu:

- Người dùng tạo, sửa, xóa được nhật ký học tập.
- Người dùng tạo, sửa, xóa được lỗi sai.
- Dữ liệu không mất khi tải lại trang.
- Tổng quan tự động cập nhật từ Nhật ký và Sổ tay lỗi sai.
- Có thống kê accuracy tổng và theo Part.
- Có trạng thái khắc phục lỗi sai.
- Có bộ lọc trong Sổ tay lỗi sai.
- Có thể tạo báo cáo học tập và lưu báo cáo.
- Nếu có AI, người dùng có thể kiểm tra và sửa kết quả AI trước khi lưu.

## 13. Gợi ý roadmap triển khai

### Giai đoạn 1: Tracking thủ công

- Xây Dashboard.
- Xây Nhật ký.
- Xây Sổ tay lỗi sai.
- Lưu dữ liệu local.
- Tính accuracy và biểu đồ cơ bản.

### Giai đoạn 2: AI giải thích câu hỏi

- Nhập câu hỏi bằng text.
- Gửi câu hỏi và đáp án người dùng chọn cho AI.
- AI trả giải thích dạng JSON.
- Người dùng xác nhận rồi lưu vào sổ tay.

### Giai đoạn 3: Ảnh và file

- Upload ảnh.
- Dán ảnh bằng Ctrl+V.
- Upload PDF/DOC/DOCX tối đa 5 trang.
- Trích xuất nội dung.
- Tự tách nhiều câu hỏi.

### Giai đoạn 4: Cá nhân hóa học tập

- Báo cáo tuần.
- Gợi ý kế hoạch học.
- Quiz ôn lại lỗi cũ.
- Nhắc lỗi lặp lại.
- Xuất báo cáo.

## 14. Prompt mẫu cho AI

Khi gửi câu hỏi cho AI, có thể dùng yêu cầu như sau:

```text
Bạn là trợ lý luyện thi TOEIC. Hãy phân tích câu hỏi sau.

Yêu cầu:
1. Xác định đáp án đúng.
2. So sánh với đáp án người học đã chọn.
3. Giải thích ngắn gọn nhưng đủ trọng tâm.
4. Phân tích vì sao các phương án sai không phù hợp.
5. Dịch câu hoàn chỉnh sang tiếng Việt.
6. Phân loại lỗi sai của người học.
7. Đề xuất một hành động học tập cụ thể để cải thiện.
8. Trả về JSON hợp lệ, không trả thêm văn bản ngoài JSON.

Dữ liệu:
- Part TOEIC: {{part}}
- Câu hỏi: {{question}}
- Đáp án người học chọn: {{user_answer}}
```

## 15. Kết luận

Tài liệu ban đầu đã đủ để mô tả ý tưởng, nhưng để yêu cầu tạo ứng dụng thực tế thì nên bổ sung các phần về dữ liệu, cách tính điểm, luồng xử lý lỗi sai, lưu trữ, AI API và tiêu chí nghiệm thu.

Khuyến nghị là xây MVP trước với tracking thủ công, sau đó tích hợp AI API theo từng bước. Cách này giúp ứng dụng dùng được sớm, ít rủi ro và dễ mở rộng về sau.
