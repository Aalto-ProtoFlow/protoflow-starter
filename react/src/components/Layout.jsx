import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="h-14 border-b bg-background flex items-center px-6 gap-6">
        <NavLink to="/devices" className="font-semibold text-lg">
          ProtoFlow
        </NavLink>
        <div className="flex gap-1">
          <NavLink
            to="/devices"
            className={({ isActive }) =>
              cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            Devices
          </NavLink>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </nav>
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
