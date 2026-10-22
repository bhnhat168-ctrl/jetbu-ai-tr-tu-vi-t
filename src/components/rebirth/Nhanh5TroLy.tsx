import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Trash2,
  Mic,
  Square,
  Globe,
  UserCog,
  Radio,
  FileText,
  ListChecks,
  Save,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";
import { core, downloadText, mdFileName, uploadAudio } from "@/lib/jetbu-client";
import { newMsg, useJetbuStore, type ChatMsg } from "@/store/useJetbuStore";
import { Citations, Md, Section, Spin, Tag, btnOutline, btnPrimary, btnSoft, input } from "./ui";
import { LiveOffice } from "./LiveOffice";

const SUB = [
  ["chat", "💬 Chat Bot"],
  ["advisor", "🧭 Cố vấn & Trợ lý"],
  ["meeting", "🎙️ Ghi âm họp"],
  ["office", "📝 Word · Excel · PDF"],
] as const;

export function Nhanh5TroLy() {
  const [sub, setSub] = useState<(typeof SUB)[number][0]>("chat");
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
      {sub === "chat" && <ChatBot />}
      {sub === "advisor" && <Advisor />}
      {sub === "meeting" && <MeetingRecorder />}
      {sub === "office" && <LiveOffice />}
    </div>
  );
}

