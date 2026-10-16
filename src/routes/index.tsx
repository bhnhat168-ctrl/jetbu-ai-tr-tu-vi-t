import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Columns2, Loader2, Plus, Trash2, FileDown, Square } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace, type ChatMessage } from "@/lib/workspace-store";
import { MODEL_CHOICES, findModel } from "@/lib/ai-models";
import { DEPARTMENT_PROMPTS } from "@/lib/prompts";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Không gian AI Đa năng — JETBU AI" },
    { name: "description", content: "Chat AI đa mô hình, soạn thảo song song và thư viện 18 mẫu câu lệnh theo phòng ban." },
    { property: "og:title", content: "Không gian AI Đa năng — JETBU AI" },
    { property: "og:description", content: "Chat AI đa mô hình, soạn thảo song song và thư viện 18 mẫu câu lệnh theo phòng ban." },
  ] }),
  component: Workspace,
});

function Workspace() {
  const ws = useWorkspace();
  const { messages, setMessages, draftInput, setDraftInput, canvasText, setCanvasText, company, sessionKey } = ws;
  const [modelKey, setModelKey] = useState("auto");
  const [split, setSplit] = useState(false);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Abort any in-flight answer when the company changes.
  useEffect(() => {
    abortRef.current?.abort();
    setBusy(false);
  }, [sessionKey]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [busy, split]);

  const send = async () => {
    const text = draftInput.trim();
    if (!text || busy) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const asstId = crypto.randomUUID();
    const history = [...messages, userMsg];
    setMessages(() => [...history, { id: asstId, role: "assistant", content: "" }]);
    setDraftInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const mySession = sessionKey;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelKey, companyName: company?.name, canvas: split, messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Không thể kết nối AI.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === asstId ? { ...x, content: acc } : x)));
      }
      if (!acc) setMessages((m) => m.map((x) => (x.id === asstId ? { ...x, content: "_(Không có phản hồi)_" } : x)));
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      toast.error(msg);
      setMessages((m) => m.map((x) => (x.id === asstId ? { ...x, content: `⚠️ ${msg}` } : x)));
    } finally {
      if (mySession === sessionKey) setBusy(false);
    }
  };

  const toCanvas = (t: string) => {
    setSplit(true);
    setCanvasText(canvasText ? `${canvasText}\n\n${t}` : t);
    toast.success("Đã đưa nội dung sang trang soạn thảo");
  };

  const chat = (
    <section className="flex min-h-[70vh] flex-1 flex-col rounded-2xl bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <select value={modelKey} onChange={(e) => setModelKey(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-base">
          {MODEL_CHOICES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <button onClick={() => setSplit((s) => !s)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium ${split ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
          <Columns2 className="h-5 w-5" /> Soạn thảo Song song
        </button>
      </div>
      <p className="px-4 pt-2 text-xs text-muted-foreground">Đang chạy: {findModel(modelKey).note}</p>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!messages.length && (
          <div className="py-12 text-center text-muted-foreground">
            <p className="font-display text-2xl font-semibold text-foreground">Xin chào, tôi là JETBU AI</p>
            <p className="mt-2 text-base">Đang làm việc cho: <b>{company?.name ?? "..."}</b>. Chọn một mẫu câu lệnh bên phải hoặc gõ câu hỏi.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-3 text-base text-primary-foreground">{m.content}</div>
            ) : (
              <div className="max-w-none">
                {m.content ? (
                  <div className="prose prose-sm max-w-none text-base text-foreground [&_*]:text-foreground"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />JETBU AI đang suy nghĩ...</span>
                )}
                {split && m.content && !busy && (
                  <button onClick={() => toCanvas(m.content)} className="mt-2 flex items-center gap-1 text-sm font-medium text-primary"><FileDown className="h-4 w-4" />Đưa sang trang soạn thảo</button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <textarea
          ref={inputRef}
          value={draftInput}
          onChange={(e) => setDraftInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          placeholder="Nhập câu hỏi hoặc yêu cầu soạn thảo..."
          className="flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        {busy ? (
          <button onClick={() => { abortRef.current?.abort(); setBusy(false); }} className="flex items-center gap-2 rounded-xl bg-destructive px-4 text-lg font-semibold text-destructive-foreground"><Square className="h-5 w-5" />Dừng</button>
        ) : (
          <button onClick={send} disabled={!draftInput.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-4 text-lg font-semibold text-primary-foreground disabled:opacity-50"><Send className="h-5 w-5" />Gửi</button>
        )}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-4 p-4 xl:flex-row">
      <div className={`flex min-w-0 flex-1 flex-col gap-4 ${split ? "lg:flex-row" : ""}`}>
        {chat}
        {split && (
          <section className="flex min-h-[70vh] flex-1 flex-col rounded-2xl bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h2 className="font-display text-lg font-semibold">Trang soạn thảo hợp đồng / báo cáo</h2>
              <button onClick={() => setCanvasText("")} className="text-sm text-muted-foreground hover:text-destructive">Xóa trang</button>
            </div>
            <textarea
              value={canvasText}
              onChange={(e) => setCanvasText(e.target.value)}
              placeholder="Soạn thảo trực tiếp tại đây, hoặc đưa câu trả lời của AI sang..."
              className="flex-1 resize-none bg-card p-6 font-serif text-base leading-relaxed outline-none"
            />
          </section>
        )}
      </div>
      <RightPanel onPick={(p) => { setDraftInput(p); inputRef.current?.focus(); }} />
    </div>
  );
}

function RightPanel({ onPick }: { onPick: (p: string) => void }) {
  const { tasks, setTasks } = useWorkspace();
  const [newTask, setNewTask] = useState("");
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-80">
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Công việc trong ngày</h2>
        <ul className="mt-3 space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-base">
              <input type="checkbox" checked={t.done} onChange={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} className="h-5 w-5 accent-primary" />
              <span className={`flex-1 ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.text}</span>
              <button aria-label="Xóa" onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
            </li>
          ))}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newTask.trim()) return; setTasks((ts) => [...ts, { id: crypto.randomUUID(), text: newTask.trim(), done: false }]); setNewTask(""); }}>
          <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Thêm việc..." className="min-w-0 flex-1 rounded-lg border border-input px-3 py-2 text-base" />
          <button className="rounded-lg bg-primary px-3 text-primary-foreground" aria-label="Thêm"><Plus className="h-5 w-5" /></button>
        </form>
      </div>
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Thư viện 18 mẫu câu lệnh</h2>
        <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {DEPARTMENT_PROMPTS.map((p) => (
            <button key={p.dept} onClick={() => onPick(p.prompt)} className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-primary hover:bg-secondary">
              <p className="text-base font-semibold text-primary">{p.dept}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{p.prompt}</p>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
