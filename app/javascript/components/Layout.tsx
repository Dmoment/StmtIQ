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
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
  Paperclip
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
  // Check if we're on the dashboard - use exact pathname match
  // React Router index routes have pathname === '/'
  const isDashboard = location.pathname === '/' || location.pathname === '';
  const userName = user?.name || 'User';
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
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

      {/* Sidebar */}
      <aside className={clsx(
        "fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200 transform transition-all duration-200 ease-in-out lg:translate-x-0 shadow-sm",
        sidebarCollapsed ? "w-20" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                StmtIQ
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button 
              className="hidden lg:flex p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <button 
              className="lg:hidden p-1 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <nav className={clsx("p-4 space-y-1", sidebarCollapsed && "px-2")}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => clsx(
                "flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                sidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3",
                isActive 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className={clsx("transition-all duration-200 bg-white", sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")}>
        {/* Top bar - Professional dark blue header */}
        <header 
          className="sticky top-0 z-30 bg-slate-800 text-white shadow-md relative overflow-hidden rounded-2xl mx-4"
          style={{
            backgroundImage: `url('/images/banks/dashboard_header.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-slate-800/70 rounded-2xl"></div>
          <div className="relative px-4 lg:px-8 py-6">
            {isDashboard && (
              // Dashboard header with greeting and description
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">
                      {getGreeting()}, {userName}
                    </h1>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed max-w-2xl">
                    Track your expenses, analyze spending patterns, and gain insights into your financial habits. 
                    Upload your bank statements to get started with automated categorization and detailed analytics.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <a
                    href="/upload"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all shadow-sm"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Upload Statement</span>
                    <span className="sm:hidden text-sm font-medium">Upload</span>
                  </a>
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all shadow-sm">
                    <HelpCircle className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Get Help</span>
                  </button>
                </div>
              </div>
            )}
            {!isDashboard && (
              // Default header for other pages
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <button 
                    className="lg:hidden p-2 hover:bg-white/10 rounded-lg mr-4 transition-colors"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-slate-700 transition-all w-64"
                      />
                    </div>
                  </div>
                </div>
              
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
                  <Bell className="w-5 h-5 text-slate-300" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <HelpCircle className="w-5 h-5 text-slate-300" />
                </button>
                
                {/* User menu */}
                <div className="relative">
                  <button 
                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-sm font-semibold text-white">
                      U
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-white">Dev User</p>
                      <p className="text-xs text-slate-400">Development Mode</p>
                    </div>
                    <ChevronDown className={clsx(
                      "w-4 h-4 text-slate-400 transition-transform",
                      userMenuOpen && "rotate-180"
                    )} />
                  </button>

                  {/* Dropdown menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50">
                      <div className="p-3 border-b border-slate-200">
                        <p className="text-sm font-semibold text-slate-900">Dev User</p>
                        <p className="text-xs text-slate-500">Development Mode</p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/settings');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="bg-white min-h-screen">
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
