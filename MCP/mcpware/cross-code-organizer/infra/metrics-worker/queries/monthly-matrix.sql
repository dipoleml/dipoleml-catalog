SELECT
  month,
  COUNT(*) AS active_installations
FROM monthly_active_users
GROUP BY month
ORDER BY month;

SELECT
  month,
  app_version,
  COUNT(*) AS active_installations
FROM monthly_active_users
GROUP BY month, app_version
ORDER BY month, active_installations DESC, app_version;

SELECT
  month,
  harness,
  COUNT(*) AS active_installations
FROM monthly_active_users
GROUP BY month, harness
ORDER BY month, active_installations DESC, harness;
