import { Link } from "@tanstack/react-router";
import { Package, ArrowRight, Bot } from "lucide-react";
import { LEGACY } from "@/components/AppShell";
import { Section } from "./ui";

/** [Mục 14] Sub-menu 📦 Tính năng cũ — mọi tính năng cũ vẫn nguyên vẹn, chỉ gom lại một chỗ. */
export function Nhanh7TinhNangCu() {
  const items = [
    {
      to: "/khong-gian-ai",
      label:
        "Không gian AI Đa năng cũ (chat đa mô hình, soạn thảo song song, 18 mẫu câu lệnh phòng ban)",
      icon: Bot,
    },
    ...LEGACY,
  ] as const;
  return (
    <Section
      title="📦 Tính năng cũ — gom gọn, không mất gì"
      icon={<Package className="h-5 w-5 text-primary" />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Chuyển đổi đa công ty xóa cache 1s · View-As Mode · Scan PDF & Brand Kit · KYC CCCD + Chữ ký
        số SHA-256 · Check-in Camera GPS · AI Sale Solar OCR Bill điện + Vay tài chính · Thẩm định
        500 file · Quản trị 18 phòng ban.
      </p>
      <ul className="grid gap-2 md:grid-cols-2">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-border p-3 text-sm transition-colors hover:bg-secondary"
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="flex-1">{label}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
