-- Distinguish "awaiting first review" from "manager sent back for redo"
alter type public.review_status add value if not exists 'needs_revision';
