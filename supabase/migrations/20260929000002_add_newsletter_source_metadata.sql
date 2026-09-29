-- Per-newsletter fields for a source (competitor and product line for Radar de Producto,
-- HR processes for Procesos RH, tags for IA Usabilidad…). Kept as jsonb so each newsletter
-- can carry its own shape without new columns.

alter table public.newsletter_sources
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Display order on the Boletines page (daily first, then by weekday).
alter table public.newsletters
  add column if not exists sort_order integer not null default 100;
