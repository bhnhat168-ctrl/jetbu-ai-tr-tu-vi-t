<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- All AI text calls go through src/lib/brain.server.ts, which tries providers in order with auto-fallback (picked model → OpenRouter → Groq → Gemini → Lovable AI); keys come from secrets plus write-only runtime overrides from Admin Tab 5, never sent to the browser; why: one place for the 5-step/council rules and provider choice. No Supabase Edge Functions (TanStack server routes instead).
- JETBU Rebirth 2026: mọi tính năng mới (3-Tier Truth Protocol, Auto-Failover AI Hub, Hội đồng Lục Đạo, tìm nguồn/.md, tin tức, pháp luật, ghi âm họp, cố vấn) nằm trong src/lib/jetbu-core.server.ts, đi ra ngoài qua 1 route duy nhất src/routes/api/jetbu-core-engine.ts (POST {action}) và server functions src/lib/jetbu.functions.ts (cổng AI). Bảng mới (ai_api_gateways, knowledge_md_store, books_luc_dao, daily_world_news, legal_knowledge, meeting_transcripts, admin_advisor_logs) do migration supabase/migrations/20261023000000_jetbu_rebirth_2026.sql tạo; trình duyệt đọc qua src/lib/jetbu-client.ts (client không kiểu cho tới khi types.ts được sinh lại). Khóa API của cổng AI chỉ nằm trong ai_api_gateways phía máy chủ (view ai_api_gateways_public cho trình duyệt). Trạng thái UI 7 nhánh: src/store/useJetbuStore.ts (zustand persist). Tính năng cũ giữ nguyên route, gom vào sub-menu 📦 (src/components/AppShell.tsx → LEGACY); trang chat cũ chuyển sang /khong-gian-ai. Không tạo Supabase Edge Function cho các tính năng này.
