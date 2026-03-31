import fs from 'node:fs';

const file = new URL('../config/inspire360.curriculum.json', import.meta.url);
const raw = fs.readFileSync(file, 'utf8');
const data = JSON.parse(raw);

const errors = [];
const program = data.program;

if (program?.defaultLanguage !== 'th') errors.push('Default language must be Thai (th).');
if (!Array.isArray(program?.supportedLanguages) || !program.supportedLanguages.includes('th')) {
  errors.push('Supported languages must include Thai (th).');
}

if (!program?.interactionUX?.aiMentorPersona?.enabled) errors.push('AI Mentor persona must be enabled.');
if (!program?.interactionUX?.aiMentorPersona?.showGuidanceEveryStep) {
  errors.push('AI Mentor guidance must be shown in every step.');
}
if (program?.interactionUX?.progressionBar?.label !== 'Step 1-4') errors.push('Progression bar label must be Step 1-4.');
if (!program?.interactionUX?.instantFeedback?.enabled) errors.push('Instant feedback must be enabled.');
if (program?.interactionUX?.instantFeedback?.type !== 'micro-reward') {
  errors.push('Instant feedback type must be micro-reward.');
}

if (!Array.isArray(program?.modules) || program.modules.length !== 5) {
  errors.push('Program must contain exactly 5 modules.');
}

for (const m of program.modules || []) {
  if (!m.id || !m.name || !m.lesson?.url) {
    errors.push(`Module missing required fields: ${m.id || '(unknown)'}`);
  }
  if (m.lesson?.embed !== 'iframe') errors.push(`Module ${m.id} lesson must use iframe embed.`);
  if (m.lesson?.placement !== 'after_pretest') errors.push(`Module ${m.id} lesson placement must be after_pretest.`);
  if (!Array.isArray(m.missions) || m.missions.length === 0) errors.push(`Module ${m.id} must contain missions.`);
  if (!m.postTest) errors.push(`Module ${m.id} must define postTest.`);
}

const module1 = (program.modules || []).find((m) => m.id === 'module-1');
if (module1) {
  const m1 = module1.missions.find((m) => m.id === 'm1-1');
  const m2 = module1.missions.find((m) => m.id === 'm1-2');

  const m1Count = (m1?.partA?.length || 0) + (m1?.partB?.length || 0);
  const m2Count = (m2?.partA?.length || 0) + (m2?.partB?.length || 0);

  if (m1?.parts !== 2 || m1?.questionsPerPart !== 9 || m1Count !== 18) {
    errors.push('Module 1 / Mission 1 must be 2 parts, 9 questions per part, total 18 questions.');
  }
  if ((m1?.partA?.length || 0) !== 9 || (m1?.partB?.length || 0) !== 9) {
    errors.push('Module 1 / Mission 1 must have 9 questions in each part.');
  }

  if (m2?.parts !== 2 || m2?.questionsPerPart !== 6 || m2Count !== 12) {
    errors.push('Module 1 / Mission 2 must be 2 parts, 6 questions per part, total 12 questions.');
  }
  if ((m2?.partA?.length || 0) !== 6 || (m2?.partB?.length || 0) !== 6) {
    errors.push('Module 1 / Mission 2 must have 6 questions in each part.');
  }
}

if ((program.finalPostTest?.passPercent ?? 0) < 80) errors.push('Final post-test pass percent must be at least 80.');
if (program.finalPostTest?.maxRetriesBeforeCooldown !== 3) errors.push('Final post-test retries before cooldown must be 3.');
if (program.finalPostTest?.cooldownHours !== 12) errors.push('Final post-test cooldown must be 12 hours.');

if (errors.length > 0) {
  console.error('Curriculum validation failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Curriculum validation passed.');
