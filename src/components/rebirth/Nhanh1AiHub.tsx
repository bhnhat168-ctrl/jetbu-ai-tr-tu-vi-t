import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plug, Plus, RefreshCw, Trash2, Zap, Eye, EyeOff, ShieldCheck } from "lucide-react";
import {
  deleteGateway,
  listGateways,
  saveGateway,
  testGateway,
  toggleGateway,
} from "@/lib/jetbu.functions";
import { useJetbuStore } from "@/store/useJetbuStore";
import { Section, Spin, Tag, btnOutline, btnPrimary, btnSoft, input } from "./ui";

/** Mẫu điền nhanh cho các cổng OpenAI-compatible phổ biến (Admin chỉ cần dán Key). */
const PRESETS = [
  {
    name: "Meta Llama 4 Maverick",
    model_id: "Llama-4-Maverick-17B-128E-Instruct-FP8",
    base_url: "https://api.llama.com/compat/v1",
  },
  {
    name: "Groq Llama 3.3 70B",
    model_id: "llama-3.3-70b-versatile",
    base_url: "https://api.groq.com/openai/v1",
  },
  {
    name: "Gemini Flash",
    model_id: "gemini-flash-latest",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    name: "Gemini Pro",
    model_id: "gemini-pro-latest",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    name: "OpenRouter DeepSeek",
    model_id: "deepseek/deepseek-v4-flash",
    base_url: "https://openrouter.ai/api/v1",
  },
  { name: "Mistral", model_id: "mistral-large-latest", base_url: "https://api.mistral.ai/v1" },
  { name: "Cerebras", model_id: "llama-3.3-70b", base_url: "https://api.cerebras.ai/v1" },
  {
    name: "Together AI",
    model_id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    base_url: "https://api.together.xyz/v1",
  },
];

