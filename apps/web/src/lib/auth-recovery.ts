export type SignInFailure = 'expired' | 'browser' | 'rate_limit' | 'failed';

export function signInFailure(error: { code?: string; message?: string }): SignInFailure {
  if (error.code === 'otp_expired') return 'expired';
  if (error.code === 'over_email_send_rate_limit' || /email rate limit exceeded/i.test(error.message ?? '')) return 'rate_limit';
  if (error.code === 'bad_code_verifier' || error.code === 'flow_state_not_found' || /code verifier|PKCE/i.test(error.message ?? '')) return 'browser';
  return 'failed';
}

export function signInRecovery(url: URL) {
  const fragment = new URLSearchParams(url.hash.slice(1));
  const reason = url.searchParams.get('signin');
  if (!reason && !url.searchParams.has('error') && !fragment.has('error')) return null;
  const code = url.searchParams.get('error_code') ?? fragment.get('error_code');
  if (reason === 'rate_limit' || code === 'over_email_send_rate_limit') return 'The sign-in email limit has been reached. Wait for it to reset before requesting a fresh email. Your older links may already have been used.';
  if (reason === 'expired' || code === 'otp_expired') return 'This sign-in link has expired or was already used. Request a fresh email and open its newest link in this same browser.';
  if (reason === 'browser') return 'Sign-in started in another browser or website address. Request a fresh email here and open its newest link in this browser.';
  return 'Sign-in could not be completed. Request a fresh sign-in email and open its newest link in this same browser.';
}
