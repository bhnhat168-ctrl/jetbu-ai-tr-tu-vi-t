import { useWorkspace } from "@/lib/workspace-store";

export function ComingSoon({ title, desc }: { title: string; desc: string }) {
  const { company } = useWorkspace();
  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-primary">{company?.name ?? "Chưa chọn công ty"}</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{desc}</p>
        <p className="mt-6 rounded-xl bg-secondary p-4 text-base">Phân hệ này sẽ được xây dựng ở bước tiếp theo.</p>
      </div>
    </div>
  );
}
