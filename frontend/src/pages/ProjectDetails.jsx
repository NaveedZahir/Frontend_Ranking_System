// src/pages/ProjectDetails.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, Trophy, Sliders, Save, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);
  const [results, setResults] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');

  // Fetch created project from LocalStorage or fallback to default mock
  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem('custom_projects') || '[]');
    const found = savedProjects.find((p) => p.id === id);

    if (found) {
      setProject(found);
      setCriteria(found.criteria || []);
    } else {
      const defaultProject = {
        id,
        title: 'Ranking Devops Team',
        description: 'Sprint evaluation based on task delivery, bug rate, and code review scores.',
        entityType: 'TEAM',
        criteria: [
          { id: 1, name: 'Assignments Marks', code: 'ASSIGN', weight: 40 },
          { id: 2, name: 'Midterm Marks', code: 'MIDTERM', weight: 60 },
        ],
      };
      setProject(defaultProject);
      setCriteria(defaultProject.criteria);
    }
  }, [id]);

  const canModify = user?.role === 'ADMIN' || user?.role === 'USER';

  // Calculate current sum of field weights
  const totalWeight = criteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);

  // Handle live weight updates for specific criteria columns
  const handleWeightChange = (critId, newWeight) => {
    const updated = criteria.map((item) =>
      item.id === critId ? { ...item, weight: parseFloat(newWeight) || 0 } : item
    );
    setCriteria(updated);
  };

  // Save updated weights and refresh project in state and LocalStorage
  const handleSaveWeights = (e) => {
    e.preventDefault();

    if (totalWeight !== 100) {
      setSaveMessage('Total weight must equal 100% before saving.');
      return;
    }

    const updatedProject = { ...project, criteria };
    setProject(updatedProject);

    // Persist updated weights to LocalStorage
    const savedProjects = JSON.parse(localStorage.getItem('custom_projects') || '[]');
    const updatedProjects = savedProjects.map((p) => (p.id === id ? updatedProject : p));
    localStorage.setItem('custom_projects', JSON.stringify(updatedProjects));

    setSaveMessage('Weightage updated successfully!');
    setTimeout(() => setSaveMessage(''), 3000);

    // If results were already calculated, automatically recalculate with new weights
    if (isCalculated) {
      calculateRankings(criteria);
    }
  };

  // Handle Mock Excel File Selection
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFileName(uploadedFile.name);
      setFileUploaded(true);
      setIsCalculated(false);
    }
  };

  // Reusable composite score calculation engine
  const calculateRankings = (activeCriteria) => {
    const rawStudents = [
      { name: 'Alice Johnson', ASSIGN: 95, MIDTERM: 88 },
      { name: 'Bob Smith', ASSIGN: 70, MIDTERM: 92 },
      { name: 'Charlie Davis', ASSIGN: 85, MIDTERM: 78 },
      { name: 'Diana Prince', ASSIGN: 90, MIDTERM: 95 },
    ];

    const computed = rawStudents.map((student) => {
      let compositeScore = 0;

      activeCriteria.forEach((crit) => {
        const rawMark = student[crit.code] || student[crit.name] || 80;
        const weightFraction = (parseFloat(crit.weight) || 0) / 100;
        compositeScore += rawMark * weightFraction;
      });

      return {
        name: student.name,
        compositeScore,
      };
    });

    computed.sort((a, b) => b.compositeScore - a.compositeScore);
    const rankedResults = computed.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    setResults(rankedResults);
    setIsCalculated(true);
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <h1>{project?.title}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{project?.description}</p>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
          Entity: {project?.entityType}
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TEACHER/ADMIN: DYNAMIC WEIGHT ADJUSTMENT PANEL                */}
      {/* ------------------------------------------------------------- */}
      {canModify ? (
        <div className="form-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="var(--primary)" /> Adjust Field Weightage
            </h3>
            <span style={{ fontWeight: 700, color: totalWeight === 100 ? '#059669' : '#e11d48' }}>
              Total Sum: {totalWeight}% / 100%
            </span>
          </div>

          <form onSubmit={handleSaveWeights}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              {criteria.map((c) => (
                <div key={c.id} className="form-group" style={{ marginBottom: 0 }}>
                  <label>{c.name} ({c.code || 'CODE'})</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={c.weight}
                      onChange={(e) => handleWeightChange(c.id, e.target.value)}
                      style={{ padding: '8px' }}
                    />
                    <span style={{ fontWeight: 600 }}>%</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button type="submit" className="btn-primary" disabled={totalWeight !== 100}>
                <Save size={16} /> Save New Weights
              </button>

              {saveMessage && (
                <span style={{
                  color: totalWeight === 100 ? '#059669' : '#e11d48',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {totalWeight === 100 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {saveMessage}
                </span>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* READ-ONLY FIELD WEIGHTS FOR VIEWER/STUDENT */
        <div className="form-card" style={{ maxWidth: '100%', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Evaluation Criteria Weights</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {criteria.map((c) => (
              <div
                key={c.id}
                style={{
                  background: '#f1f5f9',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}
              >
                <strong>{c.name}:</strong> {c.weight}% Weight
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TEACHER/ADMIN SECTION: UPLOAD & CALCULATE                     */}
      {/* ------------------------------------------------------------- */}
      {canModify && (
        <div className="form-card" style={{ maxWidth: '100%', marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Data Processing & Execution</h3>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label
              style={{
                border: '1px dashed var(--primary)',
                padding: '10px 16px',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#eef2ff',
              }}
            >
              <Upload size={16} color="var(--primary)" />
              {fileName ? fileName : 'Choose Excel (.xlsx) file...'}
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            {fileUploaded && (
              <button onClick={() => calculateRankings(criteria)} className="btn-primary">
                <Play size={16} /> Calculate Student Rankings
              </button>
            )}

            {isCalculated && (
              <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Rankings Computed Successfully!
              </span>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEADERBOARD STANDINGS TABLE                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="table-card">
        <div className="table-header">
          <Trophy color="#f59e0b" size={20} /> Ranked Results
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank Position</th>
              <th>Participant Name</th>
              <th>Composite Final Score</th>
            </tr>
          </thead>
          <tbody>
            {isCalculated ? (
              results.map((r) => (
                <tr key={r.rank}>
                  <td className="rank-cell">#{r.rank}</td>
                  <td>{r.name}</td>
                  <td style={{ fontWeight: 700 }}>{r.compositeScore.toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                  {canModify
                    ? 'Upload student data Excel sheet and click "Calculate Student Rankings" to generate leaderboard.'
                    : 'Leaderboard is currently awaiting calculation by the workspace manager.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};