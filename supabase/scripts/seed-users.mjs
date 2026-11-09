// Creates (or resets) the demo data: a few organizations, one admin, presidents
// linked to those organizations, students with student numbers, and professors
// with professor numbers.
// Run from the project root with: npm run seed:users
// Needs SUPABASE_URL, SUPABASE_SECRET_KEY and the three SEED_*_PASSWORD values in the root .env.
// Every demo account of a role shares that role's password. SEED_PROFESSOR_PASSWORD is
// optional; without it, professors use the students' password.

import { createClient } from '@supabase/supabase-js';

const organizations = [
  {
    name: 'Cybersecurity Alliance',
    categories: ['Academic'],
    department: 'College of Informatics & Computing Studies',
    description: 'Students learning to protect systems, networks and data through workshops and capture-the-flag events.',
  },
  {
    name: 'Code Innovators Guild',
    categories: ['Academic'],
    department: 'College of Informatics & Computing Studies',
    description: 'A community of student developers building projects, joining hackathons and sharing what they learn.',
  },
  {
    // Left without a president so "Add admin" can be shown in a demo.
    name: 'NEU Debate Society',
    categories: ['Special Interest'],
    department: 'University Wide',
    description: 'Sharpening critical thinking and public speaking through regular debates and competitions.',
  },
];

// "organization" makes the account that organization's active president.
const accounts = [
  { email: 'admin@neuorg.test', fullName: 'OSAS Admin', role: 'admin' },
  {
    email: 'officer@neuorg.test',
    fullName: 'Maria Santos',
    role: 'officer',
    organization: 'Cybersecurity Alliance',
    studentNo: '2021-90001',
    yearLevel: 4,
  },
  {
    email: 'officer2@neuorg.test',
    fullName: 'Carlos Mendoza',
    role: 'officer',
    organization: 'Code Innovators Guild',
    studentNo: '2022-90002',
    yearLevel: 3,
  },
  { email: 'student@neuorg.test', fullName: 'Juan dela Cruz', role: 'student', studentNo: '2023-90003', yearLevel: 2 },
  { email: 'student2@neuorg.test', fullName: 'Ana Reyes', role: 'student', studentNo: '2022-90004', yearLevel: 3 },
  { email: 'student3@neuorg.test', fullName: 'Paolo Ramos', role: 'student', studentNo: '2024-90005', yearLevel: 1 },
  {
    email: 'student4@neuorg.test',
    fullName: 'Bea Gonzales',
    role: 'student',
    studentNo: '2023-90006',
    yearLevel: 2,
    status: 'suspended',
  },
  // Professors have the "student" role in the database; their professor number puts
  // them on Users > Professors instead of Students.
  {
    email: 'professor@neuorg.test',
    fullName: 'Dr. Ramon Castillo',
    role: 'professor',
    professorNo: 'P0001',
    department: 'College of Informatics & Computing Studies',
  },
  {
    email: 'professor2@neuorg.test',
    fullName: 'Prof. Liza Navarro',
    role: 'professor',
    professorNo: 'P0002',
    department: 'College of Accountancy',
  },
];

const passwordVars = {
  admin: 'SEED_ADMIN_PASSWORD',
  officer: 'SEED_OFFICER_PASSWORD',
  student: 'SEED_STUDENT_PASSWORD',
};

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  fail('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the root .env file.');
}
if (!SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
  fail('SUPABASE_SECRET_KEY must be the secret key (sb_secret_...), not the publishable key.');
}
for (const passwordVar of Object.values(passwordVars)) {
  const password = process.env[passwordVar];
  if (!password || password.length < 8) {
    fail(`${passwordVar} must be set in .env and be at least 8 characters.`);
  }
}

// Optional: professors use the students' password unless SEED_PROFESSOR_PASSWORD is set.
const { SEED_PROFESSOR_PASSWORD } = process.env;
if (SEED_PROFESSOR_PASSWORD && SEED_PROFESSOR_PASSWORD.length < 8) {
  fail('SEED_PROFESSOR_PASSWORD must be at least 8 characters, or left empty.');
}
const professorPassword = SEED_PROFESSOR_PASSWORD || process.env.SEED_STUDENT_PASSWORD;

