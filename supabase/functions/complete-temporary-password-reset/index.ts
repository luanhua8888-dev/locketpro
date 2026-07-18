import { corsHeaders, createAdminClient, jsonResponse } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!accessToken) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null) as { password?: string } | null;
    const password = body?.password;
    if (typeof password !== 'string' || password.length < 6 || password.length > 72) {
      return jsonResponse({ error: 'Password must be between 6 and 72 characters' }, 400);
    }

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
    if (authError || !authData.user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const appMetadata = authData.user.app_metadata ?? {};
    if (appMetadata.temporary_password_reset_required !== true) {
      return jsonResponse({ error: 'Temporary password reset is not authorized' }, 403);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(authData.user.id, {
      password,
      app_metadata: {
        ...appMetadata,
        temporary_password_reset_required: false,
        temporary_password_reset_issued_at: null,
      },
    });
    if (updateError) throw updateError;

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('complete-temporary-password-reset:', error);
    return jsonResponse({ error: 'Could not update password' }, 500);
  }
});
