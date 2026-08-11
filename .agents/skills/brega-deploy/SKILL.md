---
name: brega-deploy
description: Deploy the Brega Chai project through either the normal GitLab merge-request and release pipeline or an explicitly selected direct production rollout with ci.skip. Use whenever the user asks to deploy, redeploy, release, or ship brega-chai; combines commit or push with a production rollout; or mentions GitLab skip, ci.skip, deployment pipelines, registry images, production SSH, or deploy checks. Do not use for a standalone local commit or non-production push.
---

# Brega deploy

## Choose the deployment path first

Before staging, committing, pushing, tagging, building images, or changing production, determine whether the user's current message already chooses one of these paths:

1. **Normal via MR and pipelines (recommended)** — push a feature branch without `ci.skip`, create an MR, let GitLab run its checks, and deploy production only from an approved `release-X.Y.Z` tag.
2. **Direct with skip** — push `main` with `git push -o ci.skip`, build immutable images locally, push them to GitLab Registry, and deploy over SSH with local and production checks replacing the skipped pipeline.

If the choice is not explicit, ask this question immediately and do not perform mutations until the user answers:

> Как деплоим: обычно через MR и GitLab pipelines или напрямую с `ci.skip` и ручным деплоем?

Use `request_user_input` when available. Put the normal path first and mark it recommended. If the user already said “через MR/пайплайны” or “со skip/мимо pipeline”, use that choice without asking again.

## Establish the exact release state

1. Work from the repository root.
2. Inspect `git status --short`, the current branch, remotes, recent commits, and the relevant diff. Preserve unrelated dirty and untracked files.
3. Determine affected services from the actual diff:
   - `apps/web` affects web;
   - `apps/cms` affects CMS;
   - `packages/contracts`, root dependencies, lockfiles, or shared build configuration can affect both;
   - Compose, `infra`, `scripts`, or `.gitlab-ci.yml` are deployment changes, not ordinary application-only changes.
4. Never reuse an image tag from memory. Read the current production web and CMS images over SSH before a direct rollout.
5. Never expose registry, SSH, Mailgun, database, Strapi, or application secrets in output.

## Verify before committing

Run checks proportional to the changed surface, including `git diff --check` and formatting checks for edited files.

- CMS: `yarn workspace @brega-chai/cms test`, `typecheck`, and `build`.
- Web: its tests, typecheck, and build; run relevant Playwright tests for UI, checkout, routing, or browser behavior.
- Contracts or shared configuration: verify every affected consumer.
- Production configuration: run `scripts/verify-production-config.sh` and applicable shell syntax checks.

Fix failures before continuing. Treat harmless Strapi telemetry-config permission warnings separately only when compilation and the build both exit successfully.

Stage only task files. Use the `caveman-commit` skill to create a terse conventional commit. Recheck the staged diff and ensure unrelated generated types, documents, local env files, and user work remain unstaged.

## Normal MR and pipeline path

1. Do not use `ci.skip` or skip directives.
2. Work on a feature branch. Do not place a new MR change directly on `main`.
3. Commit and push the branch normally.
4. Use the `gitlab-mr` skill to create the MR with the repository's required Russian title, description, and squash-commit format.
5. Monitor the MR pipeline and report failures with relevant job evidence. Do not merge unless the user explicitly authorizes merging.
6. Production deployment uses a protected tag matching `release-X.Y.Z` on a commit contained in `main`. If the release version or permission to create/push the tag is absent, ask before doing so.
7. The release pipeline must build both immutable images, smoke-test them, run `scripts/deploy.sh`, and pass the production job. Do not substitute a manual SSH rollout inside this path.
8. Perform the production verification described below after the release pipeline succeeds.

## Direct `ci.skip` path

Use this path only after explicit selection. It intentionally replaces GitLab checks with local evidence.

### Commit and push

1. Confirm the target commit is on `main`, fetch `origin`, and check for divergence before pushing. Never force-push.
2. Commit only verified task changes.
3. Push exactly with:

   ```bash
   git push -o ci.skip origin main
   ```

4. Record the full commit SHA and confirm through GitLab that the resulting pipeline status is `skipped`.

### Resolve production images

Read the running images rather than relying on historical tags:

```bash
ssh deploy@186.246.11.140 \
  "docker inspect -f '{{.Config.Image}}' brega-chai-web-1"
ssh deploy@186.246.11.140 \
  "docker inspect -f '{{.Config.Image}}' brega-chai-cms-1"
```

Tag each changed image with the full commit SHA:

```text
registry.gitlab.com/selfgain/brega-chai/web:<full-sha>
registry.gitlab.com/selfgain/brega-chai/cms:<full-sha>
```

Keep the exact currently running immutable tag for an unchanged service.

### Build and publish

Prefer a clean full production build from the committed tree:

```bash
docker buildx build --platform linux/amd64 --target production \
  -f apps/web/Dockerfile -t registry.gitlab.com/selfgain/brega-chai/web:<full-sha> \
  --push .
docker buildx build --platform linux/amd64 --target production \
  -f apps/cms/Dockerfile -t registry.gitlab.com/selfgain/brega-chai/cms:<full-sha> \
  --push .
```

Build only affected services unless shared or infrastructure changes require both.

If an external base registry is temporarily unavailable, the proven CMS-only fallback is an overlay image based on the exact running immutable CMS image. Use it only when dependencies, lockfiles, Dockerfiles, Strapi configuration dependencies, and runtime requirements are unchanged. Build from a clean `git archive` context, copy the tested `apps/cms/src` and compiled `apps/cms/dist`, push the full-SHA tag, verify the image contents, and remove the temporary context. Do not use an overlay when those conditions are not satisfied; stop and report the blocker.

Run or inspect each published image to prove the intended artifact is present before production deployment.

### Handle deployment-configuration changes

For ordinary web/CMS code changes, do not overwrite production Compose or scripts. If `docker-compose*.yml`, `infra`, or `scripts` changed, mirror the release pipeline's reviewed config-transfer step from the exact commit before running deploy. Validate the archive contents and target `/opt/brega-chai`; never copy the whole dirty workspace. Call out this additional production mutation before performing it.

### Deploy

Run the checked-in production script with the new tag for each changed service and the discovered running tag for each unchanged service:

```bash
ssh deploy@186.246.11.140 \
  "cd /opt/brega-chai && \
   CI_COMMIT_SHA=<full-sha> \
   WEB_IMAGE=<resolved-web-image> \
   CMS_IMAGE=<resolved-cms-image> \
   SMOKE_URL=https://bregalliance.ru \
   ./scripts/deploy.sh"
```

Allow `scripts/deploy.sh` to create the PostgreSQL/RustFS backup, wait for health, run the storefront smoke check, and roll back application images on failure. Do not bypass or duplicate its rollback logic.

## Verify production

After either deployment path:

1. Confirm the running web and CMS image tags match the intended immutable tags.
2. Confirm CMS and PostgreSQL health; inspect logs if health is not green.
3. Require HTTP 200 from `https://bregalliance.ru` and `https://admin.bregalliance.ru/admin`.
4. Run task-specific checks against production state, such as database configuration, API responses, email delivery, or UI behavior. Prefer read-only checks.
5. For the direct path, confirm the GitLab pipeline is `skipped`; for the normal path, confirm the release pipeline and deploy job succeeded.
6. Report the commit, image tags, backup identifier, pipeline status/link, health and smoke results, and any unrelated local files intentionally left untouched.

Do not call the deployment complete until every required check passes. If `scripts/deploy.sh` rolls back, report the failed rollout and the restored image tags rather than describing it as deployed.
