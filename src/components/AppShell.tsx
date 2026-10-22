import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  Package,
  Gauge,
  Scale,
  Library,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type Company } from "@/lib/workspace-store";
import { BRANCHES, useJetbuStore, type BranchId } from "@/store/useJetbuStore";

/** [Mục 14] Toàn bộ tính năng cũ gom vào 1 sub-menu — giao diện chính luôn tinh gọn. */
export const LEGACY = [
  {
    to: "/quan-tri",
    label:
      "Chuyển đổi đa công ty (xóa cache 1s) · View-As · KYC CCCD + Chữ ký SHA-256 · Thẩm định 500 file · API Hub cũ",
    icon: ShieldCheck,
  },
  {
    to: "/di-dong",
    label: "Check-in Camera GPS thực địa · Scan PDF/OCR · Ký tên điện tử",
    icon: Smartphone,
  },
  { to: "/chien-luoc", label: "Buồng lái Chiến lược 6 Chuyên gia (Arena cũ)", icon: Gauge },
  { to: "/phap-ly", label: "Cố vấn Pháp lý & Hợp đồng (bản cũ)", icon: Scale },
  {
    to: "/tri-thuc",
    label: "Kho Tri thức Nhân loại (bản cũ) · AI Sale Solar OCR Bill điện",
    icon: Library,
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { company, switchCompany, viewAsStaff, setViewAsStaff } = useWorkspace();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const branch = useJetbuStore((s) => s.branch);
  const setBranch = useJetbuStore((s) => s.setBranch);
  const [legacyOpen, setLegacyOpen] = useState(path !== "/");
  const {
    data: companies = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id,name,code").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  useEffect(() => {
    if (!company && companies[0]) switchCompany(companies[0]);
  }, [companies, company, switchCompany]);

  const onSwitch = (id: string) => {
    const c = companies.find((x) => x.id === id);
    if (!c || c.id === company?.id) return;
    switchCompany(c);
    toast.success("Đã chuyển pháp nhân và làm sạch bộ nhớ đệm an toàn!");
  };
  const go = (b: BranchId) => {
    setBranch(b);
    if (b === "n7") setLegacyOpen(true);
    if (path !== "/") void navigate({ to: "/" });
  };
  const isHome = path === "/";

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* ===== Sidebar (desktop) / Header (mobile) ===== */}
      <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-border bg-sidebar p-3 text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-76 md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-display text-xl font-bold text-primary">JETBU AI</p>
            <p className="text-xs text-muted-foreground">Siêu hệ sinh thái · Rebirth 2026</p>
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-2 py-1.5 text-card-foreground shadow-sm md:hidden">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <select
              className="w-full min-w-0 bg-transparent text-sm"
              value={company?.id ?? ""}
              onChange={(e) => onSwitch(e.target.value)}
              disabled={isLoading || !companies.length}
            >
              {!companies.length && (
                <option value="">
                  {isLoading ? "Đang tải..." : error ? "Lỗi" : "Chưa có công ty"}
                </option>
              )}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="hidden rounded-xl bg-card p-3 text-card-foreground shadow-sm md:block">
          <span className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            Chuyển đổi Công ty
          </span>
          <select
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-base"
            value={company?.id ?? ""}
            onChange={(e) => onSwitch(e.target.value)}
            disabled={isLoading || !companies.length}
          >
            {isLoading && <option>Đang tải...</option>}
            {!isLoading && !companies.length && (
              <option value="">{error ? "Lỗi tải danh sách" : "Chưa có công ty nào"}</option>
            )}
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>

        {/* 7 nhánh — desktop dọc, mobile cuộn ngang (đủ 100% tính năng, không ẩn) */}
        <nav className="hidden gap-2 md:flex md:flex-col" aria-label="7 nhánh JETBU AI">
          {BRANCHES.map((b) => {
            const active = isHome && branch === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => go(b.id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors md:text-base ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                <span className="text-lg leading-none">{b.emoji}</span>
                <span className="md:hidden">{b.short}</span>
                <span className="hidden md:inline">{b.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sub-menu 📦 Tính năng cũ */}
        <div className="hidden md:block">
          <button
            type="button"
            onClick={() => setLegacyOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              📦 Tính năng cũ (sub-menu)
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${legacyOpen ? "rotate-180" : ""}`}
            />
          </button>
          {legacyOpen && (
            <div className="mt-1 space-y-1 border-l border-border pl-3">
              {LEGACY.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-start gap-2 rounded-lg px-2 py-2 text-xs leading-snug transition-colors ${path === to ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        {viewAsStaff && (
          <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-warning px-4 py-3 text-base font-semibold text-warning-foreground">
            <span>
              ⚠️ Đang hóa thân xem dưới góc nhìn Nhân viên — mọi nút xóa dữ liệu đã bị khóa.
            </span>
            <button
              onClick={() => setViewAsStaff(false)}
              className="rounded-lg bg-card px-3 py-1 text-card-foreground"
            >
              Thoát chế độ
            </button>
          </div>
        )}
        {children}
      </main>

      {/* ===== Thanh điều hướng đáy (mobile) — bấm 1 chạm, đủ 7 nhánh ===== */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-border bg-sidebar/95 text-sidebar-foreground backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Điều hướng nhanh"
      >
        {BRANCHES.map((b) => {
          const active = isHome && branch === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => go(b.id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className="text-lg leading-none">{b.emoji}</span>
              <span>{b.short}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
