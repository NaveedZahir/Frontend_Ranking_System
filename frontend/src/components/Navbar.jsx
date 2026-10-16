// src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Trophy, PlusCircle } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="brand-link">
          <Trophy size={22} /> Ranking Platform
        </Link>

        {user && (
          <div className="nav-actions">
            <span className="user-badge">
              {user.email} (<strong>{user.role}</strong>)
            </span>

            {/* ONLY show 'New Project' if the user is NOT a VIEWER */}
            {user.role !== 'VIEWER' && (
              <Link to="/projects/new" className="btn-primary">
                <PlusCircle size={16} /> New Project
              </Link>
            )}

            <button onClick={handleLogout} className="btn-danger">
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};