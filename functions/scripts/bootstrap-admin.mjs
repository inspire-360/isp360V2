import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const parseArgs = (argv) =>
  argv.reduce((accumulator, token, index, items) => {
    if (!token.startsWith("--")) return accumulator;

    const key = token.slice(2);
    const next = items[index + 1];
    accumulator[key] = next && !next.startsWith("--") ? next : "true";
    return accumulator;
  }, {});

const args = parseArgs(process.argv.slice(2));

const requiredHint = [
  "Usage:",
  "  npm run bootstrap-admin -- --email admin@example.com --password StrongPass123! --display-name \"DU Admin Test\"",
  "  npm run bootstrap-admin -- --uid EXISTING_UID --role admin",
  "",
  "Prerequisite:",
  "  Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service account JSON for project inspire-72132",
].join("\n");

if (!args.email && !args.uid) {
  console.error(requiredHint);
  process.exit(1);
}

const splitName = (value = "") => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "DU",
    lastName: parts.slice(1).join(" ") || "Admin",
  };
};

const displayName = args["display-name"] || args.name || "DU Admin Test";
const role = args.role || "admin";
const position = args.position || "DU Admin";
const school = args.school || "";
const activePath = args["active-path"] || "/du/admin";

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
    try {
      userRecord = await auth.getUser(args.uid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }
  }

  if (!userRecord && args.email) {
    try {
      userRecord = await auth.getUserByEmail(args.email);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }
  }

  if (!userRecord) {
    if (!args.email || !args.password) {
      throw new Error("User not found. Provide --password to create a new admin test account.");
    }

    userRecord = await auth.createUser({
      email: args.email,
      password: args.password,
      displayName,
      emailVerified: args["email-verified"] === "true",
    });

    console.log(`Created Auth user ${userRecord.uid}`);
  } else if (displayName && userRecord.displayName !== displayName) {
    await auth.updateUser(userRecord.uid, { displayName });
    userRecord = await auth.getUser(userRecord.uid);
  }

  const resolvedDisplayName =
    userRecord.displayName || displayName || userRecord.email?.split("@")[0] || "DU Admin Test";
  const { firstName, lastName } = splitName(resolvedDisplayName);

  await db.collection("users").doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email: userRecord.email || args.email || "",
      role: String(role || "admin").trim().toLowerCase() || "admin",
      name: resolvedDisplayName,
      firstName,
      lastName,
      position,
      school,
      activePath,
      photoURL: userRecord.photoURL || "",
      pdpaAccepted: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      memberStatus: "active",
      sourceProvider: "admin_bootstrap",
      profileVersion: 2,
      updatedBy: "bootstrap-admin-script",
    },
    { merge: true },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        uid: userRecord.uid,
        email: userRecord.email || args.email || "",
        role,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
