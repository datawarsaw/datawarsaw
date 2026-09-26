# Operations

## Cloudflare Pages deploys (Wrangler)

### Required environment variable

Set this before any Wrangler command on this machine:

```powershell
$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.config\certs\windows-trust-bundle.pem"
```

### Why

Without it, Wrangler cannot validate the Cloudflare API certificate, because Node does not
trust the machine's root store. The failure message is misleading and points at
authentication:

```text
X [ERROR] Not logged in. Your auth token has expired and could not be refreshed, and the
environment is non-interactive. Run `wrangler login` in an interactive terminal or set a
CLOUDFLARE_API_TOKEN.
```

The token is not the problem, and `wrangler login` fails the same way with
`fetch failed` or a certificate mismatch. The actual issue is Node certificate trust.

Once the variable is set, `wrangler whoami` reports the logged-in account and the stored
OAuth token refreshes normally. No API token is needed for an interactive login.

### Deploy

Run from the repository root:

```powershell
$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.config\certs\windows-trust-bundle.pem"
wrangler pages deploy ./site --project-name domaradzki-portfolio --branch=main
```

- `main` is the production branch configured on the `domaradzki-portfolio` Pages project.
  Omitting `--branch=main` makes Wrangler infer the branch from git, which produces a
  preview deployment instead of a production release.
- `wrangler.toml` sets `pages_build_output_dir = "./site"`, so `./site` is the published
  artifact. Deploy only from this repository; another local checkout of the same Pages
  project would publish a different build.
