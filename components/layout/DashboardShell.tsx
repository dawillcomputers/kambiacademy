import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export interface SidebarItem {
  name: string;
  icon: string;
  path?: string;
  onClick?: () => void;
}

interface DashboardShellProps {
  children: React.ReactNode;
  sidebarItems: SidebarItem[];
  title: string;
  subtitle?: string;
  /** 'superadmin' uses deep navy theme, 'tutor' uses warm amber theme */
  variant?: 'superadmin' | 'tutor' | 'student';
}

/*
 * Theme tokens from superadmin.md global design system:
 *   bg:      #0B1220
 *   panel:   #111B2E
 *   panel-2: #16233A
 *   text:    #EAF0FF
 *   muted:   #A9B4CC
 *   accent:  #6366F1
 */

const themes = {
  superadmin: {
    sidebar: 'bg-[#111B2E]',
    sidebarBorder: 'border-white/[0.06]',
    active: 'bg-[#6366F1]',
    hoverBg: 'hover:bg-[#16233A]',
    content: 'bg-[#0B1220]',
    text: 'text-[#EAF0FF]',
    muted: 'text-[#A9B4CC]',
    dimmed: 'text-[#6B7A99]',
    logo: 'text-[#EAF0FF]',
  },
  tutor: {
    sidebar: 'bg-[#1a1523]',
    sidebarBorder: 'border-white/[0.06]',
    active: 'bg-amber-600',
    hoverBg: 'hover:bg-white/10',
    content: 'bg-[#120e1a]',
    text: 'text-white',
    muted: 'text-white/70',
    dimmed: 'text-white/40',
    logo: 'text-amber-400',
  },
  student: {
    sidebar: 'bg-gradient-to-b from-indigo-900 via-slate-900 to-black',
    sidebarBorder: 'border-white/10',
    active: 'bg-blue-600',
    hoverBg: 'hover:bg-white/10',
    content: 'bg-slate-950',
    text: 'text-white',
    muted: 'text-white/70',
    dimmed: 'text-white/40',
    logo: 'text-white',
  },
};

export default function DashboardShell({
  children,
  sidebarItems,
  title,
  subtitle,
  variant = 'superadmin',
}: DashboardShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const t = themes[variant];

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/superadmin' || path === '/teacher' || path === '/tutor' || path === '/student')
      return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const profilePath = variant === 'student'
    ? '/student/profile'
    : variant === 'tutor'
      ? '/teacher/profile'
      : undefined;

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className={`flex items-center justify-between px-4 py-5 border-b ${t.sidebarBorder}`}>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className={`text-lg font-extrabold tracking-tight ${t.logo}`}>{title}</h1>
            {subtitle && <p className={`text-xs mt-0.5 ${t.dimmed}`}>{subtitle}</p>}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg className={`w-4 h-4 ${t.muted} transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {sidebarItems.map((item) => {
          const active = isActive(item.path);
          const cls = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
            active
              ? `${t.active} text-white shadow-lg shadow-black/20`
              : `${t.muted} ${t.hoverBg} hover:text-white`
          }`;

          const inner = (
            <>
              <span className="text-base shrink-0 w-5 text-center">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.name}</span>}
            </>
          );

          if (item.onClick) {
            return (
              <button key={item.name} onClick={item.onClick} className={`w-full text-left ${cls}`}>
                {inner}
              </button>
            );
          }

          return (
            <Link key={item.name} to={item.path || '#'} className={cls}>
              {inner}
            </Link>
          );
        })}
      </nav>

      {/* User at bottom */}
      <div className={`border-t ${t.sidebarBorder} p-3`} ref={profileMenuRef}>
        <button
          type="button"
          onClick={() => setProfileMenuOpen((open) => !open)}
          className={`flex w-full items-center rounded-xl px-2 py-2 text-left transition hover:bg-white/10 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <div className="w-8 h-8 rounded-full bg-[#6366F1]/30 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${t.text}`}>{user?.name}</p>
                <p className={`text-xs truncate ${t.dimmed}`}>{user?.email}</p>
              </div>
              <svg className={`h-4 w-4 ${t.dimmed} transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {profileMenuOpen && (
          <div className={`mt-2 rounded-2xl border ${t.sidebarBorder} bg-black/20 p-2 backdrop-blur-xl`}>
            {profilePath && (
              <Link
                to={profilePath}
                onClick={() => setProfileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${t.muted} ${t.hoverBg} hover:text-white`}
              >
                <span className="text-base">👤</span>
                <span>Open profile</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${t.muted} hover:bg-red-500/15 hover:text-red-400 transition-colors`}
            >
              <span className="text-base">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg ${t.sidebar} text-white shadow-lg`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex ${collapsed ? 'w-[72px]' : 'w-[260px]'} flex-col ${t.sidebar} ${t.text} transition-all duration-300 shrink-0 h-screen`}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 30 }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col ${t.sidebar} ${t.text} transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Main content area — independent scroll */}
      <main
        className={`flex-1 ${t.content} overflow-y-auto h-screen`}
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        {children}
      </main>
    </div>
  );
}
