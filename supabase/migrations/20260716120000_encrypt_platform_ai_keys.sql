-- Rename API key column to reflect encrypted-at-rest storage (AES-256-GCM ciphertext).

alter table public.platform_settings
  rename column api_key to api_key_ciphertext;

comment on column public.platform_settings.api_key_ciphertext is
  'AES-256-GCM ciphertext prefixed with v1:. Requires PLATFORM_SECRETS_ENCRYPTION_KEY on the app server to decrypt.';
