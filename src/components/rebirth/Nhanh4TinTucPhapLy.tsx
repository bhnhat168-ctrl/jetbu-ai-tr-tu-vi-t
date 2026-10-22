import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Globe2, Newspaper, Scale, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";
import { core, downloadText, jdb, mdFileName } from "@/lib/jetbu-client";
import { useJetbuStore } from "@/store/useJetbuStore";
import { Citations, Md, Section, Spin, Tag, btnPrimary, btnSoft, input } from "./ui";

type News = {
  id: string;
  news_date: string;
  title: string;
  content_md: string;
  market_view: Record<string, { bias?: string; reason?: string }>;
  sources: { title: string; url: string; source: string }[];
  verified_by: string[];
  created_at: string;
};
type Legal = {
  id: string;
  jurisdiction: string;
  question: string;
  title: string;
  content_md: string;
  risk_level: string | null;
  citations: { kind: string; title: string; ref: string; source: string }[];
  verified_by: string[];
  created_at: string;
};

const Bias = ({ b }: { b?: string | undefined }) =>
  b === "tang" ? (
    <span className="inline-flex items-center gap-1 text-primary">
      <TrendingUp className="h-4 w-4" />
      Tăng
    </span>
  ) : b === "giam" ? (
    <span className="inline-flex items-center gap-1 text-destructive">
      <TrendingDown className="h-4 w-4" />
      Giảm
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="h-4 w-4" />
      Đi ngang
    </span>
  );
const MARKETS: [string, string][] = [
  ["stocks", "Chứng khoán"],
  ["gold", "Vàng"],
  ["usd", "USD"],
  ["crypto", "Crypto"],
];

export function Nhanh4TinTucPhapLy() {
  const [sub, setSub] = useState<"news" | "legal">("news");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        <button
          type="button"
          onClick={() => setSub("news")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${sub === "news" ? "bg-primary text-primary-foreground" : ""}`}
        >
          🌍 Thế Giới Trong Tay Mỗi Ngày
        </button>
        <button
          type="button"
          onClick={() => setSub("legal")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${sub === "legal" ? "bg-primary text-primary-foreground" : ""}`}
        >
          ⚖️ Tri Thức Pháp Luật
        </button>
      </div>
      {sub === "news" ? <TinTuc /> : <PhapLuat />}
    </div>
  );
}

