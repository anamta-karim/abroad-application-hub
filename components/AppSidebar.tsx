"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppSidebarProps {
  displayName: string;
  signOutAction: () => Promise<void>;
  /** Owner accounts (ADMIN_EMAILS) also get a link to the feedback inbox. */
  isAdmin?: boolean;
}

export function AppSidebar({ displayName, signOutAction, isAdmin = false }: AppSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/app",
      isActive: pathname === "/app",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "Discover",
      href: "/app/discover",
      isActive: pathname.startsWith("/app/discover"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
        </svg>
      ),
    },
    {
      label: "Applications",
      href: "/app/applications/new",
      isActive: pathname.startsWith("/app/applications"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ),
    },
    {
      label: "Compare",
      href: "/app/compare",
      isActive: pathname.startsWith("/app/compare"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10H5a1 1 0 01-1-1V8a1 1 0 011-1h4m0 10h6m-6-10h6m0 0v10m0-10h4a1 1 0 011 1v8a1 1 0 01-1 1h-4" />
        </svg>
      ),
    },
    {
      label: "Documents",
      href: "/app/documents",
      isActive: pathname.startsWith("/app/documents"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Eligibility",
      href: "/app/eligibility",
      isActive: pathname.startsWith("/app/eligibility"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: "Deadlines",
      href: "/app/deadlines",
      isActive: pathname.startsWith("/app/deadlines"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    ...(isAdmin
      ? [
          {
            label: "Feedback inbox",
            href: "/app/feedback",
            isActive: pathname.startsWith("/app/feedback"),
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
              </svg>
            ),
          },
        ]
      : []),
    {
      label: "Settings",
      href: "/app/settings",
      isActive: pathname.startsWith("/app/settings"),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* ── Desktop Left Sidebar (CoachPro / Alyona style) ── */}
      <aside className="hidden lg:flex flex-col justify-between w-64 p-6 glass-sidebar flex-shrink-0">
        <div className="space-y-8">
          {/* Brand Mark */}
          <div className="flex items-center space-x-3.5">
            <Link
              href="/app"
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center font-heading font-extrabold text-base shadow-md shadow-brand/20 active:scale-95 transition-transform flex-shrink-0"
              aria-label="AbroadAtlas Home"
            >
              A
            </Link>
            <div className="flex flex-col">
              <Link
                href="/app"
                className="font-heading font-extrabold text-ink-deep text-base tracking-tight leading-tight hover:text-brand transition-colors"
              >
                AbroadAtlas
              </Link>
              <span className="text-[11px] font-medium text-ink-muted">
                Study abroad, mapped
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all min-h-[44px] ${
                  item.isActive
                    ? "glass-nav-active font-bold"
                    : "text-ink-muted hover:text-ink-deep hover:bg-white/50"
                }`}
              >
                <span className={item.isActive ? "text-brand" : "text-ink-muted"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-6 border-t border-glass-borderSubtle space-y-3">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-2xl glass-card-subtle">
            <div className="w-8 h-8 rounded-xl bg-teal-light text-teal-dark flex items-center justify-center font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-ink-deep truncate">{displayName}</p>
              <p className="text-[10px] text-ink-muted truncate">Verified Applicant</p>
            </div>
          </div>

          <form action={signOutAction} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold text-ink-muted hover:text-ink-deep glass-card hover:bg-white/80 rounded-xl transition-all cursor-pointer min-h-[38px]"
            >
              <svg className="w-4 h-4 text-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>
          </form>

          <div className="flex items-center justify-center space-x-3 text-[10px] text-ink-subtle pt-1">
            <Link href="/privacy" className="hover:text-ink-deep transition-colors">
              Privacy
            </Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-ink-deep transition-colors">
              Terms &amp; Quotas
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar & Horizontal Tabs ── */}
      <div className="lg:hidden w-full glass-card border-b border-glass-border px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Link
              href="/app"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center font-heading font-extrabold text-sm shadow-md"
            >
              A
            </Link>
            <span className="font-heading font-extrabold text-ink-deep text-sm">
              AbroadAtlas
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-ink-muted">{displayName}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-bold text-ink-muted hover:text-ink-deep glass-card rounded-lg"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Horizontal Scroll Tabs */}
        <nav className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl transition-all min-h-[38px] flex items-center space-x-1.5 ${
                item.isActive
                  ? "glass-nav-active font-bold"
                  : "text-ink-muted hover:text-ink-deep bg-white/40"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
