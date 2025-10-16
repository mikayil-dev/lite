import { query, execute } from '$lib/db/client';
import type { ProviderConfig, ProviderType } from '$lib/providers/types';

export interface ProviderRow {
  id: number;
  name: string;
  type: ProviderType;
  api_key: string;
  base_url: string | null;
  organization: string | null;
  custom_headers: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderData extends ProviderConfig {
  id: number;
  name: string;
  isDefault: boolean;
}

function rowToProvider(row: ProviderRow): ProviderData {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    apiKey: row.api_key,
    baseUrl: row.base_url ?? undefined,
    organization: row.organization ?? undefined,
    customHeaders: row.custom_headers
      ? JSON.parse(row.custom_headers)
      : undefined,
    isDefault: row.is_default === 1,
  };
}

export async function getAllProviders(): Promise<ProviderData[]> {
  const rows = await query<ProviderRow>(
    'SELECT * FROM provider_configs ORDER BY is_default DESC, name ASC',
  );
  return rows.map(rowToProvider);
}

export async function getProviderById(id: number): Promise<ProviderData | null> {
  const rows = await query<ProviderRow>(
    'SELECT * FROM provider_configs WHERE id = ?',
    [id],
  );
  return rows[0] ? rowToProvider(rows[0]) : null;
}

export async function getDefaultProvider(): Promise<ProviderData | null> {
  const rows = await query<ProviderRow>(
    'SELECT * FROM provider_configs WHERE is_default = 1 LIMIT 1',
  );
  return rows[0] ? rowToProvider(rows[0]) : null;
}

export async function createProvider(
  config: Omit<ProviderConfig, 'apiKey'> & { name: string; apiKey: string },
  setAsDefault = false,
): Promise<number> {
  if (setAsDefault) {
    await execute(
      'UPDATE provider_configs SET is_default = 0 WHERE is_default = 1',
    );
  }

  const result = await execute(
    `INSERT INTO provider_configs (name, type, api_key, base_url, organization, custom_headers, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      config.name,
      config.type,
      config.apiKey,
      config.baseUrl ?? null,
      config.organization ?? null,
      config.customHeaders ? JSON.stringify(config.customHeaders) : null,
      setAsDefault ? 1 : 0,
    ],
  );

  return result.lastInsertId;
}

export async function updateProvider(
  id: number,
  config: Partial<Omit<ProviderConfig, 'apiKey'> & { name?: string; apiKey?: string }>,
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (config.name !== undefined) {
    updates.push('name = ?');
    values.push(config.name);
  }
  if (config.type !== undefined) {
    updates.push('type = ?');
    values.push(config.type);
  }
  if (config.apiKey !== undefined) {
    updates.push('api_key = ?');
    values.push(config.apiKey);
  }
  if (config.baseUrl !== undefined) {
    updates.push('base_url = ?');
    values.push(config.baseUrl);
  }
  if (config.organization !== undefined) {
    updates.push('organization = ?');
    values.push(config.organization);
  }
  if (config.customHeaders !== undefined) {
    updates.push('custom_headers = ?');
    values.push(JSON.stringify(config.customHeaders));
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await execute(
      `UPDATE provider_configs SET ${updates.join(', ')} WHERE id = ?`,
      values,
    );
  }
}

export async function setDefaultProvider(id: number): Promise<void> {
  await execute('UPDATE provider_configs SET is_default = 0 WHERE is_default = 1');
  await execute('UPDATE provider_configs SET is_default = 1 WHERE id = ?', [id]);
}

export async function deleteProvider(id: number): Promise<void> {
  await execute('DELETE FROM provider_configs WHERE id = ?', [id]);
}
