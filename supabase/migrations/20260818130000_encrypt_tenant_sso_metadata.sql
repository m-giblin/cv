-- SSO metadata (SAML/OIDC config) commonly embeds IdP certs and/or client
-- secrets and was stored as plain jsonb with no application-level
-- encryption, unlike webhook secrets and AI provider keys. Add a ciphertext
-- column; application code encrypts on write and decrypts on read for the
-- already-gated super-admin API path. The old `metadata` column is kept
-- for backward-compat reads of pre-migration rows (same tolerated-legacy
-- pattern used for AI provider keys) and stops being written to.
alter table public.tenant_sso_configs
  add column if not exists metadata_ciphertext text;
