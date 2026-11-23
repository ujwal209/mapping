import { useEffect, useState } from 'react'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ApiError, authApi, tokenStorage } from '../../lib/authApi'

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
    verified: search.verified === '1' || search.verified === true,
    reset: search.reset === '1' || search.reset === true,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = tokenStorage.get()
      if (token) {
        throw redirect({ to: '/dashboard' })
      }
    }
  },
  component: LoginPage,
})

type LoginStage = 'idle' | 'authenticating' | 'loading_profile' | 'redirecting'

function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  useEffect(() => {
    if (tokenStorage.get()) {
      navigate({ to: '/dashboard' })
    }
  }, [navigate])

  const [email, setEmail] = useState(search.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [stage, setStage] = useState<LoginStage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)

  const isBusy = stage !== 'idle'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isBusy) return

    setError(null)
    setNeedsVerification(false)
    setStage('authenticating')

    try {
      const tokenRes = await authApi.login(email.trim(), password)
      if (!tokenRes?.access_token) {
        throw new ApiError('Authentication succeeded but no access token was returned.', 500)
      }

      tokenStorage.set(tokenRes.access_token)
      setStage('loading_profile')

      const profile = await authApi.me(tokenRes.access_token)
      if (typeof window !== 'undefined') {
        localStorage.setItem('ms_user_profile', JSON.stringify(profile))
      }

      setStage('redirecting')
      await new Promise((r) => setTimeout(r, 350))
      const targetUrl = search.redirect || '/dashboard'
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        window.location.href = targetUrl
      } else {
        navigate({ to: targetUrl as any })
      }
    } catch (err) {
      tokenStorage.clear()
      setStage('idle')

      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to sign in. Please check your credentials and try again.'
      setError(msg)

      if (
        (err instanceof ApiError && err.status === 403) ||
        msg.toLowerCase().includes('verif')
      ) {
        setNeedsVerification(true)
      }
    }
  }

  if (stage === 'loading_profile' || stage === 'redirecting') {
    return (
      <div className="rounded-[18px] border border-[#E3E5F3] bg-[#F6F7FC] p-[32px] text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#39359D] text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[#141238]">
            {stage === 'loading_profile' ? 'Loading your workspace' : 'Workspace ready'}
          </h2>
          <p className="mt-1 text-[14px] text-[#5b5e7a]">
            {stage === 'loading_profile'
              ? 'Validating session token and fetching tenant permissions...'
              : 'Redirecting to Migration Studio console...'}
          </p>
        </div>
        <Progress
          value={stage === 'loading_profile' ? 68 : 100}
          className="h-1.5 bg-[#E3E5F3] [&>div]:bg-[#39359D]"
        />
      </div>
    )
  }

  return (
    <div>
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.12] tracking-[-0.025em] text-[#141238]">
          Sign in to your workspace
        </h1>
        <p className="mt-[6px] text-[15px] font-normal text-[#5b5e7a]">
          Don&apos;t have an account yet?{' '}
          <Link to="/signup" className="font-semibold text-[#39359D] hover:underline">
            Create your workspace
          </Link>
        </p>
      </div>

      {search.verified && (
        <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            Your email is verified and your workspace is active. Sign in below.
          </AlertDescription>
        </Alert>
      )}

      {search.reset && (
        <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            Password updated successfully. Sign in with your new password.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {error && (
          <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-[13px] font-semibold">Sign-in failed</AlertTitle>
            <AlertDescription className="text-[13px]">
              <p>{error}</p>
              {needsVerification && (
                <Link
                  to="/verify-email"
                  search={{ email: email.trim(), token: '' }}
                  className="mt-1.5 inline-block font-semibold text-[#39359D] underline"
                >
                  Complete email verification →
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-[13px] font-semibold text-[#141238]">
            Work email
          </Label>
          <Input
            id="login-email"
            type="email"
            required
            disabled={isBusy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-[44px] rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] text-[15px]"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-[13px] font-semibold text-[#141238]">
              Password
            </Label>
            <Link
              to="/forgot-password"
              search={{ email: email.trim() }}
              className="text-[13px] font-semibold text-[#39359D] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              data-1p-ignore
              type={showPassword ? 'text' : 'password'}
              required
              disabled={isBusy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="h-[44px] w-full rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] pr-11 text-[15px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isBusy}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-1 top-1 z-50 h-[36px] w-[36px] cursor-pointer rounded-[8px] text-[#5b5e7a] hover:bg-[#39359D]/10 hover:text-[#39359D]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isBusy}
          className="h-[46px] w-full cursor-pointer rounded-full bg-[#39359D] text-[16px] font-semibold text-white hover:bg-[#2e2a82]"
        >
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {stage === 'authenticating' ? 'Verifying credentials...' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}