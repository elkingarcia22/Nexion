import { supabase } from '@/lib/supabase';

type ItemType = 'alert' | 'insight' | 'feedback';
type ItemState = 'resolved' | 'learned' | 'applied' | 'converted_to_task';

export interface ItemStateRecord {
  id: string;
  workspace_id: string;
  profile_id: string;
  item_type: ItemType;
  item_id: string;
  state: ItemState;
  created_at: string;
  updated_at: string;
}

export async function getItemStates(
  workspaceId: string,
  itemType: ItemType
): Promise<Record<string, ItemState>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data } = await supabase
      .from('item_states')
      .select('item_id, state')
      .eq('workspace_id', workspaceId)
      .eq('profile_id', user.id)
      .eq('item_type', itemType);

    if (!data) return {};

    const map: Record<string, ItemState> = {};
    for (const row of data) {
      map[row.item_id] = row.state as ItemState;
    }
    return map;
  } catch {
    return {};
  }
}

export async function setItemState(
  workspaceId: string,
  itemType: ItemType,
  itemId: string,
  state: ItemState
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('item_states').upsert(
      {
        workspace_id: workspaceId,
        profile_id: user.id,
        item_type: itemType,
        item_id: itemId,
        state,
      },
      { onConflict: 'workspace_id,profile_id,item_type,item_id' }
    );

    return !error;
  } catch {
    return false;
  }
}

export async function removeItemState(
  workspaceId: string,
  itemType: ItemType,
  itemId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('item_states')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('profile_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId);

    return !error;
  } catch {
    return false;
  }
}
