import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ProductKind = 'consumable' | 'entitlement';
type CatalogEntry = {
  productId: string;
  kind: ProductKind;
  benefit: {
    kind: 'gold' | 'premium';
    amount?: number;
    durationDays?: number;
  };
};

type VerifyPayload = {
  productCode?: string;
  productId?: string;
  purchaseToken?: string;
  packageName?: string;
  orderId?: string | null;
  purchaseState?: string | null;
  rawPayload?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_PLAY_PACKAGE_NAME = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME') || '';
const GOOGLE_PLAY_ALLOWED_ORIGINS = (Deno.env.get('GOOGLE_PLAY_ALLOWED_ORIGINS') || '')
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
  ...GOOGLE_PLAY_ALLOWED_ORIGINS,
].filter(Boolean));

const makeCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'capacitor://localhost',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const CATALOG: Record<string, CatalogEntry> = {
  elite2050_gold_100: {
    productId: 'elite2050_gold_100',
    kind: 'consumable',
    benefit: { kind: 'gold', amount: 100 },
  },
  elite2050_gold_300: {
    productId: 'elite2050_gold_300',
    kind: 'consumable',
    benefit: { kind: 'gold', amount: 300 },
  },
  elite2050_gold_700: {
    productId: 'elite2050_gold_700',
    kind: 'consumable',
    benefit: { kind: 'gold', amount: 700 },
  },
  passe_circuito_neon_01: {
    productId: 'passe_circuito_neon_01',
    kind: 'entitlement',
    benefit: { kind: 'premium', durationDays: 90 },
  },
};

let cachedGoogleAccessToken: { token: string; expiresAt: number } | null = null;

const json = (body: unknown, status = 200, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const base64Url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const parsePrivateKey = (pem: string) =>
  pem
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

const getServiceAccount = () => {
  const rawJson = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if (rawJson) {
    return JSON.parse(rawJson.replace(/\\n/g, '\n')) as { client_email: string; private_key: string };
  }

  const clientEmail = Deno.env.get('GOOGLE_PLAY_CLIENT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_PLAY_PRIVATE_KEY');
  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_MISSING');
  }

  return { client_email: clientEmail, private_key: privateKey };
};

const getGoogleAccessToken = async () => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > now + 60) {
    return cachedGoogleAccessToken.token;
  }

  const serviceAccount = getServiceAccount();
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const keyData = Uint8Array.from(atob(parsePrivateKey(serviceAccount.private_key)), (char) => char.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedJwt),
  );
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenJson.access_token) {
    throw new Error(`GOOGLE_TOKEN_FAILED:${JSON.stringify(tokenJson)}`);
  }

  cachedGoogleAccessToken = {
    token: tokenJson.access_token as string,
    expiresAt: now + Number(tokenJson.expires_in || 3600),
  };
  return cachedGoogleAccessToken.token;
};

const googlePublisherFetch = async (path: string, accessToken: string, init: RequestInit = {}) => {
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`GOOGLE_PLAY_API_FAILED:${response.status}:${JSON.stringify(body)}`);
  }
  return body;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = makeCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, reason: 'METHOD_NOT_ALLOWED' }, 405, corsHeaders);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_PLAY_PACKAGE_NAME) {
      throw new Error('SERVER_ENV_MISSING');
    }

    const authHeader = req.headers.get('Authorization') || '';
    const userJwt = authHeader.replace(/^Bearer\s+/i, '');

    if (!userJwt) {
      return json({ ok: false, reason: 'AUTH_REQUIRED' }, 401, corsHeaders);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userResult, error: userError } = await adminClient.auth.getUser(userJwt);
    if (userError || !userResult.user) {
      return json({ ok: false, reason: 'INVALID_USER' }, 401, corsHeaders);
    }

    const payload = await req.json() as VerifyPayload;
    const productCode = payload.productCode || '';
    const catalog = CATALOG[productCode];
    const productId = payload.productId || '';
    const purchaseToken = payload.purchaseToken || '';
    const packageName = payload.packageName || '';

    if (!catalog) {
      return json({ ok: false, reason: 'UNKNOWN_PRODUCT_CODE' }, 400, corsHeaders);
    }

    if (!productId || productId !== catalog.productId) {
      return json({ ok: false, reason: 'PRODUCT_ID_MISMATCH' }, 400, corsHeaders);
    }

    if (!purchaseToken) {
      return json({ ok: false, reason: 'TOKEN_REQUIRED' }, 400, corsHeaders);
    }

    if (packageName !== GOOGLE_PLAY_PACKAGE_NAME) {
      return json({ ok: false, reason: 'PACKAGE_MISMATCH' }, 400, corsHeaders);
    }

    const accessToken = await getGoogleAccessToken();
    const encodedPackage = encodeURIComponent(packageName);
    const encodedProduct = encodeURIComponent(productId);
    const encodedToken = encodeURIComponent(purchaseToken);
    const productPath = `applications/${encodedPackage}/purchases/products/${encodedProduct}/tokens/${encodedToken}`;
    const googlePurchase = await googlePublisherFetch(productPath, accessToken);

    if (googlePurchase.purchaseState !== 0) {
      return json({
        ok: false,
        reason: googlePurchase.purchaseState === 2 ? 'PURCHASE_PENDING' : 'PURCHASE_NOT_PURCHASED',
        googlePurchase,
      }, 402, corsHeaders);
    }

    const { data: grantResult, error: grantError } = await adminClient.rpc('grant_mobile_purchase', {
      p_user_id: userResult.user.id,
      p_product_code: productCode,
      p_product_id: productId,
      p_purchase_token: purchaseToken,
      p_order_id: payload.orderId || googlePurchase.orderId || null,
      p_platform: 'android',
      p_package_name: packageName,
      p_purchase_state: 'purchased',
      p_expires_at: catalog.benefit.kind === 'premium' && catalog.benefit.durationDays
        ? new Date(Date.now() + catalog.benefit.durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
      p_raw_payload: {
        googlePurchase,
        clientPayload: payload.rawPayload || {},
        catalogBenefit: catalog.benefit,
      },
    });

    if (grantError) {
      throw grantError;
    }

    let googleFinalize: unknown = null;
    let googleFinalizeError: string | null = null;
    try {
      if (catalog.kind === 'consumable') {
        googleFinalize = await googlePublisherFetch(`${productPath}:consume`, accessToken, { method: 'POST', body: '{}' });
      } else if (googlePurchase.acknowledgementState !== 1) {
        googleFinalize = await googlePublisherFetch(`${productPath}:acknowledge`, accessToken, { method: 'POST', body: '{}' });
      }
    } catch (finalizeError) {
      googleFinalizeError = finalizeError instanceof Error ? finalizeError.message : String(finalizeError);
      console.error('[verify-google-play-purchase] finalize failed', googleFinalizeError);
    }

    return json({
      ok: true,
      productCode,
      productId,
      kind: catalog.kind,
      grant: grantResult,
      googleFinalize,
      googleFinalizeError,
    }, 200, corsHeaders);
  } catch (error) {
    return json({
      ok: false,
      reason: 'VERIFY_GOOGLE_PLAY_PURCHASE_FAILED',
      error: error instanceof Error ? error.message : String(error),
    }, 500, corsHeaders);
  }
});