/* ---------- tiện ích ghi âm dùng chung ---------- */
function pickMime() {
  const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return typeof MediaRecorder === "undefined"
    ? ""
    : (c.find((m) => MediaRecorder.isTypeSupported(m)) ?? "");
}
function useRecorder() {
  const [rec, setRec] = useState(false);
  const [sec, setSec] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const m = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      m.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      m.start(1000);
      mr.current = m;
      setRec(true);
      setSec(0);
      timer.current = window.setInterval(() => setSec((s) => s + 1), 1000);
    } catch {
      toast.error("Không truy cập được micro — hãy cấp quyền cho trình duyệt.");
    }
  };
  const stop = () =>
    new Promise<Blob>((resolve) => {
      const m = mr.current;
      if (!m) return resolve(new Blob());
      m.onstop = () => {
        m.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks.current, { type: m.mimeType || "audio/webm" }));
      };
      m.stop();
      setRec(false);
      if (timer.current) window.clearInterval(timer.current);
    });
  return { rec, sec, start, stop };
}
const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ================= [Mục 5] Chat Bot trung tâm — 3-Tier Truth ================= */
function Bubble({ m }: { m: ChatMsg }) {
  return (
    <div
      className={`max-w-[92%] rounded-2xl px-3 py-2 md:max-w-[80%] ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}
    >
      {m.role === "assistant" ? (
        <Md>{m.content}</Md>
      ) : (
        <p className="whitespace-pre-wrap">{m.content}</p>
      )}
      {m.role === "assistant" && (m.ai_name || m.tier) && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {m.ai_name ? `🤖 ${m.ai_name}` : ""}
          {m.tier ? ` · Tầng ${m.tier}` : ""}
        </p>
      )}
      {m.role === "assistant" && (
        <Citations items={m.citations} verifiedBy={m.verified_by} tier={m.tier} />
      )}
    </div>
  );
}

function ChatBot() {
  const { company } = useWorkspace();
  const chat = useJetbuStore((s) => s.chat);
  const pushChat = useJetbuStore((s) => s.pushChat);
  const updateChat = useJetbuStore((s) => s.updateChat);
  const clearChat = useJetbuStore((s) => s.clearChat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [forceExternal, setForceExternal] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  const send = async () => {
    const q = text.trim();
    if (!q || busy) return;
    pushChat(newMsg("user", q));
    setText("");
    setBusy(true);
    const a = newMsg("assistant", "⏳ Tầng 1: đang tra Kho Tri Thức…");
    pushChat(a);
    try {
      const history = chat.slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const r = await core<{
        answer_md: string;
        tier_used: number;
        citations: ChatMsg["citations"];
        verified_by: string[];
        ai_name: string;
        missing: string[];
      }>("ask", { question: q, company: company?.code, history, forceExternal });
      updateChat(a.id, {
        content: r.answer_md,
        tier: r.tier_used,
        citations: r.citations,
        verified_by: r.verified_by,
        ai_name: r.ai_name,
      });
    } catch (e) {
      updateChat(a.id, { content: `⚠️ ${e instanceof Error ? e.message : "Lỗi"}` });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section
      title="Chat Bot trung tâm — trả lời trung thực từ Kho Tri Thức"
      icon={<Bot className="h-5 w-5 text-primary" />}
      right={
        <div className="flex items-center gap-1.5">
          <Tag tone="ok">Tầng 1→2→3</Tag>
          <button type="button" className={btnSoft} onClick={clearChat} aria-label="Xóa hội thoại">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="flex max-h-[60vh] min-h-[40vh] flex-col gap-2 overflow-y-auto rounded-xl bg-background p-2">
        {!chat.length && (
          <p className="m-auto max-w-md text-center text-sm text-muted-foreground">
            Hỏi bất cứ điều gì. JETBU tra Kho .md trước, thiếu mới tìm nguồn mở và đưa qua Hội đồng
            AI kiểm chứng. Mọi câu trả lời đều có mục “Căn cứ”.
          </p>
        )}
        {chat.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="mt-2 flex items-end gap-2">
        <textarea
          className={`${input} min-h-12`}
          rows={1}
          placeholder="Nhập câu hỏi hoặc mệnh lệnh…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !text.trim()}
          onClick={send}
          aria-label="Gửi"
        >
          {busy ? <Spin /> : <Send className="h-5 w-5" />}
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={forceExternal}
          onChange={(e) => setForceExternal(e.target.checked)}
        />
        <Globe className="h-3.5 w-3.5" />
        Luôn đối chiếu thêm nguồn ngoài (chậm hơn, kỹ hơn)
      </label>
    </Section>
  );
}

/* ================= [Mục 10] Cố vấn & Trợ lý Admin (nhận giọng nói) ================= */
function Advisor() {
  const { company } = useWorkspace();
  const advisor = useJetbuStore((s) => s.advisor);
  const pushAdvisor = useJetbuStore((s) => s.pushAdvisor);
  const clearAdvisor = useJetbuStore((s) => s.clearAdvisor);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [actions, setActions] = useState<{ type: string; title: string; due_at?: string | null }[]>(
    [],
  );
  const { rec, sec, start, stop } = useRecorder();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [advisor.length]);

  const ask = async (msg: string, kind: "chat" | "voice") => {
    if (!msg.trim() || busy) return;
    pushAdvisor(newMsg("user", kind === "voice" ? `🎤 ${msg}` : msg));
    setBusy(true);
    try {
      const r = await core<{
        answer_md: string;
        tier_used: number;
        citations: ChatMsg["citations"];
        verified_by: string[];
        ai_name: string;
        actions: { type: string; title: string; due_at?: string | null }[];
      }>("advisor", {
        message: msg,
        company: company?.code,
        kind,
        history: advisor.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      });
      pushAdvisor(
        newMsg("assistant", r.answer_md, {
          tier: r.tier_used,
          citations: r.citations,
          verified_by: r.verified_by,
          ai_name: r.ai_name,
        }),
      );
      if (r.actions?.length) {
        setActions((a) => [...r.actions, ...a]);
        toast.success(`Đã ghi ${r.actions.length} việc/nhắc nhở`);
      }
    } catch (e) {
      pushAdvisor(newMsg("assistant", `⚠️ ${e instanceof Error ? e.message : "Lỗi"}`));
    } finally {
      setBusy(false);
    }
  };
  const voice = async () => {
    if (rec) {
      const blob = await stop();
      if (!blob.size) return;
      setBusy(true);
      try {
        const t = await uploadAudio(blob);
        setBusy(false);
        await ask(t.text, "voice");
      } catch (e) {
        setBusy(false);
        toast.error(e instanceof Error ? e.message : "Không nghe được");
      }
    } else await start();
  };
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section
          title="AI Cố vấn & Trợ lý riêng của Admin"
          icon={<UserCog className="h-5 w-5 text-primary" />}
          right={
            <button type="button" className={btnSoft} onClick={clearAdvisor}>
              <Trash2 className="h-4 w-4" />
            </button>
          }
        >
          <div className="flex max-h-[55vh] min-h-[35vh] flex-col gap-2 overflow-y-auto rounded-xl bg-background p-2">
            {!advisor.length && (
              <p className="m-auto max-w-md text-center text-sm text-muted-foreground">
                “Nhắc tôi 9h mai họp giao ban”, “Tuần này cần làm gì?”, “Ghi chi phí xăng 2 triệu
                cho xe 51C-123.45”… Bấm micro để nói.
              </p>
            )}
            {advisor.map((m) => (
              <Bubble key={m.id} m={m} />
            ))}
            <div ref={endRef} />
          </div>
          <div className="mt-2 flex items-end gap-2">
            <button
              type="button"
              className={`${rec ? "bg-destructive text-destructive-foreground" : "bg-secondary"} inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl px-3`}
              onClick={voice}
              aria-label="Ghi âm"
              disabled={busy && !rec}
            >
              {rec ? (
                <>
                  <Square className="h-5 w-5" />
                  <span className="ml-1 text-xs">{mmss(sec)}</span>
                </>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
            <textarea
              className={`${input} min-h-12`}
              rows={1}
              placeholder="Nhắn cho cố vấn…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(text, "chat");
                  setText("");
                }
              }}
            />
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !text.trim()}
              onClick={() => {
                void ask(text, "chat");
                setText("");
              }}
              aria-label="Gửi"
            >
              {busy ? <Spin /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </Section>
      </div>
      <Section title="Việc đã ghi nhận" icon={<ListChecks className="h-5 w-5 text-primary" />}>
        <ul className="space-y-2 text-sm">
          {actions.map((a, i) => (
            <li key={i} className="rounded-xl border border-border p-2">
              <Tag>{a.type}</Tag> <b>{a.title}</b>
              {a.due_at && (
                <p className="text-xs text-muted-foreground">
                  Hạn: {new Date(a.due_at).toLocaleString("vi-VN")}
                </p>
              )}
            </li>
          ))}
          {!actions.length && (
            <li className="text-muted-foreground">
              Nhắc nhở, lịch, ghi chú tài chính mà cố vấn trích ra sẽ hiện ở đây (và lưu bảng{" "}
              <code>admin_advisor_logs</code>).
            </li>
          )}
        </ul>
      </Section>
    </div>
  );
}

/* ================= [Mục 11] Ghi âm cuộc họp thông minh ================= */
type Seg = { t0: number; t1: number; speaker: string; text: string };
function MeetingRecorder() {
  const { company } = useWorkspace();
  const { rec, sec, start, stop } = useRecorder();
  const [title, setTitle] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ transcript_md: string; summary_md: string | null } | null>(
    null,
  );
  const [duration, setDuration] = useState(0);
  const process = async (blob: Blob) => {
    setBusy("stt");
    try {
      const r = await uploadAudio(blob, {
        diarize: true,
        speakers: speakers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setSegs(r.segments);
      toast.success(
        `Đã chuyển ${r.segments.length} đoạn, nhận diện ${new Set(r.segments.map((s) => s.speaker)).size} người nói`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi chuyển giọng nói");
    } finally {
      setBusy(null);
    }
  };
  const toggle = async () => {
    if (rec) {
      const b = await stop();
      setDuration(sec);
      if (b.size) await process(b);
    } else {
      setSegs([]);
      setSaved(null);
      await start();
    }
  };
  const save = async (mode: "full" | "summary") => {
    if (!segs.length) return;
    setBusy(mode);
    try {
      const r = await core<{ transcript_md: string; summary_md: string | null }>("save_meeting", {
        title: title.trim() || `Cuộc họp ${new Date().toLocaleString("vi-VN")}`,
        company: company?.code,
        segments: segs,
        mode,
        duration_sec: duration,
      });
      setSaved(r);
      toast.success(
        mode === "summary"
          ? "Đã tóm tắt & lưu vào Kho 05_Bien_Ban"
          : "Đã lưu toàn bộ biên bản vào Kho 05_Bien_Ban",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setBusy(null);
    }
  };
  const rename = (from: string, to: string) => {
    if (!to.trim()) return;
    setSegs((s) => s.map((x) => (x.speaker === from ? { ...x, speaker: to.trim() } : x)));
  };
  const names = [...new Set(segs.map((s) => s.speaker))];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Section
        title="Phòng họp ghi âm thông minh"
        icon={<Radio className="h-5 w-5 text-primary" />}
      >
        <input
          className={input}
          placeholder="Tên cuộc họp"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={`${input} mt-2`}
          placeholder="Tên người tham dự (phân cách bằng dấu phẩy) — giúp AI gán đúng người nói"
          value={speakers}
          onChange={(e) => setSpeakers(e.target.value)}
        />
        <button
          type="button"
          className={`${rec ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"} mt-3 flex min-h-16 w-full items-center justify-center gap-2 rounded-xl text-lg font-bold`}
          onClick={toggle}
          disabled={busy === "stt"}
        >
          {rec ? (
            <>
              <Square className="h-6 w-6" />
              Dừng · {mmss(sec)}
            </>
          ) : busy === "stt" ? (
            <Spin label="Đang chuyển thành văn bản…" />
          ) : (
            <>
              <Mic className="h-6 w-6" />
              Bắt đầu ghi âm
            </>
          )}
        </button>
        <label className={`${btnOutline} mt-2 w-full cursor-pointer`}>
          <FileText className="h-5 w-5" />
          Hoặc tải file ghi âm có sẵn
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setSegs([]);
                setSaved(null);
                void process(f);
              }
            }}
          />
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          Nhận diện người nói do AI suy luận từ ngữ cảnh lượt lời (không phải nhận dạng giọng sinh
          trắc). Bạn có thể đổi tên người nói trước khi lưu.
        </p>
        {!!names.length && (
          <div className="mt-2 space-y-1">
            {names.map((n) => (
              <div key={n} className="flex items-center gap-2 text-sm">
                <Tag>{n}</Tag>
                <input
                  className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm"
                  placeholder="Đổi tên…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      rename(n, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={!segs.length || !!busy}
            onClick={() => save("summary")}
          >
            {busy === "summary" ? <Spin /> : "Tóm tắt"}
          </button>
          <button
            type="button"
            className={btnOutline}
            disabled={!segs.length || !!busy}
            onClick={() => save("full")}
          >
            {busy === "full" ? <Spin /> : "Ghi toàn bộ"}
          </button>
        </div>
      </Section>
      <div className="lg:col-span-2">
        <Section
          title="Biên bản (Speaker Diarization)"
          icon={<FileText className="h-5 w-5 text-primary" />}
          right={
            !!segs.length && (
              <button
                type="button"
                className={btnSoft}
                onClick={() =>
                  downloadText(
                    mdFileName(title || "bien_ban_hop"),
                    segs
                      .map((s) => `[${mmss(Math.floor(s.t0))}] **${s.speaker}:** ${s.text}`)
                      .join("\n"),
                  )
                }
              >
                <Save className="h-4 w-4" />
                .md
              </button>
            )
          }
        >
          {saved?.summary_md && (
            <div className="mb-3 rounded-xl bg-secondary p-3">
              <p className="mb-1 text-sm font-semibold">Tóm tắt</p>
              <Md>{saved.summary_md}</Md>
            </div>
          )}
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {segs.map((s, i) => (
              <p key={i} className="text-sm">
                <span className="text-xs text-muted-foreground">[{mmss(Math.floor(s.t0))}]</span>{" "}
                <b className="text-primary">{s.speaker}:</b> {s.text}
              </p>
            ))}
            {!segs.length && (
              <p className="text-sm text-muted-foreground">
                Bắt đầu ghi âm, nội dung và người nói sẽ hiện ở đây.
              </p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
