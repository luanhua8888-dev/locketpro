import { corsHeaders, createAdminClient, jsonResponse, sha256 } from '../_shared/auth.ts';

const TEMP_CODE_PATTERN = /^TMP-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => null) as { username?: string; code?: string } | null;
    const username = body?.username?.trim().toLowerCase();
    const code = body?.code?.trim().toUpperCase();
    if (!username || username.length > 50 || !code || !TEMP_CODE_PATTERN.test(code)) {
      return jsonResponse({ error: 'Invalid or expired temporary code' }, 401);
    }

    const admin = createAdminClient();
    const codeHash = await sha256(code);
    const { data: consumed, error: consumeError } = await admin.rpc('consume_admin_login_code', {
      p_username: username,
      p_code_hash: codeHash,
    });

    if (consumeError) throw consumeError;
    const account = consumed?.[0];
    if (!account?.target_email) {
      return jsonResponse({ error: 'Invalid or expired temporary code' }, 401);
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: account.target_email,
    });
    if (linkError) throw linkError;

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(account.target_user_id);
    if (userError || !userData.user) throw userError ?? new Error('Target user not found');

    const { error: markResetError } = await admin.auth.admin.updateUserById(account.target_user_id, {
      app_metadata: {
        ...(userData.user.app_metadata ?? {}),
        temporary_password_reset_required: true,
        temporary_password_reset_issued_at: new Date().toISOString(),
      },
    });
    if (markResetError) throw markResetError;

    return jsonResponse({ tokenHash: linkData.properties.hashed_token });
  } catch (error) {
    console.error('redeem-admin-login-code:', error);
    return jsonResponse({ error: 'Could not use temporary code' }, 500);
  }
});
