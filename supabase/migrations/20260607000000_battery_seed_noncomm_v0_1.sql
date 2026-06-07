-- 20260607000000_battery_seed_noncomm_v0_1.sql
-- Seed 20 milestone non-comm (battery v0.1, prior yếu — cờ TEST)
-- Nguồn: battery_footprint_noncomm_v0_1.md (đã duyệt)
-- 4 skill_family × 5 stage = 20 rows. star=true (✭). footprint Σw=1.
-- KHÔNG sửa logic; chỉ INSERT data.
-- Migration đã áp qua MCP; file này để track trong repo.

INSERT INTO public.milestone (code, skill_family, stage, star, footprint, is_active) VALUES

-- ── SKILL A: gross_motor ─────────────────────────────────────────────
('gross_s1', 'gross_motor', 1, true,
 '{"tone":{"theta":2.0,"w":0.35},"postural_control":{"theta":2.0,"w":0.35},"vestibular":{"theta":2.0,"w":0.30}}',
 true),
('gross_s2', 'gross_motor', 2, true,
 '{"gross_motor":{"theta":1.5,"w":0.50},"vestibular":{"theta":2.0,"w":0.30},"tone":{"theta":2.5,"w":0.20}}',
 true),
('gross_s3', 'gross_motor', 3, true,
 '{"gross_motor":{"theta":3.0,"w":0.50},"vestibular":{"theta":2.5,"w":0.25},"bilateral_coord":{"theta":2.0,"w":0.25}}',
 true),
('gross_s4', 'gross_motor', 4, true,
 '{"bilateral_coord":{"theta":3.0,"w":0.40},"postural_control":{"theta":3.0,"w":0.35},"vestibular":{"theta":3.0,"w":0.25}}',
 true),
('gross_s5', 'gross_motor', 5, true,
 '{"gross_motor":{"theta":3.5,"w":0.40},"postural_control":{"theta":3.5,"w":0.40},"bilateral_coord":{"theta":3.0,"w":0.20}}',
 true),

-- ── SKILL B: fine_motor ──────────────────────────────────────────────
('fine_s1', 'fine_motor', 1, true,
 '{"fine_motor":{"theta":1.5,"w":0.50},"visual":{"theta":2.0,"w":0.25},"tactile":{"theta":2.0,"w":0.25}}',
 true),
('fine_s2', 'fine_motor', 2, true,
 '{"fine_motor":{"theta":2.0,"w":0.45},"visual":{"theta":2.0,"w":0.30},"motor_planning":{"theta":2.0,"w":0.25}}',
 true),
('fine_s3', 'fine_motor', 3, true,
 '{"fine_motor":{"theta":2.5,"w":0.40},"motor_planning":{"theta":2.5,"w":0.30},"tactile":{"theta":2.5,"w":0.30}}',
 true),
('fine_s4', 'fine_motor', 4, true,
 '{"fine_motor":{"theta":3.0,"w":0.45},"motor_planning":{"theta":3.0,"w":0.30},"visual":{"theta":3.0,"w":0.25}}',
 true),
('fine_s5', 'fine_motor', 5, true,
 '{"fine_motor":{"theta":3.5,"w":0.45},"motor_planning":{"theta":3.5,"w":0.30},"visual":{"theta":3.0,"w":0.25}}',
 true),

-- ── SKILL C: daily_living ────────────────────────────────────────────
('daily_s1', 'daily_living', 1, true,
 '{"daily_living":{"theta":1.5,"w":0.60},"fine_motor":{"theta":1.5,"w":0.40}}',
 true),
('daily_s2', 'daily_living', 2, true,
 '{"daily_living":{"theta":2.0,"w":0.60},"fine_motor":{"theta":2.0,"w":0.40}}',
 true),
('daily_s3', 'daily_living', 3, true,
 '{"daily_living":{"theta":2.5,"w":0.50},"fine_motor":{"theta":2.5,"w":0.25},"self_control":{"theta":2.0,"w":0.25}}',
 true),
('daily_s4', 'daily_living', 4, true,
 '{"daily_living":{"theta":3.0,"w":0.55},"fine_motor":{"theta":3.0,"w":0.20},"self_control":{"theta":2.5,"w":0.25}}',
 true),
('daily_s5', 'daily_living', 5, true,
 '{"daily_living":{"theta":3.5,"w":0.45},"fine_motor":{"theta":3.5,"w":0.30},"self_control":{"theta":3.0,"w":0.25}}',
 true),

-- ── SKILL D: cognition ───────────────────────────────────────────────
('cog_s1', 'cognition', 1, true,
 '{"attention":{"theta":1.5,"w":0.55},"wm_link":{"theta":1.5,"w":0.45}}',
 true),
('cog_s2', 'cognition', 2, true,
 '{"attention":{"theta":2.0,"w":0.40},"wm_link":{"theta":2.0,"w":0.35},"math":{"theta":1.0,"w":0.25}}',
 true),
('cog_s3', 'cognition', 3, true,
 '{"math":{"theta":1.5,"w":0.35},"attention":{"theta":2.5,"w":0.30},"reading":{"theta":1.0,"w":0.20},"wm_link":{"theta":2.5,"w":0.15}}',
 true),
('cog_s4', 'cognition', 4, true,
 '{"math":{"theta":2.0,"w":0.35},"reading":{"theta":1.5,"w":0.25},"attention":{"theta":3.0,"w":0.25},"wm_link":{"theta":3.0,"w":0.15}}',
 true),
('cog_s5', 'cognition', 5, true,
 '{"attention":{"theta":3.5,"w":0.30},"math":{"theta":2.5,"w":0.20},"reading":{"theta":2.0,"w":0.15},"wm_link":{"theta":3.0,"w":0.20},"self_control":{"theta":3.0,"w":0.15}}',
 true)

ON CONFLICT (code) DO NOTHING;
