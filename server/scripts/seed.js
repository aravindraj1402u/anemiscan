// ---------------------------------------------------------------------
// scripts/seed.js
// Inserts demo accounts with FRESHLY hashed passwords (so you always know
// the plaintext). Run:  npm run db:seed
// ---------------------------------------------------------------------
const { query, pool } = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');

async function run() {
  const adminPass = await hashPassword('Admin@1234');
  const hospPass = await hashPassword('Hospital@123');

  await query(
    `INSERT INTO admins (name, email, password_hash, role)
     VALUES ('Super Admin', 'admin@anemiscan.in', $1, 'super_admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [adminPass]
  );

  await query(
    `INSERT INTO hospitals (name, district, address, phone, email, password_hash,
                            department, doctor_count, beds_available, is_approved)
     VALUES ('City Care Hospital', 'Chennai', '12 Anna Salai, Chennai', '04425551234',
             'citycare@anemiscan.in', $1, 'Antenatal & Hematology', 14, 6, TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [hospPass]
  );

  console.log('[db:seed] demo accounts ready:');
  console.log('  admin    admin@anemiscan.in     / Admin@1234');
  console.log('  hospital citycare@anemiscan.in  / Hospital@123');
  await pool.end();
}

run().catch((err) => {
  console.error('[db:seed] failed:', err.message);
  process.exit(1);
});
