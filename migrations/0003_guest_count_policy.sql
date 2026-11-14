-- Preserve existing records while removing the unapproved two-guest service minimum.
-- Positive integer is an intake constraint, not a promise to accommodate any group.
CREATE TABLE consultations_v3 (
  id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  preferred_date TEXT,
  guest_count INTEGER NOT NULL CHECK (guest_count >= 1),
  experience_level TEXT NOT NULL,
  occasion TEXT,
  desired_feeling TEXT,
  vision TEXT NOT NULL,
  boundaries TEXT,
  consent_version TEXT NOT NULL,
  consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lead_status TEXT NOT NULL DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'closed')),
  contacted_at TEXT,
  closed_at TEXT,
  purged_at TEXT,
  notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending', 'sending', 'accepted', 'failed')),
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_error TEXT,
  notification_claim TEXT,
  notification_lease_until INTEGER,
  notification_accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  operator_revision INTEGER NOT NULL DEFAULT 1,
  CHECK ((lead_status = 'closed') = (closed_at IS NOT NULL))
);
INSERT INTO consultations_v3 (id, payload_hash, name, email, phone, city, preferred_date, guest_count, experience_level, occasion, desired_feeling, vision, boundaries, consent_version, consent_at, lead_status, contacted_at, closed_at, purged_at, notification_status, notification_attempts, notification_error, notification_claim, notification_lease_until, notification_accepted_at, created_at, updated_at, operator_revision)
SELECT id, payload_hash, name, email, phone, city, preferred_date, guest_count, experience_level, occasion, desired_feeling, vision, boundaries, consent_version, consent_at, lead_status, contacted_at, closed_at, purged_at, notification_status, notification_attempts, notification_error, notification_claim, notification_lease_until, notification_accepted_at, created_at, updated_at, operator_revision FROM consultations;
DROP TABLE consultations;
ALTER TABLE consultations_v3 RENAME TO consultations;
CREATE INDEX consultations_delivery ON consultations(notification_status, notification_lease_until);
CREATE INDEX consultations_lifecycle ON consultations(lead_status, closed_at);
