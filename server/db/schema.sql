-- =====================================================================
--  AnemiaScan :: PostgreSQL schema (Stage 1)
--  Run with:  psql -U postgres -d anemiscan -f db/schema.sql
--  Safe to re-run: everything is dropped first (dev convenience).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Clean slate (dev only). Comment this block out in production.
-- ---------------------------------------------------------------------
DROP VIEW  IF EXISTS v_dashboard_summary  CASCADE;
DROP TABLE IF EXISTS audit_logs           CASCADE;
DROP TABLE IF EXISTS referrals            CASCADE;
DROP TABLE IF EXISTS screenings           CASCADE;
DROP TABLE IF EXISTS hospitals            CASCADE;
DROP TABLE IF EXISTS users                CASCADE;
DROP TABLE IF EXISTS admins               CASCADE;
DROP TYPE  IF EXISTS referral_status      CASCADE;
DROP TYPE  IF EXISTS severity_level       CASCADE;
DROP TYPE  IF EXISTS admin_role           CASCADE;
DROP TYPE  IF EXISTS gender_type          CASCADE;

-- ---------------------------------------------------------------------
-- 1. Extensions
--    pgcrypto gives us gen_random_uuid() for UUID primary keys.
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 2. Custom ENUM types
--    ENUMs keep the database itself honest: a severity can only ever be
--    one of these four strings, no matter what the API sends.
-- ---------------------------------------------------------------------
CREATE TYPE gender_type      AS ENUM ('male', 'female', 'other');
CREATE TYPE severity_level   AS ENUM ('normal', 'mild', 'moderate', 'severe');
CREATE TYPE referral_status  AS ENUM ('pending', 'visited', 'treated', 'cancelled');
CREATE TYPE admin_role       AS ENUM ('super_admin', 'viewer');

-- ---------------------------------------------------------------------
-- 3. admins  --  management / admin panel accounts
-- ---------------------------------------------------------------------
CREATE TABLE admins (
    admin_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    role          admin_role   NOT NULL DEFAULT 'viewer',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. hospitals  --  hospital portal accounts + department profile
-- ---------------------------------------------------------------------
CREATE TABLE hospitals (
    hospital_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(180) NOT NULL,
    district      VARCHAR(80)  NOT NULL,
    address       TEXT,
    phone         VARCHAR(15)  NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    department    VARCHAR(120) NOT NULL DEFAULT 'General',
    doctor_count  SMALLINT     NOT NULL DEFAULT 0 CHECK (doctor_count >= 0),
    beds_available SMALLINT    NOT NULL DEFAULT 0 CHECK (beds_available >= 0),
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6),
    -- New hospitals register as unapproved; a super_admin approves them.
    is_approved   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. users  --  mobile-app users (login is optional, so password_hash
--    is nullable: an offline/guest user simply has no account yet)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(120) NOT NULL,
    phone         VARCHAR(15)  NOT NULL UNIQUE,
    age           SMALLINT     CHECK (age BETWEEN 1 AND 120),
    gender        gender_type,
    district      VARCHAR(80),
    password_hash TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 6. screenings  --  one row per Hb prediction made on the phone
--    photo_path stores a path to the ENCRYPTED eyelid/nail crop only.
-- ---------------------------------------------------------------------
CREATE TABLE screenings (
    screening_id  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID            REFERENCES users(user_id) ON DELETE CASCADE,
    photo_path    TEXT,
    predicted_hb  NUMERIC(4,1)    NOT NULL CHECK (predicted_hb BETWEEN 1 AND 25),
    severity      severity_level  NOT NULL,
    latitude      NUMERIC(9,6),
    longitude     NUMERIC(9,6),
    district      VARCHAR(80),
    device_id     VARCHAR(120),   -- lets an offline app sync without an account
    synced_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    photo_delete_after DATE,      -- auto-delete photos 90 days after capture
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()  -- capture time on device
);

-- ---------------------------------------------------------------------
-- 7. referrals  --  a screening shared with a hospital by the user
-- ---------------------------------------------------------------------
CREATE TABLE referrals (
    referral_id  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_id UUID            NOT NULL REFERENCES screenings(screening_id) ON DELETE CASCADE,
    hospital_id  UUID            NOT NULL REFERENCES hospitals(hospital_id)  ON DELETE CASCADE,
    status       referral_status NOT NULL DEFAULT 'pending',
    note         TEXT,
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (screening_id, hospital_id)   -- don't refer the same case twice
);

-- ---------------------------------------------------------------------
-- 8. audit_logs  --  every destructive/admin action lands here
--    actor_id is intentionally NOT a foreign key: logs must survive
--    even if the account that did the action is later deleted.
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
    log_id         BIGSERIAL    PRIMARY KEY,
    actor_id       UUID,
    actor_role     VARCHAR(20),
    action         VARCHAR(60)  NOT NULL,   -- e.g. 'DELETE_HOSPITAL'
    table_affected VARCHAR(60)  NOT NULL,
    record_id      TEXT,
    reason         TEXT,
    metadata       JSONB,
    "timestamp"    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 9. Indexes  --  the columns we filter/sort on most often
-- ---------------------------------------------------------------------
CREATE INDEX idx_screenings_user      ON screenings(user_id);
CREATE INDEX idx_screenings_severity  ON screenings(severity);
CREATE INDEX idx_screenings_district  ON screenings(district);
CREATE INDEX idx_screenings_created   ON screenings(created_at DESC);
CREATE INDEX idx_referrals_hospital   ON referrals(hospital_id, status);
CREATE INDEX idx_hospitals_district   ON hospitals(district);
CREATE INDEX idx_audit_timestamp      ON audit_logs("timestamp" DESC);

-- ---------------------------------------------------------------------
-- 10. updated_at trigger  --  keeps updated_at truthful automatically
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hospitals_updated
    BEFORE UPDATE ON hospitals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_referrals_updated
    BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 11. dashboard_views  --  a plain view the admin dashboard reads from.
--     (A view is a saved query: it always shows live data, no refresh.)
-- ---------------------------------------------------------------------
CREATE VIEW v_dashboard_summary AS
SELECT
    (SELECT count(*) FROM screenings)                                  AS total_screenings,
    (SELECT count(*) FROM screenings WHERE severity <> 'normal')       AS anemic_cases,
    ROUND(
        (SELECT count(*) FROM screenings WHERE severity <> 'normal')::numeric
        / NULLIF((SELECT count(*) FROM screenings), 0) * 100, 1
    )                                                                  AS anemia_rate_pct,
    (SELECT count(*) FROM hospitals)                                   AS total_hospitals,
    (SELECT count(*) FROM hospitals WHERE is_approved)                 AS approved_hospitals,
    (SELECT count(*) FROM referrals WHERE status = 'pending')          AS pending_referrals;

-- A second view for the "anemia by district" chart.
CREATE VIEW v_anemia_by_district AS
SELECT
    district,
    count(*)                                            AS total,
    count(*) FILTER (WHERE severity <> 'normal')        AS anemic,
    ROUND(avg(predicted_hb)::numeric, 2)                AS avg_hb
FROM screenings
WHERE district IS NOT NULL
GROUP BY district
ORDER BY anemic DESC;
