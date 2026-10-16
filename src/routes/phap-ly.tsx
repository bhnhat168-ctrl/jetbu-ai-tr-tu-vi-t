import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/phap-ly")({
  head: () => ({ meta: [
    { title: "Cố vấn Pháp lý & Hợp đồng — JETBU AI" },
    { name: "description", content: "Rà soát, soạn thảo và phê duyệt hợp đồng với AI." },
    { property: "og:title", content: "Cố vấn Pháp lý & Hợp đồng — JETBU AI" },
    { property: "og:description", content: "Rà soát, soạn thảo và phê duyệt hợp đồng với AI." },
  ] }),
  component: () => <ComingSoon title="Cố vấn Pháp lý & Hợp đồng" desc="Rà soát hợp đồng, soạn thảo văn bản và quản lý báo cáo phê duyệt." />,
});
