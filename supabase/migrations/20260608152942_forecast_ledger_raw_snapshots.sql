-- 20260608152942_forecast_ledger_raw_snapshots.sql
-- Thêm 2 cột snapshot vào forecast_ledger để capture raw state tại goal-lock.
-- baseline_snapshot: block scores {block:score} tại thời điểm lock — dùng để replay forecast.
-- velocity_snapshot: NULL giờ (chưa đủ lịch sử); Forecast B set sau khi có cycle data.
-- Migration đã áp qua MCP. File track repo, KHÔNG db push lại.

ALTER TABLE public.forecast_ledger
  ADD COLUMN IF NOT EXISTS baseline_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS velocity_snapshot jsonb;
