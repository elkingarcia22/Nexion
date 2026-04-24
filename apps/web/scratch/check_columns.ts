import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gcafhrdzndmgnimonfrt.supabase.co";
const supabaseKey = "sb_publishable_9DyVbZrBIASu9gPe27jHMg__1M-YMDH";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('day_summaries')
    .insert({
      workspace_id: '550e8400-e29b-41d4-a716-446655440000', // Dummy UUID
      summary_date: '2026-04-22',
      summary_text: 'Test summary',
      focus_text: 'Test focus',
      proposal_count: 0,
      finding_count: 0,
      insight_count: 0,
      alert_count: 0,
      feedback_count: 0,
      source_count: 0,
      kpi_data: {},
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert successful! Data:', data);
  }
}

testInsert();
