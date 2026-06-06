# SPEDUMAP — Anchor Behavior Rubric Reference

> **Nguồn:** `lib/anchor-data.ts` (SSOT). Tài liệu này được trích tự động — mọi chỉnh sửa phải áp vào file nguồn.  
> **Thang điểm:** 0 (nặng nhất) → 4 (tốt nhất). `∅` = chưa quan sát / ngoài range.  
> **L0:** có 2 rubric — `Behavioral` (mặc định) và `Clinical` (khi `isClinic=true`).  
> **L1–L7:** một rubric duy nhất (`rows`).

---

## L0 · Health & Nutrition (5 blocks)

---

### sleep · Sleep — Giấc ngủ

**Behavioral**

| Điểm | Mô tả |
|------|-------|
| 0 | Vào giấc >60 phút, cần can thiệp mạnh (bế, ru liên tục). Thức >4 lần/đêm, khó ngủ lại >30 phút. Thức giấc hoảng loạn. Không ngủ trưa được dù cần thiết theo lứa tuổi hoặc ngủ trưa >3 giờ gây đảo lộn giấc đêm. |
| 1 | Vào giấc 45–60 phút, cần nghi thức phức tạp. Thức 2–4 lần/đêm, khó ngủ lại 15–30 phút. Cần đánh thức nhiều lần, thức giấc khóc/la hét thường xuyên. Ngủ trưa không đều, ảnh hưởng giấc đêm. |
| 2 | Vào giấc 30–45 phút, cần nghi thức đơn giản. Thức 1–2 lần/đêm, ngủ lại được trong <15 phút. Cần đánh thức 1–2 lần, thỉnh thoảng cáu kỉnh khi thức. Ngủ trưa được nhưng không đều. |
| 3 | Vào giấc 15–30 phút, nghi thức đơn giản nhất quán. Thức <1 lần/đêm, ngủ lại ngay. Tự thức hoặc cần đánh thức 1 lần nhẹ. Ngủ trưa đều đặn phù hợp lứa tuổi. |
| 4 | Vào giấc <15 phút, không cần nghi thức đặc biệt. Không thức hoặc thức rất hiếm (<1 lần/tuần). Tự thức đúng giờ, tỉnh táo. Ngủ trưa đúng nhu cầu lứa tuổi hoặc tự điều chỉnh. |

**Clinical**

| Điểm | Mô tả |
|------|-------|
| 0 | Rối loạn giấc ngủ nặng được chẩn đoán (polysomnography, sleep diary). Cần can thiệp y tế. |
| 1 | Rối loạn giấc ngủ trung bình theo ghi nhận lâm sàng. Chưa chẩn đoán chính thức nhưng chỉ số bất thường rõ. |
| 2 | Giấc ngủ không đều theo sleep diary. Chưa đến ngưỡng rối loạn lâm sàng. |
| 3 | Giấc ngủ tương đối tốt theo ghi nhận. Không cần can thiệp y tế. |
| 4 | Giấc ngủ tốt, tất cả chỉ số trong giới hạn bình thường. |

---

### microbiome · Microbiome — Vi sinh đường ruột

**Behavioral**

| Điểm | Mô tả |
|------|-------|
| 0 | Đau bụng hàng ngày. Tiêu chảy hoặc táo bón nặng liên tục. Nôn thường xuyên. Từ chối ăn do đau. |
| 1 | Đau bụng/khó chịu >3 lần/tuần. Phân không đều thường xuyên. Thỉnh thoảng nôn hoặc buồn nôn. |
| 2 | Khó chịu tiêu hóa 1–2 lần/tuần. Phân không đều nhưng không nghiêm trọng. Ăn uống được với một số giới hạn. |
| 3 | Tiêu hóa tương đối ổn. Vấn đề nhỏ không thường xuyên. Ăn uống đa dạng không bị giới hạn nhiều. |
| 4 | Tiêu hóa ổn định. Phân đều đặn. Không đau bụng. Ăn uống đa dạng không hạn chế. |

**Clinical**

| Điểm | Mô tả |
|------|-------|
| 0 | Dysbiosis nặng được xác nhận qua xét nghiệm vi sinh. Calprotectin cao. Bệnh lý đường ruột được chẩn đoán. Tiền sử dùng kháng sinh liên tục. |
| 1 | Dysbiosis trung bình hoặc nguy cơ cao theo xét nghiệm. Tiền sử kháng sinh gần đây. |
| 2 | Microbiome chưa cân bằng nhưng không có chẩn đoán. Nguy cơ trung bình theo chỉ số. |
| 3 | Microbiome tương đối cân bằng theo xét nghiệm. Không có dấu hiệu bất thường rõ. |
| 4 | Microbiome cân bằng tốt hoặc xét nghiệm bình thường. Không có tiền sử bệnh lý đường ruột. |

---

### nutrition · Nutrition — Dinh dưỡng

**Behavioral**

