-- A plan step can be a knowledge check: a question-bank quiz with a pass mark. It completes itself
-- when the SE passes (step metadata holds questionSource and passScore).
alter type public.plan_step_type add value if not exists 'knowledge_check';
