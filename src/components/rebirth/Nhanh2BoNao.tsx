import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Brain,
  Upload,
  Link2,
  Search,
  Download,
  Check,
  FlaskConical,
  Sparkles,
  NotebookPen,
  FolderSync,
  FileAudio,
  RotateCw,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";
import {
  CATEGORIES,
  categoryLabel,
  compressToMd,
  core,
  downloadText,
  listMd,
  mdFileName,
  uploadAudio,
  esm,
  jdb,
  type Loose,
  type MdDoc,
} from "@/lib/jetbu-client";
import { useJetbuStore, type Proposal } from "@/store/useJetbuStore";
import { Md, Section, Spin, Tag, btnOutline, btnPrimary, btnSoft, input } from "./ui";

type Hit = {
  source: string;
  title: string;
  excerpt: string;
  url: string;
  citation: string;
  extra?: Record<string, unknown>;
};
const SUB = [
  ["nap", "Nạp tri thức"],
  ["3d", "Bộ não 3D"],
  ["nguon", "Tìm nguồn & .MD"],
  ["so", "NotebookLM & Claude"],
] as const;

export function Nhanh2BoNao() {
  const [sub, setSub] = useState<(typeof SUB)[number][0]>("nap");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-secondary p-1">
        {SUB.map(([id, l]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSub(id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${sub === id ? "bg-primary text-primary-foreground" : ""}`}
          >
            {l}
          </button>
        ))}
      </div>
      {sub === "nap" && <NapTriThuc />}
      {sub === "3d" && <NeuralGraph3D />}
      {sub === "nguon" && <TimNguon />}
      {sub === "so" && <SoGhiChu />}
    </div>
  );
}

/* ================= [Mục 2] Admin chủ động nạp → nén .md siêu nhẹ ================= */
async function fileToText(f: File): Promise<string> {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (
    ["txt", "md", "markdown", "csv", "json", "html", "htm", "xml", "log"].includes(ext) ||
    f.type.startsWith("text/")
  ) {
    const t = await f.text();
    return ext === "html" || ext === "htm"
      ? t
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
      : t;
  }
  if (ext === "docx") {
    const mammoth = await esm<{
      extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    }>("https://esm.sh/mammoth@1.8.0");
    return (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
  }
  if (ext === "pdf") {
    const pdfjs = await esm<Loose>("https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs";
    const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
    const out: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const c = await p.getTextContent();
      out.push(c.items.map((it: { str?: string }) => it.str ?? "").join(" "));
    }
    return out.join("\n\n");
  }
  throw new Error(`Chưa hỗ trợ định dạng .${ext} — hãy dán văn bản trực tiếp.`);
}

function NapTriThuc() {
  const { company } = useWorkspace();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [cat, setCat] = useState<string>("nao_bo_2");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { data: docs = [], refetch } = useQuery({
    queryKey: ["md", company?.code, cat, q],
    queryFn: () =>
      listMd({ ...(company ? { company: company.code } : {}), category: cat, q, limit: 40 }),
  });

  const save = async (t: string, md: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const r = await core<{ id: string; file_name: string; duplicate: boolean }>("save_md", {
        company: company?.code,
        category: cat,
        title: t,
        content_md: md,
        ...extra,
      });
      toast[r.duplicate ? "warning" : "success"](
        r.duplicate ? `Đã có sẵn trong Kho: ${r.file_name}` : `Đã nén & lưu: ${r.file_name}`,
      );
      try {
        const [{ count }, { data: tg }] = await Promise.all([
          jdb
            .from("knowledge_md_chunks")
            .select("id", { count: "exact", head: true })
            .eq("doc_id", r.id),
          jdb.from("knowledge_md_store").select("tags").eq("id", r.id).maybeSingle(),
        ]);
        const tags = ((tg as { tags?: string[] } | null)?.tags ?? []).filter((x) => x !== cat);
        toast.info(`Đã băm ${count ?? 0} đoạn, ${tags.length} từ khóa`);
      } catch {
        /* thống kê là phụ */
      }
      setTitle("");
      setText("");
      setLink("");
      setPreview(null);
      await qc.invalidateQueries({ queryKey: ["md"] });
      await qc.invalidateQueries({ queryKey: ["md-stats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  };
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const raw = await fileToText(f);
        const t = f.name.replace(/\.[^.]+$/, "");
        await save(
          t,
          compressToMd(t, raw, {
            Nguồn: `Upload ${f.name}`,
            "Kích thước gốc": `${(f.size / 1024).toFixed(1)} KB`,
          }),
          { source_type: "upload", source_name: f.name },
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không đọc được file");
    } finally {
      setBusy(false);
    }
  };
  const onLink = async () => {
    if (!/^https?:\/\//.test(link)) {
      toast.error("Dán link http(s) hợp lệ.");
      return;
    }
    setBusy(true);
    try {
      const r = await core<{ title: string; content_md: string }>("url_to_md", { url: link });
      setTitle(r.title);
      setPreview(r.content_md);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tải được link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        title="Nạp tri thức (Upload / Dán văn bản / Link)"
        icon={<Upload className="h-5 w-5 text-primary" />}
        right={<Tag tone="ok">nén .md siêu nhẹ</Tag>}
      >
        <label className="mb-2 block text-sm font-semibold">
          Thư mục lưu
          <select className={`${input} mt-1`} value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.folder}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-secondary/40 p-4 text-center text-sm">
          <Upload className="mb-1 h-6 w-6 text-primary" />
          Chạm để chọn file: .txt .md .csv .json .html .docx .pdf (nhiều file cùng lúc)
          <input
            type="file"
            multiple
            className="hidden"
            accept=".txt,.md,.markdown,.csv,.json,.html,.htm,.xml,.docx,.pdf,text/*"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
        <div className="mt-3 flex gap-2">
          <input
            className={input}
            placeholder="Dán link bài viết / tài liệu"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            inputMode="url"
          />
          <button type="button" className={btnSoft} disabled={busy} onClick={onLink}>
            <Link2 className="h-4 w-4" />
            Tải
          </button>
        </div>
        <input
          className={`${input} mt-3`}
          placeholder="Tiêu đề tài liệu"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={`${input} mt-2 min-h-32`}
          placeholder="Hoặc dán văn bản thô vào đây…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {preview && (
          <details className="mt-2 rounded-lg bg-secondary p-2 text-xs">
            <summary className="cursor-pointer font-semibold">
              Xem trước .md từ link ({(preview.length / 1024).toFixed(1)} KB)
            </summary>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap">
              {preview.slice(0, 4000)}
            </pre>
          </details>
        )}
        <button
          type="button"
          className={`${btnPrimary} mt-3 w-full`}
          disabled={busy || !title.trim() || (!text.trim() && !preview)}
          onClick={() =>
            save(
              title.trim(),
              preview ?? compressToMd(title.trim(), text, { Nguồn: "Admin dán văn bản" }),
              preview ? { source_type: "link", source_url: link } : { source_type: "text" },
            )
          }
        >
          {busy ? (
            <Spin label="Đang nén & lưu..." />
          ) : (
            <>
              <Brain className="h-5 w-5" />
              Nén thành .md & nạp vào Bộ Não Thứ 2
            </>
          )}
        </button>
      </Section>
      <Section
        title={`Kho ${categoryLabel(cat)}`}
        icon={<Brain className="h-5 w-5 text-primary" />}
        right={
          <button type="button" className={btnSoft} onClick={() => refetch()}>
            <RotateCw className="h-4 w-4" />
          </button>
        }
      >
        <input
          className={input}
          placeholder="Lọc theo tiêu đề…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="mt-2 max-h-[60vh] space-y-2 overflow-y-auto">
          {docs.map((d) => (
            <DocRow key={d.id} d={d} />
          ))}
          {!docs.length && (
            <li className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
              Thư mục trống.
            </li>
          )}
        </ul>
      </Section>
    </div>
  );
}

export function DocRow({ d }: { d: MdDoc }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <p className="font-semibold leading-snug">{d.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            <code>{d.file_name}</code> · {d.word_count} từ ·{" "}
            {new Date(d.created_at).toLocaleDateString("vi-VN")}
            {d.verified_by?.length ? ` · ✓ ${d.verified_by.join(", ")}` : ""}
            {d.chunks !== undefined ? ` · ${d.chunks} đoạn` : ""}
          </p>
          {!!d.tags?.length && (
            <span className="mt-1 flex flex-wrap gap-1">
              {d.tags.slice(0, 9).map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </span>
          )}
        </button>
        <button
          type="button"
          className={btnSoft}
          aria-label="Tải .md"
          onClick={() => downloadText(d.file_name, d.content_md)}
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-secondary/50 p-2">
          <Md>{d.content_md.slice(0, 12000)}</Md>
        </div>
      )}
    </li>
  );
}

/* ================= [Mục 4] Bộ não 3D (canvas xoay, không thư viện ngoài) ================= */
type Node3 = {
  id: string;
  label: string;
  cat: string;
  x: number;
  y: number;
  z: number;
  doc: MdDoc;
};
const CAT_COLOR: Record<string, string> = {
  so_ghi_chu: "#60a5fa",
  nao_bo_2: "#34d399",
  sach_luc_dao: "#fbbf24",
  the_gioi: "#f87171",
  phap_luat: "#a78bfa",
  bien_ban: "#f472b6",
  van_ban: "#9ca3af",
};

function NeuralGraph3D() {
  const { company } = useWorkspace();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<MdDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const proposals = useJetbuStore((s) => s.proposals);
  const setProposals = useJetbuStore((s) => s.setProposals);
  const approveProposal = useJetbuStore((s) => s.approveProposal);
  const setPendingTopic = useJetbuStore((s) => s.setPendingTopic);
  const setBranch = useJetbuStore((s) => s.setBranch);
  const setPendingDocIds = useJetbuStore((s) => s.setPendingDocIds);
  const [allCo, setAllCo] = useState(false);
  const { data: docs = [] } = useQuery({
    queryKey: ["md-graph", company?.code, allCo],
    queryFn: async () => {
      if (allCo || !company) return listMd({ limit: 400 });
      const own = await listMd({ company: company.code, limit: 400 });
      return own.length ? own : listMd({ limit: 400 });
    },
  });

  const { nodes, edges, size } = useMemo(() => {
    const nodes: Node3[] = docs.map((d, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(1, docs.length)),
        th = Math.PI * (1 + Math.sqrt(5)) * i; // phân bố Fibonacci trên cầu
      return {
        id: d.id,
        label: d.title,
        cat: d.category,
        x: Math.sin(phi) * Math.cos(th),
        y: Math.sin(phi) * Math.sin(th),
        z: Math.cos(phi),
        doc: d,
      };
    });
    const edges: [number, number][] = [];
    const tok = (d: MdDoc) =>
      new Set(
        d.title
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/u)
          .filter((w) => w.length > 3),
      );
    const sets = docs.map(tok);
    const tagSets = docs.map((d) => new Set((d.tags ?? []).filter((t) => t !== d.category)));
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        let tagShared = false;
        for (const t of tagSets[i]!) if (tagSets[j]!.has(t)) tagShared = true;
        let titleShared = 0;
        for (const w of sets[i]!) if (sets[j]!.has(w)) titleShared++;
        if (tagShared || titleShared >= 2) edges.push([i, j]);
      }
    const maxW = Math.max(1, ...docs.map((d) => d.word_count || 0));
    const size = docs.map((d) => 0.6 + 1.4 * Math.sqrt((d.word_count || 0) / maxW));
    return { nodes, edges, size };
  }, [docs]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0,
      a = 0,
      b = 0.4,
      dragging = false,
      lx = 0,
      ly = 0,
      auto = true;
    const proj = new Map<string, { sx: number; sy: number; s: number }>();
    const draw = () => {
      const W = cv.clientWidth,
        H = cv.clientHeight;
      if (cv.width !== W * devicePixelRatio) {
        cv.width = W * devicePixelRatio;
        cv.height = H * devicePixelRatio;
      }
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const R = Math.min(W, H) * 0.38,
        cx = W / 2,
        cy = H / 2;
      if (auto) a += 0.004;
      const ca = Math.cos(a),
        sa = Math.sin(a),
        cb = Math.cos(b),
        sb = Math.sin(b);
      const P = nodes.map((n) => {
        const x1 = n.x * ca - n.z * sa,
          z1 = n.x * sa + n.z * ca,
          y1 = n.y * cb - z1 * sb,
          z2 = n.y * sb + z1 * cb;
        const s = 1 / (1.8 - z2 * 0.6);
        return { sx: cx + x1 * R * s, sy: cy + y1 * R * s, s, z: z2 };
      });
      ctx.lineWidth = 1;
      for (const [i, j] of edges) {
        const p = P[i]!,
          q = P[j]!;
        ctx.strokeStyle = `rgba(120,160,140,${0.12 + 0.25 * Math.max(0, (p.z + q.z) / 2 + 0.5)})`;
        ctx.beginPath();
        ctx.moveTo(p.sx, p.sy);
        ctx.lineTo(q.sx, q.sy);
        ctx.stroke();
      }
      const order = P.map((p, i) => [p.z, i] as const).sort((u, v) => u[0] - v[0]);
      for (const [, i] of order) {
        const n = nodes[i]!,
          p = P[i]!;
        proj.set(n.id, p);
        const r = (4 + 5 * p.s) * (size[i] ?? 1);
        ctx.fillStyle = CAT_COLOR[n.cat] ?? "#9ca3af";
        ctx.globalAlpha = 0.55 + 0.45 * ((p.z + 1) / 2);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
        if (p.z > 0.35 || nodes.length <= 12) {
          ctx.fillStyle = "currentColor";
          ctx.font = `${10 + 3 * p.s}px sans-serif`;
          ctx.fillText(n.label.slice(0, 28), p.sx + r + 3, p.sy + 4);
        }
        ctx.globalAlpha = 1;
      }
      if (!nodes.length) {
        ctx.fillStyle = "currentColor";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Chưa có tri thức — hãy nạp ở tab “Nạp tri thức”.", cx, cy);
        ctx.textAlign = "start";
      }
      raf = requestAnimationFrame(draw);
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      auto = false;
      lx = e.clientX;
      ly = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      a += (e.clientX - lx) * 0.008;
      b += (e.clientY - ly) * 0.008;
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      setTimeout(() => (auto = true), 4000);
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      let best: { id: string; d: number } | null = null;
      for (const [id, p] of proj) {
        const d = Math.hypot(p.sx - x, p.sy - y);
        if (d < 14 && (!best || d < best.d)) best = { id, d };
      }
      if (best) {
        const n = nodes.find((k) => k.id === best!.id);
        if (n) setSelected(n.doc);
      }
    };
    cv.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [nodes, edges, size]);

  const propose = async () => {
    setBusy(true);
    try {
      const r = await core<{ proposals: Proposal[]; ai_name: string }>("propose_works", {
        company: company?.code,
      });
      setProposals(r.proposals);
      toast.success(`${r.ai_name} đề xuất ${r.proposals.length} tác phẩm từ liên kết tri thức`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không đề xuất được");
    } finally {
      setBusy(false);
    }
  };
  const linked = useMemo(() => {
    if (!selected) return [] as MdDoc[];
    const i = docs.findIndex((d) => d.id === selected.id);
    return edges.flatMap(([a, b]) => (a === i ? [docs[b]!] : b === i ? [docs[a]!] : []));
  }, [selected, docs, edges]);
  const sendToCouncil = () => {
    if (!selected) return;
    setPendingDocIds([selected.id, ...linked.map((d) => d.id)]);
    setPendingTopic(selected.title);
    setBranch("n3");
    toast.success("Đã đưa sách và các liên kết sang Hội đồng Lục Đạo.");
  };
  const approve = (p: Proposal) => {
    approveProposal(p.title);
    setPendingDocIds(docs.filter((d) => p.linked_files?.includes(d.file_name)).map((d) => d.id));
    setPendingTopic(`${p.title}\n\n${p.topic}`);
    setBranch("n3");
    toast.success("Đã duyệt — chuyển sang Nhánh 3 để Hội đồng sáng tác.");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section
          title="Mô hình Đồ thị Thần kinh 3D"
          icon={<Brain className="h-5 w-5 text-primary" />}
          right={
            <span className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={allCo}
                  onChange={(e) => setAllCo(e.target.checked)}
                />
                Tất cả công ty
              </label>
              <Tag>
                {docs.length} sách · {edges.length} liên kết
              </Tag>
            </span>
          }
        >
          <canvas
            ref={canvasRef}
            className="h-[52vh] w-full touch-none rounded-xl bg-sidebar text-sidebar-foreground"
          />
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {CATEGORIES.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1">
                <i
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: CAT_COLOR[c.id] }}
                />
                {c.label}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Kéo để xoay · chạm vào nút để xem tài liệu. Liên kết = chung thẻ/từ khóa nhân quả.
          </p>
          {selected && (
            <div className="mt-3 rounded-xl border border-border p-3">
              <p className="font-semibold">{selected.title}</p>
              <p className="text-xs text-muted-foreground">
                <code>{selected.file_name}</code> · {categoryLabel(selected.category)}
              </p>
              <div className="mt-2 max-h-56 overflow-y-auto">
                <Md>{selected.content_md.slice(0, 6000)}</Md>
              </div>
              <p className="mt-3 text-sm font-semibold">Liên kết ({linked.length})</p>
              <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                {linked.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="min-h-11 w-full rounded-lg bg-secondary px-3 py-2 text-left text-sm"
                      onClick={() => setSelected(d)}
                    >
                      {d.title}
                      <span className="block text-xs text-muted-foreground">
                        {categoryLabel(d.category)}
                      </span>
                    </button>
                  </li>
                ))}
                {!linked.length && (
                  <li className="text-xs text-muted-foreground">Chưa có liên kết.</li>
                )}
              </ul>
              <button type="button" className={`${btnPrimary} mt-3 w-full`} onClick={sendToCouncil}>
                📚 Đưa sách này + liên kết vào Hội đồng
              </button>
            </div>
          )}
        </Section>
      </div>
      <Section
        title="AI tự đề nghị Tác phẩm mới"
        icon={<Sparkles className="h-5 w-5 text-primary" />}
      >
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={busy || !docs.length}
          onClick={propose}
        >
          {busy ? <Spin label="Bộ não đang suy nghĩ..." /> : "Phân tích liên kết & đề xuất"}
        </button>
        <ul className="mt-3 space-y-2">
          {proposals.map((p) => (
            <li key={p.title} className="rounded-xl border border-border p-3">
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-sm">{p.topic}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.rationale}
                {p.linked_files?.length ? ` · ${p.linked_files.join(", ")}` : ""}
              </p>
              <button
                type="button"
                className={`${p.approved ? btnSoft : btnOutline} mt-2 w-full`}
                disabled={p.approved}
                onClick={() => approve(p)}
              >
                {p.approved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Đã duyệt
                  </>
                ) : (
                  "Duyệt → sáng tác ở Nhánh 3"
                )}
              </button>
            </li>
          ))}
          {!proposals.length && (
            <li className="text-sm text-muted-foreground">
              Chưa có đề xuất. Bấm nút trên để Bộ não phân tích.
            </li>
          )}
        </ul>
      </Section>
    </div>
  );
}

/* ================= [Mục 9] Tìm nguồn → Download .md → Nghiên cứu / Chấp nhận ================= */
function TimNguon() {
  const { company } = useWorkspace();
  const [q, setQ] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const accepted = useJetbuStore((s) => s.acceptedSources);
  const markAccepted = useJetbuStore((s) => s.markAccepted);
  const setPendingTopic = useJetbuStore((s) => s.setPendingTopic);
  const setBranch = useJetbuStore((s) => s.setBranch);

  const suggest = async () => {
    if (!q.trim()) return;
    const r = await core<{ sources: string[]; labels: Record<string, string> }>("suggest_sources", {
      q,
    });
    setSources(r.sources);
    setLabels(r.labels);
    setPicked(r.sources);
  };
  const run = async () => {
    if (!q.trim()) {
      toast.error("Nhập từ khóa, VD: Kinh Phật");
      return;
    }
    setBusy("search");
    try {
      const r = await core<{ hits: Hit[]; failed: string[] }>("search_sources", {
        q,
        sources: picked,
      });
      setHits(r.hits);
      setFailed(r.failed);
      if (!r.hits.length) toast.warning("Không tìm thấy kết quả.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tìm kiếm");
    } finally {
      setBusy(null);
    }
  };
  const exportMd = async (h: Hit) => {
    setBusy(h.url);
    try {
      const r = await core<{ title: string; content_md: string }>("export_md", { hit: h });
      downloadText(mdFileName(r.title), r.content_md);
      toast.success("Đã xuất file .md siêu nhẹ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi xuất");
    } finally {
      setBusy(null);
    }
  };
  const accept = async (h: Hit) => {
    setBusy(`acc:${h.url}`);
    try {
      const md = await core<{ title: string; content_md: string }>("export_md", { hit: h });
      const r = await core<{ file_name: string; duplicate: boolean }>("save_md", {
        company: company?.code,
        category: "nao_bo_2",
        title: md.title,
        content_md: md.content_md,
        source_type: "source_download",
        source_url: h.url,
        source_name: labels[h.source] ?? h.source,
        tags: ["nao_bo_2", h.source],
      });
      markAccepted(h.url, r.file_name);
      toast[r.duplicate ? "warning" : "success"](
        r.duplicate
          ? `Đã có trong Kho: ${r.file_name}`
          : `Đã chấp nhận vào nguồn Tri thức: ${r.file_name}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setBusy(null);
    }
  };
  const research = (h: Hit) => {
    setPendingTopic(
      `Nghiên cứu nguồn: ${h.title}\n${h.citation}\n${h.url}\n\n${h.excerpt.slice(0, 800)}`,
    );
    setBranch("n3");
    toast.success("Đã chuyển đề tài sang Nhánh 3 Lục Đạo.");
  };

  return (
    <div className="space-y-4">
      <Section
        title="Tìm kiếm nguồn tri thức nhân loại"
        icon={<Search className="h-5 w-5 text-primary" />}
      >
        <div className="flex gap-2">
          <input
            className={input}
            placeholder='VD: "Kinh Phật", "Nikola Tesla", "giá vàng"…'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={suggest}
            onKeyDown={(e) => e.key === "Enter" && (void suggest(), run())}
          />
          <button
            type="button"
            className={btnPrimary}
            disabled={busy === "search"}
            onClick={() => {
              void suggest().then(run);
            }}
          >
            {busy === "search" ? <Spin /> : "Tìm"}
          </button>
        </div>
        {!!sources.length && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${picked.includes(s) ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {labels[s] ?? s}
              </button>
            ))}
          </div>
        )}
        {!!failed.length && (
          <p className="mt-2 text-xs text-destructive">
            Nguồn lỗi/chậm (đã bỏ qua): {failed.join("; ")}
          </p>
        )}
      </Section>
      <ul className="grid gap-3 md:grid-cols-2">
        {hits.map((h) => {
          const acc = accepted[h.url];
          return (
            <li key={h.url} className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Tag>{labels[h.source] ?? h.source}</Tag>
                {acc && <Tag tone="ok">✓ đã nạp</Tag>}
              </div>
              <p className="mt-1 font-semibold leading-snug">{h.title}</p>
              <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{h.excerpt}</p>
              <p className="mt-1 break-all text-xs">
                <a className="underline" href={h.url} target="_blank" rel="noreferrer">
                  {h.citation}
                </a>
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  className={btnSoft}
                  disabled={busy === h.url}
                  onClick={() => exportMd(h)}
                >
                  {busy === h.url ? (
                    <Spin />
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      .md
                    </>
                  )}
                </button>
                <button type="button" className={btnSoft} onClick={() => research(h)}>
                  <FlaskConical className="h-4 w-4" />
                  Nghiên cứu
                </button>
                <button
                  type="button"
                  className={acc ? btnSoft : btnOutline}
                  disabled={!!acc || busy === `acc:${h.url}`}
                  onClick={() => accept(h)}
                >
                  {acc ? (
                    <>
                      <Check className="h-4 w-4" />
                      Đã lưu
                    </>
                  ) : busy === `acc:${h.url}` ? (
                    <Spin />
                  ) : (
                    "Chấp nhận"
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ================= [Mục 15] Cầu nối NotebookLM & Claude ================= */
function SoGhiChu() {
  const { company } = useWorkspace();
  const qc = useQueryClient();
  const [src, setSrc] = useState<"notebooklm" | "claude">("notebooklm");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const notebook = useJetbuStore((s) => s.notebook);
  const pushNotebook = useJetbuStore((s) => s.pushNotebook);
  const { data: docs = [] } = useQuery({
    queryKey: ["md", company?.code, "so_ghi_chu", ""],
    queryFn: () =>
      listMd({ ...(company ? { company: company.code } : {}), category: "so_ghi_chu", limit: 100 }),
  });

  const paste1Click = async () => {
    let t = text;
    if (!t.trim()) {
      try {
        t = await navigator.clipboard.readText();
      } catch {
        toast.error("Trình duyệt chặn đọc clipboard — hãy dán vào ô.");
        return;
      }
    }
    if (!t.trim()) {
      toast.error("Clipboard trống.");
      return;
    }
    const ttl =
      title.trim() ||
      `${src === "notebooklm" ? "NotebookLM" : "Claude"} ${new Date().toLocaleString("vi-VN")}`;
    setBusy(true);
    try {
      const md = compressToMd(ttl, t, {
        Nguồn: src === "notebooklm" ? "Google NotebookLM" : "Claude",
        "Đồng bộ lúc": new Date().toISOString(),
      });
      const r = await core<{ file_name: string }>("save_md", {
        company: company?.code,
        category: "so_ghi_chu",
        title: ttl,
        content_md: md,
        source_type: src,
        source_name: src,
        tags: ["so_ghi_chu", src],
      });
      pushNotebook({
        id: crypto.randomUUID(),
        source: src,
        title: ttl,
        content: t,
        at: Date.now(),
        saved: true,
      });
      setTitle("");
      setText("");
      toast.success(`Đã nạp vào Bộ não 3D: ${r.file_name}`);
      await qc.invalidateQueries({ queryKey: ["md"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };
  const onAudio = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const r = await uploadAudio(f, { diarize: false });
      const ttl = `Audio ${src === "notebooklm" ? "NotebookLM" : "Claude"} — ${f.name.replace(/\.[^.]+$/, "")}`;
      await core("save_md", {
        company: company?.code,
        category: "so_ghi_chu",
        title: ttl,
        content_md: compressToMd(ttl, r.text, { Nguồn: `Audio ${f.name}` }),
        source_type: src,
        source_name: f.name,
      });
      toast.success("Đã chuyển audio thành .md và nạp vào Bộ não.");
      await qc.invalidateQueries({ queryKey: ["md"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi audio");
    } finally {
      setBusy(false);
    }
  };
  const exportPack = () => {
    if (!docs.length) {
      toast.warning("Chưa có ghi chú nào.");
      return;
    }
    const pack =
      `# Gói ghi chú JETBU AI → NotebookLM\n\nXuất lúc ${new Date().toLocaleString("vi-VN")} · ${docs.length} tài liệu\n\n` +
      docs.map((d) => `\n\n---\n\n<!-- ${d.file_name} -->\n${d.content_md}`).join("");
    downloadText(`${mdFileName("goi_ghi_chu_notebooklm")}`, pack);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        title="1-Click Paste từ NotebookLM / Claude"
        icon={<NotebookPen className="h-5 w-5 text-primary" />}
      >
        <div className="mb-2 flex gap-2">
          {(["notebooklm", "claude"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSrc(s)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold ${src === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              {s === "notebooklm" ? "Google NotebookLM" : "Claude"}
            </button>
          ))}
        </div>
        <input
          className={input}
          placeholder="Tiêu đề ghi chú (tùy chọn)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={`${input} mt-2 min-h-28`}
          placeholder="Dán ghi chú… (để trống = tự đọc clipboard khi bấm nút)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button type="button" className={btnPrimary} disabled={busy} onClick={paste1Click}>
            {busy ? <Spin /> : "📋 Dán 1-Click → Bộ não 3D"}
          </button>
          <label className={`${btnOutline} cursor-pointer`}>
            <FileAudio className="h-5 w-5" />
            Audio (Podcast NotebookLM)
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => onAudio(e.target.files?.[0])}
            />
          </label>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {notebook.slice(0, 6).map((n) => (
            <li key={n.id}>
              ✓ {n.title} <i>({n.source})</i>
            </li>
          ))}
        </ul>
      </Section>
      <Section
        title="Đồng bộ Google Drive & xuất gói .md"
        icon={<FolderSync className="h-5 w-5 text-primary" />}
      >
        <p className="rounded-lg bg-secondary p-3 text-sm">
          Thư mục đồng bộ: <code>00_So_Ghi_Chu_NotebookLM_Claude/</code> trên Google Drive 5TB. Đồng
          bộ tự động 2 chiều cần cấp quyền Google (OAuth) — hiện chưa cấu hình trong dự án, nên nút
          dưới xuất gói .md để bạn thả vào Drive/NotebookLM; khi bật OAuth Google Drive thì cùng nút
          này sẽ đẩy thẳng lên thư mục.
        </p>
        <div className="mt-3 grid gap-2">
          <button type="button" className={btnPrimary} onClick={exportPack}>
            <Download className="h-5 w-5" />
            Xuất gói .md ({docs.length} ghi chú) cho NotebookLM
          </button>
          <button
            type="button"
            className={btnOutline}
            onClick={() =>
              toast.info("Cần kết nối Google Drive (OAuth). Vào Nhánh 6 để xem hướng dẫn kết nối.")
            }
          >
            <FolderSync className="h-5 w-5" />
            Đồng bộ thư mục 00_So_Ghi_Chu (Drive)
          </button>
        </div>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {docs.map((d) => (
            <DocRow key={d.id} d={d} />
          ))}
        </ul>
      </Section>
    </div>
  );
}