| Điểm | Mô tả |
|------|-------|
| 0 | Chấp nhận <5 loại thực phẩm. Từ chối toàn bộ nhóm thực phẩm. Dấu hiệu thiếu dinh dưỡng rõ (tóc, da, năng lượng thấp). |
| 1 | Chấp nhận 5–10 loại. Thiếu 1–2 nhóm thực phẩm chính. Không đủ năng lượng cho lứa tuổi. |
| 2 | Chấp nhận 10–15 loại. Có sở thích/từ chối rõ nhưng đủ nhóm cơ bản. Dinh dưỡng tạm đủ. |
| 3 | Chấp nhận >15 loại. Ăn được hầu hết nhóm. Tăng trưởng đúng đường cong. |
| 4 | Ăn đa dạng không hạn chế đáng kể. Tăng trưởng tốt. Không có dấu hiệu thiếu hụt. |

**Clinical**

| Điểm | Mô tả |
|------|-------|
| 0 | Thiếu hụt vi chất nghiêm trọng được xác nhận qua xét nghiệm. Z-score <-3. Cần can thiệp dinh dưỡng y tế. |
| 1 | Thiếu hụt vi chất trung bình. Z-score -2 đến -3. Một hoặc nhiều vi chất bất thường. |
| 2 | Thiếu vi chất nhẹ hoặc nguy cơ. Z-score -1 đến -2. Chỉ số dinh dưỡng chưa tối ưu. |
| 3 | Dinh dưỡng đủ, không có thiếu hụt đáng kể. Z-score trong giới hạn bình thường. |
| 4 | Dinh dưỡng tốt, đầy đủ và cân đối. Z-score tối ưu. Không có thiếu hụt vi chất. |

---

### immune · Immune — Miễn dịch

**Behavioral**

| Điểm | Mô tả |
|------|-------|
| 0 | Bệnh >4 lần/tháng, mỗi lần kéo dài >2 tuần. Không thể đến trường/trị liệu thường xuyên. |
| 1 | Bệnh 2–4 lần/tháng. Phục hồi 1–2 tuần. Dị ứng ảnh hưởng hoạt động hàng ngày. |
| 2 | Bệnh 1–2 lần/tháng. Phục hồi trong 1 tuần. Dị ứng theo mùa, kiểm soát được. |
| 3 | Bệnh 1–2 lần/quý. Phục hồi nhanh <1 tuần. Không có dị ứng đáng kể. |
| 4 | Hiếm khi bệnh. Phục hồi trong 2–3 ngày. Không có dị ứng. |

**Clinical**

| Điểm | Mô tả |
|------|-------|
| 0 | Suy giảm miễn dịch được chẩn đoán. Dị ứng nặng/bệnh tự miễn ảnh hưởng sinh hoạt hàng ngày. CBC bất thường. |
| 1 | Miễn dịch suy giảm nhẹ theo xét nghiệm. Dị ứng trung bình có chẩn đoán. |
| 2 | Không có chẩn đoán nhưng chỉ số nguy cơ. Dị ứng nhẹ kiểm soát được. |
| 3 | Miễn dịch tốt theo xét nghiệm. Không có chẩn đoán dị ứng/tự miễn. |
| 4 | Miễn dịch tốt. CBC bình thường. Không có tiền sử bệnh lý miễn dịch. |

---

### metabolic · Metabolic — Chuyển hóa

**Behavioral**

| Điểm | Mô tả |
|------|-------|
| 0 | Mệt mỏi mãn tính không giải thích được. Không duy trì hoạt động >15 phút. Cân nặng biến động >10% không giải thích. |
| 1 | Năng lượng thấp, mệt sau hoạt động nhẹ. Cần nghỉ thường xuyên. Khó duy trì hoạt động >30 phút. |
| 2 | Năng lượng không đều trong ngày. Mệt sau buổi chiều. Cân nặng ổn nhưng có biến động nhỏ. |
| 3 | Năng lượng tương đối ổn định. Cân nặng ổn. Duy trì hoạt động suốt ngày với nghỉ bình thường. |
| 4 | Năng lượng ổn định và đủ suốt ngày. Cân nặng ổn định. Không có dấu hiệu rối loạn chuyển hóa. |

**Clinical**

| Điểm | Mô tả |
|------|-------|
| 0 | Rối loạn chuyển hóa được chẩn đoán (tiểu đường, suy giáp, béo phì bệnh lý). Chỉ số đường huyết/TSH/BMI bất thường rõ. Cần can thiệp y tế. |
| 1 | Chỉ số cận lâm sàng bất thường chưa đến ngưỡng chẩn đoán. BMI ngoài giới hạn bình thường. |
| 2 | Chỉ số trong giới hạn nhưng có xu hướng bất thường. BMI biên. Cần theo dõi. |
| 3 | Tất cả chỉ số trong giới hạn bình thường. BMI phù hợp lứa tuổi. |
| 4 | Chỉ số chuyển hóa tối ưu. BMI lý tưởng. Không có tiền sử rối loạn chuyển hóa. |

