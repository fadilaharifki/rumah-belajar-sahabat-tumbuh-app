import { supabase } from '@/lib/supabaseClient';

/**
 * Checks across all database tables (users, parents, teachers, staff) to ensure
 * an email is 100% unique. If a duplicate is found for ANOTHER user, appends a timestamp suffix.
 * If the email is identical to the user's OWN existing email (currentEmail), it is kept unchanged without timestamp.
 */
export async function getGuaranteedUniqueEmail(
  rawEmail: string | null | undefined,
  fallbackName: string = 'user',
  prefix: string = 'guru',
  excludeUserId?: string,
  currentEmail?: string | null
): Promise<string> {
  let email = rawEmail ? rawEmail.toLowerCase().trim() : '';
  const existingEmail = currentEmail ? currentEmail.toLowerCase().trim() : '';

  // 1. If user is keeping their exact OWN existing email, do NOT modify or add timestamp
  if (existingEmail && email === existingEmail) {
    return email;
  }

  // 2. If email is empty, generate clean email from name
  if (!email || !email.includes('@')) {
    const slug = fallbackName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim() || 'user';

    email = `${prefix}.${slug}@rbst.com`;

    // If generated slug matches their own existing email, keep it
    if (existingEmail && email === existingEmail) {
      return email;
    }
  }

  const parts = email.split('@');
  const username = parts[0];
  const domain = parts[1] || 'rbst.com';

  let candidate = `${username}@${domain}`;

  // If candidate is their own existing email, return candidate directly
  if (existingEmail && candidate === existingEmail) {
    return candidate;
  }

  let attempt = 0;

  while (attempt < 10) {
    let uQuery = supabase.from('users').select('id').ilike('email', candidate).limit(1);
    let pQuery = supabase.from('parents').select('id').ilike('email', candidate).limit(1);
    let tQuery = supabase.from('teachers').select('id').ilike('email', candidate).limit(1);
    let sQuery = supabase.from('staff').select('id').ilike('email', candidate).limit(1);

    if (excludeUserId) {
      uQuery = uQuery.neq('id', excludeUserId);
    }
    if (existingEmail) {
      pQuery = pQuery.neq('email', existingEmail);
      tQuery = tQuery.neq('email', existingEmail);
      sQuery = sQuery.neq('email', existingEmail);
    }

    const [
      { data: inUsers },
      { data: inParents },
      { data: inTeachers },
      { data: inStaff }
    ] = await Promise.all([uQuery, pQuery, tQuery, sQuery]);

    const hasDuplicate =
      (inUsers && inUsers.length > 0) ||
      (inParents && inParents.length > 0) ||
      (inTeachers && inTeachers.length > 0) ||
      (inStaff && inStaff.length > 0);

    if (!hasDuplicate) {
      return candidate;
    }

    // Append 4-digit timestamp suffix for duplicate emails belonging to OTHER users
    const stamp = (Date.now() + attempt).toString().slice(-4);
    candidate = `${username}.${stamp}@${domain}`;
    attempt++;
  }

  return `${username}.${Date.now()}@${domain}`;
}
