import { query, execute } from '$lib/db/client';

export interface PreferencesRow {
  id: number;
  selected_provider_id: number | null;
  selected_model_id: string | null;
  updated_at: string;
}

export interface Preferences {
  id: number;
  selectedProviderId: number | null;
  selectedModelId: string | null;
  updatedAt: string;
}

function rowToPreferences(row: PreferencesRow): Preferences {
  return {
    id: row.id,
    selectedProviderId: row.selected_provider_id,
    selectedModelId: row.selected_model_id,
    updatedAt: row.updated_at,
  };
}

export async function getPreferences(): Promise<Preferences | null> {
  const rows = await query<PreferencesRow>(
    'SELECT * FROM user_preferences ORDER BY id DESC LIMIT 1',
  );
  return rows[0] ? rowToPreferences(rows[0]) : null;
}

export async function updatePreferences(
  selectedProviderId?: number,
  selectedModelId?: string,
): Promise<void> {
  const existing = await getPreferences();

  if (existing) {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (selectedProviderId !== undefined) {
      updates.push('selected_provider_id = ?');
      values.push(selectedProviderId);
    }
    if (selectedModelId !== undefined) {
      updates.push('selected_model_id = ?');
      values.push(selectedModelId);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(existing.id);

      await execute(
        `UPDATE user_preferences SET ${updates.join(', ')} WHERE id = ?`,
        values,
      );
    }
  } else {
    await execute(
      'INSERT INTO user_preferences (selected_provider_id, selected_model_id) VALUES (?, ?)',
      [selectedProviderId ?? null, selectedModelId ?? null],
    );
  }
}
