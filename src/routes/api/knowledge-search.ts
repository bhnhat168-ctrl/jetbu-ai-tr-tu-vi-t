import { createFileRoute } from "@tanstack/react-router";

export type Hit = { title: string; content: string; citation: string; url: string };

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function get(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, headers: { "User-Agent": "JETBU-AI/1.0", Accept: "application/json", ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`Nguồn trả lỗi ${r.status}`);
  return r.json();
}

async function search(source: string, q: string): Promise<Hit[]> {
  const e = encodeURIComponent(q);
  if (source === "suttacentral") {
    const d = await get(`https://suttacentral.net/api/search/instant?query=${e}&lang=en&limit=8`);
    return (d.hits ?? []).slice(0, 8).map((h: Record<string, any>) => ({
      title: `${h.acronym ?? ""} ${h.name ?? h.heading?.title ?? ""}`.trim(),
      content: strip((h.highlight?.content ?? []).join(" … ")) || h.root_name || "",
      citation: `SuttaCentral ${h.acronym ?? h.uid}${h.author ? `, bản dịch ${h.author}` : ""}`,
      url: `https://suttacentral.net${h.url ?? `/${h.uid}`}`,
    }));
  }
  if (source === "sefaria") {
    const d = await get("https://www.sefaria.org/api/search-wrapper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, type: "text", size: 8 }) });
    return (d.hits?.hits ?? []).map((h: Record<string, any>) => {
      const ref = String(h._source?.ref ?? h._id).replace(/\s*\(.*\)\s*$/, "");
      return { title: ref, content: strip((h.highlight?.exact ?? h.highlight?.naive_lemmatizer ?? []).join(" … ")), citation: `Sefaria — ${ref}`, url: `https://www.sefaria.org/${encodeURIComponent(ref.replace(/ /g, "_"))}` };
    });
  }
  if (source === "wikidata") {
    const d = await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${e}&language=vi&uselang=vi&format=json&limit=8`);
    return (d.search ?? []).map((h: Record<string, any>) => ({ title: h.label ?? h.id, content: h.description ?? "", citation: `Wikidata ${h.id}`, url: `https://www.wikidata.org/wiki/${h.id}` }));
  }
  if (source === "nobel") {
    const d = await get(`https://api.nobelprize.org/2.1/laureates?name=${e}&limit=8`);
    return (d.laureates ?? []).map((l: Record<string, any>) => {
      const name = l.knownName?.en ?? l.orgName?.en ?? l.fullName?.en ?? "";
      const prizes = (l.nobelPrizes ?? []).map((p: Record<string, any>) => `${p.awardYear} – ${p.category?.en}: ${p.motivation?.en ?? ""}`).join("; ");
      return { title: name, content: prizes, citation: `Nobel Prize API — laureate #${l.id}`, url: l.wikipedia?.english ?? `https://www.nobelprize.org` };
    });
  }
  throw new Error("Nguồn không hỗ trợ");
}

export const Route = createFileRoute("/api/knowledge-search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const q = (u.searchParams.get("q") ?? "").trim().slice(0, 200);
        const source = u.searchParams.get("source") ?? "";
        if (!q) return Response.json({ error: "Nhập từ khóa tìm kiếm." }, { status: 400 });
        try {
          return Response.json({ hits: await search(source, q) });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Lỗi nguồn dữ liệu" }, { status: 502 });
        }
      },
    },
  },
});
