import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const parseArgs = (argv) =>
  argv.reduce((accumulator, token, index, items) => {
    if (!token.startsWith("--")) return accumulator;
    const key = token.slice(2);
    const next = items[index + 1];
    accumulator[key] = next && !next.startsWith("--") ? next : "true";
    return accumulator;
  }, {});

const args = parseArgs(process.argv.slice(2));
const usageText = [
  "Usage:",
  "  npm run delete-user-account -- --email user@example.com",
  "  npm run delete-user-account -- --uid USER_UID",
  "",
  "Optional flags:",
  "  --project inspire-72132",
].join("\n");

if (!args.email && !args.uid) {
  console.error(usageText);
  process.exit(1);
}

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: args.project || "inspire-72132",
    });
  }

  const auth = getAuth();
  const db = getFirestore();

  let userRecord = null;
  if (args.uid) {
    userRecord = await auth.getUser(args.uid);
  } else {
    userRecord = await auth.getUserByEmail(args.email);
  }

  await db.collection("presence").doc(userRecord.uid).delete().catch(() => {});
  await db.collection("users").doc(userRecord.uid).delete().catch(() => {});
  await auth.deleteUser(userRecord.uid);

  console.log(
    JSON.stringify(
      {
        ok: true,
        uid: userRecord.uid,
        email: userRecord.email || args.email || "",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}
