export type Expert = { id: number; name: string; weight: number; veto: boolean; role: string };

export const EXPERTS: Expert[] = [
  { id: 1, name: "Tài chính Định lượng & Dòng vốn", weight: 0.25, veto: true, role: "Có quyền phủ quyết Veto" },
  { id: 2, name: "Khoa học Cứng & Vật lý Vũ trụ", weight: 0.15, veto: true, role: "Có quyền phủ quyết Veto" },
  { id: 3, name: "Chu kỳ Vận 9 & Kinh Dịch", weight: 0.1, veto: false, role: "Không veto độc lập — chỉ chọn thời điểm" },
  { id: 4, name: "Lịch sử Định lượng & Địa chính trị", weight: 0.2, veto: true, role: "Có quyền phủ quyết Veto" },
  { id: 5, name: "Lý thuyết Trò chơi & Tâm lý Thần kinh", weight: 0.15, veto: false, role: "Ma trận BATNA / Cân bằng Nash" },
  { id: 6, name: "Văn hóa, Tôn giáo, Sharia & Nhân khẩu học", weight: 0.15, veto: false, role: "Góc nhìn văn hóa & dân số" },
];

/** Score = Σ (trọng số × điểm từng chuyên gia). */
export function confluenceScore(scores: Record<number, number>): number {
  return Math.round(EXPERTS.reduce((s, e) => s + e.weight * (scores[e.id] ?? 0), 0) * 10) / 10;
}

/** Only experts holding veto rights can block; expert 3 never can. */
export function activeVetoes(votes: { id: number; veto: boolean }[]): number[] {
  return votes.filter((v) => v.veto && EXPERTS.find((e) => e.id === v.id)?.veto).map((v) => v.id);
}

export const SCENARIOS = {
  seriesB: "Thẩm định Gọi vốn Series B / IPO: Công ty dự kiến gọi 30 triệu USD vòng Series B với định giá 150 triệu USD, doanh thu năm 18 triệu USD tăng 60%/năm, biên EBITDA -8%, dòng tiền hoạt động âm 2,5 triệu USD, nợ vay 6 triệu USD. Có nên gọi vốn ngay hay chuẩn bị IPO trong 24 tháng?",
  fxHedge: "Phòng hộ Phái sinh & Tỷ giá USD/VND: Công ty có khoản nợ 12 triệu USD đáo hạn sau 9 tháng, doanh thu chủ yếu bằng VND. Tỷ giá USD/VND đang chịu áp lực tăng. Nên dùng hợp đồng kỳ hạn, hoán đổi hay quyền chọn để phòng hộ, tỷ lệ phòng hộ bao nhiêu %?",
};
