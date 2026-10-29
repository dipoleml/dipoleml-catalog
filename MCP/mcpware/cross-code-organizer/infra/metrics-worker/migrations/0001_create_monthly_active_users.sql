CREATE TABLE IF NOT EXISTS monthly_active_users (
  month TEXT NOT NULL,
  monthly_id TEXT NOT NULL,
  app_version TEXT NOT NULL,
  harness TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  PRIMARY KEY (month, monthly_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_active_users_version
  ON monthly_active_users (month, app_version);

CREATE INDEX IF NOT EXISTS idx_monthly_active_users_harness
  ON monthly_active_users (month, harness);
