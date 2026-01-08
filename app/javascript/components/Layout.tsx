import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Receipt,
  FileText,
  Settings,
  Wallet,
  Menu,
  X,
  User,
  ChevronDown,
  Search,
  Bell,
  Plus,
  LogOut,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCurrentUser } from '../queries/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();

  const userName = user?.name || 'User';
  const userEmail = user?.email || 'user@example.com';
  const userInitial = userName.charAt(0).toUpperCase();

  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '') return 'Dashboard';
    const item = navItems.find(nav => nav.to === path);
    return item?.label || 'Dashboard';
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* User menu backdrop */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200/80 transform transition-all duration-200 ease-in-out lg:translate-x-0',
          sidebarCollapsed ? 'w-[72px]' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                StmtIQ
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-full flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-sm">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
          <button
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* User/Workspace Section */}
        <div
          className={clsx(
            'border-b border-slate-200/80',
            sidebarCollapsed ? 'p-2' : 'p-4'
          )}
        >
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={clsx(
              'w-full flex items-center gap-3 rounded-xl hover:bg-slate-50 transition-colors',
              sidebarCollapsed ? 'p-2 justify-center' : 'p-3 bg-slate-50'
            )}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0">
              {userInitial}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                </div>
                <Settings className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={clsx('p-2 space-y-1', sidebarCollapsed && 'px-2')}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-lg text-sm font-medium transition-all duration-150',
                  sidebarCollapsed
                    ? 'justify-center px-3 py-3'
                    : 'gap-3 px-4 py-3',
                  isActive
                    ? 'bg-amber-200 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )
              }
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Toggle - Desktop Only */}
        <div className="absolute bottom-4 left-0 right-0 px-2 hidden lg:block">
          <button
            className={clsx(
              'w-full flex items-center gap-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors',
              sidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3'
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User Menu Dropdown */}
        {userMenuOpen && !sidebarCollapsed && (
          <div className="absolute top-28 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">{userName}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-slate-500" />
                Profile Settings
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-slate-500" />
                Help & Support
              </button>
            </div>
            <div className="p-1 border-t border-slate-100">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main
        className={clsx(
          'flex-1 flex flex-col h-full overflow-hidden transition-all duration-200',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
        {/* Top Header */}
        <header className="h-16 px-4 lg:px-8 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {/* Page Title */}
            <h1 className="text-lg font-semibold text-slate-900">
              {getPageTitle()}
            </h1>

            {/* Search Bar */}
            <div className="hidden md:flex h-10 items-center rounded-xl bg-slate-100 px-4 text-sm text-slate-500 w-64 hover:bg-slate-200/70 transition-colors cursor-pointer">
              <Search className="mr-2 h-4 w-4" />
              <span>Search...</span>
              <kbd className="ml-auto text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">
                /
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors relative">
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
            </button>

            {/* Primary Action */}
            <button
              onClick={() => navigate('/upload')}
              className="h-10 px-4 bg-amber-200 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-300 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Upload</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