---

## L1 · Neurological Regulation (6 blocks)

---

### arousal · Arousal — Điều tiết kích thích

| Điểm | Mô tả |
|------|-------|
| 0 | Arousal cực kỳ không ổn định. Liên tục hyper hoặc liên tục hypo. Không thể phục hồi về baseline trong session. |
| 1 | Arousal không ổn định, ảnh hưởng rõ đến khả năng tham gia. Chuyển đổi hyper/hypo thường xuyên. Phục hồi chậm >10 phút. |
| 2 | Arousal dao động nhưng kiểm soát được một phần. Cần nhắc nhở định kỳ. Phục hồi 5–10 phút. |
| 3 | Arousal tương đối ổn định. Tham gia được hoạt động có cấu trúc. Phục hồi <5 phút. |
| 4 | Arousal ổn định và phù hợp ngữ cảnh. Tự điều chỉnh được. Duy trì trạng thái tỉnh táo suốt session. |

---

### reflex_survival · Reflex — Survival (Moro · Rooting · Galant)

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng mạnh ở cả 3 phản xạ. Moro: từ chối/đông cứng khi test. Rooting: phản ứng mạnh má/cổ/tay. Galant: cong người mạnh, kêu đau hoặc từ chối. |
| 1 | Phản ứng rõ ở 2/3 phản xạ. Moro: giật mình mạnh. Rooting: phản ứng tương đối. Galant: cong người tương đối, hông nhúc nhích rõ. |
| 2 | Phản ứng nhẹ ở 1–2 phản xạ. Moro: nín thở, chuyển động có kiểm soát một phần. Rooting: ít. Galant: chuyển động nhẹ. |
| 3 | Phản ứng rất nhẹ, không ảnh hưởng chức năng. Moro: hơi giật nhẹ. Rooting: rất ít. Galant: hầu như không phản ứng. |
| 4 | Không có phản ứng bất thường ở cả 3 phản xạ. Tích hợp hoàn toàn. |

---

### reflex_postural · Reflex — Postural (ATNR · STNR · TLR · Landau)

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng rõ ở hầu hết phản xạ. ATNR: tay gập hoàn toàn, hông rung lắc. STNR: rung lắc mạnh toàn thân. TLR: không giữ được >5 giây. Landau: không thể cô lập thân trên/dưới. |
| 1 | Phản ứng rõ ở 2–3 phản xạ. ATNR: hơi cong tay, hông nhúc nhích. STNR: gập/duỗi khuỷu tay. TLR: giữ được ~10 giây, bất đối xứng. |
| 2 | Phản ứng nhẹ ở 1–2 phản xạ. ATNR: chuyển động nhẹ hông/chân. STNR: nhẹ. TLR: giữ được ~20 giây. |
| 3 | Phản ứng rất nhẹ. TLR: giữ được ~30 giây, ổn định. Landau: cô lập được, ngón chân hơi nhúc nhích. |
| 4 | Không có phản ứng bất thường. Duy trì tốt tất cả tư thế. Cô lập thân trên/dưới hoàn toàn. |

---

### reflex_cortical · Reflex — Cortical (Palmar · Babinski · Babkin)

| Điểm | Mô tả |
|------|-------|
| 0 | Palmar: cong người mạnh, vùng miệng phản ứng rõ, không hợp tác. Babinski: ngón chân xòe mạnh nhất quán. Babkin: miệng mở rộng, đầu xoay mạnh. |
| 1 | Palmar: chuyển động tương đối tay/ngón, nhúc nhích khuỷu tay hoặc vùng miệng. Babinski: ngón chân xòe tương đối. Babkin: miệng hé mở hoặc đầu xoay nhẹ. |
| 2 | Palmar: chuyển động nhẹ tay và ngón. Babinski: ngón chân hơi xòe nhẹ. Babkin: phản ứng rất nhẹ, không nhất quán. |
| 3 | Palmar: hơi chuyển động nhẹ ngón tay. Babinski: phản ứng rất nhẹ. Babkin: hầu như không phản ứng. |
| 4 | Không có phản ứng bất thường ở cả 3 phản xạ. Corticospinal tract trưởng thành. Tích hợp hoàn toàn. |

---

### tone · Muscle Tone — Trương lực cơ

| Điểm | Mô tả |
|------|-------|
| 0 | Tone nền bất thường nặng. Hypotonia nặng: không thể chống trọng lực, xệ người. Hoặc hypertonia nặng: cứng toàn thân, không thể thả lỏng. |
| 1 | Tone bất thường rõ. Ngồi được nhưng xệ vai, cần tựa liên tục. Hoặc di chuyển cứng, khó thay đổi tư thế. |
| 2 | Tone hơi bất thường. Ngồi được nhưng tư thế không tối ưu. Mỏi sau 15–20 phút hoạt động. |
| 3 | Tone tương đối bình thường. Duy trì tư thế tốt trong hầu hết hoạt động. Điều chỉnh được khi cần. |
| 4 | Tone bình thường. Duy trì tư thế tốt trong mọi hoạt động. Không mỏi bất thường. |

