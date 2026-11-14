# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's **private vulnerability reporting** (the "Report a vulnerability" button on the repository's Security tab) and include:

- what you found and where (file, endpoint or page),
- steps to reproduce it,
- the impact you expect.

You will get a reply within a few days. Fixes are released as soon as possible, and reporters are credited unless they prefer otherwise.

## Supported versions

Only the latest release on the `main` branch receives security fixes.

## Operating a deployment safely

- Always serve ds-sim over HTTPS in production (the provided Docker Compose stack does this with Caddy).
- Set `DS_SIM_MASTER_KEY` from a secret store or a `.env` file that is never committed, and keep an offline backup of it.
- Back up the `/data` volume regularly. It is encrypted, but it is still the only copy of user accounts.
- Keep the host, Docker images and Node.js patched.
