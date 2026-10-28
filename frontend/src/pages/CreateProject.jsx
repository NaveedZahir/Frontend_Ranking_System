
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const makeCriterion = (name = '', weight = 0) => ({
  id: crypto.randomUUID(),
  name,
  weight,
  scoringDirection: 'higher',
});

const makeFieldKey = (name) => {
  let key = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!key || !/^[a-z]/.test(key)) {
    key = `field_${key}`;
  }

  return key;
};

export const CreateProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('student');

  const [formulaType, setFormulaType] = useState('weighted_average');
  const [sortDirection, setSortDirection] = useState('higher');
  const [tieMethod, setTieMethod] = useState('competition');

  const [criteria, setCriteria] = useState([
    makeCriterion('Assignments Marks', 40),
    makeCriterion('Midterm Marks', 60),
  ]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const totalWeight = criteria.reduce(
    (sum, criterion) => sum + (Number(criterion.weight) || 0),
    0
  );

  const handleAddCriteria = () => {
    setError('');
    setCriteria((current) => [...current, makeCriterion()]);
  };

  const handleRemoveCriteria = (id) => {
    if (criteria.length <= 1) {
      setError('You must have at least one evaluation field.');
      return;
    }

    setError('');
    setCriteria((current) =>
      current.filter((criterion) => criterion.id !== id)
    );
  };

  const handleCriteriaChange = (id, field, value) => {
    setError('');

    setCriteria((current) =>
      current.map((criterion) => {
        if (criterion.id !== id) return criterion;

        if (field === 'weight') {
          return {
            ...criterion,
            weight: value === '' ? '' : Number(value),
          };
        }

        return { ...criterion, [field]: value };
      })
    );
  };

  const handleNextStep = (event) => {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Project name is required.');
      return;
    }

    setStep(2);
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setError('');

    if (!user?.id) {
      setError('Please sign in before creating a project.');
      return;
    }

    if (!['admin', 'manager_teacher'].includes(user.role)) {
      setError('You do not have permission to create projects.');
      return;
    }

    if (!title.trim()) {
      setError('Project name is required.');
      setStep(1);
      return;
    }

    if (criteria.some((criterion) => !criterion.name.trim())) {
      setError('Every evaluation field must have a name.');
      return;
    }

    if (
      criteria.some(
        (criterion) =>
          !Number.isFinite(Number(criterion.weight)) ||
          Number(criterion.weight) <= 0 ||
          Number(criterion.weight) > 100
      )
    ) {
      setError('Every field weight must be greater than 0 and at most 100.');
      return;
    }

    if (Math.abs(totalWeight - 100) > 0.000001) {
      setError(`Total weight must equal 100%. Current total: ${totalWeight}%.`);
      return;
    }

    const fieldKeys = criteria.map((criterion) =>
      makeFieldKey(criterion.name)
    );

    if (new Set(fieldKeys).size !== fieldKeys.length) {
      setError(
        'Two field names produce the same field key. Please make their names different.'
      );
      return;
    }

    setSaving(true);
    let createdProjectId = null;

    try {
      // Create the project as a draft.
      const { data: project, error: projectError } = await supabase
        .from('ranking_lists')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category,
          formula_type: formulaType,
          sort_direction: sortDirection,
          tie_method: tieMethod,
          status: 'draft',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (projectError) throw projectError;

      createdProjectId = project.id;

      // Match the actual ranking_fields schema.
      const fieldRows = criteria.map((criterion, index) => ({
        ranking_list_id: createdProjectId,
        field_key: fieldKeys[index],
        label: criterion.name.trim(),
        field_type: 'number',
        is_required: true,
        min_value: 0,
        max_value: null,
        weight: Number(criterion.weight),
        include_in_ranking: true,
        scoring_direction: criterion.scoringDirection,
        sort_order: index + 1,
      }));

      const { error: fieldsError } = await supabase
        .from('ranking_fields')
        .insert(fieldRows);

      if (fieldsError) {
        // Best-effort cleanup if field creation fails.
        const { error: cleanupError } = await supabase
          .from('ranking_lists')
          .delete()
          .eq('id', createdProjectId);

        if (cleanupError) {
          console.error('Project cleanup failed:', cleanupError.message);
        }

        throw fieldsError;
      }

      navigate(`/projects/${createdProjectId}`);
    } catch (err) {
      setError(
        err.message ||
          'Could not create the project. Check your database permissions and schema.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px' }}>
          Create New Ranking Workspace
        </h1>

        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Step {step} of 2:{' '}
          {step === 1
            ? 'Project Overview'
            : 'Evaluation Fields & Ranking Settings'}
        </p>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        {step === 1 && (
          <form
            onSubmit={handleNextStep}
            className="form-card"
            style={{ maxWidth: '100%' }}
          >
            <div className="form-group">
              <label htmlFor="project-title">Ranking Project Name</label>
              <input
                id="project-title"
                type="text"
                placeholder="e.g. CS-101 Final Grades"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-description">Description</label>
              <input
                id="project-description"
                type="text"
                placeholder="Describe how participants will be evaluated"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-category">Category</label>
              <select
                id="project-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                <option value="student">Student / Academic</option>
                <option value="employee">Employee / Team Member</option>
                <option value="vendor">Vendor / Supplier</option>
                <option value="custom">Custom Entity</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: '16px',
              }}
            >
              Next: Configure Fields <ArrowRight size={16} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={handleCreateProject}
            className="form-card"
            style={{ maxWidth: '100%' }}
          >
            <h3>Ranking Formula & Settings</h3>

            <div className="form-group">
              <label htmlFor="formula-type">Calculation Formula</label>
              <select
                id="formula-type"
                value={formulaType}
                onChange={(event) => setFormulaType(event.target.value)}
              >
                <option value="weighted_average">Weighted Average</option>
                <option value="sum">Sum</option>
                <option value="average">Average</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sort-direction">Overall Ranking Direction</label>
              <select
                id="sort-direction"
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value)}
              >
                <option value="higher">Higher total ranks first</option>
                <option value="lower">Lower total ranks first</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tie-method">Tie Handling</label>
              <select
                id="tie-method"
                value={tieMethod}
                onChange={(event) => setTieMethod(event.target.value)}
              >
                <option value="competition">
                  Competition (1, 1, 3)
                </option>
                <option value="dense">Dense (1, 1, 2)</option>
                <option value="ordinal">Ordinal (1, 2, 3)</option>
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '16px',
              }}
            >
              <h3>Evaluation Fields &amp; Weightage</h3>

              <span
                style={{
                  fontWeight: 700,
                  color:
                    Math.abs(totalWeight - 100) < 0.000001
                      ? '#059669'
                      : '#e11d48',
                }}
              >
                Total Weight: {totalWeight}% / 100%
              </span>
            </div>

            {criteria.map((criterion, index) => (
              <div
                key={criterion.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                <div style={{ flex: '2 1 180px' }}>
                  <label htmlFor={`field-name-${criterion.id}`}>
                    Field {index + 1}
                  </label>
                  <input
                    id={`field-name-${criterion.id}`}
                    type="text"
                    placeholder="e.g. Midterm Marks"
                    value={criterion.name}
                    onChange={(event) =>
                      handleCriteriaChange(
                        criterion.id,
                        'name',
                        event.target.value
                      )
                    }
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ flex: '1 1 100px' }}>
                  <label htmlFor={`field-weight-${criterion.id}`}>
                    Weight (%)
                  </label>
                  <input
                    id={`field-weight-${criterion.id}`}
                    type="number"
                    min="0.01"
                    max="100"
                    step="any"
                    value={criterion.weight}
                    onChange={(event) =>
                      handleCriteriaChange(
                        criterion.id,
                        'weight',
                        event.target.value
                      )
                    }
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ flex: '1 1 150px' }}>
                  <label htmlFor={`field-direction-${criterion.id}`}>
                    Best result
                  </label>
                  <select
                    id={`field-direction-${criterion.id}`}
                    value={criterion.scoringDirection}
                    onChange={(event) =>
                      handleCriteriaChange(
                        criterion.id,
                        'scoringDirection',
                        event.target.value
                      )
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="higher">Higher is better</option>
                    <option value="lower">Lower is better</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCriteria(criterion.id)}
                  className="btn-danger"
                  aria-label={`Remove ${criterion.name || `field ${index + 1}`}`}
                  title="Remove field"
                  style={{ padding: '8px', marginTop: '22px' }}
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

            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
              This project will be saved as a draft. You can publish it after
              its fields and results have been checked.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep(1);
                }}
                disabled={saving}
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
                disabled={saving || Math.abs(totalWeight - 100) > 0.000001}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <CheckCircle size={16} />
                {saving ? 'Saving Project...' : 'Create Draft Project'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
