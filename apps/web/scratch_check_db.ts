
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gcafhrdzndmgnimonfrt.supabase.co'
const supabaseAnonKey = 'sb_publishable_9DyVbZrBIASu9gPe27jHMg__1M-YMDH'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTable() {
  const { data, error } = await supabase
    .from('task_proposals')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Columns:', Object.keys(data[0] || {}))
  }
}

checkTable()
