import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/chien-luoc")({
  head: () => ({ meta: [
    { title: "Buồng lái Chiến lược 6 Chuyên gia — JETBU AI" },
    { name: "description", content: "Hội đồng 6 chuyên gia AI phân tích chiến lược cho doanh nghiệp." },
    { property: "og:title", content: "Buồng lái Chiến lược 6 Chuyên gia — JETBU AI" },
    { property: "og:description", content: "Hội đồng 6 chuyên gia AI phân tích chiến lược cho doanh nghiệp." },
  ] }),
  component: () => <ComingSoon title="Buồng lái Chiến lược 6 Chuyên gia" desc="Hội đồng 6 chuyên gia AI cùng phân tích một vấn đề chiến lược từ nhiều góc nhìn." />,
});
