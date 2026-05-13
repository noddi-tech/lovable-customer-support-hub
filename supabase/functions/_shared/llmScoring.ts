// LLM scoring helper — uses OpenAI gpt-5 with structured JSON output.
// Per memory #11: OpenAI is the codebase convention.

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-100, sum across all criteria = 100
  max_score?: number; // always 10 for v1
}

export interface ScoringRubric {
  criteria: RubricCriterion[];
  instructions?: string;
  include_files?: boolean;
  include_custom_fields?: boolean;
}

export interface ScoringInputApplicant {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  years_experience?: number | null;
  certifications?: string[] | null;
  drivers_license_classes?: string[] | null;
  language_norwegian?: string | null;
  work_permit_status?: string | null;
  availability_date?: string | null;
}

export interface ScoringInput {
  applicant: ScoringInputApplicant;
  position: { title: string; description?: string | null };
  custom_field_values: Array<{ field_name: string; field_type: string; value: unknown }>;
  files: Array<{ filename: string; extracted_text: string }>;
  rubric: ScoringRubric;
  stage?: { name: string; description?: string | null } | null;
}

export interface ScoringResult {
  overall_score: number; // 0-10
  per_criterion: Record<string, number>;
  explanation: string;
  strengths: string[];
  concerns: string[];
  model: string;
  token_usage: { input: number; output: number; cost_usd: number };
}

const MODEL = 'gpt-5';
// Approximate gpt-5 pricing (USD per 1M tokens) — adjust when actual pricing is known
const PRICE_INPUT_PER_M = 1.25;
const PRICE_OUTPUT_PER_M = 10.0;
const MAX_FILE_CHARS = 5000;
const MAX_TOTAL_PROMPT_CHARS = 60000;

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n) + '\n…[truncated]';
}

function buildPrompt(input: ScoringInput): string {
  const { applicant, position, custom_field_values, files, rubric, stage } = input;

  const criteriaList = rubric.criteria
    .map((c) => `- ${c.name} (vekt: ${c.weight}%): ${c.description}`)
    .join('\n');

  const applicantBlock = [
    `Navn: ${applicant.first_name} ${applicant.last_name}`,
    `E-post: ${applicant.email}`,
    applicant.phone ? `Telefon: ${applicant.phone}` : null,
    applicant.location ? `Lokasjon: ${applicant.location}` : null,
    applicant.years_experience != null ? `Års erfaring: ${applicant.years_experience}` : null,
    applicant.certifications?.length ? `Sertifiseringer: ${applicant.certifications.join(', ')}` : null,
    applicant.drivers_license_classes?.length ? `Førerkort: ${applicant.drivers_license_classes.join(', ')}` : null,
    applicant.language_norwegian ? `Norsk: ${applicant.language_norwegian}` : null,
    applicant.work_permit_status ? `Arbeidstillatelse: ${applicant.work_permit_status}` : null,
    applicant.availability_date ? `Tilgjengelig fra: ${applicant.availability_date}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const customFieldsBlock = custom_field_values.length
    ? custom_field_values
        .map((f) => `- ${f.field_name}: ${typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value ?? '')}`)
        .join('\n')
    : '(ingen)';

  const filesBlock = files.length
    ? files
        .map((f) => `--- ${f.filename} ---\n${truncate(f.extracted_text, MAX_FILE_CHARS)}`)
        .join('\n\n')
    : '(ingen filer)';

  const stageBlock = stage ? `Nåværende steg: ${stage.name}${stage.description ? ' — ' + stage.description : ''}` : '';

  const prompt = [
    `Du er en erfaren rekrutteringsekspert som vurderer kandidater for en stilling.`,
    ``,
    `STILLING: ${position.title}`,
    position.description ? `BESKRIVELSE: ${position.description}` : '',
    stageBlock,
    ``,
    `RUBRIKK (vurder hver kriterium 0-10):`,
    criteriaList,
    rubric.instructions ? `\nTILLEGGSINSTRUKS: ${rubric.instructions}` : '',
    ``,
    `KANDIDATDATA:`,
    applicantBlock,
    ``,
    `EKSTRA FELTER:`,
    customFieldsBlock,
    ``,
    `FILER:`,
    filesBlock,
    ``,
    `Returner score per kriterium (0-10), 1-2 setninger forklaring, 2-3 styrker og 1-2 bekymringer. Bruk JSON-skjemaet.`,
  ]
    .filter(Boolean)
    .join('\n');

  return truncate(prompt, MAX_TOTAL_PROMPT_CHARS);
}

function buildJsonSchema(rubric: ScoringRubric) {
  const criterionProps: Record<string, unknown> = {};
  const criterionRequired: string[] = [];
  for (const c of rubric.criteria) {
    criterionProps[c.id] = { type: 'number', minimum: 0, maximum: 10 };
    criterionRequired.push(c.id);
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      per_criterion: {
        type: 'object',
        additionalProperties: false,
        properties: criterionProps,
        required: criterionRequired,
      },
      explanation: { type: 'string', maxLength: 500 },
      strengths: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 3 },
      concerns: { type: 'array', items: { type: 'string', maxLength: 200 }, maxItems: 2 },
    },
    required: ['per_criterion', 'explanation', 'strengths', 'concerns'],
  };
}

export async function scoreApplicant(
  input: ScoringInput,
  opts?: { signal?: AbortSignal },
): Promise<ScoringResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const prompt = buildPrompt(input);
  const schema = buildJsonSchema(input.rubric);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: opts?.signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Du er en upartisk rekrutteringsekspert. Returner alltid strukturert JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'applicant_scoring', strict: true, schema },
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errBody.slice(0, 500)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content');

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`);
  }

  // Compute weighted overall score
  let overall = 0;
  let totalWeight = 0;
  for (const c of input.rubric.criteria) {
    const s = Number(parsed.per_criterion?.[c.id] ?? 0);
    overall += s * c.weight;
    totalWeight += c.weight;
  }
  const overallScore = totalWeight > 0 ? Math.round((overall / totalWeight) * 10) / 10 : 0;

  const usage = json.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;
  const costUsd =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;

  return {
    overall_score: Math.max(0, Math.min(10, Math.round(overallScore))),
    per_criterion: parsed.per_criterion,
    explanation: parsed.explanation,
    strengths: parsed.strengths ?? [],
    concerns: parsed.concerns ?? [],
    model: MODEL,
    token_usage: {
      input: inputTokens,
      output: outputTokens,
      cost_usd: Math.round(costUsd * 10000) / 10000,
    },
  };
}
