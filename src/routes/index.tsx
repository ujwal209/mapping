import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ChevronDown,
  LayoutGrid,
  LogOut,
  Rocket,
  Table2,
  ArrowRight,
} from 'lucide-react';
import { tokenStorage, type UserProfileResponse } from '../lib/authApi';
import {
  CONNECTOR_CATEGORIES,
  CONNECTORS,
  type ConnectorKey,
  FAQS,
  FEATURES,
  STEPS,
} from '../data/landingData';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function ConnectorLogo({
  connectorKey,
  size = 'md',
}: {
  connectorKey: ConnectorKey;
  size?: 'sm' | 'md';
}) {
  const boxClass =
    size === 'sm'
      ? 'h-[18px] w-[18px]'
      : 'h-[40px] w-[40px] rounded-[11px] border border-[#E3E5F3] bg-[#F6F7FC] p-[8px]';

  const icons: Record<ConnectorKey, ReactElement> = {
    fabric: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M5 17.5L13.5 4h5.5L10.5 17.5H5z" fill="#117865" />
        <path d="M5 12.5L10.5 4H16l-5.5 8.5H5z" fill="#29B596" />
        <path d="M5 20l4-6h5.5l-4 6H5z" fill="#0B5345" />
      </svg>
    ),
    dynamics: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M5 4l9 4.5v5L5 9V4z" fill="#2A4494" />
        <path d="M5 11l14 4.5-14 4.5v-9z" fill="#0078D4" />
      </svg>
    ),
    snowflake: (
      <svg viewBox="0 0 24 24" className="h-full w-full" stroke="#29B5E8" strokeWidth="2.2" strokeLinecap="round">
        <line x1="12" y1="2.5" x2="12" y2="21.5" />
        <line x1="3.8" y1="7.2" x2="20.2" y2="16.8" />
        <line x1="20.2" y1="7.2" x2="3.8" y2="16.8" />
        <circle cx="12" cy="12" r="2.2" fill="#29B5E8" />
      </svg>
    ),
    databricks: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M12 3L3 8l9 5 9-5-9-5z" fill="#FF3621" />
        <path d="M3 12.5l9 5 9-5" stroke="#FF3621" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 16.5l9 5 9-5" stroke="#FF3621" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    postgres: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <ellipse cx="12" cy="11" rx="7" ry="6.5" fill="#336791" />
        <path d="M15.5 14.5v4.5a2 2 0 01-4 0v-2" stroke="#336791" strokeWidth="2.3" strokeLinecap="round" />
        <circle cx="9.8" cy="9.8" r="1.1" fill="#ffffff" />
        <circle cx="14.2" cy="9.8" r="1.1" fill="#ffffff" />
      </svg>
    ),
    sqlserver: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <ellipse cx="12" cy="6" rx="7.5" ry="3" fill="#CC2927" />
        <path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" stroke="#CC2927" strokeWidth="2" />
        <path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" stroke="#CC2927" strokeWidth="2" />
      </svg>
    ),
    oracle: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <rect x="3" y="7.5" width="18" height="9" rx="4.5" stroke="#F80000" strokeWidth="2.6" />
      </svg>
    ),
    mongodb: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M12 2.5C8.5 7 7 10.2 7 13.5c0 3.2 2.2 5.4 5 6.5 2.8-1.1 5-3.3 5-6.5 0-3.3-1.5-6.5-5-11z" fill="#47A248" />
        <line x1="12" y1="11" x2="12" y2="21.5" stroke="#2B6B2C" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    bigquery: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <circle cx="11" cy="11" r="6.5" stroke="#4285F4" strokeWidth="2.4" />
        <rect x="8.2" y="10" width="1.6" height="3.5" rx="0.5" fill="#4285F4" />
        <rect x="10.4" y="8.2" width="1.6" height="5.3" rx="0.5" fill="#4285F4" />
        <rect x="12.6" y="11.2" width="1.6" height="2.3" rx="0.5" fill="#4285F4" />
        <line x1="16" y1="16" x2="20.5" y2="20.5" stroke="#4285F4" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    ),
    salesforce: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path
          d="M7.5 18h9.2a4.3 4.3 0 00.5-8.57A5.5 5.5 0 006.6 8.3 4.5 4.5 0 007.5 18z"
          fill="#00A1E0"
        />
      </svg>
    ),
    s3: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M5 5h14l-1.6 14H6.6L5 5z" fill="#569A31" />
        <ellipse cx="12" cy="5" rx="7" ry="2.2" fill="#7AA116" />
      </svg>
    ),
    azure: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
        <path d="M10.5 4L4 19h5.2l3.8-9.2L16.5 19H20L13.5 4h-3z" fill="#0078D4" />
      </svg>
    ),
  };

  if (size === 'sm') {
    return <span className={`inline-block shrink-0 ${boxClass}`}>{icons[connectorKey]}</span>;
  }

  return <div className={`inline-flex items-center justify-center shrink-0 ${boxClass}`}>{icons[connectorKey]}</div>;
}

