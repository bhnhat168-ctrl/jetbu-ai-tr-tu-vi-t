import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/quan-tri")({
  head: () => ({ meta: [
    { title: "Trung tâm Quản trị Admin & GPS — JETBU AI" },
    { name: "description", content: "Quản trị 7 tab và chấm công di động bằng GPS." },
    { property: "og:title", content: "Trung tâm Quản trị Admin & GPS — JETBU AI" },
    { property: "og:description", content: "Quản trị 7 tab và chấm công di động bằng GPS." },
  ] }),
  component: () => <ComingSoon title="Trung tâm Quản trị Admin 7 Tab & Di động GPS" desc="Quản trị toàn hệ thống và theo dõi chấm công GPS của nhân viên." />,
});
