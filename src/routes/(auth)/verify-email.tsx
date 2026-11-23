import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ApiError, authApi } from '../../lib/authApi';

export const Route = createFileRoute('/(auth)/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email, setEmail] = useState(search.email || '');
  const [token, setToken] = useState(search.token || '');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    search.email
      ? `We dispatched a verification email to ${search.email}. Confirm using the link in your inbox or paste the token below.`
      : null
  );

  // Auto-verify when opened directly from an email hyperlink with ?token=...
  useEffect(() => {
    if (search.token && !search.email) {
      handleVerifyToken(search.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerifyToken = async (tokenValue: string) => {
    if (!tokenValue.trim()) return;
    setError(null);
    setVerifying(true);

    try {
      const res = await authApi.verifyEmail(tokenValue.trim());
      navigate({
        to: '/login',
        search: { email: res.email, verified: true, reset: false },
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Verification token is invalid or expired.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyToken(token);
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Enter your registered email address below to request a new verification email.');
      return;
    }
    setError(null);
    setInfo(null);
    setResending(true);

    try {
      const res = await authApi.resendVerification(email.trim());
      setInfo(res.message);
      if (res.verification_token) {
        setToken(res.verification_token);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to resend verification email.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#39359D]">
          Step 2 of 2 · Activation
        </p>
        <h1 className="mt-[6px] text-[32px] sm:text-[36px] font-semibold leading-[1.12] tracking-[-0.025em] text-[#141238]">
          Verify your email
        </h1>
        <p className="mt-[8px] text-[16px] font-normal leading-[1.5] text-[#5b5e7a]">
          Activate your account to unlock console access and API keys.
        </p>
      </div>

      <div className="mt-[24px] space-y-[20px]">
        {info && (
          <div className="rounded-[14px] border border-[#39359D]/20 bg-[#F6F7FC] px-[16px] py-[12px] text-[14px] leading-[1.45] text-[#141238]">
            {info}
          </div>
        )}

        {error && (
          <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-[16px] py-[12px] text-[14px] leading-[1.45] text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-[16px]">
          <div>
            <label
              htmlFor="verify-token"
              className="block text-[14px] font-semibold tracking-[-0.01em] text-[#141238]"
            >
              Verification token
            </label>
            <input
              id="verify-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste verification token from your email"
              className="mt-[8px] h-[48px] w-full rounded-[12px] border border-[#DCE0F2] bg-[#F6F7FC] px-[16px] text-[15px] text-[#141238] placeholder:text-[#8f93b2] focus:border-[#39359D] focus:bg-[#ffffff] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full rounded-full bg-[#39359D] px-[24px] py-[13px] text-[16px] font-semibold text-[#ffffff] active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {verifying ? 'Verifying account...' : 'Verify & activate account'}
          </button>
        </form>

        {/* Resend Verification Card */}
        <div className="rounded-[16px] border border-[#E3E5F3] bg-[#F6F7FC] p-[18px]">
          <div className="text-[14px] font-semibold text-[#141238]">
            Didn&apos;t receive the verification email?
          </div>
          <p className="mt-[4px] text-[13px] text-[#5b5e7a]">
            Check your spam folder or dispatch a fresh activation token below.
          </p>
          <div className="mt-[12px] flex flex-col sm:flex-row gap-[8px]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.rivera@enterprise.io"
              className="h-[42px] flex-1 rounded-[10px] border border-[#DCE0F2] bg-[#ffffff] px-[14px] text-[14px] text-[#141238] focus:border-[#39359D] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="h-[42px] rounded-full border border-[#39359D] bg-[#ffffff] px-[18px] text-[14px] font-semibold text-[#39359D] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {resending ? 'Sending...' : 'Resend email'}
            </button>
          </div>
        </div>

        <div className="pt-[4px] text-center">
          <Link
            to="/login"
            className="text-[14px] font-semibold text-[#39359D] hover:underline"
          >
            ← Return to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}