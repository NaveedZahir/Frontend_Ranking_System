
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isManager =
    user?.role === 'admin' || user?.role === 'manager_teacher';

  const loadProjects = async () => {
    setLoading(true);
    setError('');

    try {
      // RLS determines which projects the current user may read.
      const { data, error: queryError } = await supabase
        .from('ranking_lists')
        .select(
          'id, title, description, category, status, formula_type, created_by, created_at'
        )
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setProjects(data ?? []);
    } catch (err) {
      setError(err.message || 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ranking Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Welcome, {user?.name || user?.email || 'User'}.
          </p>
          <p className="text-sm text-gray-500">
            Role: {user?.role || 'Unknown'}
          </p>
        </div>

        {isManager && (
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white"
          >
            <Plus size={18} />
            Create Project
          </Link>
        )}
      </div>

      {loading && <p>Loading projects...</p>}

      {error && (
        <div className="mb-4 rounded border border-red-300 p-4 text-red-700">
          <AlertCircle className="mr-2 inline" size={18} />
          {error}
          <button
            onClick={loadProjects}
            className="ml-3 inline-flex items-center gap-1 underline"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <Folder className="mx-auto mb-3" size={36} />
          <h2 className="text-xl font-semibold">No projects available</h2>
          <p className="mt-2 text-gray-600">
            {isManager
              ? 'Create a project to get started.'
              : 'No published rankings are currently available to you.'}
          </p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block rounded-lg border p-5 transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <Folder size={24} className="shrink-0 text-blue-600" />
                <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                  {project.status}
                </span>
              </div>

              <h2 className="text-lg font-semibold">{project.title}</h2>

              <p className="mt-2 text-sm text-gray-600">
                {project.description || 'No description provided.'}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Category: {project.category || 'General'}
              </p>
              <p className="text-xs text-gray-500">
                Formula: {project.formula_type}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};
