import { createFileRoute } from "@tanstack/react-router";
import { cleanJson } from "@/lib/approval";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scale, Landmark, Gavel, Upload, Search, Loader2, Copy } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/phap-ly")({
  head: () => ({ meta: [
    { title: "Hội Đồng Cố Vấn Pháp Lý Đa Tầng — JETBU AI" },
    { name: "description", content: "Rà soát hợp đồng, tìm bẫy pháp lý với ma trận rủi ro 3 màu và đề xuất soạn lại điều khoản." },
    { property: "og:title", content: "Hội Đồng Cố Vấn Pháp Lý Đa Tầng — JETBU AI" },
    { property: "og:description", content: "Rà soát hợp đồng, tìm bẫy pháp lý với ma trận rủi ro 3 màu và đề xuất soạn lại điều khoản." },
  ] }),
  component: LegalEngine,
});

const EXPERTS = [
  { id: "law", name: "Luật Doanh nghiệp & M&A", sub: "Term Sheet, SHA", icon: Scale },
  { id: "finance", name: "Luật Tài chính & Ngân hàng Quốc tế", sub: "Tín dụng, bảo lãnh, LMA", icon: Landmark },
  { id: "arbitration", name: "Trọng tài Thương mại", sub: "VIAC / SIAC", icon: Gavel },
] as const;

type Risk = { level: "red" | "yellow" | "green"; clause: string; issue: string; legal_basis: string; expert: string; redraft: string };
type Result = { summary: string; experts: { id: string; opinion: string }[]; risks: Risk[] };

const LEVEL = {
  red: { label: "ĐỎ — Rủi ro chí mạng, bác bỏ ngay", cls: "border-destructive bg-destructive/10", dot: "bg-destructive" },
  yellow: { label: "VÀNG — Cần đàm phán lại", cls: "border-gold bg-gold/15", dot: "bg-gold" },
  green: { label: "XANH — An toàn chuẩn quốc tế", cls: "border-primary bg-primary/10", dot: "bg-primary" },
};

function LegalEngine() {
  const { company, sessionKey } = useWorkspace();
  const [text, setText] = useState("");
  const [side, setSide] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { abortRef.current?.abort(); setText(""); setSide(""); setResult(null); setBusy(false); }, [sessionKey]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(txt|md|csv|html?)$/i.test(f.name) && !f.type.startsWith("text/")) {
      toast.error("Hiện chỉ đọc được file văn bản (.txt, .md). Với Word/PDF, hãy sao chép nội dung và dán vào khung.");
      return;
    }
    if (f.size > 500_000) { toast.error("File quá lớn (tối đa 500KB)."); return; }
    setText(await f.text());
    toast.success(`Đã nạp ${f.name}`);
  };

  const review = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setResult(null);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const res = await fetch("/api/legal", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, side, companyName: company?.name }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "Lỗi kết nối AI");
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); }
      const r = JSON.parse(cleanJson(acc)) as Result;
      const order = { red: 0, yellow: 1, green: 2 };
      r.risks = (r.risks ?? []).sort((a, b) => order[a.level] - order[b.level]);
      setResult(r);
    } catch (e) {
      if (!ctrl.signal.aborted) toast.error(e instanceof Error ? e.message : "Không rà soát được");
    } finally { setBusy(false); }
  };

  const counts = { red: 0, yellow: 0, green: 0 };
  result?.risks.forEach((r) => { counts[r.level] = (counts[r.level] ?? 0) + 1; });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">International & Vietnam Legal Engine</p>
        <h1 className="font-display text-3xl font-bold">Hội Đồng Cố Vấn Pháp Lý Đa Tầng</h1>
        <p className="text-muted-foreground">Pháp nhân: <b className="text-foreground">{company?.name ?? "..."}</b></p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {EXPERTS.map((e) => {
          const op = result?.experts?.find((x) => x.id === e.id)?.opinion;
          return (
            <div key={e.id} className={`rounded-2xl bg-card p-5 shadow-sm ${busy ? "animate-pulse" : ""}`}>
              <div className="flex items-center gap-3"><e.icon className="h-8 w-8 text-primary" /><div><h2 className="text-lg font-semibold">{e.name}</h2><p className="text-sm text-muted-foreground">{e.sub}</p></div></div>
              <p className="mt-3 text-base text-muted-foreground">{op ?? (busy ? "Đang rà soát..." : "Chờ văn bản hợp đồng.")}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Điều khoản hợp đồng</h2>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-base font-medium">
            <Upload className="h-5 w-5" />Tải file lên (.txt, .md)
            <input type="file" accept=".txt,.md,.csv,.html,text/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Dán toàn bộ hợp đồng hoặc các điều khoản cần rà soát vào đây..." className="mt-3 w-full rounded-xl border border-input bg-card p-3 text-base outline-none focus:ring-2 focus:ring-ring" />
        <input value={side} onChange={(e) => setSide(e.target.value)} placeholder="Bên cần bảo vệ (VD: Bên Mua, Nhà đầu tư, Bên vay...)" className="mt-3 w-full rounded-xl border border-input px-3 py-3 text-base" />
        <button onClick={review} disabled={busy || !text.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-xl font-bold text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}Rà soát Pháp lý & Tìm Bẫy Hợp Đồng
        </button>
      </section>

      {result && (
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Bảng Ma Trận Rủi Ro 3 Màu</h2>
          <p className="mt-2 text-base">{result.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["red", "yellow", "green"] as const).map((l) => (
              <span key={l} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-base font-semibold ${LEVEL[l].cls}`}><span className={`h-3 w-3 rounded-full ${LEVEL[l].dot}`} />{LEVEL[l].label}: {counts[l]}</span>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {result.risks.map((r, i) => (
              <div key={i} className={`rounded-xl border-l-8 p-4 ${LEVEL[r.level]?.cls ?? ""}`}>
                <p className="text-sm font-bold">{LEVEL[r.level]?.label} · {EXPERTS.find((e) => e.id === r.expert)?.name ?? r.expert}</p>
                <blockquote className="mt-2 border-l-2 border-border pl-3 italic text-muted-foreground">“{r.clause}”</blockquote>
                <p className="mt-2 text-base"><b>Vấn đề:</b> {r.issue}</p>
                <p className="text-sm text-muted-foreground"><b>Căn cứ:</b> {r.legal_basis}</p>
                <div className="mt-3 rounded-lg bg-card p-3">
                  <div className="flex items-center justify-between"><b className="text-primary">Đề xuất soạn lại</b>
                    <button onClick={() => { navigator.clipboard.writeText(r.redraft); toast.success("Đã sao chép điều khoản"); }} className="flex items-center gap-1 text-sm text-primary"><Copy className="h-4 w-4" />Sao chép</button></div>
                  <p className="mt-1 whitespace-pre-wrap text-base">{r.redraft}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Kết quả do AI hỗ trợ, cần luật sư có chứng chỉ hành nghề xác nhận trước khi ký kết.</p>
        </section>
      )}
    </div>
  );
}
