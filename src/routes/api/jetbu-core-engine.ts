/**
 * /api/jetbu-core-engine — cổng duy nhất của Frontend tới JETBU CORE ENGINE.
 * POST JSON { action, ...payload } hoặc multipart (action=transcribe, file=audio).
 * Khóa API chỉ tồn tại phía máy chủ (jetbu-core.server.ts) — không bao giờ xuống trình duyệt.
 */
import { createFileRoute } from "@tanstack/react-router";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;
const bad = (m: string, s = 400) => Response.json({ error: m }, { status: s });

export const Route = createFileRoute("/api/jetbu-core-engine")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const core = await import("@/lib/jetbu-core.server");
        try {
          const ct = request.headers.get("content-type") ?? "";
          /* ---------- Ghi âm → văn bản (multipart) ---------- */
          if (ct.includes("multipart/form-data")) {
            const fd = await request.formData();
            const file = fd.get("file");
            if (!(file instanceof Blob)) return bad("Thiếu file âm thanh.");
            const t = await core.transcribe(
              file,
              (file as File).name || "audio.webm",
              String(fd.get("language") ?? "vi"),
            );
            const wantDiarize = String(fd.get("diarize") ?? "0") === "1";
            const known = String(fd.get("speakers") ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const segments = wantDiarize
              ? await core.diarize(t.segments, known)
              : t.segments.map((s) => ({ t0: s.start, t1: s.end, speaker: "Admin", text: s.text }));
            return Response.json({
              text: t.text,
              segments,
              transcript_md: core.segmentsToMd(segments),
            });
          }

          const b = (await request.json()) as Body;
          const company =
            typeof b["company"] === "string" && b["company"] ? b["company"] : "JETBU_HQ";
          switch (String(b["action"] ?? "")) {
            /* ---------- Nhánh 5: Chat trung tâm (3-Tier Truth) ---------- */
            case "ask": {
              if (!b["question"]) return bad("Thiếu câu hỏi.");
              return Response.json(
                await core.truthAnswer({
                  question: String(b["question"]).slice(0, 8000),
                  company,
                  category: b["category"],
                  history: b["history"],
                  forceExternal: Boolean(b["forceExternal"]),
                  sources: b["sources"],
                }),
              );
            }
            /* ---------- Nhánh 5: Cố vấn & Trợ lý Admin ---------- */
            case "advisor": {
              if (!b["message"]) return bad("Thiếu nội dung.");
              return Response.json(
                await core.advisorChat({
                  message: String(b["message"]).slice(0, 8000),
                  company,
                  history: b["history"],
                  kind: b["kind"] === "voice" ? "voice" : "chat",
                }),
              );
            }
            /* ---------- Nhánh 3: Hội đồng Lục Đạo (stream NDJSON tiến độ → kết quả) ---------- */
            case "council_book": {
              if (!b["topic"]) return bad("Thiếu đề tài.");
              const enc = new TextEncoder();
              const stream = new ReadableStream<Uint8Array>({
                async start(ctrl) {
                  const send = (o: unknown) => ctrl.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
                  try {
                    const r = await core.councilBook({
                      topic: String(b["topic"]).slice(0, 4000),
                      company,
                      origin: b["origin"] === "neural_graph" ? "neural_graph" : "admin",
                      enterprises: Array.isArray(b["enterprises"]) ? b["enterprises"] : undefined,
                      cycle: Number(b["cycle"] ?? 1),
                      onProgress: (p) => send({ progress: p }),
                      doc_ids: Array.isArray(b["doc_ids"])
                        ? (b["doc_ids"] as unknown[])
                            .filter(
                              (x): x is string =>
                                typeof x === "string" &&
                                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                                  x,
                                ),
                            )
                            .slice(0, 10)
                        : undefined,
                    });
                    send({ result: r });
                  } catch (e) {
                    send({ error: e instanceof Error ? e.message : "Lỗi hội đồng" });
                  }
                  ctrl.close();
                },
              });
              return new Response(stream, {
                headers: {
                  "Content-Type": "application/x-ndjson; charset=utf-8",
                  "Cache-Control": "no-cache, no-transform",
                },
              });
            }
            /* ---------- Nhánh 2: tìm nguồn → gợi ý → xuất .md → lưu kho ---------- */
            case "suggest_sources":
              return Response.json({
                sources: core.suggestSources(String(b["q"] ?? "")),
                labels: core.SOURCE_LABELS,
              });
            case "search_sources": {
              const q = String(b["q"] ?? "")
                .trim()
                .slice(0, 200);
              if (!q) return bad("Nhập từ khóa.");
              const sources = (
                Array.isArray(b["sources"]) && b["sources"].length
                  ? b["sources"]
                  : core.suggestSources(q)
              ).filter((s: string) => (core.SOURCE_IDS as readonly string[]).includes(s));
              return Response.json(await core.tier2Search(q, sources, Number(b["perSource"] ?? 6)));
            }
            case "export_md": {
              if (!b["hit"]) return bad("Thiếu kết quả cần xuất.");
              return Response.json(await core.hitToMarkdown(b["hit"]));
            }
            case "url_to_md": {
              const url = String(b["url"] ?? "");
              if (!/^https?:\/\//.test(url)) return bad("URL không hợp lệ.");
              const r = await fetch(url, {
                signal: AbortSignal.timeout(15_000),
                headers: { "User-Agent": "JETBU-AI/2.0" },
              });
              if (!r.ok) return bad(`Không tải được (${r.status})`, 502);
              const html = await r.text();
              const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? url)
                .replace(/\s+/g, " ")
                .trim();
              return Response.json({
                title,
                content_md: `# ${title}\n\n- **URL:** ${url}\n- **Tải lúc:** ${new Date().toISOString()}\n\n---\n\n${core.htmlToMd(html).slice(0, 60_000)}`,
              });
            }
            case "save_md": {
              if (!b["title"] || !b["content_md"]) return bad("Thiếu tiêu đề hoặc nội dung.");
              return Response.json(
                await core.saveMd({
                  company_code: company,
                  category: String(b["category"] ?? "nao_bo_2"),
                  title: String(b["title"]),
                  content_md: String(b["content_md"]),
                  source_type: b["source_type"],
                  source_url: b["source_url"] ?? null,
                  source_name: b["source_name"] ?? null,
                  tags: b["tags"],
                  verified_by: b["verified_by"],
                }),
              );
            }
            case "kho_titles":
              return Response.json({ titles: await core.listKhoTitles(company) });
            case "propose_works":
              return Response.json(await core.proposeWorks(company));
            /* ---------- Nhánh 4 ---------- */
            case "daily_news":
              return Response.json(await core.dailyWorldNews(company));
            case "legal": {
              if (!b["question"]) return bad("Thiếu câu hỏi pháp lý.");
              return Response.json(
                await core.legalResearch({
                  question: String(b["question"]).slice(0, 6000),
                  company,
                  jurisdiction: b["jurisdiction"],
                }),
              );
            }
            /* ---------- Nhánh 5: biên bản họp ---------- */
            case "save_meeting": {
              if (!Array.isArray(b["segments"]) || !b["segments"].length)
                return bad("Chưa có nội dung ghi âm.");
              return Response.json(
                await core.saveMeeting({
                  title: String(b["title"] ?? "Cuộc họp"),
                  company,
                  segments: b["segments"],
                  mode: b["mode"] === "summary" ? "summary" : "full",
                  duration_sec: Number(b["duration_sec"] ?? 0),
                }),
              );
            }
            /* ---------- Nhánh 1: trạng thái cổng AI (không lộ khóa) ---------- */
            case "gateways_status": {
              const gws = await core.loadGateways();
              return Response.json({
                active: gws.map((g) => ({
                  id: g.id,
                  name: g.name,
                  model: g.model,
                  source: g.source,
                  priority: g.priority,
                })),
              });
            }
            default:
              return bad("action không hợp lệ.");
          }
        } catch (e) {
          console.error("[jetbu-core-engine]", e);
          return bad(e instanceof Error ? e.message : "Lỗi máy chủ", 500);
        }
      },
    },
  },
});
