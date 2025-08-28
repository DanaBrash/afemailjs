# Fixed Function App Package

This bundle includes:
- `function/` with `index.js`, `functions/mailer.js`, `host.json`, `.funcignore`, and `package.json`
- A robust GitHub Actions workflow at `.github/workflows/deploy-function.yml` with extensive logging
- `scripts/verify_paths.sh` to sanity-check case/paths locally

## Why this works
- On Linux Consumption with Run-From-Package, Azure **does not** install npm deps remotely. The workflow installs deps in CI and ships `node_modules` in the ZIP.
- `functions/mailer.js` avoids top-level crashes by lazy requiring `axios` **inside** the handler and validating env there.

## What to configure
- Update the Azure login step in the workflow to your credentials or keep your existing one.
- Ensure application settings exist in the Function App:
  - `FUNCTIONS_WORKER_RUNTIME=node`
  - `FUNCTIONS_EXTENSION_VERSION=~4`
  - `AzureWebJobsStorage=<connection string>`
  - `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` (and optional `EMAILJS_PRIVATE_KEY`)

## Local test
```bash
cd function
npm install
func start
# GET http://localhost:7071/api/health
# POST http://localhost:7071/api/mailer
```

## CI run will log:
- The exact files being deployed
- First lines of `index.js` and `functions/mailer.js`
- Presence of `node_modules/axios` both before and after deployment
- Trigger sync result and a short log tail
