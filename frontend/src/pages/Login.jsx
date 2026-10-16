// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER'); // Default to Teacher (USER)
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Assign specific IDs based on role for mock filtering
    const mockUser = {
      id: role === 'ADMIN' ? 'admin-001' : role === 'USER' ? 'teacher-123' : 'student-999',
      email: email || `${role.toLowerCase()}@example.com`,
      name: `Demo ${role}`,
      role: role,
    };

    login(mockUser, 'mock-jwt-token-12345');
    navigate('/dashboard');
  };

  return (
    <div className="auth-wrapper">
      <form onSubmit={handleSubmit} className="form-card">
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Platform Login</h2>

        <div className="form-group">
          <label>Select Your Role</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
          >
            <option value="USER">Teacher / Manager (USER)</option>
            <option value="ADMIN">System Administrator (ADMIN)</option>
            <option value="VIEWER">Student / Public (VIEWER)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input 
            type="email" 
            placeholder="e.g. teacher@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
          Sign In as {role}
        </button>
      </form>
    </div>
  );
};