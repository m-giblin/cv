-- grok-3-mini is retired by xAI. Move saved tenant settings and the column default to grok-4.3.
-- The app already remaps retired models at call time (lib/ai/models.ts); this keeps stored data honest.
alter table public.platform_settings alter column model set default 'grok-4.3';

update public.platform_settings
set model = 'grok-4.3'
where provider = 'xai'
  and model in ('grok-3-mini', 'grok-3', 'grok-2-latest', 'grok-2', 'grok-beta');
