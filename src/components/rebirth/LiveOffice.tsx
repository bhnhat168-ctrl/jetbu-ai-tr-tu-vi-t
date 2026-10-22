/**
 * [Mục 6] Live Office — mở & chỉnh sửa Word (.docx), Excel (.xlsx), PDF ngay trên web, có [Lưu lại] và [Chia sẻ].
 * Thư viện nạp theo nhu cầu từ esm.sh (không tăng bundle): mammoth (đọc docx), docx (ghi docx), xlsx (SheetJS), pdfjs (đọc PDF).
 * PDF là định dạng in cố định → sau khi sửa, lưu lại dưới dạng Word/.md (ghi rõ cho Admin).
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, FileType2, Save, Share2, Upload, Brain } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";
import { core, downloadBlob, esm, viSlug, type Loose } from "@/lib/jetbu-client";
import { Section, Spin, Tag, btnOutline, btnPrimary, btnSoft, input } from "./ui";

type Kind = "docx" | "xlsx" | "pdf" | null;

async function makeDocx(root: HTMLElement | null, fallbackText: string): Promise<Blob> {
  const d = await esm<Loose>("https://esm.sh/docx@9.5.0");
  const paras: unknown[] = [];
  const push = (text: string, level?: unknown, bold = false) =>
    paras.push(
      new d.Paragraph({
        ...(level ? { heading: level } : {}),
        children: [new d.TextRun({ text, bold, font: "Times New Roman", size: 26 })],
      }),
    );
  if (root) {
    for (const el of Array.from(root.children) as HTMLElement[]) {
      const t = (el.innerText ?? "").trim();
      if (!t) continue;
      const tag = el.tagName;
      if (tag === "H1") push(t, d.HeadingLevel.HEADING_1, true);
      else if (tag === "H2") push(t, d.HeadingLevel.HEADING_2, true);
      else if (tag === "H3") push(t, d.HeadingLevel.HEADING_3, true);
      else if (tag === "UL" || tag === "OL")
        Array.from(el.querySelectorAll("li")).forEach((li) =>
          push(`• ${(li as HTMLElement).innerText.trim()}`),
        );
      else if (tag === "TABLE")
        Array.from(el.querySelectorAll("tr")).forEach((tr) =>
          push(
            Array.from(tr.querySelectorAll("td,th"))
              .map((c) => (c as HTMLElement).innerText.trim())
              .join(" | "),
          ),
        );
      else t.split("\n").forEach((line) => push(line));
    }
  } else fallbackText.split("\n").forEach((line) => push(line));
  const doc = new d.Document({ sections: [{ children: paras }] });
  return d.Packer.toBlob(doc);
}

export function LiveOffice() {
  const { company } = useWorkspace();
  const [kind, setKind] = useState<Kind>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[]>([]);
  const [si, setSi] = useState(0);
  const editor = useRef<HTMLDivElement>(null);

  const open = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setKind(null);
    setHtml("");
    setSheets([]);
    setPdfText("");
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    const ext = f.name.split(".").pop()?.toLowerCase();
    setName(f.name.replace(/\.[^.]+$/, ""));
    try {
      if (ext === "docx") {
        const m = await esm<Loose>("https://esm.sh/mammoth@1.8.0");
        const r = await m.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
        setHtml(r.value || "<p></p>");
        setKind("docx");
      } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const X = await esm<Loose>("https://esm.sh/xlsx@0.18.5");
        const wb = X.read(await f.arrayBuffer(), { type: "array" });
        setSheets(
          wb.SheetNames.map((n: string) => ({
            name: n,
            rows: (
              X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "" }) as unknown[][]
            ).map((r) => r.map((c) => String(c ?? ""))),
          })),
        );
        setSi(0);
        setKind("xlsx");
      } else if (ext === "pdf") {
        setPdfUrl(URL.createObjectURL(f));
        const pdfjs = await esm<Loose>("https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs";
        const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
        const out: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i);
          const c = await p.getTextContent();
          out.push(
            `--- Trang ${i} ---\n${c.items.map((it: { str?: string }) => it.str ?? "").join(" ")}`,
          );
        }
        setPdfText(out.join("\n\n"));
        setKind("pdf");
      } else toast.error("Hỗ trợ .docx, .xlsx/.xls/.csv, .pdf");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không mở được file");
    } finally {
      setBusy(false);
    }
  };

  const buildBlob = async (): Promise<{ blob: Blob; file: string } | null> => {
    if (kind === "docx")
      return { blob: await makeDocx(editor.current, ""), file: `${viSlug(name)}.docx` };
    if (kind === "xlsx") {
      const X = await esm<Loose>("https://esm.sh/xlsx@0.18.5");
      const wb = X.utils.book_new();
      sheets.forEach((s) =>
        X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31)),
      );
      const out = X.write(wb, { bookType: "xlsx", type: "array" });
      return {
        blob: new Blob([out], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        file: `${viSlug(name)}.xlsx`,
      };
    }
    if (kind === "pdf")
      return { blob: await makeDocx(null, pdfText), file: `${viSlug(name)}_da_sua.docx` };
    return null;
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await buildBlob();
      if (r) {
        downloadBlob(r.file, r.blob);
        toast.success(`Đã lưu ${r.file}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    setBusy(true);
    try {
      const r = await buildBlob();
      if (!r) return;
      const file = new File([r.blob], r.file, { type: r.blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        toast.success("Đã mở bảng chia sẻ");
      } else {
        downloadBlob(r.file, r.blob);
        toast.info(
          "Trình duyệt không hỗ trợ chia sẻ file trực tiếp — đã tải file để bạn gửi qua Zalo/Email.",
        );
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        toast.error(e instanceof Error ? e.message : "Lỗi chia sẻ");
    } finally {
      setBusy(false);
    }
  };
  const toKho = async () => {
    const text =
      kind === "docx"
        ? (editor.current?.innerText ?? "")
        : kind === "xlsx"
          ? sheets
              .map((s) => `## ${s.name}\n\n${s.rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}`)
              .join("\n\n")
          : pdfText;
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await core<{ file_name: string }>("save_md", {
        company: company?.code,
        category: "van_ban",
        title: name,
        content_md: `# ${name}\n\n- **Loại:** ${kind}\n- **Lưu lúc:** ${new Date().toISOString()}\n\n---\n\n${text}`,
        source_type: "upload",
        source_name: `${name}.${kind}`,
      });
      toast.success(`Đã nạp bản .md vào Kho: ${r.file_name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };
  const setCell = (r: number, c: number, v: string) =>
    setSheets((s) =>
      s.map((sh, i) =>
        i !== si
          ? sh
          : {
              ...sh,
              rows: sh.rows.map((row, ri) =>
                ri !== r ? row : row.map((cell, ci) => (ci === c ? v : cell)),
              ),
            },
      ),
    );

  return (
    <div className="space-y-4">
      <Section
        title="Live Office — mở & sửa Word / Excel / PDF trên web"
        icon={<FileType2 className="h-5 w-5 text-primary" />}
        right={<Tag>06_Tai_Lieu_Chinh_Sua_Word_Excel_PDF</Tag>}
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <label className={`${btnOutline} cursor-pointer`}>
            <Upload className="h-5 w-5" />
            Mở file .docx / .xlsx / .pdf
            <input
              type="file"
              accept=".docx,.xlsx,.xls,.csv,.pdf"
              className="hidden"
              onChange={(e) => open(e.target.files?.[0])}
            />
          </label>
          <button type="button" className={btnPrimary} disabled={!kind || busy} onClick={save}>
            <Save className="h-5 w-5" />
            Lưu lại
          </button>
          <button type="button" className={btnOutline} disabled={!kind || busy} onClick={share}>
            <Share2 className="h-5 w-5" />
            Chia sẻ
          </button>
          <button type="button" className={btnSoft} disabled={!kind || busy} onClick={toKho}>
            <Brain className="h-4 w-4" />
            Nạp vào Kho
          </button>
        </div>
        {kind && (
          <input
            className={`${input} mt-2`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên file khi lưu"
          />
        )}
        {busy && (
          <p className="mt-2">
            <Spin label="Đang xử lý tài liệu…" />
          </p>
        )}
      </Section>

      {kind === "docx" && (
        <Section
          title="Word (.docx) — gõ trực tiếp để sửa"
          icon={<FileText className="h-5 w-5 text-primary" />}
        >
          <div
            ref={editor}
            contentEditable
            suppressContentEditableWarning
            className="jetbu-md min-h-[50vh] rounded-xl border border-input bg-background p-4 outline-none focus:ring-2 focus:ring-primary"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Lưu lại sẽ xuất .docx (font Times New Roman 13) giữ tiêu đề, đoạn, danh sách và bảng
            dạng văn bản.
          </p>
        </Section>
      )}
      {kind === "xlsx" && sheets[si] && (
        <Section
          title="Excel (.xlsx) — sửa từng ô"
          icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
          right={
            <div className="flex gap-1 overflow-x-auto">
              {sheets.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSi(i)}
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${i === si ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          }
        >
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-border">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                {sheets[si].rows.slice(0, 500).map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-border p-0">
                        <input
                          className="w-full min-w-24 bg-transparent px-2 py-1"
                          value={cell}
                          onChange={(e) => setCell(r, c, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={btnSoft}
              onClick={() =>
                setSheets((s) =>
                  s.map((sh, i) =>
                    i === si
                      ? {
                          ...sh,
                          rows: [
                            ...sh.rows,
                            new Array(Math.max(1, sh.rows[0]?.length ?? 1)).fill(""),
                          ],
                        }
                      : sh,
                  ),
                )
              }
            >
              + Dòng
            </button>
            <button
              type="button"
              className={btnSoft}
              onClick={() =>
                setSheets((s) =>
                  s.map((sh, i) =>
                    i === si ? { ...sh, rows: sh.rows.map((r) => [...r, ""]) } : sh,
                  ),
                )
              }
            >
              + Cột
            </button>
            <span className="self-center text-xs text-muted-foreground">
              Hiển thị tối đa 500 dòng đầu; công thức được giữ dưới dạng giá trị.
            </span>
          </div>
        </Section>
      )}
      {kind === "pdf" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="PDF gốc" icon={<FileText className="h-5 w-5 text-primary" />}>
            {pdfUrl && (
              <iframe
                title="PDF"
                src={pdfUrl}
                className="h-[60vh] w-full rounded-xl border border-border"
              />
            )}
          </Section>
          <Section
            title="Văn bản trích xuất — sửa rồi Lưu lại (xuất .docx)"
            icon={<FileText className="h-5 w-5 text-primary" />}
          >
            <textarea
              className={`${input} min-h-[60vh] font-mono text-sm`}
              value={pdfText}
              onChange={(e) => setPdfText(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              PDF là định dạng in cố định nên bản sửa được lưu thành Word (.docx) để tiếp tục chỉnh
              và in lại.
            </p>
          </Section>
        </div>
      )}
    </div>
  );
}
