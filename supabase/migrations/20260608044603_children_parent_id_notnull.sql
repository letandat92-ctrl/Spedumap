-- 20260608044603_children_parent_id_notnull.sql
-- Đóng lỗ orphan children: xoá test row parent_id IS NULL, enforce NOT NULL.
-- Migration đã áp qua MCP. File này track vào repo, KHÔNG db push lại.

-- 1. Xoá orphan test rows (parent_id IS NULL — chỉ tồn tại trong data test)
DELETE FROM public.children WHERE parent_id IS NULL;

-- 2. Enforce NOT NULL
ALTER TABLE public.children ALTER COLUMN parent_id SET NOT NULL;
