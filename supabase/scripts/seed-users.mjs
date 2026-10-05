// Creates (or resets) one test account per role: admin, officer and student.
// Run from the project root with: npm run seed:users
// Needs SUPABASE_URL, SUPABASE_SECRET_KEY and the three SEED_*_PASSWORD values in the root .env.

import { createClient } from '@supabase/supabase-js';

const accounts = [
  {
    email: 'admin@neuorg.test',
    fullName: 'OSAS Admin',
    role: 'admin',
    passwordVar: 'SEED_ADMIN_PASSWORD',
  },
  {
    email: 'officer@neuorg.test',
    fullName: 'Sample Officer',
    role: 'officer',
    passwordVar: 'SEED_OFFICER_PASSWORD',
  },
  {
    email: 'student@neuorg.test',
    fullName: 'Sample Student',
    role: 'student',
    passwordVar: 'SEED_STUDENT_PASSWORD',
  },
];

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  fail('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the root .env file.');
}
if (!SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
  fail('SUPABASE_SECRET_KEY must be the secret key (sb_secret_...), not the publishable key.');
}

// The secret key bypasses RLS. It must never be used in the mobile or web app.
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const account of accounts) {
  const password = process.env[account.passwordVar];
  if (!password || password.length < 8) {
    fail(`${account.passwordVar} must be set in .env and be at least 8 characters.`);
  }

  const existing = await findUserByEmail(account.email);
  let userId;
  let action;

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    });
    if (error) fail(`Could not update ${account.email}: ${error.message}`);
    userId = existing.id;
    action = 'updated';
  } else {
    // email_confirm marks the address as verified, so no email is sent.
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    });
    if (error) fail(`Could not create ${account.email}: ${error.message}`);
    userId = data.user.id;
    action = 'created';
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .update({ role: account.role, full_name: account.fullName })
    .eq('id', userId)
    .select('id');

  if (profileError) {
    fail(`Could not set the role for ${account.email}: ${profileError.message}`);
  }
  if (profiles.length === 0) {
    fail(`No profile found for ${account.email}. Did you run "npx supabase db push"?`);
  }

  console.log(`${action.padEnd(8)} ${account.role.padEnd(8)} ${account.email}`);
}

console.log('\nDone. Log in with these emails and the passwords from your .env file.');

async function findUserByEmail(email) {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) fail(`Could not list users: ${error.message}`);
    const user = data.users.find((u) => u.email === email);
    if (user) return user;
    if (data.users.length < perPage) return null;
  }
}

function fail(message) {
  console.error(`\nSeed failed: ${message}`);
  process.exit(1);
}
