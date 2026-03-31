import process from 'node:process';

const STRICT_MODE = process.argv.includes('--strict');

/**
 * Result helper
 */
const result = {
  timestamp: new Date().toISOString(),
  strictMode: STRICT_MODE,
  projectId: null,
  checks: {
    adminInit: { ok: false, details: '' },
    firestoreConnection: { ok: false, details: '' },
    realtimeDatabaseConnection: { ok: false, details: '' },
    roleAssignment: { ok: false, details: '' },
    learningPageAccess: { ok: false, details: '' }
  }
};

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error.message}`);
  }
}

function parseRequiredRoles() {
  const raw = process.env.FIREBASE_REQUIRED_ROLES || '';
  return raw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

function parseLearningPageRoles() {
  const raw = process.env.FIREBASE_LEARNING_PAGE_ROLES || 'learner,teacher,admin';
  return raw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

async function run() {
  let admin;

  try {
    admin = await import('firebase-admin');
  } catch (error) {
    console.error('Cannot import firebase-admin. Install dependencies first (npm install).');
    console.error(error.message);
    process.exit(1);
  }

  try {
    const serviceAccount = readServiceAccount();
    const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || null;
    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    if (!databaseURL) {
      throw new Error('Missing FIREBASE_DATABASE_URL for Realtime Database connectivity check');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || undefined,
      databaseURL
    });

    result.projectId = projectId;
    result.checks.adminInit = {
      ok: true,
      details: 'Firebase Admin SDK initialized successfully.'
    };
  } catch (error) {
    result.checks.adminInit = {
      ok: false,
      details: error.message
    };

    finalizeAndExit();
    return;
  }

  // Firestore connectivity
  try {
    const firestore = admin.firestore();
    await firestore.doc('_healthcheck/connection').get();

    result.checks.firestoreConnection = {
      ok: true,
      details: 'Connected to Firestore successfully.'
    };
  } catch (error) {
    result.checks.firestoreConnection = {
      ok: false,
      details: `Firestore connectivity failed: ${error.message}`
    };
  }

  // Realtime Database connectivity
  try {
    const rtdb = admin.database();
    await rtdb.ref('.info/connected').get();

    result.checks.realtimeDatabaseConnection = {
      ok: true,
      details: 'Connected to Realtime Database successfully.'
    };
  } catch (error) {
    result.checks.realtimeDatabaseConnection = {
      ok: false,
      details: `Realtime Database connectivity failed: ${error.message}`
    };
  }

  // Role assignment verification using custom claims
  try {
    const uid = process.env.FIREBASE_TEST_UID;
    const requiredRoles = parseRequiredRoles();
    const learningPageRoles = parseLearningPageRoles();

    if (!uid) {
      result.checks.roleAssignment = {
        ok: true,
        details: 'Skipped role-assignment check (FIREBASE_TEST_UID not provided).'
      };
      result.checks.learningPageAccess = {
        ok: true,
        details: 'Skipped learning-page access check (FIREBASE_TEST_UID not provided).'
      };
    } else {
      const userRecord = await admin.auth().getUser(uid);
      const claims = userRecord.customClaims || {};
      const roleValues = new Set([
        claims.role,
        ...(Array.isArray(claims.roles) ? claims.roles : [])
      ].filter(Boolean));

      const missingRoles = requiredRoles.filter((r) => !roleValues.has(r));

      if (missingRoles.length > 0) {
        result.checks.roleAssignment = {
          ok: false,
          details: `User ${uid} is missing required roles: ${missingRoles.join(', ')}`
        };
      } else {
        result.checks.roleAssignment = {
          ok: true,
          details: `User ${uid} has expected role claims. Current roles: ${[...roleValues].join(', ') || '(none)'}`
        };
      }

      const matchedLearningRoles = learningPageRoles.filter((r) => roleValues.has(r));
      if (matchedLearningRoles.length > 0) {
        result.checks.learningPageAccess = {
          ok: true,
          details: `User ${uid} can access learning page via role(s): ${matchedLearningRoles.join(', ')}`
        };
      } else {
        result.checks.learningPageAccess = {
          ok: false,
          details: `User ${uid} cannot access learning page. Allowed roles: ${learningPageRoles.join(', ')}`
        };
      }
    }
  } catch (error) {
    result.checks.roleAssignment = {
      ok: false,
      details: `Role-assignment check failed: ${error.message}`
    };
    result.checks.learningPageAccess = {
      ok: false,
      details: `Learning-page access check failed: ${error.message}`
    };
  }

  finalizeAndExit();
}

function finalizeAndExit() {
  const failedChecks = Object.values(result.checks).filter((c) => !c.ok);
  const overallOk = failedChecks.length === 0;

  console.log(JSON.stringify({ overallOk, ...result }, null, 2));

  if (STRICT_MODE && !overallOk) {
    process.exit(2);
  }

  process.exit(overallOk ? 0 : 1);
}

run();
