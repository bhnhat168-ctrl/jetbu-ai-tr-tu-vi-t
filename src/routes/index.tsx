/**
 * Trang chủ JETBU AI (Rebirth 2026) — Mobile-First + Desktop, chứa đủ 7 Nhánh Mindmap và sub-menu 📦 Tính năng cũ.
 * Nhánh đang mở được nhớ trong useJetbuStore (localStorage). Điều hướng qua AppShell (sidebar / thanh đáy).
 */
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useWorkspace } from "@/lib/workspace-store";
import { BRANCHES, useJetbuStore } from "@/store/useJetbuStore";
import { Spin } from "@/components/rebirth/ui";

const Nhanh1 = lazy(() =>
  import("@/components/rebirth/Nhanh1AiHub").then((m) => ({ default: m.Nhanh1AiHub })),
);
const Nhanh2 = lazy(() =>
  import("@/components/rebirth/Nhanh2BoNao").then((m) => ({ default: m.Nhanh2BoNao })),
);
const Nhanh3 = lazy(() =>
  import("@/components/rebirth/Nhanh3LucDao").then((m) => ({ default: m.Nhanh3LucDao })),
);
const Nhanh4 = lazy(() =>
  import("@/components/rebirth/Nhanh4TinTucPhapLy").then((m) => ({
    default: m.Nhanh4TinTucPhapLy,
  })),
);
const Nhanh5 = lazy(() =>
  import("@/components/rebirth/Nhanh5TroLy").then((m) => ({ default: m.Nhanh5TroLy })),
);
const Nhanh6 = lazy(() =>
  import("@/components/rebirth/Nhanh6Drive").then((m) => ({ default: m.Nhanh6Drive })),
);
const Nhanh7 = lazy(() =>
  import("@/components/rebirth/Nhanh7TinhNangCu").then((m) => ({ default: m.Nhanh7TinhNangCu })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JETBU AI — Siêu Hệ Sinh Thái Rebirth 2026" },
      {
        name: "description",
        content:
          "Smart AI Hub, Bộ não thứ 2 (.md + 3D), Sách Lục Đạo Luân Hồi, Thế giới trong tay mỗi ngày, Pháp luật, Chat bot & Cố vấn Admin, Ghi âm họp, Live Office, Google Drive 5TB.",
      },
      { property: "og:title", content: "JETBU AI — Siêu Hệ Sinh Thái Rebirth 2026" },
      {
        property: "og:description",
        content: "7 nhánh mindmap, 15 tính năng, 3-Tier Truth Protocol chống ảo giác.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { company } = useWorkspace();
  const branch = useJetbuStore((s) => s.branch);
  // Zustand persist hydrate sau SSR → tránh lệch markup: render sau khi mount.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const meta = BRANCHES.find((b) => b.id === branch) ?? BRANCHES[0]!;

  return (
    <div className="space-y-4 p-3 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Siêu hệ sinh thái JETBU AI · Rebirth 2026
          </p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            {meta.emoji} {meta.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pháp nhân: <b className="text-foreground">{company?.name ?? "…"}</b> · Hiến pháp trung
            thực: Kho nội bộ → nguồn mở → hội đồng AI kiểm chứng
          </p>
        </div>
      </header>
      {!ready ? (
        <Spin label="Đang khởi động…" />
      ) : (
        <Suspense fallback={<Spin label="Đang tải nhánh…" />}>
          {branch === "n1" && <Nhanh1 />}
          {branch === "n2" && <Nhanh2 />}
          {branch === "n3" && <Nhanh3 />}
          {branch === "n4" && <Nhanh4 />}
          {branch === "n5" && <Nhanh5 />}
          {branch === "n6" && <Nhanh6 />}
          {branch === "n7" && <Nhanh7 />}
        </Suspense>
      )}
    </div>
  );
}
