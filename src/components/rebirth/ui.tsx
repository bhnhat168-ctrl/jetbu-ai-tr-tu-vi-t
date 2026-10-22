import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ReactNode } from "react";

export const box = "rounded-2xl bg-card p-4 text-card-foreground shadow-sm md:p-5";
export const input = "w-full rounded-xl border border-input bg-background px-3 py-3 text-base";
export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";
export const btnOutline =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary px-4 py-3 text-base font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-50";
export const btnSoft =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-50";

export function Section({
  title,
  icon,
  children,
  right,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className={box}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold md:text-xl">
          {icon}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Spin({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? "Đang xử lý..."}
    </span>
  );
}

export function Md({ children }: { children: string }) {
  return (
    <div className="jetbu-md text-base text-foreground">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "ok" | "warn" | "bad";
}) {
  const c =
    tone === "ok"
      ? "bg-primary/15 text-primary"
      : tone === "warn"
        ? "bg-warning/20 text-warning-foreground"
        : tone === "bad"
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}

export function Citations({
  items,
  verifiedBy,
  tier,
}: {
  items?: { kind: string; title: string; ref: string; source: string }[] | undefined;
  verifiedBy?: string[] | undefined;
  tier?: number | undefined;
}) {
  if (!items?.length && !verifiedBy?.length) return null;
  return (
    <details className="mt-2 rounded-lg bg-secondary/60 p-2 text-xs">
      <summary className="cursor-pointer font-semibold">
        Căn cứ · Tầng {tier ?? 1}
        {verifiedBy?.length ? ` · kiểm chứng bởi ${verifiedBy.join(", ")}` : ""}
      </summary>
      <ul className="mt-1 space-y-1">
        {items?.map((c, i) => (
          <li key={i} className="break-all">
            {c.kind === "internal" ? "📄" : "🌐"} <b>{c.title}</b> —{" "}
            {c.kind === "internal" ? (
              <code>{c.ref}</code>
            ) : (
              <a className="underline" href={c.ref} target="_blank" rel="noreferrer">
                {c.ref}
              </a>
            )}{" "}
            <i>({c.source})</i>
          </li>
        ))}
      </ul>
    </details>
  );
}