---

### ns_stability · Neural Stability — Ổn định hệ thần kinh

| Điểm | Mô tả |
|------|-------|
| 0 | Hệ thần kinh cực kỳ không ổn định. Phản ứng mạnh với kích thích rất nhỏ. Meltdown thường xuyên. Hành vi hoàn toàn không nhất quán. |
| 1 | Không ổn định rõ. Ngưỡng kích hoạt thấp. Phục hồi >15 phút. Biến động lớn giữa các session. |
| 2 | Không ổn định vừa. Kiểm soát được trong môi trường có cấu trúc. Phục hồi 10–15 phút. |
| 3 | Tương đối ổn định. Ngưỡng kích hoạt gần bình thường. Phục hồi 5–10 phút. Biến động nhỏ. |
| 4 | Ổn định tốt. Ngưỡng kích hoạt bình thường. Phục hồi <5 phút. Nhất quán giữa các session. |

---

## L2 · Sensory Processing (7 blocks)

---

### vestibular · Vestibular — Tiền đình

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng cực đoan với chuyển động: hoàn toàn né tránh (sợ hãi, nôn) hoặc tìm kiếm liên tục không kiểm soát. Mất thăng bằng rõ rệt. |
| 1 | Phản ứng quá mức hoặc thiếu với chuyển động. Khó duy trì thăng bằng trong hoạt động cơ bản. |
| 2 | Thăng bằng cơ bản đạt được nhưng không ổn định khi có thách thức. Có sở thích/né tránh nhất định. |
| 3 | Thăng bằng tốt trong hầu hết hoạt động. Có thể có sở thích nhỏ nhưng không ảnh hưởng chức năng. |
| 4 | Hệ tiền đình hoạt động tốt. Thăng bằng tốt trong mọi hoạt động. Xử lý chuyển động bình thường. |

---

### proprioception · Proprioception — Cảm giác bản thể

| Điểm | Mô tả |
|------|-------|
| 0 | Không nhận biết vị trí cơ thể trong không gian. Đụng chạm quá mạnh, không kiểm soát lực. Liên tục va chạm đồ vật/người khác. |
| 1 | Nhận thức cơ thể kém. Thường dùng lực không phù hợp. Khó thực hiện động tác cần phán đoán lực. |
| 2 | Nhận thức cơ thể trung bình. Kiểm soát lực không đều. Hoạt động tốt hơn trong môi trường quen. |
| 3 | Nhận thức cơ thể tương đối tốt. Kiểm soát lực hợp lý trong hầu hết tình huống. |
| 4 | Nhận thức cơ thể tốt. Kiểm soát lực và không gian chính xác. Tự điều chỉnh không cần nhắc. |

---

### auditory · Auditory — Thính giác

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng cực đoan với âm thanh: che tai, meltdown, hoặc hoàn toàn không phản hồi âm thanh. |
| 1 | Nhạy cảm âm thanh rõ rệt hoặc không phản hồi đủ. Môi trường ồn ào ảnh hưởng đáng kể. |
| 2 | Có phản ứng với một số loại âm thanh nhất định. Hoạt động được trong môi trường yên tĩnh. |
| 3 | Xử lý âm thanh tương đối tốt. Có thể có một loại gây khó chịu nhưng tự điều tiết được. |
| 4 | Xử lý âm thanh tốt. Lọc được âm thanh nền. Không có phản ứng bất thường. |

---

### visual · Visual — Thị giác

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng cực đoan với ánh sáng/thị giác. Né tránh nhìn trực tiếp hoặc bị thu hút bởi chuyển động quay liên tục. |
| 1 | Xử lý thị giác kém. Khó theo dõi đối tượng di chuyển, khó phối hợp mắt-tay. |
| 2 | Theo dõi thị giác cơ bản được nhưng không ổn định. Phối hợp mắt-tay cần nỗ lực. |
| 3 | Thị giác chức năng tốt trong hầu hết hoạt động. Theo dõi và phối hợp mắt-tay ổn. |
| 4 | Xử lý thị giác tốt. Theo dõi mượt mà, phối hợp mắt-tay chính xác. |

---

### tactile · Tactile — Xúc giác

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng cực đoan với xúc giác: hoặc né tránh hoàn toàn mọi tiếp xúc, hoặc tìm kiếm kích thích mạnh liên tục. |
| 1 | Nhạy cảm xúc giác hoặc tìm kiếm xúc giác rõ rệt. Ảnh hưởng đến mặc quần áo, cắt tóc, ăn uống. |
| 2 | Có nhạy cảm/tìm kiếm với một số loại xúc giác cụ thể. Hoạt động được nhưng cần điều chỉnh. |
| 3 | Xử lý xúc giác tương đối tốt. Có thể có sở thích nhỏ nhưng không ảnh hưởng sinh hoạt. |
| 4 | Xử lý xúc giác tốt. Không có phản ứng bất thường. Tham gia đa dạng hoạt động xúc giác. |

