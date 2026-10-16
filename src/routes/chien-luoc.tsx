import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Gauge, Sun, AlertTriangle, ShieldAlert, Swords, Gavel, Loader2, Rocket, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace-store";
import { EXPERTS, SCENARIOS, activeVetoes, confluenceScore } from "@/lib/war-room";

export const Route = createFileRoute("/chien-luoc")({
  head: () => ({ meta: [
    { title: "Buồng Lái Tình Báo Chiến Lược V5.0 — JETBU AI" },
    { name: "description", content: "Hội đồng 6 tác tử AI tranh biện 3 vòng, điểm hội tụ, chu kỳ thời vận và đồ thị nhân quả." },
    { property: "og:title", content: "Buồng Lái Tình Báo Chiến Lược V5.0 — JETBU AI" },
    { property: "og:description", content: "Hội đồng 6 tác tử AI tranh biện 3 vòng, điểm hội tụ, chu kỳ thời vận và đồ thị nhân quả." },
  ] }),
  component: WarRoom,
});

type R1 = { id: number; score: number; stance: string; veto: boolean; reasoning: string };
type Result = {
  round1: R1[];
  round2: { from: number; target: number; critique: string }[];
  round3: { verdict: string; timing: string; scenarios: { name: string; probability: number; outcome: string; stop_loss: string }[] };
  hexagram: string;
  alerts: { ocf: { status: string; note: string }; wacc_roic: { wacc: number; roic: number; note: string }; m_score: { value: number; note: string } };
};

const card = "rounded-2xl border border-command-muted/20 bg-command-card p-5";

