import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, MapPin, ScanText, PenLine, Loader2, X, Eraser, Download, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace-store";
import { sha256Hex, stampLines, signaturePayload } from "@/lib/field-hub";

export const Route = createFileRoute("/di-dong")({
  head: () => ({ meta: [
    { title: "Ứng dụng Di động Thực địa — JETBU AI" },
    { name: "description", content: "Điểm danh camera trực tiếp kèm GPS, quét giấy tờ OCR bằng AI và ký tên điện tử chống giả mạo." },
    { property: "og:title", content: "Ứng dụng Di động Thực địa — JETBU AI" },
    { property: "og:description", content: "Điểm danh camera trực tiếp kèm GPS, quét giấy tờ OCR bằng AI và ký tên điện tử chống giả mạo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MobileHardwareHub,
});

const TABS = [
  { id: "checkin", label: "Điểm danh GPS", icon: MapPin },
  { id: "ocr", label: "Quét giấy tờ OCR", icon: ScanText },
  { id: "sign", label: "Ký tên Điện tử", icon: PenLine },
] as const;

function MobileHardwareHub() {
  const { sessionKey } = useWorkspace();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("checkin");
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">Ứng dụng Di động Thực địa</h1>
        <p className="text-muted-foreground">Mobile Hardware Hub — chạy trực tiếp trên trình duyệt điện thoại và máy tính.</p>
      </header>
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-base font-semibold md:text-lg ${tab === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            <t.icon className="h-6 w-6" />{t.label}
          </button>
        ))}
      </div>
      {tab === "checkin" && <CheckIn key={sessionKey} />}
      {tab === "ocr" && <Ocr key={sessionKey} />}
      {tab === "sign" && <ESign key={sessionKey} />}
    </div>
  );
}

/** Live camera only — no gallery picker. Returns a canvas snapshot. */
function LiveCamera({ onCapture, onClose }: { onCapture: (c: HTMLCanvasElement) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Trình duyệt không hỗ trợ camera trực tiếp (cần HTTPS).");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch (e) {
        setErr(e instanceof Error && e.name === "NotAllowedError" ? "Bạn đã từ chối quyền camera. Hãy cho phép camera trong cài đặt trình duyệt." : (e as Error).message);
      }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1280 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    onCapture(c);
  };
  return (
    <div className="space-y-3 rounded-2xl bg-white p-3 shadow-sm">
      {err ? <p className="rounded-lg bg-destructive/10 p-3 text-destructive">{err}</p> : (
        <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full rounded-xl bg-muted object-cover md:aspect-video" />
      )}
      <div className="flex gap-2">
        <button onClick={snap} disabled={!!err} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-xl font-bold text-primary-foreground disabled:opacity-50">
          <Camera className="h-6 w-6" /> Chụp ngay
        </button>
        <button onClick={onClose} className="rounded-xl border px-4 text-lg"><X className="h-6 w-6" /></button>
      </div>
    </div>
  );
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("Thiết bị không hỗ trợ GPS."));
    navigator.geolocation.getCurrentPosition(res, (e) => rej(new Error(e.code === 1 ? "Bạn đã từ chối quyền vị trí. Điểm danh bắt buộc có GPS." : "Không lấy được vị trí GPS, thử lại ngoài trời.")), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

function CheckIn() {
  const { company } = useWorkspace();
  const [staff, setStaff] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [pos, setPos] = useState<GeolocationPosition | null>(null);

  const start = async () => {
    if (!company) { toast.error("Hãy chọn công ty trước."); return; }
    if (!staff.trim()) { toast.error("Nhập họ tên nhân viên."); return; }
    setPhoto(null);
    try { setPos(await getPosition()); setOpen(true); } catch (e) { toast.error((e as Error).message); }
  };

  const capture = async (c: HTMLCanvasElement) => {
    if (!company || !pos) return;
    setOpen(false);
    setBusy(true);
    try {
      const fresh = await getPosition().catch(() => pos);
      const ctx = c.getContext("2d")!;
      const lines = stampLines({ lat: fresh.coords.latitude, lng: fresh.coords.longitude, accuracy: fresh.coords.accuracy, at: new Date(), companyName: company.name, staff: staff.trim() });
      const fs = Math.max(16, Math.round(c.width / 38));
      const pad = fs * 0.6;
      const boxH = lines.length * fs * 1.35 + pad * 2;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, c.height - boxH, c.width, boxH);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.textBaseline = "top";
      lines.forEach((l, i) => ctx.fillText(l, pad, c.height - boxH + pad + i * fs * 1.35));
      const data = c.toDataURL("image/jpeg", 0.72);
      setPhoto(data);
      const { error } = await supabase.from("gps_checkins").insert({
        company_code: company.code, staff_name: staff.trim(),
        latitude: fresh.coords.latitude, longitude: fresh.coords.longitude, photo_data: data,
      });
      if (error) throw error;
      toast.success("Đã điểm danh và lưu vào hệ thống!");
    } catch (e) {
      toast.error("Lưu điểm danh thất bại: " + (e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold">Điểm danh Thực địa Bắt buộc Camera & GPS</h2>
      <p className="text-muted-foreground">Chỉ chụp trực tiếp bằng ống kính — không cho chọn ảnh có sẵn trong máy. Tọa độ, giờ và tên công ty được in đè lên ảnh.</p>
      <input value={staff} onChange={(e) => setStaff(e.target.value)} maxLength={120} placeholder="Họ tên nhân viên"
        className="w-full rounded-xl border px-4 py-3 text-lg" />
      {!open && (
        <button onClick={start} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-xl font-bold text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />} Mở Camera Điểm danh
        </button>
      )}
      {open && <LiveCamera onCapture={capture} onClose={() => setOpen(false)} />}
      {photo && <img src={photo} alt="Ảnh điểm danh đã đóng dấu GPS" className="w-full rounded-xl border" />}
    </section>
  );
}

type OcrResult = { doc_type: string; fields: { label: string; value: string }[]; raw_text: string };

function Ocr() {
  const { company } = useWorkspace();
  const [kind, setKind] = useState("invoice");
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<OcrResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async (dataUrl: string) => {
    setImg(dataUrl); setRes(null); setBusy(true);
    abortRef.current = new AbortController();
    try {
      const r = await fetch("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl, kind }), signal: abortRef.current.signal });
      if (!r.ok || !r.body) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "AI không phản hồi.");
      const reader = r.body.getReader(); const dec = new TextDecoder(); let txt = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; txt += dec.decode(value, { stream: true }); }
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI không đọc được giấy tờ.");
      setRes(JSON.parse(m[0]) as OcrResult);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold">Quét giấy tờ thông minh (OCR)</h2>
      <div className="grid grid-cols-3 gap-2">
        {[["invoice", "Hóa đơn"], ["contract", "Hợp đồng"], ["cccd", "CCCD"]].map(([k, l]) => (
          <button key={k} onClick={() => setKind(k ?? "invoice")} className={`rounded-xl border py-3 text-lg font-semibold ${kind === k ? "border-primary bg-primary/10 text-primary" : ""}`}>{l}</button>
        ))}
      </div>
      {!open && (
        <button onClick={() => { if (!company) { toast.error("Hãy chọn công ty trước."); return; } setOpen(true); }} disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-xl font-bold text-primary-foreground disabled:opacity-50">
          <Camera className="h-6 w-6" /> Chụp giấy tờ
        </button>
      )}
      {open && <LiveCamera onCapture={(c) => { setOpen(false); void run(c.toDataURL("image/jpeg", 0.85)); }} onClose={() => setOpen(false)} />}
      {img && <img src={img} alt="Ảnh giấy tờ" className="max-h-72 w-full rounded-xl border object-contain" />}
      {busy && <p className="flex items-center gap-2 text-lg"><Loader2 className="h-5 w-5 animate-spin" /> AI đang đọc chữ…</p>}
      {res && (
        <div className="space-y-3">
          <p className="font-semibold">Loại: {res.doc_type}</p>
          <div className="space-y-2">
            {res.fields.map((f, i) => (
              <label key={i} className="block rounded-xl border p-3">
                <span className="text-sm text-muted-foreground">{f.label}</span>
                <input value={f.value} onChange={(e) => setRes({ ...res, fields: res.fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-lg" />
              </label>
            ))}
          </div>
          <details><summary className="cursor-pointer text-muted-foreground">Toàn bộ chữ đọc được</summary><pre className="whitespace-pre-wrap text-sm">{res.raw_text}</pre></details>
          <p className="text-sm text-muted-foreground">Kết quả do AI đọc — hãy kiểm tra lại trước khi sử dụng.</p>
        </div>
      )}
    </section>
  );
}

function ESign() {
  const { company } = useWorkspace();
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [signer, setSigner] = useState("");
  const [seal, setSeal] = useState<{ code: string; at: string; png: string } | null>(null);

  useEffect(() => {
    const c = ref.current!; const r = c.getBoundingClientRect(); const d = window.devicePixelRatio || 1;
    c.width = r.width * d; c.height = r.height * d;
    const ctx = c.getContext("2d")!; ctx.scale(d, d); ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0b1f3a";
  }, []);

  const pt = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  const down = (e: React.PointerEvent) => { if (seal) return; ref.current!.setPointerCapture(e.pointerId); drawing.current = true; const ctx = ref.current!.getContext("2d")!; const [x, y] = pt(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const ctx = ref.current!.getContext("2d")!; const [x, y] = pt(e); ctx.lineTo(x, y); ctx.stroke(); setHasInk(true); };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setHasInk(false); setSeal(null); };

  const finalize = async () => {
    if (!company) { toast.error("Hãy chọn công ty trước."); return; }
    if (!signer.trim() || !hasInk) { toast.error("Nhập họ tên và ký vào khung."); return; }
    const png = ref.current!.toDataURL("image/png");
    const at = new Date().toISOString();
    const code = await sha256Hex(signaturePayload({ png, signer: signer.trim(), at, companyCode: company.code }));
    setSeal({ code, at, png });
    toast.success("Đã khóa chữ ký và tạo mã bảo mật.");
  };

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold">Bảng Ký tên Điện tử (E-Sign)</h2>
      <input value={signer} onChange={(e) => setSigner(e.target.value)} disabled={!!seal} placeholder="Họ tên người ký" className="w-full rounded-xl border px-4 py-3 text-lg" />
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="h-56 w-full touch-none rounded-xl border-2 border-dashed bg-white" aria-label="Khung ký tên" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={clear} className="flex items-center justify-center gap-2 rounded-xl border py-4 text-lg font-semibold"><Eraser className="h-5 w-5" /> Ký lại</button>
        <button onClick={finalize} disabled={!!seal} className="flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-50"><ShieldCheck className="h-5 w-5" /> Xác nhận chữ ký</button>
      </div>
      {seal && (
        <div className="space-y-2 rounded-xl border border-primary bg-primary/5 p-4">
          <p className="font-semibold">Mã bảo mật chống làm giả (SHA-256)</p>
          <code className="block break-all text-sm">{seal.code}</code>
          <p className="text-sm text-muted-foreground">{signer} · {company?.name} · {new Date(seal.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Mọi thay đổi trên chữ ký, tên hoặc thời gian sẽ cho ra mã khác.</p>
          <a href={seal.png} download={`chu-ky_${seal.code.slice(0, 12)}.png`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"><Download className="h-4 w-4" /> Tải ảnh chữ ký</a>
        </div>
      )}
    </section>
  );
}
