import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2, LayoutDashboard, Wallet, Users, FileText, ScrollText, Settings,
  Sparkles, TrendingUp, AlertTriangle, Send, Banknote, Landmark, Bot,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JETBU AI — Bảng điều khiển quản trị đa công ty" },
      { name: "description", content: "Theo dõi doanh thu, quỹ tiền mặt, chuyển khoản và nhận cố vấn chiến lược từ JETBU AI." },
      { property: "og:title", content: "JETBU AI — Quản trị đa công ty" },
      { property: "og:description", content: "Hệ thống quản trị đa công ty và cố vấn chiến lược bằng AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const companies = [
  { name: "JETBU Logistics", revenue: 4.82, growth: 12.4, late: 2 },
  { name: "JETBU Vận Tải", revenue: 3.15, growth: 6.1, late: 5 },
  { name: "JETBU Xây Dựng", revenue: 2.07, growth: -3.2, late: 0 },
  { name: "JETBU Thương Mại", revenue: 1.64, growth: 9.8, late: 1 },
];

const nav = [
  { icon: LayoutDashboard, label: "Tổng quan", active: true },
  { icon: Building2, label: "Công ty" },
  { icon: Wallet, label: "Tài chính" },
  { icon: Users, label: "Nhân sự" },
  { icon: FileText, label: "Hợp đồng" },
  { icon: ScrollText, label: "Nhật ký hệ thống" },
  { icon: Settings, label: "Cài đặt" },
];

const suggestions = [
  "Phân tích dòng tiền quý này",
  "Công ty nào cần tái cơ cấu?",
  "Đề xuất giảm chi phí vận hành",
];

function Dashboard() {
  const [selected, setSelected] = useState(companies[0]?.name ?? "");
  const [question, setQuestion] = useState("");
  const totalLate = companies.reduce((s, c) => s + c.late, 0);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col bg-sidebar p-6 text-sidebar-foreground lg:flex">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-bold">JETBU AI</p>
            <p className="text-sm opacity-70">Quản trị đa công ty</p>
          </div>
        </div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <button
              key={n.label}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-lg transition ${
                n.active ? "bg-primary text-primary-foreground" : "opacity-80 hover:bg-primary/20"
              }`}
            >
              <n.icon className="h-5 w-5" /> {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 space-y-6 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Xin chào, Quản trị viên</p>
            <h1 className="text-3xl font-bold md:text-4xl">Tổng quan tập đoàn</h1>
          </div>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-xl border bg-card px-4 py-3 text-lg shadow-card"
          >
            {companies.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
        </header>

        {totalLate > 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive p-5 text-destructive-foreground">
            <AlertTriangle className="h-7 w-7 shrink-0" />
            <p className="text-lg font-semibold">SOS: {totalLate} khoản thanh toán quá hạn trên toàn hệ thống</p>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={TrendingUp} label="Tổng doanh thu" value="11,68 tỷ ₫" note="+7,8% so với tháng trước" />
          <Stat icon={Banknote} label="Quỹ tiền mặt" value="2,34 tỷ ₫" note="Cập nhật hôm nay" />
          <Stat icon={Landmark} label="Quỹ chuyển khoản" value="8,91 tỷ ₫" note="4 tài khoản ngân hàng" />
          <Stat icon={Building2} label="Công ty thành viên" value="4" note="Đang hoạt động" />
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl bg-card p-6 shadow-card xl:col-span-2">
            <h2 className="mb-5 text-2xl font-semibold">Hiệu suất công ty</h2>
            <div className="space-y-4">
              {companies.map((c) => (
                <div key={c.name} className="rounded-xl border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-semibold">{c.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold">{c.revenue.toFixed(2).replace(".", ",")} tỷ ₫</span>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${c.growth >= 0 ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"}`}>
                        {c.growth > 0 ? "+" : ""}{c.growth}%
                      </span>
                      {c.late > 0 && (
                        <span className="rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-destructive-foreground">{c.late} quá hạn</span>
                      )}
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${(c.revenue / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <Bot className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-semibold">Cố vấn JETBU AI</h2>
                <p className="text-sm opacity-75">Đang phân tích: {selected}</p>
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-card p-4 text-card-foreground">
              <p className="leading-relaxed">
                💡 Doanh thu {selected} tăng ổn định. Đề xuất ưu tiên thu hồi công nợ quá hạn và
                cân đối tỷ lệ quỹ tiền mặt dưới 20% tổng thanh khoản.
              </p>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setQuestion(s)} className="rounded-full border border-primary-foreground/30 px-3 py-1.5 text-sm hover:bg-primary-foreground/10">
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-auto flex gap-2 rounded-xl bg-card p-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Hỏi cố vấn chiến lược..."
                className="flex-1 bg-transparent px-3 text-lg text-card-foreground outline-none"
              />
              <button className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof TrendingUp; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-muted-foreground">{label}</p>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-5 w-5" /></div>
      </div>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