// The secret key bypasses RLS. It must never be used in the mobile or web app.
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const orgIds = new Map();
for (const org of organizations) {
  orgIds.set(org.name, await findOrCreateOrganization(org));
}

console.log('');

for (const account of accounts) {
  const userId = await createOrUpdateUser(account);

  // Presidents become "officer" below, once they're linked to their organization.
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .update({
      role: account.role === 'admin' ? 'admin' : 'student',
      full_name: account.fullName,
      student_no: account.studentNo ?? null,
      year_level: account.yearLevel ?? null,
      professor_no: account.professorNo ?? null,
      department: account.department ?? null,
      status: account.status ?? 'active',
    })
    .eq('id', userId)
    .select('id');

  if (profileError) {
    fail(`Could not update the profile for ${account.email}: ${profileError.message}`);
  }
  if (profiles.length === 0) {
    fail(`No profile found for ${account.email}. Did you run "npx supabase db push"?`);
  }

  // Undo presidencies from earlier demos, so students start as plain students again.
  if (account.role !== 'officer') {
    const { error } = await supabase
      .from('officers')
      .update({ status: 'inactive' })
      .eq('profile_id', userId)
      .eq('status', 'active');
    if (error) fail(`Could not reset officer rows for ${account.email}: ${error.message}`);
  }

  let note = '';
  if (account.organization) {
    note = await linkPresident(userId, account);
  }

  console.log(`${account.role.padEnd(8)} ${account.email}${note}`);
}

console.log('\nDone. Log in with these emails and the passwords from your .env file.');

async function findOrCreateOrganization(org) {
  // Organization names are unique ignoring case, so this finds at most one.
  const { data: found, error } = await supabase
    .from('organizations')
    .select('id')
    .ilike('name', org.name)
    .maybeSingle();
  if (error) fail(`Could not look up ${org.name}: ${error.message}`);

  if (found) {
    console.log(`exists   org      ${org.name}`);
    return found.id;
  }

  const { data: created, error: createError } = await supabase
    .from('organizations')
    .insert(org)
    .select('id')
    .single();
  if (createError) fail(`Could not create ${org.name}: ${createError.message}`);

  console.log(`created  org      ${org.name}`);
  return created.id;
}

async function createOrUpdateUser(account) {
  const password = account.role === 'professor' ? professorPassword : process.env[passwordVars[account.role]];
  const existing = await findUserByEmail(account.email);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName },
    });
    if (error) fail(`Could not update ${account.email}: ${error.message}`);
    return existing.id;
  }

  // email_confirm marks the address as verified, so no email is sent.
  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: account.fullName },
  });
  if (error) fail(`Could not create ${account.email}: ${error.message}`);
  return data.user.id;
}

// Makes the account the active president of its organization and gives it the
// "officer" role. Leaves a real president in place instead of replacing them.
async function linkPresident(userId, account) {
  const organizationId = orgIds.get(account.organization);

  const { data: current, error } = await supabase
    .from('officers')
    .select('profile_id, profile:profiles(email)')
    .eq('organization_id', organizationId)
    .eq('position', 'President')
    .eq('status', 'active')
    .maybeSingle();
  if (error) fail(`Could not check the president of ${account.organization}: ${error.message}`);

  if (current && current.profile_id !== userId) {
    return ` (not linked: ${current.profile?.email ?? 'someone else'} is already president of ${account.organization})`;
  }

  const { error: upsertError } = await supabase
    .from('officers')
    .upsert(
      { profile_id: userId, organization_id: organizationId, position: 'President', status: 'active' },
      { onConflict: 'profile_id,organization_id' },
    );
  if (upsertError) fail(`Could not link ${account.email} to ${account.organization}: ${upsertError.message}`);

  const { error: roleError } = await supabase.from('profiles').update({ role: 'officer' }).eq('id', userId);
  if (roleError) fail(`Could not set the officer role for ${account.email}: ${roleError.message}`);

  return `  → President of ${account.organization}`;
}

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