/* ================= [Mục 7] ================= */
function TinTuc() {
  const { company } = useWorkspace();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<News | null>(null);
  const setLastNewsAt = useJetbuStore((s) => s.setLastNewsAt);
  const { data: list = [] } = useQuery({
    queryKey: ["news", company?.code],
    queryFn: async () => {
      const { data, error } = await jdb
        .from("daily_world_news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as News[];
    },
  });
  const run = async () => {
    setBusy(true);
    try {
      const r = await core<News & { ai_name: string; rejected: number }>("daily_news", {
        company: company?.code,
      });
      setLastNewsAt(new Date().toISOString());
      setOpen(r);
      toast.success(
        `${r.ai_name} đã xuất bản tin (${r.sources.length} nguồn kiểm chứng, loại ${r.rejected})`,
      );
      await qc.invalidateQueries({ queryKey: ["news"] });
      await qc.invalidateQueries({ queryKey: ["md"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi nhận định");
    } finally {
      setBusy(false);
    }
  };
  const cur = open ?? list[0] ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Section
          title="Nhận định thị trường hôm nay"
          icon={<Globe2 className="h-5 w-5 text-primary" />}
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Quét tin kinh tế – chính trị toàn cầu 48 giờ (GDELT), Hội đồng AI kiểm chứng chéo, rồi
            viết bài <b>“Thế giới trong tay mỗi ngày”</b> và tự lưu vào Kho{" "}
            <code>03_The_Gioi_Trong_Tay_Moi_Ngay/</code>.
          </p>
          <button type="button" className={`${btnPrimary} w-full`} disabled={busy} onClick={run}>
            {busy ? (
              <Spin label="Đang quét tin & kiểm chứng (≈1 phút)…" />
            ) : (
              <>
                <Newspaper className="h-5 w-5" />
                Nhận định
              </>
            )}
          </button>
          {cur?.market_view && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {MARKETS.map(([k, l]) => (
                <div key={k} className="rounded-xl border border-border p-2">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <Bias b={cur.market_view[k]?.bias} />
                  <p className="mt-1 line-clamp-3 text-xs">{cur.market_view[k]?.reason}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Bản tin đã xuất bản" icon={<Newspaper className="h-5 w-5 text-primary" />}>
          <ul className="max-h-[45vh] space-y-1 overflow-y-auto">
            {list.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setOpen(n)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm ${cur?.id === n.id ? "bg-secondary" : "hover:bg-secondary/60"}`}
                >
                  <b>{new Date(n.news_date).toLocaleDateString("vi-VN")}</b> — {n.title}
                </button>
              </li>
            ))}
            {!list.length && <li className="text-sm text-muted-foreground">Chưa có bản tin.</li>}
          </ul>
        </Section>
      </div>
      <div className="lg:col-span-3">
        {cur ? (
          <Section
            title={cur.title}
            icon={<Globe2 className="h-5 w-5 text-primary" />}
            right={
              <button
                type="button"
                className={btnSoft}
                onClick={() => downloadText(mdFileName(cur.title), cur.content_md)}
              >
                <Download className="h-4 w-4" />
                .md
              </button>
            }
          >
            <p className="mb-2 text-xs text-muted-foreground">
              {cur.sources?.length ?? 0} nguồn · kiểm chứng bởi {cur.verified_by?.join(", ") || "—"}
            </p>
            <div className="max-h-[70vh] overflow-y-auto">
              <Md>{cur.content_md}</Md>
            </div>
            {!!cur.sources?.length && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-semibold">Nguồn đã kiểm chứng</summary>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  {cur.sources.map((s, i) => (
                    <li key={i} className="break-all">
                      <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                        {s.title}
                      </a>{" "}
                      <i>({s.source})</i>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </Section>
        ) : (
          <Section title="Chưa có bản tin" icon={<Globe2 className="h-5 w-5 text-primary" />}>
            <p className="text-sm text-muted-foreground">
              Bấm “Nhận định” để tạo bản tin đầu tiên.
            </p>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ================= [Mục 8] ================= */
function PhapLuat() {
  const { company } = useWorkspace();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [jur, setJur] = useState<"VN" | "INTL" | "BOTH">("BOTH");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Legal | null>(null);
  const { data: list = [] } = useQuery({
    queryKey: ["legal", company?.code],
    queryFn: async () => {
      const { data, error } = await jdb
        .from("legal_knowledge")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Legal[];
    },
  });
  const run = async () => {
    if (!q.trim()) {
      toast.error("Nhập câu hỏi pháp lý.");
      return;
    }
    setBusy(true);
    try {
      const r = await core<{
        id: string;
        title: string;
        answer_md: string;
        risk_level: string | null;
        citations: Legal["citations"];
        verified_by: string[];
        tier_used: number;
      }>("legal", { question: q, company: company?.code, jurisdiction: jur });
      setOpen({
        id: r.id,
        jurisdiction: jur,
        question: q,
        title: r.title,
        content_md: r.answer_md,
        risk_level: r.risk_level,
        citations: r.citations,
        verified_by: r.verified_by,
        created_at: new Date().toISOString(),
      });
      setQ("");
      toast.success("Đã lưu vào Tri Thức Pháp Luật");
      await qc.invalidateQueries({ queryKey: ["legal"] });
      await qc.invalidateQueries({ queryKey: ["md"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi nghiên cứu");
    } finally {
      setBusy(false);
    }
  };
  const cur = open ?? list[0] ?? null;
  const risk = (r: string | null) =>
    r === "do" ? (
      <Tag tone="bad">ĐỎ</Tag>
    ) : r === "vang" ? (
      <Tag tone="warn">VÀNG</Tag>
    ) : r === "xanh" ? (
      <Tag tone="ok">XANH</Tag>
    ) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Section
          title="AI nghiên cứu Pháp luật VN & Quốc tế"
          icon={<Scale className="h-5 w-5 text-primary" />}
        >
          <div className="mb-2 flex gap-1">
            {(["VN", "INTL", "BOTH"] as const).map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setJur(j)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold ${jur === j ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {j === "VN" ? "Việt Nam" : j === "INTL" ? "Quốc tế" : "Cả hai"}
              </button>
            ))}
          </div>
          <textarea
            className={`${input} min-h-24`}
            placeholder="VD: Điều kiện cho thuê tài chính xe ô tô theo luật hiện hành? Rủi ro hợp đồng với bên thuê là cá nhân?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className={`${btnPrimary} mt-2 w-full`}
            disabled={busy}
            onClick={run}
          >
            {busy ? (
              <Spin label="Tra Kho → nguồn ngoài → hội đồng kiểm chứng…" />
            ) : (
              "Nghiên cứu & lưu vào Tri Thức Pháp Luật"
            )}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Kết quả luôn ghi số hiệu văn bản/điều khoản và phân loại rủi ro Đỏ/Vàng/Xanh; những điểm
            chưa có văn bản gốc sẽ được đánh dấu “cần đối chiếu vbpl.vn”. Đây là thông tin tham
            khảo, không thay thế tư vấn của luật sư.
          </p>
        </Section>
        <Section
          title="Tri Thức Pháp Luật đã lưu"
          icon={<Scale className="h-5 w-5 text-primary" />}
        >
          <ul className="max-h-[40vh] space-y-1 overflow-y-auto">
            {list.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setOpen(l)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm ${cur?.id === l.id ? "bg-secondary" : "hover:bg-secondary/60"}`}
                >
                  <span className="line-clamp-2">{l.title}</span>
                  {risk(l.risk_level)}
                </button>
              </li>
            ))}
            {!list.length && <li className="text-sm text-muted-foreground">Chưa có mục nào.</li>}
          </ul>
        </Section>
      </div>
      <div className="lg:col-span-3">
        {cur ? (
          <Section
            title={cur.title}
            icon={<Scale className="h-5 w-5 text-primary" />}
            right={
              <div className="flex items-center gap-1.5">
                {risk(cur.risk_level)}
                <button
                  type="button"
                  className={btnSoft}
                  onClick={() => downloadText(mdFileName(cur.title), cur.content_md)}
                >
                  <Download className="h-4 w-4" />
                  .md
                </button>
              </div>
            }
          >
            <p className="mb-2 text-xs text-muted-foreground">
              Câu hỏi: {cur.question} · Phạm vi: {cur.jurisdiction}
            </p>
            <div className="max-h-[70vh] overflow-y-auto">
              <Md>{cur.content_md}</Md>
            </div>
            <Citations
              items={cur.citations}
              verifiedBy={cur.verified_by}
              tier={cur.verified_by?.length ? 3 : 1}
            />
          </Section>
        ) : (
          <Section
            title="Kết quả nghiên cứu sẽ hiện ở đây"
            icon={<Scale className="h-5 w-5 text-primary" />}
          >
            <p className="text-sm text-muted-foreground">Đặt câu hỏi pháp lý ở khung bên trái.</p>
          </Section>
        )}
      </div>
    </div>
  );
}
