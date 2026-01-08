import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  CheckSquare,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import NotificationBell from './NotificationBell';

export default function EnhancedLayout({ children, user, permissions, onLogout }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const can = (moduleKey) => {
    if (!permissions) return true;
    return !!permissions?.modules?.[moduleKey]?.enabled;
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', testId: 'nav-dashboard', moduleKey: 'dashboard' },
    { path: '/customers', icon: Users, label: 'Customers', testId: 'nav-customers', moduleKey: 'customers' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks', testId: 'nav-tasks', moduleKey: 'tasks' },
    { path: '/opportunities', icon: TrendingUp, label: 'Opportunity Pipeline', testId: 'nav-opportunities', moduleKey: 'opportunities' },
    { path: '/reports', icon: BarChart3, label: 'Reports', testId: 'nav-reports', moduleKey: 'dashboard' },
    { path: '/data-labs-reports', icon: FileText, label: 'Data Labs', testId: 'nav-datalabs', moduleKey: 'datalabs_reports' },
    { path: '/settings', icon: Settings, label: 'Settings', testId: 'nav-settings', moduleKey: 'settings' },
  ].filter((i) => can(i.moduleKey));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(240,20%,98%)] via-[hsl(250,15%,98%)] to-[hsl(260,10%,99%)] flex">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 fixed left-0 top-0 h-full transition-all duration-300 z-40 flex flex-col shadow-sm`}>
        {/* Logo */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4">
          {!sidebarCollapsed && (
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">CE</span>
              </div>
              <span className="text-lg font-bold text-slate-800">Convin Elevate</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center mx-auto shadow-md">
              <span className="text-white font-bold text-sm">CE</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 mx-2 rounded-lg transition-all ${active
                    ? 'bg-brand-hover text-brand-primary font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
                data-testid={item.testId}
                title={sidebarCollapsed ? item.label : ''}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
                {!sidebarCollapsed && item.badge && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <div className="border-t border-slate-200 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>

        {/* User Profile */}
        <div className="border-t border-slate-200 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} w-full px-2 py-2 rounded-lg hover:bg-slate-50 transition-all`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-medium shadow-md">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-slate-800">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.role}</div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings size={16} className="mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} data-testid="logout-button">
                <LogOut size={16} className="mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 h-16">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="text-xs text-slate-500">
                Convin.ai CSM Platform
                <span className="text-[10px] text-slate-300 ml-1" title="Created by Arsalaan">• Arsalaan</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