---

### taste · Taste — Vị giác

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng cực đoan với vị: nôn/ọe khi nếm vị nhất định, hoặc liếm/ăn đồ vật không phải thức ăn (pica). Ăn được rất ít món. |
| 1 | Nhạy cảm vị rõ rệt. Né tránh nhiều nhóm thức ăn theo vị (chua/đắng/mặn). Kén ăn nặng, ảnh hưởng dinh dưỡng. |
| 2 | Có nhạy cảm vị nhất định. Né tránh một số vị cụ thể nhưng vẫn ăn được nhóm thức ăn cơ bản. |
| 3 | Xử lý vị tương đối tốt. Có khẩu vị riêng nhưng ăn được đa dạng món. |
| 4 | Xử lý vị bình thường. Ăn đa dạng, chấp nhận vị mới. Không phản ứng bất thường. |

---

### smell · Smell — Khứu giác

| Điểm | Mô tả |
|------|-------|
| 0 | Phản ứng cực đoan với mùi: nôn/ọe hoặc hoảng loạn với mùi thường, hoặc ngửi/tìm mùi mọi vật liên tục bất thường. |
| 1 | Nhạy cảm mùi rõ rệt. Phản ứng mạnh (che mũi, bỏ chạy) với mùi bình thường ở nhà/lớp. |
| 2 | Có nhạy cảm với một số mùi cụ thể, nhưng không ảnh hưởng nghiêm trọng sinh hoạt. |
| 3 | Xử lý mùi tương đối tốt. Khó chịu với mùi mạnh nhưng thích nghi được. |
| 4 | Xử lý mùi bình thường. Không phản ứng bất thường với mùi thông thường. |

---

## L3 · Motor (5 blocks)

---

### motor_planning · Motor Planning — Lập kế hoạch vận động

| Điểm | Mô tả |
|------|-------|
| 0 | Không thể thực hiện chuỗi vận động mới dù đơn giản. Không bắt chước động tác. |
| 1 | Rất khó thực hiện vận động mới. Cần nhiều lần thử và hướng dẫn trực tiếp. Bắt chước kém. |
| 2 | Thực hiện được vận động mới với hướng dẫn cụ thể và luyện tập nhiều lần. |
| 3 | Học vận động mới được với hướng dẫn vừa phải. Bắt chước tương đối tốt. |
| 4 | Lập kế hoạch và thực hiện vận động tốt. Học kỹ năng mới nhanh. Tự động hóa hiệu quả. |

---

### gross_motor · Gross Motor — Vận động thô

| Điểm | Mô tả |
|------|-------|
| 0 | Không đạt các mốc vận động thô cơ bản so với lứa tuổi. Không đi được độc lập. |
| 1 | Trễ rõ vận động thô. Di chuyển được nhưng không vững. Té ngã thường xuyên. |
| 2 | Thực hiện được các vận động thô cơ bản nhưng không khéo léo. Một số kỹ năng lứa tuổi chưa đạt. |
| 3 | Vận động thô đủ cho sinh hoạt. Chạy, nhảy, leo cơ bản được. Có thể chậm hơn bạn cùng tuổi. |
| 4 | Vận động thô tốt, phù hợp lứa tuổi. Tham gia được các trò chơi vận động với bạn. |

---

### fine_motor · Fine Motor — Vận động tinh

| Điểm | Mô tả |
|------|-------|
| 0 | Không thực hiện được vận động tinh cơ bản. Không cầm đồ vật nhỏ, không dùng muỗng, không cầm bút. |
| 1 | Vận động tinh rất hạn chế. Cầm nắm được nhưng không kiểm soát. Cần hỗ trợ nhiều. |
| 2 | Vận động tinh cơ bản thực hiện được nhưng chậm và mệt. Viết được nhưng khó đọc. |
| 3 | Vận động tinh đủ cho sinh hoạt hàng ngày. Tự phục vụ cơ bản độc lập. |
| 4 | Vận động tinh tốt, phù hợp lứa tuổi. Viết rõ, dùng kéo và dụng cụ thành thạo. |

---

### postural_control · Postural Control — Kiểm soát tư thế

| Điểm | Mô tả |
|------|-------|
| 0 | Không thể duy trì tư thế ngồi thẳng độc lập. Cần hỗ trợ vật lý liên tục. |
| 1 | Ngồi được nhưng tư thế xấu rõ. Mệt cơ nhanh. Khó duy trì tư thế khi tập trung vào việc khác. |
| 2 | Duy trì được tư thế ngồi nhưng không ổn định khi kéo dài. Tư thế giảm dần sau 10–15 phút. |
| 3 | Duy trì tư thế ngồi tương đối tốt trong thời gian trung bình. Điều chỉnh được khi nhắc. |
| 4 | Kiểm soát tư thế tốt. Duy trì tư thế phù hợp không cần nhắc. |

