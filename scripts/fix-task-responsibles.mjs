import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envRaw = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('=')).filter(([k]) => k).map(([k, ...v]) => [k.trim(), v.join('=').trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const WS_ID = '406370f6-50bc-45d0-9f93-3e83bce60de6';
const USER = 'Elkin Alexis Garcia Salazar';

// Update core/transversal tasks to be assigned to the user
const toAssign = [
  'Implementar gestión de usuarios',
  'Migrar API REST',
  'Implementar caché distribuida',
  'Desplegar agente de IA',
  'Automatizar respuestas del chat',
];

for (const title of toAssign) {
  const { data, error } = await supabase
    .from('task_proposals')
    .update({ responsible: USER })
    .eq('workspace_id', WS_ID)
    .ilike('title', `%${title}%`)
    .select('id, title');
  if (error) console.log(`  ❌ "${title}": ${error.message}`);
  else console.log(`  ✅ Updated: ${data?.map(d => d.title?.substring(0, 50)).join(', ') || 'none'}`);
}

// Also update the day_summary kpi_data
const { data: summaries } = await supabase
  .from('day_summaries')
  .select('id, summary_date, kpi_data')
  .eq('workspace_id', WS_ID);

for (const s of summaries || []) {
  let changed = false;
  const kpi = s.kpi_data || {};
  for (const key of ['tasks']) {
    const items = kpi[key] || [];
    for (const item of items) {
      const match = toAssign.some(t => item.title?.toLowerCase().includes(t.toLowerCase()));
      if (match && item.responsible !== USER) {
        item.responsible = USER;
        changed = true;
      }
    }
  }
  if (changed) {
    await supabase.from('day_summaries').update({ kpi_data: kpi }).eq('id', s.id);
    console.log('  ✅ Updated day_summary', s.summary_date);
  }
}

// Final verification
const { data: allTasks } = await supabase
  .from('task_proposals')
  .select('id, title, responsible, team, priority')
  .eq('workspace_id', WS_ID);

console.log('\n=== VISIBILITY CHECK ===');
const visible = allTasks?.filter(t => (t.responsible || '').toLowerCase().includes(USER.toLowerCase())) || [];
const hidden = allTasks?.filter(t => !(t.responsible || '').toLowerCase().includes(USER.toLowerCase())) || [];
console.log(`Visible to "${USER}": ${visible.length}`);
console.log(`Hidden: ${hidden.length}`);
for (const t of visible) console.log(`  👁️ [${t.team || '?'}] ${t.responsible?.substring(0, 32)} → ${t.title.substring(0, 60)}`);
for (const t of hidden) console.log(`  🙈 [${t.team || '?'}] ${t.responsible?.substring(0, 32)} → ${t.title.substring(0, 60)}`);
