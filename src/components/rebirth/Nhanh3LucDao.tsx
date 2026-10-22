import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Download, Orbit, Square, Users, X } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";
import {
  categoryLabel,
  coreStream,
  downloadText,
  jdb,
  khoTitles,
  mdFileName,
} from "@/lib/jetbu-client";
import { useJetbuStore } from "@/store/useJetbuStore";
import { Md, Section, Spin, Tag, btnOutline, btnPrimary, btnSoft, input } from "./ui";

const LUC_DAO = ["Sinh thái", "Giáo dục", "Năng lượng", "Hạ tầng", "Kinh tế số", "Xã hội"];
const ENTERPRISES = [
  "Nhật Quân",
  "Winadata",
  "AgreenBOT",
  "Mai Linh Bình Dương",
  "Emailinh",
  "Ninh Kiều Go",
  "Viện Blockchain & Pháp lý",
];
type Book = {
  id: string;
  title_vi: string;
  topic: string;
  origin: string;
  cycle_round: number;
  content_md: string;
  ai_participants: string[];
  applications: unknown[];
  council_log: {
    next_cycle_questions?: string[];
    sources_internal?: { file_name: string; title: string; chunks: number }[];
  };
  created_at: string;
};

export function Nhanh3LucDao() {
  const { company } = useWorkspace();
  const qc = useQueryClient();
  const pendingTopic = useJetbuStore((s) => s.pendingTopic);
  const setPendingTopic = useJetbuStore((s) => s.setPendingTopic);
  const [topic, setTopic] = useState("");
  const [ents, setEnts] = useState<string[]>(ENTERPRISES);
  const [cycle, setCycle] = useState(1);
  const [progress, setProgress] = useState<{ step: string; detail?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    title_vi: string;
    content_md: string;
    participants: string[];
    synthesizer: string;
    next_cycle_questions: string[];
    sources_internal?: { file_name: string; title: string; chunks: number }[];
  } | null>(null);
  const pendingDocIds = useJetbuStore((s) => s.pendingDocIds);
  const setPendingDocIds = useJetbuStore((s) => s.setPendingDocIds);
  const [picked, setPicked] = useState<string[]>([]);
  const [kq, setKq] = useState("");
  const { data: titles = [], isLoading: titlesLoading } = useQuery({
    queryKey: ["kho-titles", company?.code],
    queryFn: () => khoTitles(company?.code),
  });
  const shownTitles = titles
    .filter((t) => {
      const n = kq.trim().toLowerCase();
      return !n || t.title.toLowerCase().includes(n) || t.tags?.some((g) => g.includes(n));
    })
    .slice(0, 60);
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(0, 10)));
  const [open, setOpen] = useState<Book | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { data: books = [] } = useQuery({
    queryKey: ["books", company?.code],
    queryFn: async () => {
      const { data, error } = await jdb
        .from("books_luc_dao")
        .select(
          "id,title_vi,topic,origin,cycle_round,content_md,ai_participants,applications,council_log,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Book[];
    },
  });

  useEffect(() => {
    if (pendingTopic) {
      setTopic(pendingTopic);
      setPendingTopic(null);
      if (pendingDocIds.length) {
        setPicked(pendingDocIds);
        setPendingDocIds([]);
      }
      toast.info("Đề tài được duyệt từ Bộ não 3D / nguồn tri thức đã sẵn sàng.");
    }
  }, [pendingTopic, setPendingTopic, pendingDocIds, setPendingDocIds]);

  const run = async () => {
    if (!topic.trim()) {
      toast.error("Nhập đề tài nghiên cứu.");
      return;
    }
    setBusy(true);
    setProgress([]);
    setResult(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await coreStream(
        {
          action: "council_book",
          topic,
          company: company?.code,
          enterprises: ents,
          cycle,
          doc_ids: picked,
          origin: pendingTopic ? "neural_graph" : "admin",
        },
        (o) => {
          if (o["progress"])
            setProgress((p) => [...p, o["progress"] as { step: string; detail?: string }]);
          if (o["result"]) {
            setResult(o["result"] as typeof result);
            toast.success("Hội đồng đã hoàn thành cuốn sách!");
            void qc.invalidateQueries({ queryKey: ["books"] });
            void qc.invalidateQueries({ queryKey: ["md"] });
          }
          if (o["error"]) toast.error(String(o["error"]));
        },
        ctrl.signal,
      );
    } catch (e) {
      if (!ctrl.signal.aborted) toast.error(e instanceof Error ? e.message : "Lỗi hội đồng");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Section
          title="Đề tài → Hội đồng AI Lục Đạo Luân Hồi"
          icon={<Orbit className="h-5 w-5 text-primary" />}
        >
          <p className="mb-2 rounded-lg bg-secondary p-2 text-xs">
            Chu trình khép kín: {LUC_DAO.join(" → ")} → Vòng N+1. Chỉ nghiên cứu khi Admin yêu cầu
            hoặc duyệt từ Bộ não 3D. Tất cả AI đang hoạt động cùng phân tích, Red Team phản biện
            chéo, tổng hợp thành sách tiếng Việt.
          </p>
          <textarea
            className={`${input} min-h-28`}
            placeholder="VD: Điện mặt trời áp mái cho đội xe cho thuê tài chính tại Bình Dương…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <div className="mt-3 rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">📚 Chọn sách từ Kho cho Hội đồng</p>
            <input
              className={`${input} mt-2`}
              placeholder="Tìm nhanh theo tên sách hoặc từ khóa…"
              value={kq}
              onChange={(e) => setKq(e.target.value)}
            />
            <button
              type="button"
              className={`${btnSoft} mt-2 w-full`}
              onClick={() =>
                setPicked(
                  titles
                    .filter((t) => t.category === "sach_luc_dao" || t.category === "nao_bo_2")
                    .map((t) => t.id)
                    .slice(0, 10),
                )
              }
            >
              Chọn tất cả sách Lục Đạo (tối đa 10)
            </button>
            {!!picked.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {picked.map((id) => {
                  const t = titles.find((x) => x.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePick(id)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
                    >
                      {t?.title.slice(0, 40) ?? "Sách đã chọn"}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            )}
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {titlesLoading && (
                <li>
                  <Spin label="Đang tải Kho…" />
                </li>
              )}
              {shownTitles.map((t) => (
                <li key={t.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-secondary">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0"
                      checked={picked.includes(t.id)}
                      onChange={() => togglePick(t.id)}
                    />
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium leading-snug">{t.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {categoryLabel(t.category)} · {t.word_count ?? 0} từ
                        {t.tags?.length ? ` · ${t.tags.slice(0, 5).join(", ")}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {!titlesLoading && !shownTitles.length && (
                <li className="text-xs text-muted-foreground">Kho chưa có sách phù hợp.</li>
              )}
            </ul>
          </div>
          <p className="mt-2 text-sm font-semibold">Ứng dụng thực tiễn cho:</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ENTERPRISES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() =>
                  setEnts((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]))
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${ents.includes(e) ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {e}
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            Vòng Lục Đạo
            <input
              type="number"
              min={1}
              max={9}
              className="w-16 rounded-lg border border-input bg-background px-2 py-1"
              value={cycle}
              onChange={(e) => setCycle(Number(e.target.value))}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" className={`${btnPrimary} flex-1`} disabled={busy} onClick={run}>
              {busy ? (
                <Spin label="Hội đồng đang làm việc…" />
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  Nghiên cứu & viết sách
                </>
              )}
            </button>
            {busy && (
              <button
                type="button"
                className={btnSoft}
                onClick={() => abortRef.current?.abort()}
                aria-label="Dừng"
              >
                <Square className="h-4 w-4" />
              </button>
            )}
          </div>
          {!!progress.length && (
            <ol className="mt-3 space-y-1 text-sm">
              {progress.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary">
                    {i === progress.length - 1 && busy ? "⏳" : "✓"}
                  </span>
                  <span>
                    {p.step}
                    {p.detail ? (
                      <span className="block text-xs text-muted-foreground">{p.detail}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>
        <Section
          title="Thư viện sách & công trình"
          icon={<BookOpen className="h-5 w-5 text-primary" />}
        >
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
            {books.map((b) => (
              <li key={b.id} className="rounded-xl border border-border p-3">
                <button type="button" className="w-full text-left" onClick={() => setOpen(b)}>
                  <p className="font-semibold leading-snug">{b.title_vi}</p>
                  <p className="text-xs text-muted-foreground">
                    Vòng {b.cycle_round} ·{" "}
                    {b.origin === "neural_graph" ? "Bộ não đề xuất" : "Admin"} ·{" "}
                    {b.ai_participants?.length ?? 0} AI ·{" "}
                    {new Date(b.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </button>
              </li>
            ))}
            {!books.length && <li className="text-sm text-muted-foreground">Chưa có sách nào.</li>}
          </ul>
        </Section>
      </div>
      <div className="lg:col-span-3">
        {result || open ? (
          (() => {
            const b = result
              ? {
                  title: result.title_vi,
                  md: result.content_md,
                  meta: `Tham gia: ${result.participants.join(", ")} · Tổng hợp: ${result.synthesizer}`,
                  next: result.next_cycle_questions,
                  used: result.sources_internal ?? [],
                }
              : {
                  title: open!.title_vi,
                  md: open!.content_md,
                  meta: `Tham gia: ${(open!.ai_participants ?? []).join(", ")}`,
                  next: open!.council_log?.next_cycle_questions ?? [],
                  used: open!.council_log?.sources_internal ?? [],
                };
            return (
              <Section
                title={b.title}
                icon={<BookOpen className="h-5 w-5 text-primary" />}
                right={
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className={btnSoft}
                      onClick={() => downloadText(mdFileName(b.title), b.md)}
                    >
                      <Download className="h-4 w-4" />
                      .md
                    </button>
                    {open && (
                      <button type="button" className={btnSoft} onClick={() => setOpen(null)}>
                        Đóng
                      </button>
                    )}
                  </div>
                }
              >
                <p className="mb-2 text-xs text-muted-foreground">{b.meta}</p>
                {!!b.used.length && (
                  <details className="mb-2 rounded-lg bg-secondary/60 p-2 text-xs">
                    <summary className="cursor-pointer font-semibold">
                      Sách đã dùng ({b.used.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5">
                      {b.used.map((u) => (
                        <li key={u.file_name} className="break-all">
                          📄 <code>{u.file_name}</code> · {u.chunks} đoạn
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="max-h-[70vh] overflow-y-auto">
                  <Md>{b.md}</Md>
                </div>
                {!!b.next.length && (
                  <div className="mt-3 rounded-xl bg-secondary p-3">
                    <p className="text-sm font-semibold">Vòng N+1 — câu hỏi sâu hơn:</p>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {b.next.map((q, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            className="text-left underline"
                            onClick={() => {
                              setTopic(q);
                              setCycle((c) => c + 1);
                              setOpen(null);
                              setResult(null);
                            }}
                          >
                            {q}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>
            );
          })()
        ) : (
          <Section title="Sách sẽ hiện ở đây" icon={<BookOpen className="h-5 w-5 text-primary" />}>
            <p className="text-sm text-muted-foreground">
              Nhập đề tài và bấm “Nghiên cứu & viết sách”, hoặc chọn một cuốn trong thư viện. Mỗi
              cuốn tự động được gom vào Kho .md <code>02_Sach_Va_Cong_Trinh_Luc_Dao/</code>.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LUC_DAO.map((l, i) => (
                <Tag key={l} tone="ok">
                  {i + 1}. {l}
                </Tag>
              ))}
            </div>
            <button
              type="button"
              className={`${btnOutline} mt-4`}
              onClick={() =>
                setTopic("Kinh tế tuần hoàn cho đội xe cho thuê tài chính: từ sinh thái đến xã hội")
              }
            >
              Thử đề tài mẫu
            </button>
          </Section>
        )}
      </div>
    </div>
  );
}
