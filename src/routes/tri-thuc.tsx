import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/tri-thuc")({
  head: () => ({ meta: [
    { title: "Kho Tri thức Nhân loại — JETBU AI" },
    { name: "description", content: "Tri thức Nobel, Tesla và Tam Giáo phục vụ quản trị." },
    { property: "og:title", content: "Kho Tri thức Nhân loại — JETBU AI" },
    { property: "og:description", content: "Tri thức Nobel, Tesla và Tam Giáo phục vụ quản trị." },
  ] }),
  component: () => <ComingSoon title="Kho Tri thức Nhân loại" desc="Tra cứu tri thức Nobel, Tesla và Tam Giáo cùng bản đồ quan hệ nhân quả." />,
});
