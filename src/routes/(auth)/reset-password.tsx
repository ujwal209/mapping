import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ApiError, authApi } from '../../lib/authApi';

export const Route = createFileRoute('/(auth)/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [token, setToken] = useState(search.token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword(token.trim(), newPassword);
      navigate({
        to: '/login',
        search: { email: res.email, verified: false, reset: true },
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Invalid or expired recovery token.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#39359D]">
          Credential update
        </p>
        <h1 className="mt-[6px] text-[32px] sm:text-[36px] font-semibold leading-[1.12] tracking-[-0.025em] text-[#141238]">
          Set a new password
        </h1>
        <p className="mt-[8px] text-[16px] font-normal leading-[1.5] text-[#5b5e7a]">
          Paste your recovery token and choose a strong new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-[28px] space-y-[18px]">
        {error && (
          <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-[16px] py-[12px] text-[14px] leading-[1.45] text-rose-800">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="reset-token"
            className="block text-[14px] font-semibold tracking-[-0.01em] text-[#141238]"
          >
            Recovery token
          </label>
          <input
            id="reset-token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste recovery token"
            className="mt-[6px] h-[46px] w-full rounded-[12px] border border-[#DCE0F2] bg-[#F6F7FC] px-[16px] text-[15px] text-[#141238] placeholder:text-[#8f93b2] focus:border-[#39359D] focus:bg-[#ffffff] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="reset-new-password"
            className="block text-[14px] font-semibold tracking-[-0.01em] text-[#141238]"
          >
            New password
          </label>
          <div className="relative mt-[6px]">
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="h-[46px] w-full rounded-[12px] border border-[#DCE0F2] bg-[#F6F7FC] pl-[16px] pr-[60px] text-[16px] text-[#141238] placeholder:text-[#8f93b2] focus:border-[#39359D] focus:bg-[#ffffff] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#5b5e7a] hover:text-[#39359D]"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="reset-confirm-password"
            className="block text-[14px] font-semibold tracking-[-0.01em] text-[#141238]"
          >
            Confirm new password
          </label>
          <input
            id="reset-confirm-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="mt-[6px] h-[46px] w-full rounded-[12px] border border-[#DCE0F2] bg-[#F6F7FC] px-[16px] text-[16px] text-[#141238] placeholder:text-[#8f93b2] focus:border-[#39359D] focus:bg-[#ffffff] focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#39359D] px-[24px] py-[13px] text-[16px] font-semibold text-[#ffffff] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? 'Updating password...' : 'Reset password'}
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