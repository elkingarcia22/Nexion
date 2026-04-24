import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gcafhrdzndmgnimonfrt.supabase.co";
const supabaseKey = "sb_publishable_9DyVbZrBIASu9gPe27jHMg__1M-YMDH";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('day_summaries')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching rows:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No rows found, trying to get table definition via RPC or other means is not possible here. Let\'s try to insert a minimal row.');
    const { error: insertError } = await supabase.from('day_summaries').insert({}).select();
    if (insertError) {
      console.log('Insert error hints at columns:', insertError.message);
    }
  }
}

checkSchema();