---

### bilateral_coord · Bilateral Coordination — Phối hợp hai bên

| Điểm | Mô tả |
|------|-------|
| 0 | Không phối hợp được hai tay/hai chân cùng lúc. Không thể dùng tay này giữ, tay kia thao tác. |
| 1 | Phối hợp hai bên rất kém. Có xu hướng dùng một bên. Khó các hoạt động cần hai tay phối hợp. |
| 2 | Phối hợp hai bên cơ bản được nhưng chưa nhịp nhàng. Một số kỹ năng lứa tuổi chưa đạt. |
| 3 | Phối hợp hai bên đủ cho sinh hoạt. Có thể chậm hơn bạn cùng tuổi ở một số kỹ năng. |
| 4 | Phối hợp hai bên tốt, phù hợp lứa tuổi. Thực hiện nhịp nhàng các hoạt động cần phối hợp. |

---

## L4 · Processing (4 blocks)

---

### attention · Attention Focus — Chú ý & Tập trung

| Điểm | Mô tả |
|------|-------|
| 0 | Không thể duy trì chú ý vào bất kỳ hoạt động nào dù trong vài giây. Không thể tham gia hoạt động có cấu trúc. |
| 1 | Duy trì chú ý dưới 2 phút. Dễ phân tâm bởi mọi kích thích. Hiếm khi hoàn thành nhiệm vụ. |
| 2 | Duy trì chú ý 2–5 phút với hỗ trợ. Hoàn thành nhiệm vụ ngắn khi có hỗ trợ liên tục. |
| 3 | Duy trì chú ý 5–15 phút. Hoàn thành nhiệm vụ với hỗ trợ vừa phải. |
| 4 | Duy trì chú ý phù hợp lứa tuổi. Tự điều chỉnh. Hoàn thành nhiệm vụ độc lập. |

---

### auditory_processing · Auditory Processing — Xử lý thính giác

| Điểm | Mô tả |
|------|-------|
| 0 | Không hiểu được hướng dẫn bằng lời dù đơn giản. Không phản hồi tên gọi. |
| 1 | Xử lý ngôn ngữ nói rất chậm. Cần nhắc lại nhiều lần. Không hiểu câu phức. |
| 2 | Hiểu được chỉ dẫn 1–2 bước quen thuộc. Chậm xử lý trong môi trường ồn ào. |
| 3 | Hiểu được hầu hết chỉ dẫn thông thường. Xử lý tốt trong môi trường yên tĩnh. |
| 4 | Xử lý thính giác tốt. Hiểu chỉ dẫn đa bước. Không ảnh hưởng đáng kể bởi tiếng ồn. |

---

### visual_processing · Visual Processing — Xử lý thị giác

| Điểm | Mô tả |
|------|-------|
| 0 | Không nhận ra vật thể, hình ảnh, hoặc biểu tượng quen thuộc. Không phân biệt màu sắc, hình dạng cơ bản. |
| 1 | Xử lý thị giác rất hạn chế. Nhận ra vật thể quen nhưng không nhận ra hình ảnh đại diện. |
| 2 | Nhận ra hình ảnh và biểu tượng quen. Chậm quét thông tin thị giác. |
| 3 | Xử lý thị giác đủ cho học tập cơ bản. Đọc hình ảnh, biểu đồ đơn giản. |
| 4 | Xử lý thị giác tốt. Đọc và giải thích thông tin thị giác đa dạng. Phân biệt chi tiết tốt. |

---

### wm_link · Working Memory Link — Kết nối trí nhớ làm việc

| Điểm | Mô tả |
|------|-------|
| 0 | Không giữ được thông tin trong khi thực hiện nhiệm vụ. Quên ngay lập tức bước tiếp theo. |
| 1 | Trí nhớ làm việc rất hạn chế. Chỉ giữ được 1 thông tin tại một thời điểm. Mất hướng khi bị gián đoạn. |
| 2 | Giữ được 1–2 thông tin ngắn hạn. Cần nhắc lại khi nhiệm vụ có nhiều bước. |
| 3 | Trí nhớ làm việc đủ cho nhiệm vụ thông thường. Giữ được 2–3 thông tin. |
| 4 | Trí nhớ làm việc tốt, phù hợp lứa tuổi. Theo dõi đa bước. Kết hợp thông tin từ nhiều nguồn. |

---

## L5 · Communication (5 blocks)

---

### oral_language · Oral Language — Ngôn ngữ miệng

