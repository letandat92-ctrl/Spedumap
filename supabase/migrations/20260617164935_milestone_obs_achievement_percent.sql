-- Áp qua MCP. File track version, KHÔNG push lại.
-- Change achievement encoding: ordinal 0-3 → percent 25/50/75.
ALTER TABLE milestone_obs DROP CONSTRAINT IF EXISTS milestone_obs_achievement_check;
UPDATE milestone_obs SET achievement = CASE
  WHEN achievement = 0 THEN 25 WHEN achievement = 1 THEN 25
  WHEN achievement = 2 THEN 50 WHEN achievement = 3 THEN 75
  ELSE achievement END
WHERE achievement BETWEEN 0 AND 3;
ALTER TABLE milestone_obs ADD CONSTRAINT milestone_obs_achievement_check
  CHECK (achievement IN (25, 50, 75));
