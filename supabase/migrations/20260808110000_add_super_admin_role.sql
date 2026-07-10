-- Must be a separate migration: new enum values cannot be used until committed.
alter type public.profile_role add value if not exists 'super_admin';