| Điểm | Mô tả |
|------|-------|
| 0 | Không có ngôn ngữ nói chức năng. Giao tiếp chỉ qua hành động hoặc không giao tiếp được. |
| 1 | Vốn từ rất hạn chế (dưới 20 từ chức năng). Chủ yếu dùng từ đơn lẻ. |
| 2 | Câu 2–3 từ thường xuyên. Người thân hiểu được, người lạ khó theo. |
| 3 | Câu đầy đủ, giao tiếp hàng ngày được. Người lạ hiểu được phần lớn. |
| 4 | Ngôn ngữ nói phù hợp lứa tuổi. Giao tiếp rõ ràng. Ngữ pháp cơ bản đúng. |

---

### word_finding · Word Finding — Tìm từ

| Điểm | Mô tả |
|------|-------|
| 0 | Không truy xuất được từ khi cần. Không thể gọi tên đồ vật quen thuộc khi nhìn thấy. |
| 1 | Tìm từ rất khó khăn. Dừng lại lâu, dùng nhiều cử chỉ thay từ. |
| 2 | Tìm từ chậm và không đều. Gọi tên đồ vật quen được nhưng chậm. |
| 3 | Tìm từ thường tốt với chủ đề quen. Giao tiếp trôi chảy hầu hết thời gian. |
| 4 | Truy xuất từ nhanh và chính xác. Giao tiếp trôi chảy. Vốn từ đa dạng. |

---

### phonemic_awareness · Phonemic Awareness — Nhận thức âm vị

| Điểm | Mô tả |
|------|-------|
| 0 | Không nhận ra vần, không phân biệt âm đầu/âm cuối. Không có khái niệm về đơn vị âm thanh. |
| 1 | Nhận ra một số từ giống vần quen thuộc nhưng không phân tích được âm. |
| 2 | Nhận ra vần cơ bản. Xác định được âm đầu của từ đơn giản. |
| 3 | Nhận ra vần tốt. Phân tích âm đầu/âm cuối được. Ghép âm với hỗ trợ ít. |
| 4 | Nhận thức âm vị tốt phù hợp lứa tuổi. Phân tích và tổng hợp âm linh hoạt. |

---

### auditory_memory · Auditory Memory — Trí nhớ thính giác

| Điểm | Mô tả |
|------|-------|
| 0 | Không nhớ được thông tin nghe trong vài giây. Không lặp lại được từ vừa nghe. |
| 1 | Nhớ được 1–2 từ riêng lẻ vừa nghe. Quên nhanh thông tin mới. |
| 2 | Nhớ được câu 2–3 từ vừa nghe. Học từ mới qua nghe nhưng cần nhiều lần lặp lại. |
| 3 | Nhớ được câu đầy đủ và chuỗi thông tin ngắn. Nhớ hướng dẫn 2–3 bước. |
| 4 | Trí nhớ thính giác tốt. Nhớ và lặp lại thông tin phức tạp. Học từ mới hiệu quả qua nghe. |

---

### visual_memory · Visual Memory — Trí nhớ thị giác

| Điểm | Mô tả |
|------|-------|
| 0 | Không nhận ra đồ vật/hình ảnh quen sau khi không nhìn thấy. Không nhớ vị trí đồ vật. |
| 1 | Trí nhớ thị giác rất kém. Không nhớ được hình ảnh vừa thấy sau vài phút. |
| 2 | Nhớ hình ảnh quen thuộc nhưng không nhớ chi tiết. Khó nhớ hình ảnh/biểu tượng mới. |
| 3 | Trí nhớ thị giác tốt cho vật thể và mặt người quen. Nhớ đường và không gian quen. |
| 4 | Trí nhớ thị giác tốt. Nhớ chi tiết hình ảnh, nhận mặt nhanh. Trí nhớ không gian tốt. |

---

## L6 · Social & Behavioral (4 blocks)

---

### self_control · Self-Control — Tự kiểm soát

| Điểm | Mô tả |
|------|-------|
| 0 | Không có khả năng kiềm chế xung động. Không dừng được khi được yêu cầu. Không chờ đợi được dù trong vài giây. |
| 1 | Kiểm soát xung động rất kém. Chờ đợi dưới 30 giây khó khăn. Dừng hoạt động chỉ khi có can thiệp vật lý. |
| 2 | Kiểm soát xung động không đều. Dừng và chờ được với nhắc nhở liên tục. |
| 3 | Kiểm soát xung động tương đối tốt trong tình huống quen. Chờ đợi được với nhắc nhở vừa phải. |
| 4 | Kiểm soát xung động tốt phù hợp lứa tuổi. Tự điều chỉnh không cần nhắc liên tục. |

---

### behavior · Behavior — Hành vi

| Điểm | Mô tả |
|------|-------|
| 0 | Hành vi nguy hiểm thường xuyên (tự làm đau, gây hại người khác). Cần giám sát 1:1 liên tục. |
| 1 | Hành vi thách thức thường xuyên ảnh hưởng đến sinh hoạt. Cần hỗ trợ hành vi chuyên biệt liên tục. |
| 2 | Hành vi thách thức xảy ra thường xuyên nhưng có thể dự đoán (trigger rõ). |
| 3 | Hành vi phù hợp hầu hết thời gian. Hành vi thách thức xảy ra không thường xuyên. |
| 4 | Hành vi phù hợp ở mức lứa tuổi. Không cần hỗ trợ hành vi chuyên biệt. |

