-- Intentionally empty: an operator must identify this database before intake opens.
CREATE TABLE intake_environment (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'preview', 'local'))
);
CREATE TRIGGER intake_environment_immutable_update BEFORE UPDATE ON intake_environment
BEGIN SELECT RAISE(ABORT, 'Environment marker is immutable'); END;
CREATE TRIGGER intake_environment_immutable_delete BEFORE DELETE ON intake_environment
BEGIN SELECT RAISE(ABORT, 'Environment marker is immutable'); END;
ALTER TABLE consultations ADD COLUMN operator_revision INTEGER NOT NULL DEFAULT 1;