function WarRoom() {
  const { company, sessionKey } = useWorkspace();
  const [problem, setProblem] = useState("");
  const [phase, setPhase] = useState(0); // 0 idle, 1-3 rounds running, 4 done
  const [result, setResult] = useState<Result | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    setProblem(""); setResult(null); setPhase(0);
  }, [sessionKey]);

  const { data: kp } = useQuery({
    queryKey: ["kp"],
    queryFn: async () => {
      const r = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");
      const rows = (await r.json()) as unknown[];
      const last = rows[rows.length - 1] as Record<string, unknown> | unknown[];
      const v = Array.isArray(last) ? last[1] : (last as Record<string, unknown>)["Kp"];
      return Number(v);
    },
    staleTime: 10 * 60_000,
  });

  const run = async () => {
    if (!problem.trim() || (phase > 0 && phase < 4)) return;
    setResult(null); setPhase(1);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const t2 = setTimeout(() => setPhase((p) => (p === 1 ? 2 : p)), 6000);
    const t3 = setTimeout(() => setPhase((p) => (p === 2 ? 3 : p)), 14000);
    try {
      const res = await fetch("/api/arena", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem, companyName: company?.name }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "Lỗi kết nối AI");
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); }
      const json = acc.slice(acc.indexOf("{"), acc.lastIndexOf("}") + 1);
      const parsed = JSON.parse(json) as Result;
      // Reveal rounds one after another for the visual effect.
      setResult(parsed); setPhase(1);
      await new Promise((r) => setTimeout(r, 900)); setPhase(2);
      await new Promise((r) => setTimeout(r, 900)); setPhase(3);
      await new Promise((r) => setTimeout(r, 900)); setPhase(4);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      toast.error(e instanceof Error ? e.message : "Hội đồng không trả được kết quả");
      setPhase(0);
    } finally { clearTimeout(t2); clearTimeout(t3); }
  };

  const scores = Object.fromEntries((result?.round1 ?? []).map((r) => [r.id, r.score]));
  const score = result ? confluenceScore(scores) : null;
  const vetoes = result ? activeVetoes(result.round1) : [];
  const busy = phase > 0 && phase < 4 && !result;

  return (
    <div className="min-h-screen bg-command p-4 text-command-foreground md:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">Strategic War Room V5.0</p>
          <h1 className="font-display text-3xl font-bold">Buồng Lái Tình Báo Chiến Lược</h1>
        </div>
        <p className="text-command-muted">Pháp nhân: <b className="text-command-foreground">{company?.name ?? "..."}</b></p>
      </header>

      {/* Top gauges */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <h2 className="flex items-center gap-2 font-semibold text-gold"><Gauge className="h-5 w-5" />Điểm Hội Tụ Đa Chiều</h2>
          <Dial value={score} />
          <p className="text-center text-sm text-command-muted">Score = Σ (Trọng số × Điểm từng chuyên gia)</p>
          {vetoes.length > 0 && <p className="mt-2 rounded-lg bg-destructive/20 p-2 text-center font-semibold text-destructive">⛔ Phủ quyết bởi chuyên gia {vetoes.join(", ")}</p>}
        </div>
        <div className={card}>
          <h2 className="flex items-center gap-2 font-semibold text-gold"><Sun className="h-5 w-5" />Chu kỳ Thời vận</h2>
          <dl className="mt-3 space-y-3 text-base">
            <div><dt className="text-sm text-command-muted">Nguyên vận</dt><dd className="font-semibold">Hạ Nguyên Vận 9 — Hành Hỏa (2024–2043)</dd></div>
            <div><dt className="text-sm text-command-muted">Trạng thái Quẻ Kinh Dịch</dt><dd className="font-semibold">{result?.hexagram ?? "Chờ hội đồng luận quẻ"}</dd></div>
            <div><dt className="text-sm text-command-muted">Bão từ Mặt trời (chỉ số Kp, NOAA)</dt>
              <dd className="font-semibold">{kp == null || Number.isNaN(kp) ? "Đang tải..." : `Kp ${kp.toFixed(1)} — ${kp >= 5 ? "Có bão từ" : kp >= 4 ? "Nhiễu động" : "Yên tĩnh"}`}</dd></div>
          </dl>
        </div>
        <div className={`${card} border-destructive/50`}>
          <h2 className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-5 w-5" />Cảnh báo Đỏ</h2>
          {result ? (
            <ul className="mt-3 space-y-3 text-base">
              <AlertRow label="Dòng tiền thực (OCF)" bad={result.alerts.ocf.status !== "an toàn"} value={result.alerts.ocf.status} note={result.alerts.ocf.note} />
              <AlertRow label="WACC so với ROIC" bad={result.alerts.wacc_roic.wacc >= result.alerts.wacc_roic.roic} value={`WACC ${result.alerts.wacc_roic.wacc}% / ROIC ${result.alerts.wacc_roic.roic}%`} note={result.alerts.wacc_roic.note} />
              <AlertRow label="Beneish M-Score" bad={result.alerts.m_score.value > -1.78} value={String(result.alerts.m_score.value)} note={`${result.alerts.m_score.value > -1.78 ? "Vượt ngưỡng -1,78: nghi vấn thao túng. " : ""}${result.alerts.m_score.note}`} />
              <li className="text-xs text-command-muted">Số liệu do AI ước tính từ dữ kiện đề bài.</li>
            </ul>
          ) : <p className="mt-3 text-command-muted">Kích hoạt hội đồng để kiểm tra OCF, WACC/ROIC và M-Score.</p>}
        </div>
      </div>

      {/* Problem input */}
      <section className={`${card} mt-4`}>
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Swords className="h-5 w-5 text-gold" />Phòng Tranh Biện Hội Đồng 6 Tác Tử</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setProblem(SCENARIOS.seriesB)} className="rounded-lg border border-gold/50 px-3 py-2 text-base text-gold hover:bg-gold/10">Kịch bản 1: Thẩm định Gọi vốn Series B / IPO</button>
          <button onClick={() => setProblem(SCENARIOS.fxHedge)} className="rounded-lg border border-gold/50 px-3 py-2 text-base text-gold hover:bg-gold/10">Kịch bản 2: Phòng hộ Phái sinh & Tỷ giá USD/VND</button>
        </div>
        <textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={4} placeholder="Nhập bài toán chiến lược..." className="mt-3 w-full rounded-xl bg-card p-3 text-base text-card-foreground outline-none focus:ring-2 focus:ring-gold" />
        <button onClick={run} disabled={busy || !problem.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-xl font-bold text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Rocket className="h-6 w-6" />}Kích hoạt Hội đồng Tranh biện 3 Vòng
        </button>
        <RoundsBar phase={phase} />
      </section>

      {/* Agent cards */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXPERTS.map((e) => {
          const r = phase >= 1 ? result?.round1.find((x) => x.id === e.id) : undefined;
          const crit = phase >= 2 ? result?.round2.find((x) => x.from === e.id) : undefined;
          const thinking = phase === 1 && !result;
          return (
            <div key={e.id} className={`${card} transition-all ${thinking ? "animate-pulse border-gold/60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-command-muted">Chuyên gia {e.id}</p>
                  <h3 className="text-lg font-semibold">{e.name}</h3>
                </div>
                <span className="rounded-full bg-gold/20 px-3 py-1 text-lg font-bold text-gold">{e.weight * 100}%</span>
              </div>
              <p className={`mt-1 text-sm ${e.veto ? "text-destructive" : "text-command-muted"}`}>{e.veto ? "🛡 " : ""}{e.role}</p>
              {r && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-command"><div className="h-2 rounded-full bg-primary-glow transition-all duration-700" style={{ width: `${r.score}%` }} /></div>
                    <b>{r.score}</b>
                  </div>
                  <p className="text-sm"><b>{r.stance}</b>{r.veto && e.veto && <span className="ml-2 font-bold text-destructive">⛔ VETO</span>}</p>
                  <p className="text-sm text-command-muted">{r.reasoning}</p>
                </div>
              )}
              {crit && <p className="mt-3 rounded-lg bg-destructive/15 p-2 text-sm">😈 Phản biện CG {crit.target}: {crit.critique}</p>}
            </div>
          );
        })}
      </div>

      {phase >= 3 && result && (
        <section className={`${card} mt-4 border-gold/60`}>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gold"><Gavel className="h-5 w-5" />Vòng 3 — Tổng Trọng tài kết luận</h2>
          <p className="mt-2 text-base">{result.round3.verdict}</p>
          <p className="mt-1 text-sm text-command-muted">⏱ Thời điểm: {result.round3.timing}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {result.round3.scenarios.map((s) => (
              <div key={s.name} className="rounded-xl bg-command p-4">
                <div className="flex items-center justify-between"><b className="text-lg">{s.name}</b><span className="text-2xl font-bold text-gold">{s.probability}%</span></div>
                <p className="mt-2 text-sm">{s.outcome}</p>
                <p className="mt-2 text-sm font-semibold text-destructive">Cắt lỗ: {s.stop_loss}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <CausalGraph />
    </div>
  );
}

function Dial({ value }: { value: number | null }) {
  const v = value ?? 0; const r = 70; const c = Math.PI * r;
  return (
    <svg viewBox="0 0 180 105" className="mx-auto mt-2 w-56">
      <path d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke="var(--command)" strokeWidth="14" strokeLinecap="round" />
      <path d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke="var(--gold)" strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset 1s" }} />
      <text x="90" y="88" textAnchor="middle" fill="var(--command-foreground)" fontSize="30" fontWeight="700">{value == null ? "--" : `${v}%`}</text>
    </svg>
  );
}

function AlertRow({ label, value, note, bad }: { label: string; value: string; note: string; bad: boolean }) {
  return (
    <li className={`rounded-lg p-2 ${bad ? "bg-destructive/20" : "bg-primary/20"}`}>
      <div className="flex justify-between gap-2"><span className="flex items-center gap-1">{bad && <ShieldAlert className="h-4 w-4 text-destructive" />}{label}</span><b>{value}</b></div>
      <p className="text-xs text-command-muted">{note}</p>
    </li>
  );
}

function RoundsBar({ phase }: { phase: number }) {
  const rounds = ["Vòng 1: Chấm điểm độc lập", "Vòng 2: Ác phản biện chéo", "Vòng 3: Tổng trọng tài kết luận"];
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-3">
      {rounds.map((r, i) => {
        const n = i + 1; const active = phase === n; const done = phase > n;
        return (
          <div key={r} className={`flex items-center gap-2 rounded-lg p-3 text-base transition-colors ${done ? "bg-primary text-primary-foreground" : active ? "animate-pulse bg-gold/30 text-gold" : "bg-command text-command-muted"}`}>
            {active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{r}
          </div>
        );
      })}
    </div>
  );
}

function CausalGraph() {
  const { data = [], error, isLoading } = useQuery({
    queryKey: ["causal_graph_edges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("causal_graph_edges").select("id,source_entity,relation_type,target_entity,impact_weight,description");
      if (error) throw error;
      return data;
    },
  });
  // Two-column layout: causes on the left, effects on the right, so labels never overlap.
  const left = Array.from(new Set(data.map((e) => e.source_entity)));
  const right = Array.from(new Set(data.map((e) => e.target_entity)));
  const nodes = [...left, ...right];
  const W = 900, H = Math.max(left.length, right.length) * 90 + 40, cy = H / 2;
  const pos = (n: string, side: "l" | "r") => { const list = side === "l" ? left : right; const i = list.indexOf(n); return { x: side === "l" ? 230 : 670, y: 50 + i * 90 + (H - 40 - list.length * 90) / 2 }; };
  return (
    <section className={`${card} mt-4`}>
      <h2 className="text-xl font-semibold text-gold">Sơ đồ Đồ thị Nhân quả</h2>
      {isLoading ? <p className="mt-3 text-command-muted">Đang tải...</p> : error ? <p className="mt-3 text-destructive">Không tải được dữ liệu nhân quả.</p> : !data.length ? <p className="mt-3 text-command-muted">Chưa có quan hệ nhân quả nào.</p> : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
            <defs><marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--gold)" /></marker></defs>
            {data.map((e) => { const a = pos(e.source_entity, "l"), b = pos(e.target_entity, "r"); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              return (<g key={e.id}><line x1={a.x + 10} y1={a.y} x2={b.x - 10} y2={b.y} stroke="var(--gold)" strokeWidth={1 + Number(e.impact_weight ?? 1) * 2} markerEnd="url(#arr)" opacity="0.8" />
                <text x={mx} y={my - 6} textAnchor="middle" fill="var(--gold)" fontSize="13" fontWeight="700">{e.relation_type.replace(/\s+/g, " ")}</text></g>); })}
            {nodes.map((n, idx) => { const side = idx < left.length ? "l" : "r"; const p = pos(n, side); return (<g key={side + n}><circle cx={p.x} cy={p.y} r="8" fill="var(--primary-glow)" />
              <text x={side === "l" ? p.x - 14 : p.x + 14} y={p.y + 5} textAnchor={side === "l" ? "end" : "start"} fill="var(--command-foreground)" fontSize="14">{n.replace(/\s+/g, " ")}</text></g>); })}
          </svg>
          <ul className="mt-3 space-y-1 text-sm text-command-muted">
            {data.map((e) => <li key={e.id}>• {e.source_entity} → <b className="text-gold">{e.relation_type}</b> → {e.target_entity} (trọng số {e.impact_weight})</li>)}
          </ul>
        </>
      )}
    </section>
  );
}
