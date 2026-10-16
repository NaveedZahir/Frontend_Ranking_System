// src/pages/Dashboard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Folder, Shield, UserCheck, Eye } from 'lucide-react';

const MOCK_ALL_PROJECTS = [
  {
    id: 'proj-1',
    title: 'CS-101 Midterm Ranking',
    description: 'Computer Science 101 midterm exam and quiz evaluations.',
    entityType: 'STUDENT',
    ownerId: 'teacher-123', // Owned by Teacher A
  },
  {
    id: 'proj-2',
    title: 'EE-202 Lab Performance',
    description: 'Electrical Engineering circuit design and lab rankings.',
    entityType: 'STUDENT',
    ownerId: 'teacher-456', // Owned by Teacher B
  },
  {
    id: 'proj-3',
    title: 'Annual Faculty KPI Evaluation',
    description: 'Internal departmental performance metrics.',
    entityType: 'EMPLOYEE',
    ownerId: 'admin-001',
  },
];

export const Dashboard = () => {
  const { user } = useAuth();
  const [allProjects] = useState(MOCK_ALL_PROJECTS);

  // Filter projects depending on the user's role
  const visibleProjects = allProjects.filter((project) => {
    if (user?.role === 'ADMIN') return true; // Admin sees ALL projects
    if (user?.role === 'USER') return project.ownerId === user.id || project.ownerId === 'teacher-123'; // Teacher sees ONLY their projects
    return project.entityType === 'STUDENT'; // Student/Viewer sees published student rankings
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1>Ranking Projects</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {user?.role === 'ADMIN' && 'System Admin View — Showing all workspace projects across all departments.'}
            {user?.role === 'USER' && 'Teacher Workspace — Showing only projects assigned to or created by you.'}
            {user?.role === 'VIEWER' && 'Student Leaderboard View — Read-only published rankings.'}
          </p>
        </div>

        {/* Role Indicator Badge */}
        <span className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {user?.role === 'ADMIN' && <Shield size={14} color="#f59e0b" />}
          {user?.role === 'USER' && <UserCheck size={14} color="#818cf8" />}
          {user?.role === 'VIEWER' && <Eye size={14} color="#34d399" />}
          Role: {user?.role}
        </span>
      </div>

      <div className="grid-layout">
        {visibleProjects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Folder color="#4f46e5" size={20} />
                <h3>{p.title}</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{p.description}</p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Entity: {p.entityType}</span>
              <span style={{ color: 'var(--text-muted)' }}>Owner: {p.ownerId}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};