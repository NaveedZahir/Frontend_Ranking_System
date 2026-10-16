// src/pages/CreateProject.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export const CreateProject = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 State: Basic Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState('STUDENT');

  // Step 2 State: Dynamic Criteria Fields
  const [criteria, setCriteria] = useState([
    { id: 1, name: 'Assignments Marks', code: 'ASSIGN', weight: 40, isHigherBetter: true },
    { id: 2, name: 'Midterm Marks', code: 'MIDTERM', weight: 60, isHigherBetter: true },
  ]);

  const [error, setError] = useState('');

  // Criteria Field Handlers
  const handleAddCriteria = () => {
    setCriteria([
      ...criteria,
      { id: Date.now(), name: '', code: '', weight: 0, isHigherBetter: true },
    ]);
  };

  const handleRemoveCriteria = (id) => {
    if (criteria.length === 1) {
      setError('You must have at least one evaluation field.');
      return;
    }
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const handleCriteriaChange = (id, field, value) => {
    setError('');
    setCriteria(
      criteria.map((c) => {
        if (c.id === id) {
          if (field === 'weight') return { ...c, weight: parseFloat(value) || 0 };
          if (field === 'name') return { ...c, name: value, code: value.toUpperCase().replace(/\s+/g, '_') };
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project name is required.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleCreateProject = (e) => {
    e.preventDefault();

    if (totalWeight !== 100) {
      setError(`Total weightage must equal exactly 100%. Currently it is ${totalWeight}%.`);
      return;
    }

    // Save project into LocalStorage for persistent testing
    const newProject = {
      id: `proj-${Date.now()}`,
      title,
      description,
      entityType,
      criteria,
      ownerId: 'teacher-123',
      createdAt: new Date().toISOString(),
    };

    const existingProjects = JSON.parse(localStorage.getItem('custom_projects') || '[]');
    localStorage.setItem('custom_projects', JSON.stringify([...existingProjects, newProject]));

    navigate(`/projects/${newProject.id}`);
  };

  return (
    <div className="page-container">
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px' }}>Create New Ranking Workspace</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Step {step} of 2: {step === 1 ? 'Project Overview' : 'Define Evaluation Fields & Weightage'}
        </p>

        {error && <div className="error-banner">{error}</div>}

        {/* STEP 1: BASIC DETAILS FORM */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="form-card" style={{ maxWidth: '100%' }}>
            <div className="form-group">
              <label>Ranking Project Name</label>
              <input
                type="text"
                placeholder="e.g. Ranking Devops Team or CS-101 Final Grades"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                placeholder="e.g. Evaluated based on sprint performance and code review marks"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Domain Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
              >
                <option value="STUDENT">Student / Academic</option>
                <option value="EMPLOYEE">Employee / Team Member</option>
                <option value="VENDOR">Vendor / Supplier</option>
                <option value="CUSTOM">Custom Entity</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}>
              Next: Configure Fields <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* STEP 2: DYNAMIC CRITERIA & WEIGHTAGE FORM */}
        {step === 2 && (
          <form onSubmit={handleCreateProject} className="form-card" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Evaluation Fields & Weightage</h3>
              <span style={{ fontWeight: 700, color: totalWeight === 100 ? '#059669' : '#e11d48' }}>
                Total Weight: {totalWeight}% / 100%
              </span>
            </div>

            {criteria.map((c, idx) => (
              <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ flex: 2 }}>
                  <input
                    type="text"
                    placeholder={`Field Name ${idx + 1} (e.g. Midterm Marks)`}
                    value={c.name}
                    onChange={(e) => handleCriteriaChange(c.id, 'name', e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    placeholder="Weight %"
                    min="1"
                    max="100"
                    value={c.weight || ''}
                    onChange={(e) => handleCriteriaChange(c.id, 'weight', e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCriteria(c.id)}
                  className="btn-danger"
                  style={{ padding: '8px' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddCriteria}
              style={{
                background: '#f1f5f9',
                border: '1px dashed var(--border)',
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '24px',
                fontWeight: 600,
              }}
            >
              <Plus size={16} /> Add Another Metric Column
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ArrowLeft size={16} /> Back
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={totalWeight !== 100}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <CheckCircle size={16} /> Complete Project Setup
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};