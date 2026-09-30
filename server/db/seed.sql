-- =====================================================================
--  AnemiaScan :: sample seed data (Stage 1)
--  Passwords below are bcrypt hashes of the plaintext noted in comments.
--  (Generate your own with scripts/seed.js -- this file is for quick demos.)
-- =====================================================================

-- Demo super admin  ::  email: admin@anemiscan.in   password: Admin@1234
INSERT INTO admins (name, email, password_hash, role) VALUES
('Super Admin', 'admin@anemiscan.in',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'super_admin'),
('District Viewer', 'viewer@anemiscan.in',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'viewer')
ON CONFLICT (email) DO NOTHING;

-- Demo hospitals  ::  email: citycare@anemiscan.in  password: Hospital@123
INSERT INTO hospitals (name, district, address, phone, email, password_hash,
                       department, doctor_count, beds_available, is_approved)
VALUES
('City Care Hospital', 'Chennai', '12 Anna Salai, Chennai', '04425551234',
 'citycare@anemiscan.in',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
 'Antenatal & Hematology', 14, 6, TRUE),
('Madurai General Hospital', 'Madurai', '5 West Veli St, Madurai', '04522334567',
 'maduraigen@anemiscan.in',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
 'General Medicine', 9, 3, FALSE)
ON CONFLICT (email) DO NOTHING;

-- A couple of demo screenings for the dashboard to render something.
INSERT INTO users (name, phone, age, gender, district) VALUES
('Meena K', '9000000001', 26, 'female', 'Chennai'),
('Arjun S', '9000000002', 19, 'male',   'Madurai')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO screenings (user_id, predicted_hb, severity, district, latitude, longitude)
SELECT user_id, 9.4, 'moderate', 'Chennai', 13.0827, 80.2707
FROM users WHERE phone = '9000000001';

INSERT INTO screenings (user_id, predicted_hb, severity, district, latitude, longitude)
SELECT user_id, 13.1, 'normal', 'Madurai', 9.9252, 78.1198
FROM users WHERE phone = '9000000002';
