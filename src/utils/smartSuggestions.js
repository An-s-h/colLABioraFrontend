export const SMART_SUGGESTION_KEYWORDS = [
  "Cancer",
  "Cardiology",
  "Cardiac",
  "Cardiovascular",
  "Cardio Oncology",
  "Cardio-Oncology",
  "Cardiac Rehab",
  "Cardiac Surgery",
  "Cardiomyopathy",
  "Clinical Trial",
  "Clinical Trials",
  "Oncology",
  "Immunotherapy",
  "Immunology",
  "Autoimmune",
  "Neurology",
  "Neuroscience",
  "Neurodegenerative",
  "Pediatrics",
  "Genetics",
  "Rare Disease",
  "Diabetes",
  "Endocrinology",
  "Metabolic Disorders",
  "Gastroenterology",
  "Hepatology",
  "Dermatology",
  "Pulmonology",
  "Hematology",
  "Multiple Sclerosis",
  "Leukemia",
  "Lung Cancer",
  "Breast Cancer",
  "Prostate Cancer",
  "Cardiothoracic",
  "Precision Medicine",
  "Digital Health",
  "AI in Healthcare",
  "Radiology",
  "Medical Imaging",
  "Behavioral Health",
  "Mental Health",
  "Immunization",
  "Vaccines",
  "Transplant",
  "Regenerative Medicine",
];

const normalizeTerm = (term) =>
  typeof term === "string" ? term.trim() : "";

export function buildSuggestionPool(extraTerms = []) {
  const merged = [...SMART_SUGGESTION_KEYWORDS, ...extraTerms];
  const pool = [];
  const seen = new Set();

  for (const rawTerm of merged) {
    const term = normalizeTerm(rawTerm);
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(term);
  }

  return pool;
}

export function getSmartSuggestions(
  query,
  extraTerms = [],
  limit = 8
) {
  if (!query || !query.trim()) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const pool = buildSuggestionPool(extraTerms);

  const startsWithMatches = pool.filter((term) =>
    term.toLowerCase().startsWith(normalizedQuery)
  );

  const containsMatches = pool.filter(
    (term) =>
      !startsWithMatches.includes(term) &&
      term.toLowerCase().includes(normalizedQuery)
  );

  return [...startsWithMatches, ...containsMatches].slice(0, limit);
}

export const DEFAULT_SUGGESTION_LIMIT = 8;

