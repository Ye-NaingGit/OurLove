/* ============================================================
   supabase-client.js
   One place to configure Supabase. Every page loads this file
   (after the supabase-js CDN script) and reads `db` + `isSupabaseConfigured`.

   HOW TO CONNECT YOUR PROJECT:
   1. Create a project at https://supabase.com
   2. Run supabase/schema.sql (in this project) in the Supabase SQL editor —
      it creates all the tables and sensible starter security rules.
   3. Copy your Project URL and anon public key from
      Project Settings -> API, and paste them below.

   Until you do that, isSupabaseConfigured stays false and every page
   quietly falls back to the DEMO DATA defined at the top of its own
   script, so you can preview and style the whole site before Supabase
   is even set up.
============================================================ */

const SUPABASE_URL = 'https://kpmblhjxpqhzqcognpys.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_h0zKEZjYtubWu7KSbYHEug_NB-ndojo';

const isSupabaseConfigured =
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
  typeof window.supabase !== 'undefined';

// `db` is null until configured — every page must check isSupabaseConfigured
// (or just check `db`) before using it.
const db = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Small helper so every page can write:
 *   const memories = await loadTable('memories', demoMemories, { order: 'date', ascending: false });
 * — it queries Supabase when configured, and silently falls back to your
 * local demo array otherwise (or if the request fails for any reason,
 * e.g. you haven't run the schema yet).
 */
async function loadTable(tableName, fallbackData, { order, ascending = true, select = '*' } = {}) {
  if (!db) return fallbackData;

  try {
    let query = db.from(tableName).select(select);
    if (order) query = query.order(order, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data ?? fallbackData;
  } catch (err) {
    console.warn(`Supabase query for "${tableName}" failed, using demo data instead:`, err.message);
    return fallbackData;
  }
}
