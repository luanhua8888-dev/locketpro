import { corsHeaders, createAdminClient, jsonResponse, sha256 } from '../_shared/auth.ts';

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const createTemporaryCode = () => {
  const random = new Uint8Array(12);
  crypto.getRandomValues(random);
  return `TMP-${Array.from(random, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!accessToken) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as { targetUserId?: string } | null;
    const targetUserId = body?.targetUserId?.trim();
    if (!targetUserId || !USER_ID_PATTERN.test(targetUserId)) {
      return jsonResponse({ error: 'Invalid target user' }, 400);
    }

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !authData.user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const adminUserId = authData.user.id;
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const [adminProfileResult, targetProfileResult, recentCodesResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', adminUserId).maybeSingle(),
      admin.from('profiles').select('id, username').eq('id', targetUserId).maybeSingle(),
      admin
        .from('admin_login_codes')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', adminUserId)
        .gte('created_at', oneMinuteAgo),
    ]);

    if (adminProfileResult.error || adminProfileResult.data?.role?.toLowerCase().trim() !== 'admin') {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }
    if (targetProfileResult.error || !targetProfileResult.data) {
      return jsonResponse({ error: 'User not found' }, 404);
    }
    if ((recentCodesResult.count ?? 0) >= 10) {
      return jsonResponse({ error: 'Too many codes created. Try again in one minute.' }, 429);
    }

    const temporaryCode = createTemporaryCode();
    const codeHash = await sha256(temporaryCode);

    await admin
      .from('admin_login_codes')
      .update({ expires_at: new Date().toISOString() })
      .eq('created_by', adminUserId)
      .eq('target_user_id', targetUserId)
      .is('used_at', null);

    const { data: insertedCode, error: insertError } = await admin
      .from('admin_login_codes')
      .insert({ target_user_id: targetUserId, created_by: adminUserId, code_hash: codeHash })
      .select('expires_at')
      .single();

    if (insertError) throw insertError;

    return jsonResponse({
      code: temporaryCode,
      expiresAt: insertedCode.expires_at,
      username: targetProfileResult.data.username,
    });
  } catch (error) {
    console.error('create-admin-login-code:', error);
    return jsonResponse({ error: 'Could not create temporary login code' }, 500);
  }
});

