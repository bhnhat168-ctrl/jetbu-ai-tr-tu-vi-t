/**
 * Server Functions cho JETBU Rebirth (chạy trên máy chủ, gọi từ React qua useServerFn).
 * File *.functions.ts có thể vào bundle client → chỉ import module .server bên trong handler.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const gatewayInput = z.object({
  name: z.string().trim().min(1).max(80),
  model_id: z.string().trim().min(1).max(160),
  base_url: z.string().trim().url().max(300),
  api_key: z.string().trim().max(600), // rỗng = giữ khóa cũ khi sửa
  supports_json: z.boolean().optional(),
  priority: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
});

/** [Mục 1] Bấm Lưu → ghi thẳng vào Supabase ai_api_gateways (service_role, không bao giờ lỗi RLS). Khóa không trả về. */
export const saveGateway = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => gatewayInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const base_url = data.base_url.replace(/\/+$/, "");
    const { data: ex } = await sb
      .from("ai_api_gateways")
      .select("id,api_key")
      .eq("name", data.name)
      .maybeSingle();
    const row: Record<string, unknown> = {
      name: data.name,
      model_id: data.model_id,
      base_url,
      supports_json: data.supports_json ?? true,
      priority: data.priority ?? 50,
      enabled: data.enabled ?? true,
      is_healthy: true,
      fail_count: 0,
      last_error: null,
    };
    if (data.api_key) row["api_key"] = data.api_key;
    else if (!ex) throw new Error("Cần dán API Key cho AI mới.");
    const q = ex
      ? sb
          .from("ai_api_gateways")
          .update(row)
          .eq("id", (ex as { id: string }).id)
      : sb.from("ai_api_gateways").insert(row);
    const { data: saved, error } = await q
      .select("id,name,model_id,base_url,key_last4,priority,enabled,is_healthy")
      .single();
    if (error) throw new Error(error.message);
    return saved as {
      id: string;
      name: string;
      model_id: string;
      base_url: string;
      key_last4: string;
      priority: number;
      enabled: boolean;
      is_healthy: boolean;
    };
  });

/** Danh sách cổng AI cho trình duyệt (qua view không có api_key) + cổng từ biến môi trường. */
export const listGateways = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const core = await import("./jetbu-core.server");
  const sb = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data } = await sb.from("ai_api_gateways_public").select("*").order("priority");
  const active = await core.loadGateways();
  return {
    db: (data ?? []) as {
      id: string;
      name: string;
      model_id: string;
      base_url: string;
      key_last4: string | null;
      supports_json: boolean;
      priority: number;
      enabled: boolean;
      is_healthy: boolean;
      last_error: string | null;
      last_status: number | null;
      last_checked: string | null;
      fail_count: number;
    }[],
    env: active
      .filter((g) => g.source === "env")
      .map((g) => ({
        id: g.id,
        name: g.name,
        model_id: g.model,
        base_url: g.baseUrl,
        priority: g.priority,
      })),
    activeNames: active.map((g) => g.name),
  };
});

/** Kiểm tra 1 cổng (theo id DB hoặc env id). */
export const testGateway = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const core = await import("./jetbu-core.server");
    const all = await core.loadGateways();
    let g = all.find((x) => x.id === data.id || x.id === `db:${data.id}`);
    if (!g) {
      // cổng đang bị đánh dấu lỗi vẫn phải test được
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sb = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
      const { data: r } = await sb
        .from("ai_api_gateways")
        .select("*")
        .eq("id", data.id.replace(/^db:/, ""))
        .maybeSingle();
      if (!r) throw new Error("Không tìm thấy cổng AI.");
      const row = r as Record<string, unknown>;
      g = {
        id: `db:${row["id"]}`,
        name: String(row["name"]),
        model: String(row["model_id"]),
        baseUrl: String(row["base_url"]),
        key: String(row["api_key"]),
        json: row["supports_json"] !== false,
        priority: Number(row["priority"] ?? 50),
        source: "db",
      };
    }
    return core.probeGateway(g);
  });

export const deleteGateway = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { error } = await sb.from("ai_api_gateways").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleGateway = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { error } = await sb
      .from("ai_api_gateways")
      .update({ enabled: data.enabled, is_healthy: true, fail_count: 0 })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
