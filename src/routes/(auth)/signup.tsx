import { useEffect, useState } from 'react'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError, authApi, tokenStorage } from '../../lib/authApi'

export const Route = createFileRoute('/(auth)/signup')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = tokenStorage.get()
      if (token) {
        throw redirect({ to: '/dashboard' })
      }
    }
  },
  component: SignupPage,
})

const ROLE_OPTIONS = [
  'Data Engineer',
  'Senior Data Engineer',
  'Staff / Principal Data Engineer',
  'Analytics Engineer',
  'Data Architect',
  'Enterprise Solutions Architect',
  'Platform / Infrastructure Engineer',
  'Database Administrator (DBA)',
  'BI / Data Warehouse Developer',
  'ETL / Integration Specialist',
  'ML / AI Engineer',
  'Data Governance & Compliance Lead',
  'Head of Data / VP of Data',
  'Engineering Manager',
] as const

function SignupPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (tokenStorage.get()) {
      navigate({ to: '/dashboard' })
    }
  }, [navigate])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [role, setRole] = useState<string>('Data Engineer')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.signup({
        full_name: fullName.trim(),
        email: email.trim(),
        organization: organization.trim(),
        role,
        password,
      })

      navigate({
        to: '/verify-email',
        search: {
          email: res.email,
          token: res.verification_token || '',
        },
      })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Registration failed. Please verify your details and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.12] tracking-[-0.025em] text-[#141238]">
          Create your workspace
        </h1>
        <p className="mt-[4px] text-[15px] font-normal text-[#5b5e7a]">
          Register to start managing schema migrations ·{' '}
          <Link to="/login" search={{ email: '', verified: false, reset: false }} className="font-semibold text-[#39359D] hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {error && (
          <Alert variant="destructive" className="border-rose-200 bg-rose-50 py-2.5 text-rose-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-[13px]">{error}</AlertDescription>
          </Alert>
        )}

        {/* Row 1: Full Name + Work Email */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="signup-name" className="text-[13px] font-semibold text-[#141238]">
              Full name
            </Label>
            <Input
              id="signup-name"
              type="text"
              required
              disabled={loading}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="h-[42px] rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] text-[15px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="signup-email" className="text-[13px] font-semibold text-[#141238]">
              Work email
            </Label>
            <Input
              id="signup-email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-[42px] rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] text-[15px]"
            />
          </div>
        </div>

        {/* Row 2: Organization + shadcn Select Role */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="signup-org" className="text-[13px] font-semibold text-[#141238]">
              Organization
            </Label>
            <Input
              id="signup-org"
              type="text"
              required
              disabled={loading}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Acme Inc."
              className="h-[42px] rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] text-[15px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="signup-role" className="text-[13px] font-semibold text-[#141238]">
              Role
            </Label>
            <Select value={role} onValueChange={(val) => setRole(val)} disabled={loading}>
              <SelectTrigger
                id="signup-role"
                className="h-[42px] w-full cursor-pointer rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] text-[15px] text-[#141238]"
              >
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent className="z-[9999] max-h-[240px] rounded-[14px] border-[#DCE0F2] bg-white shadow-xl">
                {ROLE_OPTIONS.map((item) => (
                  <SelectItem
                    key={item}
                    value={item}
                    className="cursor-pointer rounded-[8px] text-[14px] text-[#141238] focus:bg-[#39359D]/10 focus:text-[#39359D]"
                  >
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Password + Confirm Password */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="signup-password" className="text-[13px] font-semibold text-[#141238]">
              Password
            </Label>
            <div className="relative">
              <Input
                id="signup-password"
                data-1p-ignore
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="h-[42px] w-full rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] pr-11 text-[15px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 top-1 z-50 h-[34px] w-[34px] cursor-pointer rounded-[8px] text-[#5b5e7a] hover:bg-[#39359D]/10 hover:text-[#39359D]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="signup-confirm" className="text-[13px] font-semibold text-[#141238]">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="signup-confirm"
                data-1p-ignore
                type={showConfirmPassword ? 'text' : 'password'}
                required
                disabled={loading}
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="h-[42px] w-full rounded-[11px] border-[#DCE0F2] bg-[#F6F7FC] pr-11 text-[15px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={loading}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-1 top-1 z-50 h-[34px] w-[34px] cursor-pointer rounded-[8px] text-[#5b5e7a] hover:bg-[#39359D]/10 hover:text-[#39359D]"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-[46px] w-full cursor-pointer rounded-full bg-[#39359D] text-[16px] font-semibold text-white hover:bg-[#2e2a82]"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Creating workspace...' : 'Create workspace'}
        </Button>
      </form>
    </div>
  )
}