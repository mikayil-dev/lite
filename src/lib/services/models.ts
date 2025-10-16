import { query, execute } from '$lib/db/client';

export interface ModelPreferenceRow {
  id: number;
  provider_id: number;
  model_id: string;
  model_name: string;
  is_favorite: number;
  last_used: string | null;
}

export interface ModelPreference {
  id: number;
  providerId: number;
  modelId: string;
  modelName: string;
  isFavorite: boolean;
  lastUsed: string | null;
}

function rowToModelPreference(row: ModelPreferenceRow): ModelPreference {
  return {
    id: row.id,
    providerId: row.provider_id,
    modelId: row.model_id,
    modelName: row.model_name,
    isFavorite: row.is_favorite === 1,
    lastUsed: row.last_used,
  };
}

export async function getModelPreferences(
  providerId: number,
): Promise<ModelPreference[]> {
  const rows = await query<ModelPreferenceRow>(
    'SELECT * FROM model_preferences WHERE provider_id = ?',
    [providerId],
  );
  return rows.map(rowToModelPreference);
}

export async function upsertModelPreference(
  providerId: number,
  modelId: string,
  modelName: string,
): Promise<void> {
  const existing = await query<ModelPreferenceRow>(
    'SELECT * FROM model_preferences WHERE provider_id = ? AND model_id = ?',
    [providerId, modelId],
  );

  if (existing.length > 0) {
    await execute(
      'UPDATE model_preferences SET last_used = CURRENT_TIMESTAMP WHERE provider_id = ? AND model_id = ?',
      [providerId, modelId],
    );
  } else {
    await execute(
      'INSERT INTO model_preferences (provider_id, model_id, model_name, last_used) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [providerId, modelId, modelName],
    );
  }
}
