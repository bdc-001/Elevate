import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Settings, FileText, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Top Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">CS</span>
                </div>
                <span className="text-xl font-bold text-slate-800">CSM Tool</span>
              </Link>
              
              {/* Navigation */}
              <nav className="hidden md:flex space-x-1">
                <Link
                  to="/"
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
                    isActive('/') && location.pathname === '/'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  data-testid="nav-dashboard"
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/customers"
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
                    isActive('/customers')
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  data-testid="nav-customers"
                >
                  <Users size={18} />
                  <span>Customers</span>
                </Link>
                <Link
                  to="/reports"
                  className="px-4 py-2 rounded-lg flex items-center space-x-2 text-slate-600 hover:bg-slate-100 transition-all"
                  data-testid="nav-reports"
                >
                  <FileText size={18} />
                  <span>Reports</span>
                </Link>
                <Link
                  to="/pipeline"
                  className="px-4 py-2 rounded-lg flex items-center space-x-2 text-slate-600 hover:bg-slate-100 transition-all"
                  data-testid="nav-pipeline"
                >
                  <TrendingUp size={18} />
                  <span>Pipeline</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-sm font-medium text-slate-800">{user?.name}</div>
                      <div className="text-xs text-slate-500">{user?.role} • Convin.ai</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings size={16} className="mr-2" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText size={16} className="mr-2" />
                    <span>My Activities</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} data-testid="logout-button">
                    <LogOut size={16} className="mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full">
        {children}
      </main>
    </div>
  );
}