export function Nhanh1AiHub() {
  const qc = useQueryClient();
  const setGateways = useJetbuStore((s) => s.setGateways);
  const list = useServerFn(listGateways);
  const save = useServerFn(saveGateway);
  const test = useServerFn(testGateway);
  const del = useServerFn(deleteGateway);
  const toggle = useServerFn(toggleGateway);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["jetbu-gateways"],
    queryFn: () => list(),
  });
  const [form, setForm] = useState({
    name: "",
    model_id: "",
    base_url: "",
    api_key: "",
    priority: 50,
  });
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<
    Record<string, { ok: boolean; detail: string; ms: number }>
  >({});

  // Đồng bộ danh sách (không có khóa) vào localStorage để giao diện hiển thị tức thì lần sau
  useEffect(() => {
    if (!data) return;
    setGateways([
      ...data.db.map((g) => ({
        id: g.id,
        name: g.name,
        model_id: g.model_id,
        base_url: g.base_url,
        key_last4: g.key_last4,
        enabled: g.enabled,
        is_healthy: g.is_healthy,
        last_error: g.last_error,
        source: "db" as const,
      })),
      ...data.env.map((g) => ({
        id: g.id,
        name: g.name,
        model_id: g.model_id,
        base_url: g.base_url,
        key_last4: null,
        enabled: true,
        is_healthy: true,
        source: "env" as const,
      })),
    ]);
  }, [data, setGateways]);

  const submit = async () => {
    if (!form.name.trim() || !form.model_id.trim() || !form.base_url.trim()) {
      toast.error("Điền đủ Tên AI, Model ID và Base URL.");
      return;
    }
    setBusy("save");
    try {
      const r = await save({
        data: {
          ...form,
          name: form.name.trim(),
          model_id: form.model_id.trim(),
          base_url: form.base_url.trim(),
          api_key: form.api_key.trim(),
        },
      });
      toast.success(
        `Đã lưu "${r.name}" vào Supabase — AI này lập tức tham gia hội đồng nghiên cứu.`,
      );
      setForm({ name: "", model_id: "", base_url: "", api_key: "", priority: 50 });
      await qc.invalidateQueries({ queryKey: ["jetbu-gateways"] });
      const t = await test({ data: { id: r.id } });
      setResults((p) => ({ ...p, [r.id]: t }));
      toast[t.ok ? "success" : "error"](
        t.ok ? `"${r.name}" hoạt động (${t.ms} ms)` : `"${r.name}" lỗi: ${t.detail}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setBusy(null);
    }
  };
  const runTest = async (id: string) => {
    setBusy(id);
    try {
      const t = await test({ data: { id } });
      setResults((p) => ({ ...p, [id]: t }));
      toast[t.ok ? "success" : "error"](t.ok ? `Hoạt động (${t.ms} ms)` : t.detail);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kiểm tra thất bại");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Section
        title="Thêm AI mới — 1 click"
        icon={<Plus className="h-5 w-5 text-primary" />}
        right={<Tag tone="ok">Lưu Supabase + localStorage</Tag>}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={btnSoft}
              onClick={() => setForm((f) => ({ ...f, ...p }))}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          <input
            className={input}
            placeholder="Tên AI (VD: Meta Llama 4)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={input}
            placeholder="Model ID (VD: Llama-4-Maverick-17B-128E-Instruct-FP8)"
            value={form.model_id}
            onChange={(e) => setForm({ ...form, model_id: e.target.value })}
          />
          <input
            className={input}
            placeholder="Base URL (OpenAI-compatible, VD: https://api.llama.com/compat/v1)"
            value={form.base_url}
            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            inputMode="url"
          />
          <div className="flex gap-2">
            <input
              className={input}
              type={showKey ? "text" : "password"}
              autoComplete="off"
              placeholder="API Key (chỉ lưu trên máy chủ, không hiện lại)"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            />
            <button
              type="button"
              className={btnSoft}
              onClick={() => setShowKey((v) => !v)}
              aria-label="Hiện/Ẩn khóa"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Ưu tiên (nhỏ = chạy trước)
            <input
              type="number"
              min={0}
              max={999}
              className="w-24 rounded-lg border border-input bg-background px-2 py-1"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            />
          </label>
          <button type="button" className={btnPrimary} disabled={busy === "save"} onClick={submit}>
            {busy === "save" ? (
              <Spin label="Đang lưu & kiểm tra..." />
            ) : (
              <>
                <Plug className="h-5 w-5" />
                Lưu & kích hoạt ngay
              </>
            )}
          </button>
        </div>
        <p className="mt-3 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-primary" />
          Khóa API chỉ nằm trong bảng <code>ai_api_gateways</code> phía máy chủ (trình duyệt chỉ
          thấy 4 ký tự cuối). AI lỗi 401/429/500 hoặc hết hạn mức sẽ bị <b>bỏ qua tức thì</b> và tự
          thử lại sau 10 phút.
        </p>
      </Section>

      <div className="lg:col-span-3">
        <Section
          title="Đội AI đang hoạt động — Auto-Failover"
          icon={<Zap className="h-5 w-5 text-primary" />}
          right={
            <button type="button" className={btnSoft} onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          }
        >
          {isLoading && <Spin label="Đang tải danh sách..." />}
          {data && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Thứ tự định tuyến hiện tại:{" "}
                <b className="text-foreground">
                  {data.activeNames.join(" → ") || "chưa có AI nào"}
                </b>
              </p>
              <ul className="space-y-2">
                {data.db.map((g) => {
                  const r = results[g.id];
                  return (
                    <li key={g.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {g.name}{" "}
                            <span className="text-xs text-muted-foreground">
                              · ưu tiên {g.priority}
                            </span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {g.model_id} · {g.base_url} · key ••••{g.key_last4 ?? "????"}
                          </p>
                          {g.last_error && !g.is_healthy && (
                            <p className="mt-1 text-xs text-destructive">
                              Lỗi gần nhất ({g.last_status}): {g.last_error}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!g.enabled ? (
                            <Tag>Tắt</Tag>
                          ) : g.is_healthy ? (
                            <Tag tone="ok">✓ Sẵn sàng</Tag>
                          ) : (
                            <Tag tone="bad">✗ Đang bỏ qua</Tag>
                          )}
                          {r && <Tag tone={r.ok ? "ok" : "bad"}>{r.ok ? `${r.ms} ms` : "lỗi"}</Tag>}
                          <button
                            type="button"
                            className={btnSoft}
                            disabled={busy === g.id}
                            onClick={() => runTest(g.id)}
                          >
                            {busy === g.id ? <Spin /> : "Kiểm tra"}
                          </button>
                          <button
                            type="button"
                            className={btnSoft}
                            onClick={async () => {
                              await toggle({ data: { id: g.id, enabled: !g.enabled } });
                              refetch();
                            }}
                          >
                            {g.enabled ? "Tắt" : "Bật"}
                          </button>
                          <button
                            type="button"
                            className={`${btnSoft} text-destructive`}
                            aria-label="Xóa"
                            onClick={async () => {
                              if (!confirm(`Xóa cổng "${g.name}"?`)) return;
                              await del({ data: { id: g.id } });
                              toast.success("Đã xóa");
                              refetch();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
                {data.env.map((g) => {
                  const r = results[g.id];
                  return (
                    <li key={g.id} className="rounded-xl border border-dashed border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {g.name} <Tag>biến môi trường</Tag>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {g.model_id} · {g.base_url}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {r && (
                            <Tag tone={r.ok ? "ok" : "bad"}>{r.ok ? `${r.ms} ms` : r.detail}</Tag>
                          )}
                          <button
                            type="button"
                            className={btnSoft}
                            disabled={busy === g.id}
                            onClick={() => runTest(g.id)}
                          >
                            {busy === g.id ? <Spin /> : "Kiểm tra"}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
                {!data.db.length && !data.env.length && (
                  <li className="rounded-xl bg-secondary p-4 text-sm">
                    Chưa có AI nào. Thêm AI đầu tiên ở khung bên trái — chỉ cần Tên + Model + Base
                    URL + Key.
                  </li>
                )}
              </ul>
              <button
                type="button"
                className={`${btnOutline} mt-3 w-full`}
                onClick={async () => {
                  for (const g of [...data.db, ...data.env]) await runTest(g.id);
                }}
              >
                Kiểm tra toàn bộ đội AI
              </button>
            </>
          )}
        </Section>
      </div>
    </div>
  );
}
