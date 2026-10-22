import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FolderTree, HardDrive, Smartphone, Download, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace-store";
import { CATEGORIES, downloadText, listMd, mdStats, todayVN } from "@/lib/jetbu-client";
import { Section, Spin, Tag, btnOutline, btnPrimary, btnSoft } from "./ui";
import { DocRow } from "./Nhanh2BoNao";

export function Nhanh6Drive() {
  const { company } = useWorkspace();
  const [cat, setCat] = useState<string>("nao_bo_2");
  const [busy, setBusy] = useState(false);
  const { data: stats = [] } = useQuery({
    queryKey: ["md-stats", company?.code],
    queryFn: () => mdStats(company?.code),
  });
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["md", company?.code, cat, ""],
    queryFn: () =>
      listMd({ ...(company ? { company: company.code } : {}), category: cat, limit: 100 }),
  });
  const { data: quota } = useQuery({
    queryKey: ["quota", company?.id],
    enabled: !!company,
    queryFn: async () =>
      (
        await supabase
          .from("companies")
          .select("storage_quota_gb, drive_folder_id, drive_root_folder_id")
          .eq("id", company!.id)
          .single()
      ).data,
  });
  const total = stats.reduce((a, s) => a + Number(s.docs), 0),
    words = stats.reduce((a, s) => a + Number(s.words), 0);

  const exportFolder = async () => {
    if (!docs.length) {
      toast.warning("Thư mục trống.");
      return;
    }
    setBusy(true);
    try {
      const folder = CATEGORIES.find((c) => c.id === cat)!.folder;
      const pack =
        `# ${folder}\n\nXuất lúc ${new Date().toLocaleString("vi-VN")} · ${docs.length} file\n` +
        docs
          .map((d) => `\n\n<!-- ===== ${folder}/${d.file_name} ===== -->\n${d.content_md}`)
          .join("");
      downloadText(`${todayVN()}_${folder}.md`, pack);
      toast.success("Đã xuất gói .md của thư mục — thả vào Google Drive cùng tên.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Section
          title="Google Drive 5TB — cây thư mục Tiếng Việt"
          icon={<FolderTree className="h-5 w-5 text-primary" />}
          right={
            <Tag>
              {total} file · {words.toLocaleString("vi-VN")} từ
            </Tag>
          }
        >
          <ul className="space-y-1">
            {CATEGORIES.map((c) => {
              const s = stats.find((x) => x.category === c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCat(c.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${cat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                  >
                    <span>
                      📁 <code>{c.folder}/</code>
                    </span>
                    <span className="text-xs opacity-80">{Number(s?.docs ?? 0)} file</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 rounded-lg bg-secondary p-3 text-xs">
            Hạn mức Drive của {company?.code ?? "..."}: <b>{quota?.storage_quota_gb ?? "…"} GB</b> ·
            Thư mục gốc:{" "}
            <b>{quota?.drive_root_folder_id || quota?.drive_folder_id || "chưa cấu hình"}</b>. Tên
            file tự đặt theo mẫu <code>NGÀY_tieu_de_khong_dau.md</code>; mọi sách, bản tin, pháp
            luật, biên bản họp tự động nằm đúng thư mục.
          </p>
        </Section>
        <Section
          title="Kết nối Google Drive (OAuth)"
          icon={<HardDrive className="h-5 w-5 text-primary" />}
        >
          <p className="text-sm text-muted-foreground">
            Dự án giữ nguyên cấu hình Drive cũ. Đồng bộ tự động 2 chiều cần Google OAuth — khi được
            bật, nút “Đồng bộ” sẽ đẩy thẳng từng thư mục lên Drive; hiện tại dùng “Xuất gói .md” rồi
            thả vào thư mục cùng tên.
          </p>
          <div className="mt-2 grid gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || isLoading}
              onClick={exportFolder}
            >
              {busy ? (
                <Spin />
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Xuất gói .md thư mục đang chọn
                </>
              )}
            </button>
            <button
              type="button"
              className={btnOutline}
              onClick={() =>
                toast.info(
                  "Bật Google Drive OAuth: trong Lovable nhắn 1 câu “Kết nối Google Drive OAuth, ghi file .md vào thư mục theo category” — hoặc tạm dùng Xuất gói .md.",
                )
              }
            >
              <Link2 className="h-5 w-5" />
              Đồng bộ Drive (cần OAuth)
            </button>
          </div>
        </Section>
        <Section title="Mobile-First 100%" icon={<Smartphone className="h-5 w-5 text-primary" />}>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              Thanh điều hướng đáy 7 nhánh, nút tối thiểu 44px, không ẩn tính năng nào so với máy
              tính.
            </li>
            <li>
              Ghi âm họp, cố vấn giọng nói, chụp/tải file, chia sẻ file qua Zalo/Email đều chạy trên
              điện thoại.
            </li>
            <li>
              Check-in Camera GPS thực địa & OCR vẫn ở <b>📦 Tính năng cũ → Ứng dụng Di động</b>.
            </li>
          </ul>
        </Section>
      </div>
      <div className="lg:col-span-3">
        <Section
          title={`📁 ${CATEGORIES.find((c) => c.id === cat)?.folder}/`}
          icon={<FolderTree className="h-5 w-5 text-primary" />}
          right={
            <button type="button" className={btnSoft} onClick={exportFolder}>
              <Download className="h-4 w-4" />
              Gói .md
            </button>
          }
        >
          {isLoading && <Spin />}
          <ul className="max-h-[75vh] space-y-2 overflow-y-auto">
            {docs.map((d) => (
              <DocRow key={d.id} d={d} />
            ))}
            {!isLoading && !docs.length && (
              <li className="text-sm text-muted-foreground">Thư mục trống.</li>
            )}
          </ul>
        </Section>
      </div>
    </div>
  );
}
