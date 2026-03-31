import fs from 'node:fs';

const file = new URL('../config/inspire360.curriculum.json', import.meta.url);
const raw = fs.readFileSync(file, 'utf8');
const data = JSON.parse(raw);
const program = data.program;
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

assert(Boolean(program?.id), 'program.id is required');
assert(Array.isArray(program?.modules) && program.modules.length === 5, 'Program must contain exactly 5 modules.');
assert(program?.interactionUX?.aiMentorPersona?.enabled === true, 'AI Mentor persona must be enabled.');
assert(Array.isArray(program?.interactionUX?.progressionBar?.steps) && program.interactionUX.progressionBar.steps.length === 4, 'Progression bar must contain 4 steps.');
assert(program?.interactionUX?.instantFeedback?.enabled === true, 'Instant feedback must be enabled.');

for (const mod of program.modules || []) {
  assert(Boolean(mod.id), 'Every module must include id.');
  assert(Boolean(mod.name), `Module ${mod.id} is missing name.`);
  assert(isValidHttpUrl(mod.lesson?.embedUrl), `Module ${mod.id} has invalid lesson.embedUrl.`);
  assert(isValidHttpUrl(mod.lesson?.fallbackEmbedUrl), `Module ${mod.id} has invalid lesson.fallbackEmbedUrl.`);
  assert(isValidHttpUrl(mod.lesson?.openInNewTabUrl), `Module ${mod.id} has invalid lesson.openInNewTabUrl.`);
  assert(mod.lesson?.showAfter === 'pre-test', `Module ${mod.id} lesson.showAfter must be pre-test.`);
  assert(Array.isArray(mod.missions) && mod.missions.length > 0, `Module ${mod.id} must include missions.`);
  assert(Boolean(mod.postTest), `Module ${mod.id} must include postTest.`);
}

const m1 = program.modules.find((m) => m.id === 'module-1');
assert(Boolean(m1), 'module-1 is required.');
if (m1) {
  const m1_1 = m1.missions.find((m) => m.id === 'm1-1');
  const m1_2 = m1.missions.find((m) => m.id === 'm1-2');
  assert(Array.isArray(m1_1?.parts) && m1_1.parts.length === 2, 'module-1 mission m1-1 must have 2 parts.');
  assert(Array.isArray(m1_2?.parts) && m1_2.parts.length === 2, 'module-1 mission m1-2 must have 2 parts.');

  const m1_1_count = (m1_1?.parts || []).reduce((sum, p) => sum + (p.questions?.length || 0), 0);
  const m1_2_count = (m1_2?.parts || []).reduce((sum, p) => sum + (p.questions?.length || 0), 0);
  assert(m1_1_count === 18, 'module-1 mission m1-1 must contain 18 total questions.');
  assert(m1_2_count === 12, 'module-1 mission m1-2 must contain 12 total questions.');
}

assert(program?.finalPostTest?.passPercent === 80, 'Final post-test passPercent must be 80.');
assert(program?.finalPostTest?.retryLimit === 3, 'Final post-test retryLimit must be 3.');
assert(program?.finalPostTest?.cooldownHoursAfterLimit === 12, 'Final post-test cooldownHoursAfterLimit must be 12.');

if (errors.length) {
  console.error('Curriculum validation failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Curriculum validation passed.');
