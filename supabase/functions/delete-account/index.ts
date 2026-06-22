import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type DeleteAccountPayload = {
  confirm?: boolean;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ACCOUNT_DELETE_ALLOWED_ORIGINS = (Deno.env.get('ACCOUNT_DELETE_ALLOWED_ORIGINS') || Deno.env.get('GOOGLE_PLAY_ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  SUPABASE_URL,
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
  ...ACCOUNT_DELETE_ALLOWED_ORIGINS,
].filter(Boolean));

const makeCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'capacitor://localhost',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (body: unknown, status = 200, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || 'capacitor://localhost';
  const corsHeaders = makeCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, reason: 'METHOD_NOT_ALLOWED' }, 405, corsHeaders);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, reason: 'SUPABASE_SERVICE_ROLE_MISSING' }, 500, corsHeaders);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return json({ ok: false, reason: 'AUTH_REQUIRED' }, 401, corsHeaders);
  }

  let payload: DeleteAccountPayload = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  if (payload.confirm !== true) {
    return json({ ok: false, reason: 'CONFIRMATION_REQUIRED' }, 400, corsHeaders);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return json({ ok: false, reason: 'INVALID_SESSION' }, 401, corsHeaders);
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    console.error('delete-account: admin.deleteUser failed', deleteError);
    return json({ ok: false, reason: 'DELETE_FAILED' }, 500, corsHeaders);
  }

  return json({ ok: true }, 200, corsHeaders);
});
