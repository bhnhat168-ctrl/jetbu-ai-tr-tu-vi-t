import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
export type Company = { id: string; name: string; code: string };
export type Task = { id: string; text: string; done: boolean };

type WorkspaceState = {
  company: Company | null;
  messages: ChatMessage[];
  canvasText: string;
  draftInput: string;
  tasks: Task[];
  sessionKey: number;
  setMessages: (fn: (m: ChatMessage[]) => ChatMessage[]) => void;
  setCanvasText: (t: string) => void;
  setDraftInput: (t: string) => void;
  setTasks: (fn: (t: Task[]) => Task[]) => void;
  switchCompany: (c: Company) => void;
};

const defaultTasks = (): Task[] => [
  { id: "t1", text: "Duyệt báo cáo tài chính tuần", done: false },
  { id: "t2", text: "Họp giao ban Ban Giám đốc 9:00", done: false },
  { id: "t3", text: "Rà soát hợp đồng nhà cung cấp", done: false },
];

const Ctx = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [messages, setMessagesState] = useState<ChatMessage[]>([]);
  const [canvasText, setCanvasText] = useState("");
  const [draftInput, setDraftInput] = useState("");
  const [tasks, setTasksState] = useState<Task[]>(defaultTasks);
  const [sessionKey, setSessionKey] = useState(0);

  const setMessages = useCallback((fn: (m: ChatMessage[]) => ChatMessage[]) => setMessagesState(fn), []);
  const setTasks = useCallback((fn: (t: Task[]) => Task[]) => setTasksState(fn), []);

  // Switching company wipes every piece of on-screen temporary data synchronously.
  const switchCompany = useCallback((c: Company) => {
    setCompany(c);
    setMessagesState([]);
    setCanvasText("");
    setDraftInput("");
    setTasksState(defaultTasks());
    setSessionKey((k) => k + 1);
  }, []);

  return (
    <Ctx.Provider
      value={{ company, messages, canvasText, draftInput, tasks, sessionKey, setMessages, setCanvasText, setDraftInput, setTasks, switchCompany }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be inside WorkspaceProvider");
  return v;
}
