
const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function calculateResults(entries, fields, project) {
  const activeFields = fields
    .filter((field) => field.include_in_ranking)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (activeFields.length === 0) {
    throw new Error('Add at least one criterion to calculate rankings.');
  }

  const formula = project.formula_type || 'weighted_average';

  if (!['weighted_average', 'sum', 'average'].includes(formula)) {
    throw new Error(`Unsupported ranking formula: ${formula}`);
  }

  const weights = activeFields.map((field) =>
    Number(field.weight ?? 0)
  );

  if (
    weights.some((weight) => !Number.isFinite(weight) || weight < 0)
  ) {
    throw new Error('Criterion weights must be valid nonnegative numbers.');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (formula === 'weighted_average' && Math.abs(totalWeight - 100) > 0.001) {
    throw new Error('Included criterion weights must total 100%.');
  }

  const prepared = entries.map((entry) => {
    const values = {};
    const missing = {};

    for (const field of activeFields) {
      const raw = toFiniteNumber(entry.field_values?.[field.field_key]);

      if (raw === null) {
        values[field.field_key] = 0;
        missing[field.field_key] = true;
      } else {
        values[field.field_key] = raw;
        missing[field.field_key] = false;
      }

      const min = toFiniteNumber(field.min_value);
      const max = toFiniteNumber(field.max_value);

      if (min !== null && max !== null && min > max) {
        throw new Error(
          `Minimum cannot exceed maximum for "${field.label}".`
        );
      }

      if (
        raw !== null &&
        ((min !== null && raw < min) ||
          (max !== null && raw > max))
      ) {
        throw new Error(
          `"${entry.participant_name}" has a value outside the allowed range for "${field.label}".`
        );
      }
    }

    return { entry, values, missing };
  });

  const ranges = {};

  for (const field of activeFields) {
    const observed = prepared
      .filter((row) => !row.missing[field.field_key])
      .map((row) => row.values[field.field_key]);

    const configuredMin = toFiniteNumber(field.min_value);
    const configuredMax = toFiniteNumber(field.max_value);

    ranges[field.field_key] = {
      min: configuredMin ?? (observed.length ? Math.min(...observed) : 0),
      max: configuredMax ?? (observed.length ? Math.max(...observed) : 0),
    };
  }

  const results = prepared.map(({ entry, values, missing }) => {
    const criterionScores = {};
    const incompleteCriteria = [];

    for (const field of activeFields) {
      const key = field.field_key;
      const value = values[key];
      const range = ranges[key];

      let score;

      // Missing data must never earn a bonus on a lower-is-better
      // criterion, even though its stored calculation value is zero.
      if (missing[key]) {
        score = 0;
        incompleteCriteria.push(field.label);
      } else if (range.max === range.min) {
        score = 100;
      } else if (field.scoring_direction === 'lower') {
        score =
          100 * (range.max - value) / (range.max - range.min);
      } else {
        score =
          100 * (value - range.min) / (range.max - range.min);
      }

      criterionScores[key] = Number(clamp(score, 0, 100).toFixed(4));
    }

    let finalScore;

    if (formula === 'weighted_average') {
      finalScore = activeFields.reduce(
        (sum, field) =>
          sum +
          criterionScores[field.field_key] * Number(field.weight ?? 0),
        0
      ) / totalWeight;
    } else {
      const sum = activeFields.reduce(
        (total, field) => total + criterionScores[field.field_key],
        0
      );

      finalScore = formula === 'average'
        ? sum / activeFields.length
        : sum;
    }

    return {
      ...entry,
      criterionScores,
      finalScore: Number(finalScore.toFixed(2)),
      incomplete: incompleteCriteria.length > 0,
      incompleteCriteria,
      rank: null,
    };
  });

  const direction = project.sort_direction === 'lower' ? 1 : -1;

  results.sort((a, b) => {
    const scoreDifference = (a.finalScore - b.finalScore) * direction;

    if (scoreDifference !== 0) return scoreDifference;

    return String(a.participant_name || '').localeCompare(
      String(b.participant_name || '')
    );
  });

  const tieMethod = project.tie_method || 'competition';
  let previousScore;
  let previousRank = 0;
  let denseRank = 0;

  results.forEach((result, index) => {
    const tied = previousScore !== undefined &&
      result.finalScore === previousScore;

    if (tieMethod === 'ordinal') {
      result.rank = index + 1;
    } else if (tied) {
      result.rank = previousRank;
    } else {
      denseRank += 1;
      result.rank = tieMethod === 'dense' ? denseRank : index + 1;
    }

    if (!tied) previousRank = result.rank;
    previousScore = result.finalScore;
  });

  return results;
}
