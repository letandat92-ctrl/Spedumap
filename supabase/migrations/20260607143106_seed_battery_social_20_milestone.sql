-- 20260607143106_seed_battery_social_20_milestone.sql
-- Track: 20 milestone SOCIAL (battery v0.2, prior yếu — cờ TEST)
-- Nguồn: DB thật qua SELECT (KHÔNG từ battery_footprint_social_v0_2.md trực tiếp)
-- Skill 3 (eyecontact_nonverbal): social_skills CHỦ ĐẠO (quyết định #1d) — visual chỉ nền S1-2.
-- Migration đã áp qua MCP (version 20260607143106); file này để track trong repo.
-- ON CONFLICT (code) DO NOTHING → idempotent.

INSERT INTO public.milestone (code, skill_family, stage, star, footprint, is_active) VALUES

-- ── SKILL 1: interaction_duration ────────────────────────────────────
('interaction_s1', 'interaction_duration', 1, true,
 '{"social_skills":{"theta":1.5,"w":0.40},"attention":{"theta":1.5,"w":0.25},"arousal":{"theta":2.0,"w":0.15},"tactile":{"theta":2.0,"w":0.10},"gross_motor":{"theta":1.5,"w":0.10}}',
 true),

('interaction_s2', 'interaction_duration', 2, true,
 '{"social_skills":{"theta":2.0,"w":0.40},"attention":{"theta":2.0,"w":0.25},"self_control":{"theta":1.5,"w":0.20},"tactile":{"theta":2.5,"w":0.15}}',
 true),

('interaction_s3', 'interaction_duration', 3, true,
 '{"social_skills":{"theta":2.5,"w":0.35},"attention":{"theta":3.0,"w":0.30},"oral_language":{"theta":1.8,"w":0.20},"wm_link":{"theta":2.0,"w":0.15}}',
 true),

('interaction_s4', 'interaction_duration', 4, true,
 '{"social_skills":{"theta":3.0,"w":0.35},"attention":{"theta":3.5,"w":0.30},"self_control":{"theta":2.5,"w":0.20},"behavior":{"theta":2.5,"w":0.15}}',
 true),

('interaction_s5', 'interaction_duration', 5, true,
 '{"social_skills":{"theta":3.5,"w":0.35},"attention":{"theta":3.5,"w":0.30},"self_control":{"theta":3.0,"w":0.20},"behavior":{"theta":3.0,"w":0.15}}',
 true),

-- ── SKILL 2: language ────────────────────────────────────────────────
('language_s1', 'language', 1, true,
 '{"oral_language":{"theta":2.0,"w":0.55},"word_finding":{"theta":1.5,"w":0.25},"attention":{"theta":1.5,"w":0.20}}',
 true),

('language_s2', 'language', 2, true,
 '{"oral_language":{"theta":2.0,"w":0.45},"word_finding":{"theta":2.0,"w":0.25},"attention":{"theta":2.0,"w":0.15},"social_skills":{"theta":1.5,"w":0.15}}',
 true),

('language_s3', 'language', 3, true,
 '{"oral_language":{"theta":2.5,"w":0.40},"word_finding":{"theta":2.5,"w":0.25},"social_skills":{"theta":2.0,"w":0.20},"wm_link":{"theta":2.0,"w":0.15}}',
 true),

('language_s4', 'language', 4, true,
 '{"oral_language":{"theta":3.0,"w":0.35},"word_finding":{"theta":3.0,"w":0.20},"wm_link":{"theta":3.0,"w":0.20},"auditory_processing":{"theta":3.0,"w":0.15},"social_skills":{"theta":2.5,"w":0.10}}',
 true),

('language_s5', 'language', 5, true,
 '{"oral_language":{"theta":3.5,"w":0.35},"word_finding":{"theta":3.5,"w":0.15},"social_skills":{"theta":3.0,"w":0.20},"auditory_processing":{"theta":3.5,"w":0.15},"wm_link":{"theta":3.0,"w":0.15}}',
 true),

-- ── SKILL 3: eyecontact_nonverbal ─────────────────────────────────────
-- Quyết định #1d: social_skills CHỦ ĐẠO (w=0.45-0.50). visual chỉ nền S1-2.
-- visual_processing xuất hiện từ S3+ (đọc biểu cảm, vai phụ).
-- KHÔNG phải visual_processing chủ đạo (khác với v0.2 draft ban đầu).
('eyecontact_s1', 'eyecontact_nonverbal', 1, true,
 '{"social_skills":{"theta":1.5,"w":0.45},"visual":{"theta":2.0,"w":0.35},"attention":{"theta":1.5,"w":0.20}}',
 true),

('eyecontact_s2', 'eyecontact_nonverbal', 2, true,
 '{"social_skills":{"theta":2.0,"w":0.45},"visual":{"theta":2.0,"w":0.30},"attention":{"theta":2.0,"w":0.25}}',
 true),

('eyecontact_s3', 'eyecontact_nonverbal', 3, true,
 '{"social_skills":{"theta":2.5,"w":0.50},"attention":{"theta":2.5,"w":0.30},"visual_processing":{"theta":2.0,"w":0.20}}',
 true),

('eyecontact_s4', 'eyecontact_nonverbal', 4, true,
 '{"social_skills":{"theta":3.0,"w":0.50},"attention":{"theta":3.0,"w":0.30},"visual_processing":{"theta":2.5,"w":0.20}}',
 true),

('eyecontact_s5', 'eyecontact_nonverbal', 5, true,
 '{"social_skills":{"theta":3.5,"w":0.50},"attention":{"theta":3.5,"w":0.20},"visual_processing":{"theta":3.0,"w":0.15},"auditory_processing":{"theta":3.0,"w":0.15}}',
 true),

-- ── SKILL 4: flexibility ─────────────────────────────────────────────
('flexibility_s1', 'flexibility', 1, true,
 '{"self_control":{"theta":1.5,"w":0.40},"behavior":{"theta":1.5,"w":0.35},"arousal":{"theta":2.0,"w":0.25}}',
 true),

('flexibility_s2', 'flexibility', 2, true,
 '{"self_control":{"theta":2.0,"w":0.35},"behavior":{"theta":2.0,"w":0.30},"social_skills":{"theta":2.0,"w":0.20},"oral_language":{"theta":1.5,"w":0.15}}',
 true),

('flexibility_s3', 'flexibility', 3, true,
 '{"self_control":{"theta":2.5,"w":0.35},"behavior":{"theta":2.5,"w":0.30},"social_skills":{"theta":2.5,"w":0.20},"wm_link":{"theta":2.0,"w":0.15}}',
 true),

('flexibility_s4', 'flexibility', 4, true,
 '{"self_control":{"theta":3.0,"w":0.35},"behavior":{"theta":3.0,"w":0.25},"social_skills":{"theta":3.0,"w":0.20},"wm_link":{"theta":2.5,"w":0.20}}',
 true),

('flexibility_s5', 'flexibility', 5, true,
 '{"self_control":{"theta":3.5,"w":0.40},"behavior":{"theta":3.0,"w":0.30},"attention":{"theta":3.0,"w":0.15},"social_skills":{"theta":3.0,"w":0.15}}',
 true)

ON CONFLICT (code) DO NOTHING;
