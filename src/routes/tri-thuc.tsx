import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Atom, Flower2, Church, Orbit, Search, Loader2, Save, ExternalLink, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace-store";
import { checkRateLimit, SEARCH_LIMIT } from "@/lib/rate-limit";
import type { Hit } from "./api/knowledge-search";

export const Route = createFileRoute("/tri-thuc")({
  head: () => ({ meta: [
    { title: "Cổng Tri Thức Nhân Loại — JETBU AI" },
    { name: "description", content: "Tra cứu Nobel, Tesla, Tam Tạng Pāli, Sefaria, Wikidata và lưu trích dẫn vào kho tri thức doanh nghiệp." },
    { property: "og:title", content: "Cổng Tri Thức Nhân Loại — JETBU AI" },
    { property: "og:description", content: "Tra cứu Nobel, Tesla, Tam Tạng Pāli, Sefaria, Wikidata và lưu trích dẫn vào kho tri thức doanh nghiệp." },
  ] }),
  component: KnowledgeGate,
});

const CHANNELS = [
  { icon: Atom, title: "Khoa học & Giải Nobel", links: [["arXiv", "https://arxiv.org"], ["OpenAlex", "https://openalex.org"], ["Wikidata", "https://www.wikidata.org"], ["Nobel Prize API", "https://www.nobelprize.org/about/developer-zone-2/"], ["AlphaFold", "https://alphafold.ebi.ac.uk"], ["Bằng sáng chế Nikola Tesla", "https://patents.google.com/?inventor=Nikola+Tesla"]] },
  { icon: Flower2, title: "Phật giáo", links: [["SuttaCentral — Tam Tạng Pāli", "https://suttacentral.net"], ["CBETA — Đại Tạng Kinh", "https://cbetaonline.dila.edu.tw"]] },
  { icon: Church, title: "Thiên Chúa giáo & Do Thái giáo", links: [["DigiVatLib (IIIF) — Thư viện Vatican", "https://digi.vatlib.it"], ["Sefaria API", "https://www.sefaria.org"]] },
  { icon: Orbit, title: "Đạo giáo & Dịch học", links: [["CText", "https://ctext.org"], ["Kanripo — Đạo Tạng", "https://www.kanripo.org"]] },
] as const;

const SOURCES = [
  { id: "suttacentral", label: "SuttaCentral", domain: "Phật giáo", hint: "Tiếng Anh, VD: compassion" },
  { id: "sefaria", label: "Sefaria", domain: "Do Thái giáo", hint: "Tiếng Anh, VD: justice" },
  { id: "wikidata", label: "Wikidata", domain: "Khoa học", hint: "VD: Nikola Tesla" },
  { id: "nobel", label: "Nobel Prize API", domain: "Giải Nobel", hint: "Tên người đoạt giải, VD: Einstein" },
] as const;

function KnowledgeGate() {
  const { company, sessionKey } = useWorkspace();
  const qc = useQueryClient();
  const [source, setSource] = useState<(typeof SOURCES)[number]["id"]>("suttacentral");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [remaining, setRemaining] = useState(SEARCH_LIMIT.max);
  const [cooldown, setCooldown] = useState(0);
  const stamps = useRef<number[]>([]);

  useEffect(() => { setQ(""); setHits([]); setSaved(new Set()); }, [sessionKey]);
  useEffect(() => {
    const t = setInterval(() => {
      const r = checkRateLimit(stamps.current, Date.now(), SEARCH_LIMIT.max, SEARCH_LIMIT.windowMs);
      setRemaining(r.allowed ? r.remaining + 1 : 0);
      setCooldown(Math.ceil(r.retryInMs / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const run = async () => {
    if (!q.trim() || busy) return;
    const r = checkRateLimit(stamps.current, Date.now(), SEARCH_LIMIT.max, SEARCH_LIMIT.windowMs);
    if (!r.allowed) { toast.error(`Bộ đếm chống nghẽn: chờ ${Math.ceil(r.retryInMs / 1000)} giây.`); return; }
    stamps.current = r.recent; setRemaining(r.remaining);
    setBusy(true); setHits([]);
    try {
      const res = await fetch(`/api/knowledge-search?source=${source}&q=${encodeURIComponent(q)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setHits(j.hits);
      if (!j.hits.length) toast.info("Không tìm thấy kết quả.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi tìm kiếm"); }
    finally { setBusy(false); }
  };

  const save = async (h: Hit) => {
    if (!company) { toast.error("Hãy chọn công ty trước."); return; }
    const domain = SOURCES.find((s) => s.id === source)!.domain;
    const { error } = await supabase.from("knowledge_vectors").insert({
      company_code: company.code, domain, title: h.title.slice(0, 500), content: h.content.slice(0, 20000) || h.title, source_citation: `${h.citation} — ${h.url}`,
    });
    if (error) { toast.error(`Không lưu được: ${error.message}`); return; }
    setSaved((s) => new Set(s).add(h.url + h.title));
    qc.invalidateQueries({ queryKey: ["knowledge_vectors"] });
    toast.success(`Đã lưu vào Kho Tri Thức của ${company.code}`);
  };

  const src = SOURCES.find((s) => s.id === source)!;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Di sản Khoa học Nobel/Tesla & Tam Giáo Kinh Điển</p>
        <h1 className="font-display text-3xl font-bold">Cổng Tri Thức Nhân Loại</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CHANNELS.map((c, i) => (
          <div key={c.title} className="rounded-2xl bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2"><c.icon className="h-7 w-7 text-primary" /><h2 className="text-lg font-semibold">({i + 1}) {c.title}</h2></div>
            <ul className="mt-3 space-y-1">
              {c.links.map(([name, url]) => (
                <li key={name}><a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-base text-primary hover:underline"><span className="h-2 w-2 rounded-full bg-primary-glow" />{name}<ExternalLink className="h-3 w-3" /></a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Tìm kiếm trực tiếp nguồn gốc</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${remaining === 0 ? "bg-destructive/15 text-destructive" : "bg-secondary"}`}>
            Bộ đếm chống nghẽn: còn {remaining}/{SEARCH_LIMIT.max} lượt/phút{remaining === 0 && cooldown ? ` · chờ ${cooldown}s` : ""}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button key={s.id} onClick={() => { setSource(s.id); setHits([]); }} className={`rounded-lg px-4 py-2 text-base font-medium ${source === s.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s.label}</button>
          ))}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={src.hint} className="min-w-0 flex-1 rounded-xl border border-input px-4 py-3 text-base" />
          <button disabled={busy || !q.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-5 text-lg font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}Tìm</button>
        </form>

        <div className="mt-4 space-y-3">
          {hits.map((h) => {
            const isSaved = saved.has(h.url + h.title);
            return (
              <article key={h.url + h.title} className="rounded-xl border border-border p-4">
                <h3 className="text-lg font-semibold">{h.title}</h3>
                {h.content && <p className="mt-1 text-base">{h.content}</p>}
                <p className="mt-2 text-sm text-muted-foreground">Trích dẫn: {h.citation} · <a href={h.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Xem bản gốc</a></p>
                <button onClick={() => save(h)} disabled={isSaved} className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground disabled:opacity-60">
                  {isSaved ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />}{isSaved ? "Đã lưu" : "Lưu vào Kho Tri Thức Doanh Nghiệp"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
