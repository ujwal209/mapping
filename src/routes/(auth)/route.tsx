import { useEffect, useState } from 'react';
import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { tokenStorage } from '../../lib/authApi';

export const Route = createFileRoute('/(auth)')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = tokenStorage.get();
      if (token) {
        throw redirect({
          to: '/dashboard',
        });
      }
    }
  },
  component: AuthSplitLayout,
});

function AuthSplitLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      navigate({ to: '/dashboard' });
    } else {
      setChecking(false);
    }
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#ffffff]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39359D] border-t-transparent" />
      </div>
    );
  }
  return (
    <div
      style={{ fontFamily: "'Google Sans', system-ui, -apple-system, sans-serif" }}
      className="min-h-screen lg:h-screen lg:overflow-hidden w-full grid lg:grid-cols-12 bg-[#ffffff] text-[#141238]"
    >
      {/* ================= LEFT BRAND PANEL (Locked 100vh) ================= */}
      <aside className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-[#39359D] p-[40px] xl:p-[52px] text-[#ffffff] overflow-hidden">
        <div>
          <Link to="/" className="inline-flex items-center select-none">
            <span className="text-[21px] font-semibold tracking-[-0.045em] text-[#ffffff]">
              migration
            </span>
            <span className="mx-[8px] h-[15px] w-[1px] bg-white/30" />
            <span className="text-[21px] font-light tracking-[-0.03em] text-[#c7d2fe]">
              studio
            </span>
          </Link>

          <div className="mt-[44px] xl:mt-[56px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#c7d2fe]">
              DETERMINISTIC DATA PIPELINES
            </p>
            <h2 className="mt-[12px] text-[32px] xl:text-[38px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#ffffff]">
              Move data across systems with full row-level proof.
            </h2>
            <p className="mt-[14px] text-[15px] xl:text-[16px] font-normal leading-[1.5] text-[#e0e7ff]">
              Connect sources, lock versioned schema mappings, gate against
              unexpected drift, and export signed audit bundles.
            </p>
          </div>

          <div className="mt-[36px] space-y-[16px] border-t border-white/15 pt-[28px]">
            <div className="flex items-start gap-[12px]">
              <span className="mt-[2px] inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-[#ffffff]">
                01
              </span>
              <div>
                <div className="text-[15px] font-semibold text-[#ffffff]">
                  Pre-flight schema drift gating
                </div>
                <p className="mt-[2px] text-[13px] leading-[1.4] text-[#c7d2fe]">
                  Runs halt automatically before writing if upstream columns or
                  types break contract.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-[12px]">
              <span className="mt-[2px] inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-[#ffffff]">
                02
              </span>
              <div>
                <div className="text-[15px] font-semibold text-[#ffffff]">
                  Reverse row-level lineage
                </div>
                <p className="mt-[2px] text-[13px] leading-[1.4] text-[#c7d2fe]">
                  Trace any destination record back to its exact source row and
                  mapping version.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-[12px]">
              <span className="mt-[2px] inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold text-[#ffffff]">
                03
              </span>
              <div>
                <div className="text-[15px] font-semibold text-[#ffffff]">
                  Tenant-isolated &amp; encrypted
                </div>
                <p className="mt-[2px] text-[13px] leading-[1.4] text-[#c7d2fe]">
                  TLS 1.3 in transit, AES-256 at rest, and scrubbed credential
                  references.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/15 pt-[20px] text-[12px] text-[#c7d2fe]">
          <span>SOC 2 Type II · ISO 27001</span>
          <span>© 2026 Migration Studio</span>
        </div>
      </aside>

      {/* ================= RIGHT FORM PANEL (Fits Single Viewport) ================= */}
      <div className="lg:col-span-7 flex flex-col justify-between bg-[#ffffff] px-5 py-4 sm:px-10 sm:py-6 lg:h-screen lg:overflow-hidden">
        {/* Top Row */}
        <header className="mx-auto flex w-full max-w-[500px] items-center justify-between shrink-0">
          <Link to="/" className="lg:hidden inline-flex items-center select-none">
            <span className="text-[19px] font-semibold tracking-[-0.045em] text-[#39359D]">
              migration
            </span>
            <span className="mx-[7px] h-[14px] w-[1px] bg-[#39359D]/25" />
            <span className="text-[19px] font-light tracking-[-0.03em] text-[#5b5e7a]">
              studio
            </span>
          </Link>

          <div className="hidden lg:block" />

          <Link
            to="/"
            className="inline-flex items-center gap-[6px] rounded-full border border-[#E3E5F3] bg-[#F6F7FC] px-[14px] py-[6px] text-[13px] font-normal text-[#39359D] hover:border-[#39359D]/40 transition-colors"
          >
            <span>← Back to home</span>
          </Link>
        </header>

        {/* Centered Form Slot */}
        <main className="mx-auto my-auto w-full max-w-[500px] py-2">
          <Outlet />
        </main>

        {/* Compact Bottom Legal */}
        <footer className="mx-auto w-full max-w-[500px] text-center lg:text-left text-[12px] text-[#787b9a] shrink-0">
          Protected by enterprise encryption and strict tenant isolation.
        </footer>
      </div>
    </div>
  );
}