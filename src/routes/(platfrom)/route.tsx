import { useEffect, useState } from 'react'
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import {
  LayoutGrid,
  Folder,
  Server,
  BookOpen,
  Table2,
  Compass,
  ListChecks,
  Rocket,
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  LoaderCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { tokenStorage, type UserProfileResponse } from '../../lib/authApi'

export const Route = createFileRoute('/(platfrom)')({
  beforeLoad: ({ location }) => {
    if (typeof window !== 'undefined') {
      const token = tokenStorage.get()
      if (!token) {
        throw redirect({
          to: '/login',
          search: {
            redirect: location.href,
          },
        })
      }
    }
  },
  component: PlatformLayout,
})

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

interface NavGroup {
  heading: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'WORKSPACE',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutGrid, exact: true },
      { label: 'Projects', to: '/projects', icon: Folder },
    ],
  },
  {
    heading: 'CONNECTIVITY',
    items: [{ label: 'Connectors', to: '/connectors', icon: Server }],
  },
  {
    heading: 'MODELING',
    items: [
      { label: 'Ontology Studio', to: '/ontology', icon: BookOpen },
    ],
  },
  {
    heading: 'SCHEMA MAPPING',
    items: [
      { label: 'Discover Pairs', to: '/table-matching/discover', icon: Compass },
      { label: 'Table Matching', to: '/table-matching', icon: Table2 },
    ],
  },
  {
    heading: 'MIGRATIONS',
    items: [
      { label: 'Start Migration', to: '/migrations/new', icon: Rocket },
      { label: 'Migration Runs', to: '/migrations', icon: ListChecks, exact: true },
    ],
  },
]

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'MS'
}

function SidebarContent({
  pathname,
  profile,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  onSignOut,
}: {
  pathname: string
  profile: UserProfileResponse | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  onSignOut: () => void
}) {
  const isItemActive = (item: NavItem) => {
    if (item.exact) return pathname === item.to
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  }

  return (
    <div className="flex h-full flex-col justify-between bg-[#ffffff] px-3 py-3.5 select-none">
      {/* Top Brand Header */}
      <div className="shrink-0">
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between px-2'
          }`}
        >
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="inline-flex items-center"
          >
            {collapsed ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#39359D] text-[14px] font-semibold text-white">
                ms
              </span>
            ) : (
              <span className="inline-flex items-center">
                <span className="text-[18px] font-semibold tracking-[-0.045em] text-[#39359D]">
                  migration
                </span>
                <span className="mx-[6px] h-[13px] w-[1px] bg-[#39359D]/25" />
                <span className="text-[18px] font-light tracking-[-0.03em] text-[#5b5e7a]">
                  studio
                </span>
              </span>
            )}
          </Link>

          {onToggleCollapse && !collapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="h-7 w-7 cursor-pointer rounded-[7px] text-[#8f93b2] hover:bg-[#F4F6FA] hover:text-[#141238]"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        {onToggleCollapse && collapsed && (
          <div className="mt-1.5 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="h-7 w-7 cursor-pointer rounded-[7px] text-[#8f93b2] hover:bg-[#F4F6FA] hover:text-[#141238]"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Grouped Navigation — Compact Vertical Rhythm so Nothing Clips */}
      <nav className="flex flex-col space-y-2.5 py-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#8f93b2]">
                {group.heading}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item)

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center ${
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                  } py-[5.5px] rounded-[9px] text-[13px] leading-tight transition-colors ${
                    active
                      ? 'bg-[#F1F3F9] font-semibold text-[#141238]'
                      : 'font-normal text-[#334155] hover:bg-[#F8FAFC] hover:text-[#141238]'
                  }`}
                >
                  <Icon
                    className={`h-[16px] w-[16px] shrink-0 transition-colors ${
                      active
                        ? 'text-[#39359D] stroke-[2.2]'
                        : 'text-[#8c96a9] stroke-[1.75] group-hover:text-[#39359D]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Profile + Sign Out — Always Fully Visible */}
      <div className="shrink-0 space-y-1 border-t border-[#EEF0F9] pt-2.5">
        {profile && (
          <div
            className={`flex items-center gap-2 rounded-[10px] bg-[#F8FAFC] border border-[#EEF0F9] ${
              collapsed ? 'justify-center p-1.5' : 'px-2.5 py-1.5'
            }`}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#39359D] text-[10px] font-semibold text-white">
              {getInitials(profile.full_name, profile.email)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[12px] font-semibold text-[#141238]">
                  {profile.full_name}
                </div>
                <div className="truncate text-[10.5px] text-[#787b9a]">
                  {profile.email}
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={onSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={`h-7 w-full cursor-pointer rounded-[8px] text-[12px] font-medium text-[#64748b] hover:bg-rose-50 hover:text-rose-700 ${
            collapsed ? 'justify-center px-0' : 'justify-start gap-2 px-2.5'
          }`}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </div>
    </div>
  )
}

function PlatformLayout() {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const token = tokenStorage.get()
    if (!token) {
      setIsAuthorized(false)
      const currentPath =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : pathname
      navigate({
        to: '/login',
        search: { redirect: currentPath },
      })
      return
    }

    setIsAuthorized(true)
    try {
      const raw = localStorage.getItem('ms_user_profile')
      if (raw) setProfile(JSON.parse(raw))
    } catch {
      // ignore storage errors
    }
  }, [navigate, pathname])

  const handleSignOut = () => {
    tokenStorage.clear()
    localStorage.removeItem('ms_user_profile')
    navigate({
      to: '/login',
      search: { email: '', verified: false, reset: false },
    })
  }

  // Prevent flash of protected layout while checking or if unauthorized
  if (isAuthorized === null || isAuthorized === false) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle className="w-8 h-8 animate-spin text-[#432DD7]" />
          <p className="text-xs font-medium">Verifying authorization…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ fontFamily: "'Google Sans', system-ui, -apple-system, sans-serif" }}
      className="h-dvh w-full overflow-hidden bg-[#F8FAFC] text-[#141238] flex"
    >
      {/* Desktop Fixed Non-Scrollable Sidebar */}
      <aside
        className={`hidden lg:block h-dvh shrink-0 overflow-hidden border-r border-[#E6E8F0] bg-[#ffffff] transition-all duration-200 ${
          collapsed ? 'w-[70px]' : 'w-[240px]'
        }`}
      >
        <SidebarContent
          pathname={pathname}
          profile={profile}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Scrollable Inner Page Viewport (No Top Navbar on Desktop) */}
      <div className="flex-1 h-dvh overflow-y-auto overflow-x-hidden">
        {/* Compact Mobile Drawer Trigger Only (<1024px) */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-[#E6E8F0] bg-[#ffffff]/95 px-4 py-2.5 backdrop-blur-sm">
          <Link to="/dashboard" className="inline-flex items-center select-none">
            <span className="text-[18px] font-semibold tracking-[-0.045em] text-[#39359D]">
              migration
            </span>
            <span className="mx-[6px] h-[13px] w-[1px] bg-[#39359D]/25" />
            <span className="text-[18px] font-light tracking-[-0.03em] text-[#5b5e7a]">
              studio
            </span>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-[9px] border border-[#E6E8F0]"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 text-[#141238]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[256px] p-0 bg-[#ffffff]">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                pathname={pathname}
                profile={profile}
                onNavigate={() => setMobileOpen(false)}
                onSignOut={handleSignOut}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Inner Page Content */}
        <main className="w-full max-w-[1400px] mx-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}