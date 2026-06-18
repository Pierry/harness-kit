---
description: Create or reuse a Firebase project, configure Hosting, and deploy the current static site. Never deletes.
argument-hint: "[project-id] [site-id], e.g. 'simulador-financiamento-br' (site defaults to project-id)"
---

Publish static site to Firebase Hosting. Create project if missing, else reuse. Deploy.

Print header card before deploy, footer card after live URL returns. Format: .claude/scripts/stage-card.md.

## Hard safety rules

- NEVER delete. No `projects:delete`, no `hosting:sites:delete`, no `hosting:channel:delete`, no resource removal. If wrong project made, tell user to delete in console. Do not attempt.
- Create AT MOST ONE project per run. After `projects:create`, re-check `firebase projects:list`. Confirm exists. Do NOT loop create on ambiguous output. CLI prints `Your Firebase project is ready!` on success, not `Success`. Match loose, verify by list, stop after one.
- Outward-facing publish. Live site = public. Confirm PROJECT_ID with user before create unless user passed it as arg.

## Inputs

- PROJECT_ID. user arg, else derive from feature_id/repo slug, propose, confirm. Globally unique, lowercase, 6-30 chars.
- SITE_ID. default = PROJECT_ID.

## Preconditions

1. `firebase --version` exists. Missing → tell user `npm i -g firebase-tools`. Stop.
2. `firebase login:list`. Not logged in → tell user run `! firebase login`. Stop. Never write creds.

## Steps

1. Resolve PROJECT_ID (above). 
2. `firebase projects:list`. PROJECT_ID present → reuse, skip create. Absent → `firebase projects:create <PROJECT_ID> --display-name "<name>"`. Then re-run `projects:list`, confirm present. Not present → stop, surface error, ask user.
3. Pin default: write `.firebaserc` `{"projects":{"default":"<PROJECT_ID>"}}` if absent or different.
4. Ensure `firebase.json` hosting block exists. Missing → write minimal:
   ```json
   { "hosting": { "public": ".", "ignore": ["firebase.json", "**/.*", "**/node_modules/**"], "cleanUrls": true } }
   ```
   Confirm `public` points at the dir holding `index.html`.
5. Stage first: `firebase hosting:channel:deploy preview --project <PROJECT_ID> --expires 7d`. Capture preview URL. Show user.
6. Promote: `firebase deploy --only hosting --project <PROJECT_ID>`.
7. Live URLs: `https://<SITE_ID>.web.app` and `https://<SITE_ID>.firebaseapp.com`.

## Output

Save `.claude/runtime/outputs/sse/deploy/{feature_id}.md`:
- project id, site id, console URL
- preview URL + expiry
- live URLs
- deployed files count, deploy timestamp

## Reply shape

```
Firebase publish done.
  project: {PROJECT_ID} ({created|reused})
  console: https://console.firebase.google.com/project/{PROJECT_ID}/overview
  preview: {url} (expires 7d)
  live:    https://{SITE_ID}.web.app
  files:   {N} deployed
  next:    custom domain → /firebase-add-domain, or share the live URL
```

## Notes

- Free Spark plan serves Hosting. No billing needed for static deploy.
- Custom domain is a separate step: hand off to `firebase-add-domain` skill.
- SEO domain swap after custom domain: `seo-domain-swap` skill.