function DesignerWordmark() {
  return (
    <span className="inline-flex items-center select-none">
      <span className="text-[20px] font-semibold tracking-[-0.045em] text-[#39359D]">
        migration
      </span>
      <span className="mx-[8px] h-[15px] w-[1px] bg-[#39359D]/25" />
      <span className="text-[20px] font-light tracking-[-0.03em] text-[#5b5e7a]">
        studio
      </span>
    </span>
  );
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'MS';
}

function LandingPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authenticated User State for Navbar
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      try {
        const raw = localStorage.getItem('ms_user_profile');
        if (raw) {
          setUser(JSON.parse(raw));
        } else {
          setUser({
            user_id: 'uid',
            email: 'user@workspace.com',
            full_name: 'Member',
            tenant_id: 'default',
            role: 'Engineer',
            is_verified: true,
          });
        }
      } catch {
        setUser({
          user_id: 'uid',
          email: 'user@workspace.com',
          full_name: 'Member',
          tenant_id: 'default',
          role: 'Engineer',
          is_verified: true,
        });
      }
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  const handleSignOut = () => {
    tokenStorage.clear();
    localStorage.removeItem('ms_user_profile');
    setUser(null);
    setUserDropdownOpen(false);
  };

  const filteredConnectors =
    selectedCategory === 'All'
      ? CONNECTORS
      : CONNECTORS.filter((c) => c.category === selectedCategory);

  return (
    <div
      style={{ fontFamily: "'Google Sans', system-ui, -apple-system, sans-serif" }}
      className="min-h-screen bg-[#ffffff] text-[#141238]"
    >
      {/* ================= SINGLE STICKY NAVBAR WITH WORKING MOBILE HAMBURGER ================= */}
      <header className="sticky top-0 z-50 border-b border-[#39359D]/[0.1] bg-[#ffffff]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between px-4 sm:px-8">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center"
          >
            <DesignerWordmark />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-[28px] text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-[#3d3f5c]">
            <a href="#product" className="hover:text-[#39359D] transition-colors">Product</a>
            <a href="#connectors" className="hover:text-[#39359D] transition-colors">Browse connectors</a>
            <a href="#workflow" className="hover:text-[#39359D] transition-colors">How it works</a>
            <a href="#solutions" className="hover:text-[#39359D] transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-[#39359D] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#39359D] transition-colors">Resources</a>
          </nav>

          {/* Desktop Auth CTAs vs Avatar */}
          {user ? (
            <div ref={userMenuRef} className="hidden md:flex items-center gap-[14px]">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#39359D] px-[15px] py-[7px] text-[13.5px] font-medium text-white shadow-xs hover:bg-[#2f2b84] active:scale-95 transition-all"
              >
                <span>Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-[#39359D]/20 transition"
                  aria-label="User profile menu"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#39359D] text-white text-xs font-semibold font-mono shadow-xs">
                    {getInitials(user.full_name, user.email)}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                      userDropdownOpen ? 'rotate-180 text-[#39359D]' : ''
                    }`}
                  />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {user.full_name || 'Logged in user'}
                      </div>
                      {user.email && (
                        <div className="text-[11px] text-slate-500 truncate">
                          {user.email}
                        </div>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <LayoutGrid className="w-3.5 h-3.5 text-[#39359D]" />
                        <span>Workspace Dashboard</span>
                      </Link>
                      <Link
                        to="/table-matching"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <Table2 className="w-3.5 h-3.5 text-[#39359D]" />
                        <span>Table Matching Studio</span>
                      </Link>
                      <Link
                        to="/migrations"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                      >
                        <Rocket className="w-3.5 h-3.5 text-[#39359D]" />
                        <span>Migration Engine</span>
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-[12px]">
              <Link
                to="/login"
                search={{ email: '', verified: false, reset: false }}
                className="rounded-[8px] border border-[#39359D]/20 bg-[#ffffff] px-[15px] py-[8px] text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-[#39359D] active:scale-95 transition-transform"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-[#39359D] px-[20px] py-[8px] text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-[#ffffff] active:scale-95 transition-transform"
              >
                Get started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button (44x44 touch target) */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex h-[44px] w-[44px] items-center justify-center rounded-[10px] text-[#141238] hover:bg-[#F6F7FC] active:scale-95 transition-transform"
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E3E5F3] bg-[#ffffff] px-6 pt-4 pb-6">
            <nav className="flex flex-col divide-y divide-[#F0F1F8] text-[17px] font-normal tracking-[-0.374px] text-[#141238]">
              <a
                href="#product"
                onClick={() => setMobileMenuOpen(false)}
                className="py-[12px] hover:text-[#39359D]"
              >
                Product
              </a>
              <a
                href="#connectors"
                onClick={() => setMobileMenuOpen(false)}
                className="py-[12px] hover:text-[#39359D]"
              >
                Browse connectors
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="py-[12px] hover:text-[#39359D]"
              >
                How it works
              </a>
              <a
                href="#solutions"
                onClick={() => setMobileMenuOpen(false)}
                className="py-[12px] hover:text-[#39359D]"
              >
                Solutions
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-[12px] hover:text-[#39359D]"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-[12px] hover:text-[#39359D]"
              >
                Resources
              </a>
            </nav>

            {user ? (
              <div className="mt-[20px] p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#39359D] text-white text-xs font-semibold font-mono">
                    {getInitials(user.full_name, user.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {user.full_name || 'Logged in user'}
                    </div>
                    {user.email && (
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg bg-[#39359D] py-2 text-center text-xs font-medium text-white shadow-xs"
                  >
                    Console
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700 hover:text-rose-600"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-[20px] grid grid-cols-2 gap-[12px]">
                <Link
                  to="/login"
                  search={{ email: '', verified: false, reset: false }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full border border-[#39359D] py-[11px] text-center text-[15px] font-normal text-[#39359D] active:scale-95 transition-transform"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full bg-[#39359D] py-[11px] text-center text-[15px] font-normal text-[#ffffff] active:scale-95 transition-transform"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ================= TILE 1: CLEAN GALLERY HERO (#ffffff, NO MOCKUP) ================= */}
      <section className="w-full rounded-none bg-[#ffffff] py-[72px] sm:py-[96px] text-center">
        <div className="mx-auto max-w-[980px] px-4 sm:px-8">
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-semibold leading-[1.07] tracking-[-0.28px] text-[#141238]">
            Move your data without the{' '}
            <span className="text-[#39359D]">guesswork.</span>
          </h1>

          <p className="mx-auto mt-[20px] max-w-[740px] text-[21px] sm:text-[28px] font-normal leading-[1.18] tracking-[0.196px] text-[#4b4d6b]">
            Copy data from one system to another — safely, with a record of
            exactly what changed and where every row came from.
          </p>

          <div className="mt-[32px] flex flex-wrap items-center justify-center gap-[16px]">
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="rounded-full bg-[#39359D] px-[26px] py-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#ffffff] active:scale-95 transition-transform"
            >
              {user ? 'Open Console' : 'Get started free'}
            </Link>
            <a
              href="#workflow"
              className="rounded-full border border-[#39359D] bg-[#ffffff] px-[26px] py-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#39359D] active:scale-95 transition-transform"
            >
              See how it works
            </a>
          </div>

          {/* Works With — Crisp Vector Connector Pills */}
          <div className="mt-[56px] border-t border-[#E3E5F3] pt-[36px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#787b9a]">
              Works with
            </p>
            <div className="mt-[16px] flex flex-wrap items-center justify-center gap-[10px] sm:gap-[12px]">
              {CONNECTORS.slice(0, 8).map((c) => (
                <div
                  key={c.name}
                  className="inline-flex items-center gap-[8px] rounded-full border border-[#E3E5F3] bg-[#F6F7FC] px-[14px] py-[7px]"
                >
                  <ConnectorLogo connectorKey={c.key} size="sm" />
                  <span className="text-[14px] font-normal tracking-[-0.224px] text-[#141238]">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= TILE 2: SOFT INDIGO ALABASTER (#F6F7FC) — WHAT YOU GET ================= */}
      <section id="product" className="w-full rounded-none bg-[#F6F7FC] py-[64px] sm:py-[80px] text-[#141238]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
              What you get
            </p>
            <h2 className="mt-[8px] text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#141238]">
              Everything you need to move data safely.
            </h2>
            <p className="mt-[12px] text-[21px] sm:text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#4b4d6b]">
              No more scripts, spreadsheets, or guesswork. Six things that make
              migrations boring — in the good way.
            </p>
          </div>

          <div className="mt-[48px] grid gap-[24px] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, idx) => (
              <div
                key={f.title}
                className="rounded-[18px] border border-[#E3E5F3] bg-[#ffffff] p-[24px]"
              >
                <div className="text-[12px] font-semibold tracking-[0.06em] text-[#39359D]">
                  0{idx + 1}
                </div>
                <h3 className="mt-[8px] text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#141238]">
                  {f.title}
                </h3>
                <p className="mt-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#4b4d6b]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TILE 3: PURE WHITE (#ffffff) — CONNECT ANYTHING ================= */}
      <section id="connectors" className="w-full rounded-none bg-[#ffffff] py-[64px] sm:py-[80px] text-[#141238]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
              Connect anything
            </p>
            <h2 className="mt-[8px] text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#141238]">
              Your systems, already supported.
            </h2>

            {/* Configurator Option Chips */}
            <div className="mt-[32px] flex flex-wrap justify-center gap-[8px]">
              {CONNECTOR_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-[18px] py-[10px] text-[14px] leading-[1.43] tracking-[-0.224px] active:scale-95 transition-transform ${
                      isSelected
                        ? 'bg-[#39359D] font-semibold text-[#ffffff]'
                        : 'border border-[#E3E5F3] bg-[#F6F7FC] font-normal text-[#141238]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-[48px] grid gap-[24px] sm:grid-cols-2 lg:grid-cols-4">
            {filteredConnectors.map((item) => (
              <div
                key={item.name}
                className="rounded-[18px] border border-[#E3E5F3] bg-[#ffffff] p-[24px]"
              >
                <div className="flex items-center justify-between">
                  <ConnectorLogo connectorKey={item.key} />
                  <span className="text-[12px] font-normal tracking-[-0.12px] text-[#787b9a]">
                    {item.category}
                  </span>
                </div>
                <h3 className="mt-[17px] text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-[#141238]">
                  {item.name}
                </h3>
                <p className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#4b4d6b]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TILE 4: ARCHITECTURAL GALLERY STEPPER (#F6F7FC) — HOW IT WORKS ================= */}
      <section id="workflow" className="w-full rounded-none bg-[#F6F7FC] py-[64px] sm:py-[88px] text-[#141238]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
              How it works
            </p>
            <h2 className="mt-[8px] text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#141238]">
              Four steps. No surprises.
            </h2>
            <p className="mt-[12px] text-[21px] sm:text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#4b4d6b]">
              Every step is checked and reversible. Nothing lands in your
              destination without your say-so.
            </p>
          </div>

          <div className="relative mx-auto mt-[56px] max-w-[1280px]">
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-[22px] left-[12%] right-[12%] h-[1px] bg-[#39359D]/20"
            />

            <div className="grid gap-[24px] sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.num} className="relative flex flex-col">
                  <div className="mb-[20px] flex items-center gap-[12px]">
                    <span className="relative z-10 inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#39359D] text-[14px] font-semibold tracking-[-0.224px] text-[#ffffff]">
                      {s.num}
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#787b9a]">
                      {s.phase}
                    </span>
                  </div>

                  <div className="flex-1 rounded-[18px] border border-[#E3E5F3] bg-[#ffffff] p-[28px]">
                    <h3 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#141238]">
                      {s.title}
                    </h3>
                    <p className="mt-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#4b4d6b]">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= TILE 5: PURE WHITE (#ffffff) — COMPARISON & METRICS ================= */}
      <section id="solutions" className="w-full rounded-none bg-[#ffffff] py-[64px] sm:py-[80px] text-[#141238]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
              A better way
            </p>
            <h2 className="mt-[8px] text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#141238]">
              The old way vs the sane way.
            </h2>
          </div>

          <div className="mx-auto mt-[48px] grid max-w-[1120px] gap-[24px] lg:grid-cols-2">
            <div className="rounded-[18px] border border-[#E3E5F3] bg-[#F6F7FC] p-[32px]">
              <div className="text-[14px] font-semibold tracking-[-0.224px] text-[#787b9a]">
                The old way
              </div>
              <h3 className="mt-[4px] text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#141238]">
                Spreadsheets &amp; scripts
              </h3>
              <ul className="mt-[24px] space-y-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#4b4d6b]">
                <li>Spreadsheets with 900 columns, no validation</li>
                <li>Scripts nobody can explain a year later</li>
                <li>Silent failures — you find out from a report</li>
                <li>No record of which row came from where</li>
                <li>Reruns create duplicates; nobody notices</li>
              </ul>
            </div>

            <div className="rounded-[18px] border-2 border-[#39359D] bg-[#ffffff] p-[32px]">
              <div className="text-[14px] font-semibold tracking-[-0.224px] text-[#39359D]">
                Migration Studio · The sane way
              </div>
              <h3 className="mt-[4px] text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#141238]">
                Structured &amp; signed
              </h3>
              <ul className="mt-[24px] space-y-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#141238]">
                <li>Column mapping reviewed and approved once</li>
                <li>Every run has a permanent, signed report</li>
                <li>Run halts if the source schema drifts</li>
                <li>Click any target row to see its source</li>
                <li>Idempotent loads — retries are safe</li>
              </ul>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="mx-auto mt-[48px] grid max-w-[1120px] grid-cols-2 gap-[24px] border-t border-[#E3E5F3] pt-[48px] sm:grid-cols-4 text-center">
            <div>
              <div className="text-[40px] font-semibold leading-[1.1] text-[#39359D]">240M+</div>
              <div className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">Rows moved</div>
            </div>
            <div>
              <div className="text-[40px] font-semibold leading-[1.1] text-[#39359D]">12+</div>
              <div className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">Systems supported</div>
            </div>
            <div>
              <div className="text-[40px] font-semibold leading-[1.1] text-[#39359D]">99.99%</div>
              <div className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">Rows matched</div>
            </div>
            <div>
              <div className="text-[40px] font-semibold leading-[1.1] text-[#39359D]">&lt;2s</div>
              <div className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">Connection check</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TILE 6: SOFT INDIGO ALABASTER (#F6F7FC) — REGULATED & SECURITY ================= */}
      <section className="w-full rounded-none bg-[#F6F7FC] py-[64px] sm:py-[80px] text-[#141238]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
              Built for regulated teams
            </p>
            <h2 className="mt-[8px] text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#141238]">
              Safe by default. Auditable by design.
            </h2>
          </div>

          <div className="mt-[48px] grid gap-[24px] sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Encrypted in transit and at rest', desc: 'TLS 1.3 for every connection. AES-256 at rest.' },
              { title: 'Secrets never touch logs', desc: 'Credentials are referenced, never printed. Every log line is scrubbed.' },
              { title: 'Full audit trail', desc: 'Every mutation produces a tamper-evident event with actor and timestamp.' },
              { title: 'Reversible runs', desc: 'Rollback creates a separate record — the original run is preserved forever.' },
            ].map((s) => (
              <div key={s.title} className="rounded-[18px] border border-[#E3E5F3] bg-[#ffffff] p-[24px]">
                <h3 className="text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-[#141238]">
                  {s.title}
                </h3>
                <p className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#4b4d6b]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-[32px] text-center">
            <p className="text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#4b4d6b]">
              Compliance, ready out of the box — Evidence bundles mapped to{' '}
              <span className="font-semibold text-[#39359D]">
                SOC 2 Type II · ISO 27001 · GDPR ready · HIPAA aligned
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ================= TILE 7: PURE WHITE (#ffffff) — TESTIMONIALS & PRICING ================= */}
      <section className="w-full rounded-none bg-[#ffffff] py-[64px] sm:py-[80px] text-[#141238]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="mx-auto max-w-[980px] text-center">
            <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
              Trusted by data teams · 4.9 · 120+ reviews
            </p>
            <h2 className="mt-[8px] text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#141238]">
              What teams say after their first run.
            </h2>
          </div>

          <div className="mt-[48px] grid gap-[24px] lg:grid-cols-3">
            {[
              {
                quote:
                  'We replaced a 900-column spreadsheet with Migration Studio and cut our quarterly migration window from two weeks to three days.',
                initials: 'PR',
                name: 'Priya Raghunathan',
                role: 'Data Platform Lead, Global Retail Bank',
              },
              {
                quote:
                  'The pre-flight drift gate caught a schema change that would have silently corrupted our target warehouse. That alone paid for the platform.',
                initials: 'MA',
                name: 'Marcus Aldridge',
                role: 'Principal Engineer, Logistics SaaS',
              },
              {
                quote:
                  "Reverse lineage was the audit team's biggest ask. Now they can click any target record and see the exact source row that produced it.",
                initials: 'HO',
                name: 'Hana Okafor',
                role: 'Head of Data Governance, Health Insurer',
              },
            ].map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between rounded-[18px] border border-[#E3E5F3] bg-[#F6F7FC] p-[24px]"
              >
                <p className="text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#141238]">
                  “{t.quote}”
                </p>
                <div className="mt-[24px] flex items-center gap-[12px]">
                  <span className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#39359D] text-[14px] font-semibold text-white">
                    {t.initials}
                  </span>
                  <div>
                    <div className="text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-[#141238]">
                      {t.name}
                    </div>
                    <div className="text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-[#787b9a]">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div id="pricing" className="mx-auto mt-[80px] max-w-[980px] text-center">
            <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
              Pricing
            </p>
            <h2 className="mt-[8px] text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#141238]">
              Start free. Scale when you&apos;re ready.
            </h2>
          </div>

          <div className="mt-[48px] grid gap-[24px] lg:grid-cols-3">
            {/* Starter */}
            <div className="flex flex-col justify-between rounded-[18px] border border-[#E3E5F3] bg-[#ffffff] p-[24px]">
              <div>
                <h3 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#141238]">
                  Starter
                </h3>
                <p className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">
                  For individual engineers exploring the platform.
                </p>
                <div className="mt-[24px] text-[40px] font-semibold leading-[1.1] text-[#141238]">
                  Free <span className="text-[17px] font-normal text-[#787b9a]">forever</span>
                </div>
                <ul className="mt-[24px] space-y-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#141238]">
                  <li>1 concurrent pipeline</li>
                  <li>10K rows per run</li>
                  <li>Column matching &amp; review</li>
                  <li>Community support</li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="mt-[32px] block rounded-full border border-[#39359D] px-[22px] py-[11px] text-center text-[17px] font-normal text-[#39359D] active:scale-95 transition-transform"
              >
                Start free
              </Link>
            </div>

            {/* Team */}
            <div className="flex flex-col justify-between rounded-[18px] border-2 border-[#39359D] bg-[#F6F7FC] p-[24px]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#141238]">
                    Team
                  </h3>
                  <span className="text-[14px] font-semibold tracking-[-0.224px] text-[#39359D]">
                    Most popular
                  </span>
                </div>
                <p className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">
                  For production teams running real migrations.
                </p>
                <div className="mt-[24px] text-[40px] font-semibold leading-[1.1] text-[#39359D]">
                  $99 <span className="text-[17px] font-normal text-[#787b9a]">per month</span>
                </div>
                <ul className="mt-[24px] space-y-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#141238]">
                  <li>Unlimited pipelines</li>
                  <li>10M rows per run</li>
                  <li>Reverse row-level lineage</li>
                  <li>Drift gating + policy waivers</li>
                  <li>Priority support</li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="mt-[32px] block rounded-full bg-[#39359D] px-[22px] py-[11px] text-center text-[17px] font-normal text-[#ffffff] active:scale-95 transition-transform"
              >
                Start 14-day trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="flex flex-col justify-between rounded-[18px] border border-[#E3E5F3] bg-[#ffffff] p-[24px]">
              <div>
                <h3 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#141238]">
                  Enterprise
                </h3>
                <p className="mt-[8px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">
                  For regulated industries with deep audit needs.
                </p>
                <div className="mt-[24px] text-[40px] font-semibold leading-[1.1] text-[#141238]">
                  Custom <span className="text-[17px] font-normal text-[#787b9a]">annual</span>
                </div>
                <ul className="mt-[24px] space-y-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#141238]">
                  <li>Everything in Team</li>
                  <li>Unlimited rows per run</li>
                  <li>SAML SSO + SCIM</li>
                  <li>Audit export to S3 / Azure</li>
                  <li>Dedicated CSM + SLA</li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="mt-[32px] block rounded-full border border-[#39359D] px-[22px] py-[11px] text-center text-[17px] font-normal text-[#39359D] active:scale-95 transition-transform"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TILE 8: SOFT INDIGO ALABASTER (#F6F7FC) — FAQ ================= */}
      <section id="faq" className="w-full rounded-none bg-[#F6F7FC] py-[64px] sm:py-[80px] text-[#141238]">
        <div className="mx-auto max-w-[980px] px-4 sm:px-8">
          <p className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#39359D]">
            FAQ
          </p>
          <h2 className="mt-[8px] text-[34px] font-semibold leading-[1.47] tracking-[-0.374px] text-[#141238]">
            Common questions.
          </h2>
          <p className="text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#787b9a]">
            Short answers to the things people ask most.
          </p>

          <div className="mt-[32px] divide-y divide-[#E3E5F3] border-y border-[#E3E5F3]">
            {FAQS.map((item, idx) => (
              <div key={item.q} className="py-[24px]">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between text-left text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#141238]"
                >
                  <span>{item.q}</span>
                  <span className="ml-4 text-[#39359D]">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <p className="mt-[12px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#4b4d6b]">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TILE 9: BRAND INDIGO (#39359D) — FINAL CTA ================= */}
      <section className="w-full rounded-none bg-[#39359D] py-[64px] sm:py-[80px] text-center text-[#ffffff]">
        <div className="mx-auto max-w-[980px] px-4 sm:px-8">
          <h2 className="text-[34px] sm:text-[40px] font-semibold leading-[1.1] tracking-[0px] text-[#ffffff]">
            Your first migration, done this week.
          </h2>
          <p className="mx-auto mt-[12px] max-w-[680px] text-[21px] sm:text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#e0e7ff]">
            Add a source and a destination. Run a real pipeline. See the full
            report. Free to start.
          </p>
          <div className="mt-[32px] flex flex-wrap justify-center gap-[16px]">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-full bg-[#ffffff] px-[28px] py-[14px] text-[18px] font-medium leading-none text-[#39359D] active:scale-95 transition-transform shadow-sm"
                >
                  Go to console
                </Link>
                <Link
                  to="/table-matching"
                  className="rounded-full border border-white/40 bg-transparent px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#ffffff] active:scale-95 transition-transform"
                >
                  Table Matching
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  search={{ email: '', verified: false, reset: false }}
                  className="rounded-full bg-[#ffffff] px-[28px] py-[14px] text-[18px] font-light leading-none text-[#39359D] active:scale-95 transition-transform"
                >
                  Open console
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full border border-white/40 bg-transparent px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#ffffff] active:scale-95 transition-transform"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================= FOOTER (#F6F7FC, dense-link 2.41 line-height) ================= */}
      <footer className="w-full bg-[#F6F7FC] py-[64px] text-[#4b4d6b]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
          <div className="border-b border-[#E3E5F3] pb-[32px]">
            <DesignerWordmark />
            <p className="mt-[10px] max-w-[640px] text-[12px] font-normal leading-[1.4] tracking-[-0.12px] text-[#787b9a]">
              Deterministic, audited data pipelines with canonical ontologies
              and reverse row-level lineage — from source schema to signed
              evidence bundle.
            </p>
          </div>

          <div className="mt-[32px] grid grid-cols-2 gap-[24px] sm:grid-cols-4">
            <div>
              <h4 className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-[#141238]">
                Product
              </h4>
              <ul className="mt-[8px] text-[17px] font-normal leading-[2.41] text-[#4b4d6b]">
                <li><a href="#product" className="hover:text-[#39359D]">Features</a></li>
                <li><a href="#connectors" className="hover:text-[#39359D]">Connectors</a></li>
                <li><a href="#product" className="hover:text-[#39359D]">Ontology</a></li>
                <li><a href="#workflow" className="hover:text-[#39359D]">Workflow</a></li>
                <li><a href="#pricing" className="hover:text-[#39359D]">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-[#141238]">
                Resources
              </h4>
              <ul className="mt-[8px] text-[17px] font-normal leading-[2.41] text-[#4b4d6b]">
                <li><a href="#faq" className="hover:text-[#39359D]">Documentation</a></li>
                <li><a href="#faq" className="hover:text-[#39359D]">Blog</a></li>
                <li><a href="#faq" className="hover:text-[#39359D]">Changelog</a></li>
                <li><a href="#faq" className="hover:text-[#39359D]">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-[#141238]">
                Company
              </h4>
              <ul className="mt-[8px] text-[17px] font-normal leading-[2.41] text-[#4b4d6b]">
                <li><a href="#solutions" className="hover:text-[#39359D]">About</a></li>
                <li><Link to="/signup" className="hover:text-[#39359D]">Contact</Link></li>
                <li><a href="#solutions" className="hover:text-[#39359D]">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-[#141238]">
                Legal
              </h4>
              <ul className="mt-[8px] text-[17px] font-normal leading-[2.41] text-[#4b4d6b]">
                <li><a href="#faq" className="hover:text-[#39359D]">Privacy</a></li>
                <li><a href="#faq" className="hover:text-[#39359D]">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-[32px] border-t border-[#E3E5F3] pt-[24px] text-[12px] font-normal leading-none tracking-[-0.12px] text-[#787b9a]">
            © 2026 Migration Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}