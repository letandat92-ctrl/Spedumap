-- Add 'reception' to user_profiles.role_check constraint.
-- reception = front-desk role; can create parent records (no login) via /reception.

ALTER TABLE user_profiles DROP CONSTRAINT role_check;
ALTER TABLE user_profiles ADD CONSTRAINT role_check
  CHECK (role = ANY (ARRAY[
    'admin','head_therapist','senior_therapist',
    'technician_therapist','junior_therapist','parent','reception'
  ]));