---

### social_skills · Social Skills — Kỹ năng xã hội

| Điểm | Mô tả |
|------|-------|
| 0 | Không có tương tác xã hội chức năng. Không nhận ra người quen. Không giao tiếp mắt. |
| 1 | Tương tác xã hội rất hạn chế. Chỉ tương tác với người thân thiết trong điều kiện quen thuộc. |
| 2 | Tương tác được với người quen, khó với người lạ. Chơi song song hơn là cùng nhau. |
| 3 | Tương tác xã hội cơ bản tốt. Chơi được với bạn quen. Hiểu quy tắc xã hội thông thường. |
| 4 | Kỹ năng xã hội phù hợp lứa tuổi. Tạo và duy trì quan hệ bạn bè. Đọc tín hiệu xã hội tốt. |

---

### daily_living · Daily Living — Sinh hoạt hàng ngày

| Điểm | Mô tả |
|------|-------|
| 0 | Hoàn toàn phụ thuộc trong tất cả sinh hoạt cá nhân (ăn, vệ sinh, mặc). |
| 1 | Phụ thuộc hầu hết. Tham gia được một số bước nhưng không hoàn thành. |
| 2 | Tự thực hiện được một số kỹ năng cơ bản. Cần nhắc nhở và hỗ trợ đáng kể. |
| 3 | Tự thực hiện được hầu hết kỹ năng tự chăm sóc với nhắc nhở vừa phải. |
| 4 | Độc lập trong sinh hoạt hàng ngày phù hợp lứa tuổi. |

---

## L7 · Academic (3 blocks)

---

### math · Math — Toán học

| Điểm | Mô tả |
|------|-------|
| 0 | Không có khái niệm số. Không so sánh nhiều/ít. Không đếm được đến 3. |
| 1 | Đếm được đến 10 thuộc lòng nhưng không hiểu số lượng. Kém hơn ít nhất 2 năm so với lứa tuổi. |
| 2 | Hiểu số lượng cơ bản. Cộng/trừ trong phạm vi 10 với vật cụ thể. Kém hơn khoảng 1 năm. |
| 3 | Đạt gần mức lứa tuổi với hỗ trợ vừa phải. Thực hiện được hầu hết bài tập. |
| 4 | Đạt mức lứa tuổi. Thực hiện được bài tập lớp học độc lập. |

---

### writing · Writing — Viết

| Điểm | Mô tả |
|------|-------|
| 0 | Không viết được. Không tô theo nét. Không có khả năng cầm bút để tạo hình có chủ đích. |
| 1 | Tô/vẽ được nét cơ bản nhưng không viết chữ được. Kém hơn ít nhất 2 năm. |
| 2 | Viết được chữ cái và số quen nhưng chậm, chữ không đều. Kém hơn khoảng 1 năm. |
| 3 | Viết được với chất lượng chấp nhận được, chậm hơn bạn cùng tuổi. |
| 4 | Viết đạt mức lứa tuổi. Tốc độ và chất lượng phù hợp. |

---

### reading · Reading — Đọc hiểu

| Điểm | Mô tả |
|------|-------|
| 0 | Không nhận biết chữ cái hoặc không có khái niệm đọc. |
| 1 | Nhận biết một số chữ cái quen nhưng không đọc từ được. Kém hơn ít nhất 2 năm. |
| 2 | Đọc được từ đơn giản, quen thuộc. Chậm, cần giải mã từng chữ. |
| 3 | Đọc được tài liệu phù hợp lứa tuổi với tốc độ chậm hơn. |
| 4 | Đọc hiểu đạt mức lứa tuổi. Tốc độ và độ chính xác phù hợp. |

---

## Tổng kết

| Layer | Blocks |
|-------|--------|
| L0 Health & Nutrition | sleep · microbiome · nutrition · immune · metabolic |
| L1 Neurological Regulation | arousal · reflex_survival · reflex_postural · reflex_cortical · tone · ns_stability |
| L2 Sensory Processing | vestibular · proprioception · auditory · visual · tactile · taste · smell |
| L3 Motor | motor_planning · gross_motor · fine_motor · postural_control · bilateral_coord |
| L4 Processing | attention · auditory_processing · visual_processing · wm_link |
| L5 Communication | oral_language · word_finding · phonemic_awareness · auditory_memory · visual_memory |
| L6 Social & Behavioral | self_control · behavior · social_skills · daily_living |
| L7 Academic | math · writing · reading |
| **Tổng** | **39 blocks** |

> Xuất từ `lib/anchor-data.ts` — ONTOLOGY_VERSION 3.3
