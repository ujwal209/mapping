import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ApiError, authApi } from '../../lib/authApi';

export const Route = createFileRoute('/(auth)/forgot-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const search = Route.useSearch();

  const [email, setEmail] = useState(search.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSentMessage(null);
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      setSentMessage(res.message);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to send password recovery email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#39359D]">
          Account recovery
        </p>
        <h1 className="mt-[6px] text-[32px] sm:text-[36px] font-semibold leading-[1.12] tracking-[-0.025em] text-[#141238]">
          Forgot your password?
        </h1>
        <p className="mt-[8px] text-[16px] font-normal leading-[1.5] text-[#5b5e7a]">
          Enter your registered work email and we&apos;ll send a time-limited
          recovery token.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-[28px] space-y-[20px]">
        {error && (
          <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-[16px] py-[12px] text-[14px] leading-[1.45] text-rose-800">
            {error}
          </div>
        )}

        {sentMessage && (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-[16px] py-[12px] text-[14px] leading-[1.45] text-emerald-900">
            <p>{sentMessage}</p>
            <Link
              to="/reset-password"
              search={{ token: resetToken }}
              className="mt-2 inline-block font-semibold text-[#39359D] underline"
            >
              Continue to set new password →
            </Link>
          </div>
        )}

        <div>
          <label
            htmlFor="forgot-email"
            className="block text-[14px] font-semibold tracking-[-0.01em] text-[#141238]"
          >
            Work email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex.rivera@enterprise.io"
            className="mt-[8px] h-[48px] w-full rounded-[12px] border border-[#DCE0F2] bg-[#F6F7FC] px-[16px] text-[16px] text-[#141238] placeholder:text-[#8f93b2] focus:border-[#39359D] focus:bg-[#ffffff] focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#39359D] px-[24px] py-[13px] text-[16px] font-semibold text-[#ffffff] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? 'Dispatching recovery email...' : 'Send recovery instructions'}
        </button>

        <div className="pt-[4px] text-center">
          <Link
            to="/login"
            className="text-[14px] font-semibold text-[#39359D] hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}