import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Loader2, Upload, FileSignature, KeyRound, HardDrive, Eye, MapPin, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace-store";
import { DEPARTMENT_PROMPTS } from "@/lib/prompts";
import { AI_KEYS } from "@/lib/approval";
import { approveReport, checkConnections, summarizeReport } from "@/lib/admin.functions";


export const Route = createFileRoute("/quan-tri")({
  head: () => ({ meta: [
    { title: "Trung Tâm Quản Trị Tối Cao — JETBU AI" },
    { name: "description", content: "Bảng điều khiển Admin 7 tab: dòng tiền, KPI, duyệt báo cáo, hiệu suất AI, khóa API, phân quyền và GPS." },
    { property: "og:title", content: "Trung Tâm Quản Trị Tối Cao — JETBU AI" },
    { property: "og:description", content: "Bảng điều khiển Admin 7 tab: dòng tiền, KPI, duyệt báo cáo, hiệu suất AI, khóa API, phân quyền và GPS." },
  ] }),
  component: AdminDashboard,
});

const box = "rounded-2xl bg-card p-5 shadow-sm";
const demoTag = <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">Dữ liệu mẫu</span>;
const TABS = [
  ["cash", "1. Dòng tiền & Đào thải ngành"], ["kpi", "2. KPI Đóng dấu Thời gian"], ["approval", "3. Duyệt Báo cáo 3 Trạm"],
  ["ai", "4. Hiệu suất AI"], ["keys", "5. API Hub"], ["roles", "6. Phân quyền & View As"], ["gps", "7. Điều phối & GPS"],
] as const;

