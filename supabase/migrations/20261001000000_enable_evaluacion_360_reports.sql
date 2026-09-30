-- Evaluación 360 has BigQuery data (product_metrics.axs_360_usability_history): it gets the
-- biweekly pulse and the nested monthly, quarterly, semiannual and annual reports.
update public.analytics_products
set enabled_reports = array['pulso_quincenal', 'mensual', 'trimestral', 'semestral', 'anual'],
    updated_at = now()
where id = 'evaluacion-360';
