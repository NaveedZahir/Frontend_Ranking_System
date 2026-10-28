
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Trophy, PlusCircle } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const canCreateProject =
    user?.role === 'admin' ||
    user?.role === 'manager_teacher';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="brand-link">
          <Trophy size={22} />
          Ranking Platform
        </Link>

        {user && (
          <div className="nav-actions">
            <span className="user-badge">
              {user.email || user.name || 'Signed in'}{' '}
              (<strong>{user.role}</strong>)
            </span>

            {canCreateProject && (
              <Link to="/projects/new" className="btn-primary">
                <PlusCircle size={16} />
                New Project
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="btn-danger"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
