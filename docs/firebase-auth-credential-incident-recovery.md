# Firebase Auth Credential Incident Recovery

## What Happened

A temporary authorized-user credential file was created during Firebase admin script testing. That file contained:

- a refresh token
- the OAuth client metadata used by Firebase CLI / Google installed-app auth

The file was never pushed successfully, but it was treated as compromised and handled as an incident.

## What Was Remediated

The following actions were completed on the local machine and repository:

1. Revoked the exposed refresh token.
2. Removed the bad local commit that contained the temporary credential file.
3. Expired reflog entries and pruned git objects so the removed credential file is no longer retained in reachable local history.
4. Deleted the temporary file `functions/.codex-temp-firebase-adc.json`.
5. Cleared the stale local Firebase credential cache files so the next Firebase login starts from a clean state.
6. Added credential-focused ignore rules in `.gitignore`.

## About the `client_secret`

The `client_secret` that appeared in the temporary authorized-user JSON is not an application secret from this repository or from the Firebase project itself.

It belongs to the OAuth client used by Firebase CLI / Google installed-app authentication. In practice, the correct mitigation for this incident is:

- revoke the refresh token
- remove the file from history
- delete any stale local credential cache
- force a clean re-authentication

There is no project-level Firebase setting in this repository to rotate that CLI-owned `client_secret`.

## Required Next Step Before More Firebase Work

Before running `firebase` commands or admin backfill scripts again:

1. Run `firebase login --reauth`
2. If admin SDK scripts are needed, use a proper service-account JSON stored outside the repo
3. Point `GOOGLE_APPLICATION_CREDENTIALS` to that external file only for the session that needs it

## Safe Handling Rules Going Forward

- Never commit authorized-user JSON files.
- Never create ADC or credential JSON files inside the repo unless they are guaranteed ignored and temporary.
- Keep service-account files outside the repository tree.
- Use the repository ignore rules for `.env`, credential JSON, service-account JSON, and ADC-like files.

## Verification Checklist

- `git log --all --name-only -- functions/.codex-temp-firebase-adc.json` returns nothing
- the temporary credential file is absent from the working tree
- stale local Firebase auth cache files have been removed
- Firebase CLI requires a fresh login before further deploy or admin-script usage
