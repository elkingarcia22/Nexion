-- Unify metric category names to match product keys from onboarding
-- This ensures products selected in onboarding map correctly to metrics

update public.metrics
set category = 'matriz_talento'
where category = 'matrix';

update public.metrics
set category = 'evaluacion_360'
where category = '360';

update public.metrics
set category = 'contratacion'
where category = 'hiring';

update public.metrics
set category = 'lms_creator'
where category = 'creator';
