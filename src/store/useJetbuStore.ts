/**
 * useJetbuStore — Zustand + persist (localStorage) cho JETBU AI Rebirth 2026.
 * Lưu: nhánh đang mở, danh sách cổng AI (KHÔNG lưu api_key — chỉ 4 ký tự cuối), lịch sử chat,
 * nguồn đã chấp nhận (khóa nút chống lưu trùng), đề xuất tác phẩm đã duyệt, hàng đợi NotebookLM/Claude.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BranchId = "n1" | "n2" | "n3" | "n4" | "n5" | "n6" | "n7";
export const BRANCHES: { id: BranchId; label: string; short: string; emoji: string }[] = [
  { id: "n5", label: "Chat Bot & Cố vấn Admin", short: "Chat", emoji: "💬" },
  { id: "n1", label: "Smart AI Hub — Kết nối AI", short: "AI Hub", emoji: "🔌" },
  { id: "n2", label: "Bộ Não Thứ 2 & Kho .MD", short: "Bộ não", emoji: "🧠" },
  { id: "n3", label: "Sách & Công trình Lục Đạo", short: "Lục Đạo", emoji: "📚" },
  { id: "n4", label: "Thế Giới Trong Tay & Pháp Luật", short: "Tin tức", emoji: "🌍" },
  { id: "n6", label: "Google Drive 5TB & Mobile", short: "Drive", emoji: "📁" },
  { id: "n7", label: "Tính năng cũ (sub-menu)", short: "Cũ", emoji: "📦" },
];

export type GatewayLite = {
  id: string;
  name: string;
  model_id: string;
  base_url: string;
  key_last4: string | null;
  enabled: boolean;
  is_healthy: boolean;
  last_error?: string | null;
  source: "db" | "env";
};
export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tier?: number | undefined;
  citations?: { kind: string; title: string; ref: string; source: string }[] | undefined;
  verified_by?: string[] | undefined;
  ai_name?: string | undefined;
  at: number;
};
export type Proposal = {
  title: string;
  topic: string;
  rationale: string;
  linked_files: string[];
  approved?: boolean;
};
export type NotebookItem = {
  id: string;
  source: "notebooklm" | "claude";
  title: string;
  content: string;
  at: number;
  saved?: boolean;
};

type State = {
  branch: BranchId;
  setBranch: (b: BranchId) => void;
  gateways: GatewayLite[];
  setGateways: (g: GatewayLite[]) => void;
  chat: ChatMsg[];
  pushChat: (m: ChatMsg) => void;
  updateChat: (id: string, patch: Partial<ChatMsg>) => void;
  clearChat: () => void;
  advisor: ChatMsg[];
  pushAdvisor: (m: ChatMsg) => void;
  clearAdvisor: () => void;
  acceptedSources: Record<string, string>; // url → file_name đã lưu (khóa nút)
  markAccepted: (url: string, file: string) => void;
  proposals: Proposal[];
  setProposals: (p: Proposal[]) => void;
  approveProposal: (title: string) => void;
  pendingTopic: string | null; // Bộ não 3D [Duyệt] → Nhánh 3
  setPendingTopic: (t: string | null) => void;
  pendingDocIds: string[]; // sách Kho đi kèm đề tài → Hội đồng
  setPendingDocIds: (ids: string[]) => void;
  notebook: NotebookItem[];
  pushNotebook: (n: NotebookItem) => void;
  markNotebookSaved: (id: string) => void;
  lastNewsAt: string | null;
  setLastNewsAt: (d: string) => void;
  reset: () => void;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const newMsg = (
  role: ChatMsg["role"],
  content: string,
  extra?: Partial<ChatMsg>,
): ChatMsg => ({ id: uid(), role, content, at: Date.now(), ...extra });

const initial = {
  branch: "n5" as BranchId,
  gateways: [] as GatewayLite[],
  chat: [] as ChatMsg[],
  advisor: [] as ChatMsg[],
  acceptedSources: {} as Record<string, string>,
  proposals: [] as Proposal[],
  pendingTopic: null as string | null,
  pendingDocIds: [] as string[],
  notebook: [] as NotebookItem[],
  lastNewsAt: null as string | null,
};

export const useJetbuStore = create<State>()(
  persist(
    (set) => ({
      ...initial,
      setBranch: (branch) => set({ branch }),
      setGateways: (gateways) => set({ gateways }),
      pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-200) })),
      updateChat: (id, patch) =>
        set((s) => ({ chat: s.chat.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      clearChat: () => set({ chat: [] }),
      pushAdvisor: (m) => set((s) => ({ advisor: [...s.advisor, m].slice(-200) })),
      clearAdvisor: () => set({ advisor: [] }),
      markAccepted: (url, file) =>
        set((s) => ({ acceptedSources: { ...s.acceptedSources, [url]: file } })),
      setProposals: (proposals) => set({ proposals }),
      approveProposal: (title) =>
        set((s) => ({
          proposals: s.proposals.map((p) => (p.title === title ? { ...p, approved: true } : p)),
        })),
      setPendingTopic: (pendingTopic) => set({ pendingTopic }),
      setPendingDocIds: (pendingDocIds) => set({ pendingDocIds: [...new Set(pendingDocIds)].slice(0, 10) }),
      pushNotebook: (n) => set((s) => ({ notebook: [n, ...s.notebook].slice(0, 100) })),
      markNotebookSaved: (id) =>
        set((s) => ({
          notebook: s.notebook.map((n) => (n.id === id ? { ...n, saved: true } : n)),
        })),
      setLastNewsAt: (lastNewsAt) => set({ lastNewsAt }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "jetbu-rebirth-2026",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage)
          : window.localStorage,
      ),
      partialize: (s) => ({
        branch: s.branch,
        gateways: s.gateways,
        chat: s.chat,
        advisor: s.advisor,
        acceptedSources: s.acceptedSources,
        proposals: s.proposals,
        pendingTopic: s.pendingTopic,
        pendingDocIds: s.pendingDocIds,
        notebook: s.notebook,
        lastNewsAt: s.lastNewsAt,
      }),
    },
  ),
);
