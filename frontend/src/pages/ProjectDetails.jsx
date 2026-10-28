
import { calculateResults } from '../lib/rankingEngine';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Upload,
  Trophy,
  Sliders,
  Save,
  Play,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const MANAGER_ROLES = ['admin', 'manager_teacher'];

const normaliseHeader = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const parseCSV = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }

      row.push(cell.trim());

      if (row.some((value) => value !== '')) {
        rows.push(row);
      }

      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (quoted) {
    throw new Error('The CSV contains an unclosed quotation mark.');
  }

  row.push(cell.trim());

  if (row.some((value) => value !== '')) {
    rows.push(row);
  }

  if (rows.length < 2) {
    throw new Error(
      'The CSV must contain a header and at least one participant.'
    );
  }

  const headers = rows[0].map((header) =>
    normaliseHeader(header.replace(/^\uFEFF/, ''))
  );

  if (headers.some((header) => !header)) {
    throw new Error('Every CSV column must have a header.');
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error('The CSV contains duplicate column headers.');
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${index + 2} has the wrong number of columns.`
      );
    }

    return Object.fromEntries(
      headers.map((header, i) => [header, values[i]])
    );
  });
};

export const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);

  const canModify = MANAGER_ROLES.includes(user?.role);
  const isPublished = project?.status === 'published';

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data: projectData,
        error: projectError,
      } = await supabase
        .from('ranking_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) {
        throw projectError;
      }

      const [fieldsResponse, entriesResponse] = await Promise.all([
        supabase
          .from('ranking_fields')
          .select('*')
          .eq('ranking_list_id', id)
          .order('sort_order', { ascending: true }),

        supabase
          .from('ranking_entries')
          .select('*')
          .eq('ranking_list_id', id),
      ]);

      if (fieldsResponse.error) {
        throw fieldsResponse.error;
      }

      if (entriesResponse.error) {
        throw entriesResponse.error;
      }

      setProject(projectData);
      setCriteria(fieldsResponse.data ?? []);
      setEntries(entriesResponse.data ?? []);
    } catch (err) {
      setError(err.message || 'Unable to load this ranking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  // Safely calculate results so invalid configuration does not crash the page.
  const calculation = useMemo(() => {
    if (!project) {
      return { results: [], error: '' };
    }

    try {
      return {
        results: calculateResults(entries, criteria, project),
        error: '',
      };
    } catch (err) {
      return {
        results: [],
        error: err.message || 'Unable to calculate ranking.',
      };
    }
  }, [entries, criteria, project]);

  const results = calculation.results;

  const totalWeight = criteria
    .filter((field) => field.include_in_ranking)
    .reduce((sum, field) => sum + Number(field.weight || 0), 0);

  const handleWeightChange = (fieldId, value) => {
    setCriteria((current) =>
      current.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              weight: value === '' ? '' : Number(value),
            }
          : field
      )
    );
  };

  const handleSaveWeights = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!canModify) {
      setError('You do not have permission to edit this ranking.');
      return;
    }

    if (
      criteria.some(
        (field) =>
          field.include_in_ranking &&
          (
            field.weight === '' ||
            !Number.isFinite(Number(field.weight)) ||
            Number(field.weight) < 0
          )
      )
    ) {
      setError(
        'Included field weights must be valid non-negative numbers.'
      );
      return;
    }

    if (
      project.formula_type === 'weighted_average' &&
      Math.abs(totalWeight - 100) > 0.001
    ) {
      setError('Included field weights must total 100%.');
      return;
    }

    setSaving(true);

    try {
      for (const field of criteria) {
        const { error: updateError } = await supabase
          .from('ranking_fields')
          .update({ weight: Number(field.weight || 0) })
          .eq('id', field.id)
          .eq('ranking_list_id', id);

        if (updateError) {
          throw updateError;
        }
      }

      setMessage('Weights saved successfully.');
      await loadProject();
    } catch (err) {
      setError(`Could not save all weights: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    setError('');
    setMessage('');

    if (!canModify) {
      setError('You do not have permission to import scores.');
      return;
    }

    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }

    if (!criteria.length) {
      setError('This project has no configured fields.');
      return;
    }

    setImporting(true);
    let batchId = null;

    try {
      const csvText = await file.text();
      const csvRows = parseCSV(csvText);

      const nameHeaders = [
        'participant_name',
        'name',
        'student_name',
        'employee_name',
      ];

      const codeHeaders = [
        'participant_code',
        'code',
        'student_id',
        'employee_id',
      ];

      const nameHeader = nameHeaders.find((header) =>
        csvRows.some((row) => header in row)
      );

      const codeHeader = codeHeaders.find((header) =>
        csvRows.some((row) => header in row)
      );

      if (!nameHeader) {
        throw new Error(
          'CSV needs a participant_name, participant name, or name column.'
        );
      }

      const fieldHeaders = criteria.map((field) => {
        const possibleHeaders = [
          normaliseHeader(field.field_key),
          normaliseHeader(field.label),
        ];

        const found = possibleHeaders.find((header) =>
          csvRows.some((row) => header in row)
        );

        if (!found) {
          throw new Error(
            `CSV is missing a column for "${field.label}". Use "${field.field_key}" as its header.`
          );
        }

        return { field, header: found };
      });

      const entryRows = csvRows.map((row, index) => {
        const participantName = row[nameHeader]?.trim();

        if (!participantName) {
          throw new Error(
            `CSV row ${index + 2} has no participant name.`
          );
        }

        const fieldValues = {};

        for (const { field, header } of fieldHeaders) {
          const raw = row[header];

          // Missing numeric values are stored as null and scored as zero
          // by rankingEngine.js.
          if (raw === undefined || raw === '') {
            fieldValues[field.field_key] = null;
            continue;
          }

          if (field.field_type === 'number') {
            const value = Number(raw);

            if (!Number.isFinite(value)) {
              throw new Error(
                `CSV row ${index + 2} has an invalid number for "${field.label}".`
              );
            }

            if (
              field.min_value != null &&
              value < Number(field.min_value)
            ) {
              throw new Error(
                `CSV row ${index + 2}: "${field.label}" is below its minimum.`
              );
            }

            if (
              field.max_value != null &&
              value > Number(field.max_value)
            ) {
              throw new Error(
                `CSV row ${index + 2}: "${field.label}" exceeds its maximum.`
              );
            }

            fieldValues[field.field_key] = value;
          } else {
            fieldValues[field.field_key] = raw;
          }
        }

        return {
          ranking_list_id: id,
          user_id: null,
          participant_name: participantName,
          participant_code: codeHeader
            ? row[codeHeader] || null
            : null,
          field_values: fieldValues,
        };
      });

      // Create a record to track this import.
      const {
        data: batch,
        error: batchError,
      } = await supabase
        .from('import_batches')
        .insert({
          ranking_list_id: id,
          file_name: file.name,
          uploaded_by: user.id,
          status: 'processing',
          row_count: 0,
        })
        .select('id')
        .single();

      if (batchError) {
        throw batchError;
      }

      batchId = batch.id;

      const { error: insertError } = await supabase
        .from('ranking_entries')
        .insert(entryRows);

      if (insertError) {
        throw insertError;
      }

      const { error: batchUpdateError } = await supabase
        .from('import_batches')
        .update({
          status: 'completed',
          row_count: entryRows.length,
          error_message: null,
        })
        .eq('id', batchId);

      if (batchUpdateError) {
        throw batchUpdateError;
      }

      setFile(null);
      setMessage(
        `Imported ${entryRows.length} participants successfully.`
      );

      await loadProject();
    } catch (err) {
      setError(`Import failed: ${err.message}`);

      if (batchId) {
        const { error: batchUpdateError } = await supabase
          .from('import_batches')
          .update({
            status: 'failed',
            error_message: err.message,
          })
          .eq('id', batchId);

        if (batchUpdateError) {
          console.error(
            'Could not update import status:',
            batchUpdateError.message
          );
        }
      }
    } finally {
      setImporting(false);
    }
  };

  const handlePublish = async () => {
    setError('');
    setMessage('');

    if (!canModify) {
      setError('You do not have permission to publish this ranking.');
      return;
    }

    if (!entries.length) {
      setError('Import participant data before publishing.');
      return;
    }

    if (!criteria.some((field) => field.include_in_ranking)) {
      setError('Enable at least one field for ranking.');
      return;
    }

    if (calculation.error) {
      setError(calculation.error);
      return;
    }

    if (
      !results.some((result) =>
        Number.isFinite(result.finalScore)
      )
    ) {
      setError('There are no valid scores to rank.');
      return;
    }

    setPublishing(true);

    try {
      const { error: updateError } = await supabase
        .from('ranking_lists')
        .update({ status: 'published' })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setProject((current) => ({
        ...current,
        status: 'published',
      }));

      setMessage('Ranking published successfully.');
    } catch (err) {
      setError(`Could not publish ranking: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="page-container">Loading ranking...</div>;
  }

  if (error && !project) {
    return (
      <div className="page-container">
        <div className="error-banner" role="alert">
          {error}
        </div>

        <button className="btn-primary" onClick={loadProject}>
          Retry
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-container">
        Ranking not found.
      </div>
    );
  }

  const visibleToStudent = user?.role === 'student_employee';

  if (visibleToStudent && !isPublished) {
    return (
      <div className="page-container">
        <h1>Ranking not available</h1>
        <p>This ranking has not been published.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <h1>{project.title}</h1>

        <p style={{ color: 'var(--text-muted)' }}>
          {project.description || 'No description provided.'}
        </p>

        <p>
          Category: {project.category || 'General'} · Status:{' '}
          {project.status}
        </p>

        <p style={{ color: 'var(--text-muted)' }}>
          Formula: {project.formula_type} · Sort:{' '}
          {project.sort_direction} first · Tie method:{' '}
          {project.tie_method}
        </p>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {calculation.error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          {calculation.error}
        </div>
      )}

      {message && (
        <p
          role="status"
          style={{ color: '#059669', marginBottom: '16px' }}
        >
          <CheckCircle2n
          />{' '}
          {message}
        </p>
      )}

      {canModify && (
        <>
          <section
            className="form-card"
            style={{
              maxWidth: '100%',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <Sliders size={18} />
              Evaluation Field Weights
            </h3>

            <p style={{ color: 'var(--text-muted)' }}>
              {project.formula_type === 'weighted_average'
                ? 'Included field weights must total 100%.'
                : 'Weights are not used by the selected formula.'}{' '}
              If a field has no configured minimum and maximum, its scores
              are normalised using the observed participant range.
            </p>

            <form onSubmit={handleSaveWeights}>
              {criteria.map((field) => (
                <div
                  key={field.id}
                  className="form-group"
                  style={{ marginBottom: '12px' }}
                >
                  <label htmlFor={`weight-${field.id}`}>
                    {field.label}
                    {field.include_in_ranking
                      ? ''
                      : ' (not included)'}
                  </label>

                  <input
                    id={`weight-${field.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={field.weight ?? ''}
                    onChange={(event) =>
                      handleWeightChange(
                        field.id,
                        event.target.value
                      )
                    }
                    disabled={
                      !field.include_in_ranking || saving
                    }
                  />
                </div>
              ))}

              <p>
                Included weight total: {totalWeight.toFixed(2)}%
                {project.formula_type === 'weighted_average'
                  ? ' / 100%'
                  : ''}
              </p>

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  saving ||
                  (
                    project.formula_type === 'weighted_average' &&
                    Math.abs(totalWeight - 100) > 0.001
                  )
                }
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Weights'}
              </button>
            </form>
          </section>

          <section
            className="form-card"
            style={{
              maxWidth: '100%',
              marginBottom: '24px',
            }}
          >
            <h3>Import Participant Scores (CSV)</h3>

            <p style={{ color: 'var(--text-muted)' }}>
              Your CSV must contain a participant name column and a column
              for every configured field. Use field keys or field labels
              as headers. Missing scores are treated as zero during ranking.
            </p>

            <p style={{ fontSize: '0.9rem' }}>
              Example headers:{' '}
              <code>
                participant_name,participant_code,assignments_marks,midterm_marks
              </code>
            </p>

            <label>
              <Upload
                size={16}
                style={{ display: 'inline' }}
              />{' '}
              Choose CSV file

              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) =>
                  setFile(event.target.files?.[0] ?? null)
                }
                style={{
                  display: 'block',
                  marginTop: '8px',
                }}
              />
            </label>

            {file && <p>Selected: {file.name}</p>}

            <button
              type="button"
              className="btn-primary"
              onClick={handleImport}
              disabled={!file || importing}
              style={{ marginTop: '16px' }}
            >
              <Play size={16} />
              {importing ? 'Importing...' : 'Import Scores'}
            </button>
          </section>

          <section
            className="form-card"
            style={{
              maxWidth: '100%',
              marginBottom: '24px',
            }}
          >
            <h3>Publication</h3>

            <p>
              {isPublished
                ? 'This ranking is published and visible to permitted students/employees.'
                : 'This ranking is a draft. Publishing makes its leaderboard available to permitted students/employees.'}
            </p>

            {!isPublished && (
              <button
                type="button"
                className="btn-primary"
                onClick={handlePublish}
                disabled={
                  publishing ||
                  !entries.length ||
                  Boolean(calculation.error)
                }
              >
                <Globe size={16} />
                {publishing
                  ? 'Publishing...'
                  : 'Publish Leaderboard'}
              </button>
            )}
          </section>
        </>
      )}

      <section className="table-card">
        <div className="table-header">
          <Trophy color="#f59e0b" size={20} />
          Leaderboard
        </div>

        {!entries.length ? (
          <p style={{ padding: '24px' }}>
            No participant entries have been imported yet.
          </p>
        ) : calculation.error ? (
          <p style={{ padding: '24px' }}>
            The leaderboard cannot be calculated until the error above
            is corrected.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Participant</th>
                  <th>Participant Code</th>

                  {criteria.map((field) => (
                    <th key={field.id}>{field.label}</th>
                  ))}

                  <th>Total Score</th>
                </tr>
              </thead>

              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td className="rank-cell">
                      {result.rank === null
                        ? '—'
                        : `#${result.rank}`}
                    </td>

                    <td>{result.participant_name}</td>

                    <td>
                      {result.participant_code || '—'}
                    </td>

                    {criteria.map((field) => {
                      const raw = result.field_values?.[
                        field.field_key
                      ];

                      return (
                        <td key={field.id}>
                          {raw === null ||
                          raw === undefined ||
                          raw === ''
                            ? '—'
                            : String(raw)}
                        </td>
                      );
                    })}

                    <td style={{ fontWeight: 700 }}>
                      {Number.isFinite(result.finalScore)
                        ? result.finalScore.toFixed(2)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