function AdminDashboard() {
  const { company } = useWorkspace();
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Master Admin Dashboard</p>
        <h1 className="font-display text-3xl font-bold">Trung Tâm Quản Trị Tối Cao</h1>
        <p className="text-muted-foreground">Pháp nhân: <b className="text-foreground">{company?.name ?? "..."}</b></p>
      </header>
      <Tabs defaultValue="cash">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-secondary p-1">
          {TABS.map(([v, l]) => <TabsTrigger key={v} value={v} className="px-3 py-2 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="cash"><CashTab /></TabsContent>
        <TabsContent value="kpi"><KpiTab /></TabsContent>
        <TabsContent value="approval"><ApprovalTab /></TabsContent>
        <TabsContent value="ai"><AiTab /></TabsContent>
        <TabsContent value="keys"><KeysTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="gps"><GpsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Tab 1 ---------- */
const CASH = [
  { m: "T5", bank: 4.2, invoice: 4.2 }, { m: "T6", bank: 4.8, invoice: 4.7 }, { m: "T7", bank: 5.1, invoice: 5.6 },
  { m: "T8", bank: 4.6, invoice: 4.6 }, { m: "T9", bank: 3.9, invoice: 4.8 }, { m: "T10", bank: 4.4, invoice: 4.5 },
];
const INDUSTRY = [
  { name: "Bất động sản nghỉ dưỡng", signs: ["Doanh thu ngành giảm 3 quý liên tiếp", "Tồn kho tăng > 30%", "Biên lợi nhuận gộp giảm"] },
  { name: "Logistics nội địa", signs: ["Chi phí nhiên liệu tăng"] },
  { name: "Bán lẻ điện máy", signs: ["Sức mua giảm", "Biên lợi nhuận giảm"] },
];
function CashTab() {
  const flagged = CASH.filter((c) => Math.abs(c.bank - c.invoice) / c.invoice > 0.05);
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <div className={`${box} lg:col-span-2`}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Đối chiếu Sao kê Ngân hàng & Hóa đơn (tỷ VNĐ)</h2>{demoTag}</div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CASH}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" /><YAxis /><Tooltip /><Legend />
              <Bar dataKey="bank" name="Sao kê ngân hàng" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="invoice" name="Hóa đơn" fill="var(--gold)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-2">
          {flagged.map((c) => (
            <p key={c.m} className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-base font-semibold text-destructive">
              <AlertTriangle className="h-5 w-5" />CỜ ĐỎ {c.m}: chênh lệch {(c.invoice - c.bank).toFixed(1)} tỷ ({((Math.abs(c.bank - c.invoice) / c.invoice) * 100).toFixed(1)}%) giữa sao kê và hóa đơn
            </p>
          ))}
        </div>
      </div>
      <div className={box}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Đào thải ngành</h2>{demoTag}</div>
        <div className="mt-3 space-y-3">
          {INDUSTRY.map((i) => {
            const red = i.signs.length >= 3;
            return (
              <div key={i.name} className={`rounded-xl border p-3 ${red ? "border-destructive bg-destructive/10" : "border-border"}`}>
                <p className={`font-semibold ${red ? "text-destructive" : ""}`}>{red && "🚩 "}{i.name} — {i.signs.length}/3 dấu hiệu</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{i.signs.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab 2 ---------- */
function KpiTab() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const rows = DEPARTMENT_PROMPTS.map((d, i) => {
    const progress = (i * 37 + 23) % 101;
    return { dept: d.dept, progress, stamp: new Date(Date.UTC(2026, 9, 17, 1 + (i % 9), (i * 13) % 60)) };
  });
  return (
    <div className={`${box} mt-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Tiến độ 18 phòng ban</h2>
        <div className="flex items-center gap-2">{demoTag}<span className="font-mono text-base">⏱ {now?.toLocaleTimeString("vi-VN") ?? "--:--:--"}</span></div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <div key={r.dept} className="rounded-xl border border-border p-3">
            <div className="flex justify-between"><b>{r.dept}</b><b className={r.progress < 40 ? "text-destructive" : "text-primary"}>{r.progress}%</b></div>
            <div className="mt-2 h-3 rounded-full bg-secondary"><div className={`h-3 rounded-full ${r.progress < 40 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${r.progress}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">Đóng dấu: {r.stamp.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tab 3 ---------- */
function ApprovalTab() {
  const { company, viewAsStaff } = useWorkspace();
  const qc = useQueryClient();
  const summarize = useServerFn(summarizeReport);
  const approve = useServerFn(approveReport);
  const [form, setForm] = useState({ title: "", author: "", dept: DEPARTMENT_PROMPTS[0]!.dept, content: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: reports = [] } = useQuery({
    queryKey: ["approval_reports", company?.code],
    enabled: !!company,
    queryFn: async () => {
      const { data, error } = await supabase.from("approval_reports").select("*").eq("company_code", company!.code).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["approval_reports"] });

  const submit = async () => {
    if (!company || !form.title.trim() || !form.author.trim() || !form.content.trim()) { toast.error("Điền đủ tiêu đề, người lập và nội dung."); return; }
    const { error } = await supabase.from("approval_reports").insert({
      company_code: company.code, author_name: form.author.trim(), department: form.dept, title: form.title.trim(),
      draft_path: `draft/${Date.now()}_${form.title.trim().slice(0, 40)}`, draft_content: form.content, status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Đã nộp báo cáo nháp vào Trạm 1 (không thể sửa sau khi nộp)");
    setForm({ ...form, title: "", content: "" }); refresh();
  };

  const run = async (id: string, kind: "sum" | "ok") => {
    setBusyId(id);
    try {
      if (kind === "sum") { await summarize({ data: { id } }); toast.success("AI đã tóm tắt ở Trạm 2"); }
      else { const r = await approve({ data: { id } }); toast.success(`Đã duyệt: ${r.approvedPath} — đã nạp vào Kho Tri Thức`); }
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className={box}>
        <h2 className="text-xl font-semibold">Trạm 1 — Tạo / tải báo cáo nháp</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tiêu đề báo cáo" className="rounded-xl border border-input px-3 py-3 text-base" />
          <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Người lập" className="rounded-xl border border-input px-3 py-3 text-base" />
          <select value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} className="rounded-xl border border-input px-3 py-3 text-base">
            {DEPARTMENT_PROMPTS.map((d) => <option key={d.dept}>{d.dept}</option>)}
          </select>
        </div>
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Nội dung báo cáo..." className="mt-3 w-full rounded-xl border border-input p-3 text-base" />
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-base font-medium"><Upload className="h-5 w-5" />Tải file (.txt, .md)
            <input type="file" accept=".txt,.md,text/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, content: await f.text(), title: form.title || f.name.replace(/\.\w+$/, "") }); e.target.value = ""; }} />
          </label>
          <button onClick={submit} className="rounded-xl bg-primary px-5 py-3 text-lg font-semibold text-primary-foreground">Nộp vào Trạm 1</button>
        </div>
      </div>

      {reports.map((r) => (
        <div key={r.id} className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="text-lg font-semibold">{r.title}</h3><p className="text-sm text-muted-foreground">{r.department} · {r.author_name} · {new Date(r.created_at!).toLocaleString("vi-VN")}</p></div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${r.status === "approved" ? "bg-primary text-primary-foreground" : "bg-gold/30"}`}>{r.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-secondary p-3"><p className="font-semibold">Trạm 1 · Bản nháp</p><p className="mt-1 line-clamp-6 whitespace-pre-wrap text-sm">{r.draft_content}</p></div>
            <div className="rounded-xl bg-secondary p-3"><p className="font-semibold">Trạm 2 · Tóm tắt AI</p>
              {r.ai_summary ? <p className="mt-1 whitespace-pre-wrap text-sm">{r.ai_summary}</p> : r.status === "pending" &&
                <button disabled={busyId === r.id} onClick={() => run(r.id, "sum")} className="mt-2 flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-base font-medium">{busyId === r.id && <Loader2 className="h-4 w-4 animate-spin" />}Tạo tóm tắt AI</button>}
            </div>
            <div className="rounded-xl bg-secondary p-3"><p className="font-semibold">Trạm 3 · Duyệt & Ký số</p>
              {r.status === "approved" ? (
                <div className="mt-1 space-y-1 text-sm"><p className="flex items-center gap-1 font-semibold text-primary"><FileSignature className="h-4 w-4" />{r.approved_path}</p><p className="break-all font-mono text-xs">SHA-256: {r.signature_hash}</p></div>
              ) : (
                <button disabled={!r.ai_summary || busyId === r.id || viewAsStaff} onClick={() => run(r.id, "ok")} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-base font-bold text-primary-foreground disabled:opacity-50">
                  {busyId === r.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}[Duyệt & Nạp vào Kho Tri Thức RAG]
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Tab 4 ---------- */
function AiTab() {
  const usage = [{ d: "T2", raw: 1.8, opt: 0.19 }, { d: "T3", raw: 2.1, opt: 0.2 }, { d: "T4", raw: 2.6, opt: 0.25 }, { d: "T5", raw: 2.2, opt: 0.22 }, { d: "T6", raw: 3.0, opt: 0.29 }, { d: "T7", raw: 1.1, opt: 0.11 }];
  const raw = usage.reduce((s, u) => s + u.raw, 0), opt = usage.reduce((s, u) => s + u.opt, 0);
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {[["Token chưa tối ưu", `${raw.toFixed(1)} triệu`], ["Token thực dùng", `${opt.toFixed(2)} triệu`], ["Tiết kiệm", `${Math.round((1 - opt / raw) * 100)}%`]].map(([l, v]) => (
        <div key={l} className={box}><p className="text-muted-foreground">{l}</p><p className="font-display text-4xl font-bold text-primary">{v}</p></div>
      ))}
      <div className={`${box} lg:col-span-3`}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Lượng Token theo ngày (triệu)</h2>{demoTag}</div>
        <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={usage}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" /><YAxis /><Tooltip /><Legend />
          <Bar dataKey="raw" name="Nếu không tối ưu" fill="var(--muted-foreground)" /><Bar dataKey="opt" name="Thực dùng (bộ nhớ đệm + định tuyến)" fill="var(--primary)" /></BarChart></ResponsiveContainer></div>
        <p className="mt-2 text-sm text-muted-foreground">Số liệu thực tế về chi phí AI xem tại Cài đặt → Gói & tín dụng.</p>
      </div>
    </div>
  );
}

/* ---------- Tab 5 ---------- */
function KeysTab() {
  const { company } = useWorkspace();
  const check = useServerFn(checkConnections);
  const [res, setRes] = useState<Awaited<ReturnType<typeof checkConnections>> | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: quota } = useQuery({
    queryKey: ["quota", company?.id], enabled: !!company,
    queryFn: async () => (await supabase.from("companies").select("storage_quota_gb, drive_folder_id").eq("id", company!.id).single()).data,
  });
  const run = async () => { setBusy(true); try { setRes(await check()); toast.success("Đã kiểm tra kết nối"); } catch { toast.error("Kiểm tra thất bại"); } finally { setBusy(false); } };
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className={box}>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><KeyRound className="h-5 w-5 text-primary" />Chìa khóa AI</h2>
        <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">🔒 Vì an toàn, chìa khóa API <b>không được dán vào trang web</b>. Hãy nhắn trợ lý Lovable "thêm khóa Gemini/Groq/..." — một ô nhập bảo mật sẽ hiện ra và khóa được mã hóa trên máy chủ.</p>
        <ul className="mt-3 space-y-2">
          <li className="flex items-center justify-between rounded-xl border border-border p-3 text-base"><span>Lovable AI (đang dùng cho toàn hệ thống)</span><Status ok={res?.lovableAi} /></li>
          {AI_KEYS.map((k) => <li key={k.env} className="flex items-center justify-between rounded-xl border border-border p-3 text-base"><span>{k.label}</span><Status ok={res?.keys.find((x) => x.env === k.env)?.configured} /></li>)}
        </ul>
        <button onClick={run} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-lg font-bold text-primary-foreground">{busy && <Loader2 className="h-5 w-5 animate-spin" />}[Kiểm tra Kết nối]</button>
      </div>
      <div className={box}>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><HardDrive className="h-5 w-5 text-primary" />Ổ đĩa Google Drive</h2>
        <p className="mt-3 text-base">Hạn mức lưu trữ của {company?.code}: <b>{quota?.storage_quota_gb ?? "..."} GB</b> ({((Number(quota?.storage_quota_gb ?? 0)) / 1000).toFixed(1)} TB)</p>
        <p className="mt-1 text-base">Thư mục Drive: <b>{quota?.drive_folder_id || "Chưa cấu hình"}</b></p>
        <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">Kết nối Google Drive thật cần cấp quyền tài khoản Google — hãy nhắn trợ lý "kết nối Google Drive" để bật.</p>
      </div>
    </div>
  );
}
function Status({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return <span className="text-sm text-muted-foreground">Chưa kiểm tra</span>;
  return ok ? <span className="font-semibold text-primary">✓ Đã kết nối</span> : <span className="font-semibold text-destructive">✗ Chưa có khóa</span>;
}

/* ---------- Tab 6 ---------- */
function RolesTab() {
  const { viewAsStaff, setViewAsStaff } = useWorkspace();
  const roles = [
    ["Admin", "Toàn quyền, duy nhất được sửa/xóa dữ liệu"], ["Kế toán", "Chỉ nộp — dữ liệu khóa sau khi ghi"],
    ["Điều hành", "Chỉ nộp — dữ liệu khóa sau khi ghi"], ["Lái xe / Nhân viên", "Chỉ nộp điểm danh & báo cáo"],
  ];
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className={box}>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Eye className="h-5 w-5 text-primary" />Hóa thân xem dưới góc nhìn Nhân viên</h2>
        <label className="mt-4 flex items-center justify-between rounded-xl border border-border p-4 text-lg">
          <span>{viewAsStaff ? "Đang BẬT" : "Đang tắt"}</span>
          <Switch checked={viewAsStaff} onCheckedChange={(v) => { setViewAsStaff(v); toast(v ? "Đã bật chế độ xem dưới góc nhìn Nhân viên" : "Đã trở lại quyền Admin"); }} />
        </label>
        <button disabled={viewAsStaff} onClick={() => toast("Đây là nút xóa minh họa")} className="mt-4 flex items-center gap-2 rounded-xl bg-destructive px-4 py-3 text-base font-semibold text-destructive-foreground disabled:opacity-40">
          <Trash2 className="h-5 w-5" />Xóa dữ liệu {viewAsStaff && "(đã khóa)"}
        </button>
      </div>
      <div className={box}>
        <h2 className="text-xl font-semibold">Ma trận phân quyền "Bút sa gà chết"</h2>
        <ul className="mt-3 space-y-2">{roles.map(([r, d]) => <li key={r} className="rounded-xl border border-border p-3"><b>{r}</b><p className="text-sm text-muted-foreground">{d}</p></li>)}</ul>
      </div>
    </div>
  );
}

/* ---------- Tab 7 ---------- */
function GpsTab() {
  const { company } = useWorkspace();
  const [sel, setSel] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["gps_checkins", company?.code], enabled: !!company,
    queryFn: async () => {
      const { data, error } = await supabase.from("gps_checkins").select("*").eq("company_code", company!.code).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const cur = data.find((d) => d.id === sel) ?? data.find((d) => d.latitude != null);
  const lat = Number(cur?.latitude), lon = Number(cur?.longitude);
  const hasPos = cur && Number.isFinite(lat) && Number.isFinite(lon);
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-5">
      <div className={`${box} lg:col-span-2`}>
        <h2 className="text-xl font-semibold">Điểm danh thực địa ({data.length})</h2>
        {isLoading ? <p className="mt-3 text-muted-foreground">Đang tải...</p> : !data.length ? <p className="mt-3 text-muted-foreground">Chưa có lượt điểm danh nào cho {company?.code}.</p> : (
          <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
            {data.map((d) => (
              <li key={d.id}>
                <button onClick={() => setSel(d.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${cur?.id === d.id ? "border-primary bg-secondary" : "border-border"}`}>
                  {d.photo_data ? <img src={d.photo_data.startsWith("data:") || d.photo_data.startsWith("http") ? d.photo_data : `data:image/jpeg;base64,${d.photo_data}`} alt={d.staff_name ?? ""} className="h-14 w-14 rounded-lg object-cover" /> : <MapPin className="h-8 w-8 text-primary" />}
                  <div><b>{d.staff_name ?? "Không tên"}</b><p className="text-sm text-muted-foreground">{d.created_at && new Date(d.created_at).toLocaleString("vi-VN")}</p><p className="text-xs text-muted-foreground">{d.latitude}, {d.longitude}</p></div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={`${box} lg:col-span-3`}>
        <h2 className="text-xl font-semibold">Bản đồ GPS {cur?.staff_name ? `— ${cur.staff_name}` : ""}</h2>
        {hasPos ? (
          <iframe title="Bản đồ" className="mt-3 h-[60vh] w-full rounded-xl border-0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.006},${lon + 0.01},${lat + 0.006}&layer=mapnik&marker=${lat},${lon}`} />
        ) : <p className="mt-3 text-muted-foreground">Chọn một lượt điểm danh có tọa độ để xem vị trí.</p>}
      </div>
    </div>
  );
}
