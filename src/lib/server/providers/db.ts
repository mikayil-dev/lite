import { db } from '../db/db';
import type { ProviderConfig, ProviderType, ConfigValuesDb } from './types';

/**
 * Database interface for provider configurations
 */

export interface ProviderConfigRow {
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

export interface MessageRow {
  id: number;
  chat_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  model: string | null;
  provider_id: number | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  created_at: string;
}

export interface ModelPreferenceRow {
  id: number;
  provider_id: number;
  model_id: string;
  model_name: string;
  is_favorite: number;
  last_used: string | null;
}

export interface UserPreferencesRow {
  id: number;
  selected_provider_id: number | null;
  selected_model_id: string | null;
  updated_at: string;
}

/**
 * Convert database row to ProviderConfig
 */
export function rowToProviderConfig(row: ProviderConfigRow): ProviderConfig & {
  id: number;
  name: string;
  isDefault: boolean;
} {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    apiKey: row.api_key,
    baseUrl: row.base_url ?? undefined,
    organization: row.organization ?? undefined,
    customHeaders: row.custom_headers
      ? (JSON.parse(row.custom_headers) as Record<string, string>)
      : undefined,
    isDefault: row.is_default === 1,
  };
}

/**
 * Convert ProviderConfig to database values
 */
export function configToDbValues(
  config: Omit<ProviderConfig, 'apiKey'> & { name: string; apiKey: string },
): ConfigValuesDb {
  return {
    name: config.name,
    type: config.type,
    api_key: config.apiKey,
    base_url: config.baseUrl ?? null,
    organization: config.organization ?? null,
    custom_headers: config.customHeaders
      ? JSON.stringify(config.customHeaders)
      : null,
  };
}

/**
 * Provider database operations
 */
export class ProviderDB {
  /**
   * Get all provider configurations
   */
  static async getAll(): Promise<
    Array<ProviderConfig & { id: number; name: string; isDefault: boolean }>
  > {
    const rows = (await db.getAll(
      'SELECT * FROM provider_configs ORDER BY is_default DESC, name ASC',
    )) as ProviderConfigRow[];

    return rows.map(rowToProviderConfig);
  }

  /**
   * Get a provider configuration by ID
   */
  static async getById(
    id: number,
  ): Promise<
    (ProviderConfig & { id: number; name: string; isDefault: boolean }) | null
  > {
    const row = (await db.get('SELECT * FROM provider_configs WHERE id = ?', [
      id,
    ])) as ProviderConfigRow | undefined;

    return row ? rowToProviderConfig(row) : null;
  }

  /**
   * Get the default provider configuration
   */
  static async getDefault(): Promise<
    (ProviderConfig & { id: number; name: string; isDefault: boolean }) | null
  > {
    const row = (await db.get(
      'SELECT * FROM provider_configs WHERE is_default = 1 LIMIT 1',
    )) as ProviderConfigRow | undefined;

    return row ? rowToProviderConfig(row) : null;
  }

  /**
   * Create a new provider configuration
   */
  static async create(
    config: Omit<ProviderConfig, 'apiKey'> & { name: string; apiKey: string },
    setAsDefault = false,
  ): Promise<number> {
    const values = configToDbValues(config);

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      await db.get(
        'UPDATE provider_configs SET is_default = 0 WHERE is_default = 1',
      );
    }

    const result = (await db.get(
      `INSERT INTO provider_configs (name, type, api_key, base_url, organization, custom_headers, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        values.name,
        values.type,
        values.api_key,
        values.base_url,
        values.organization,
        values.custom_headers,
        setAsDefault ? 1 : 0,
      ],
    )) as { id: number };

    return result.id;
  }

  /**
   * Update a provider configuration
   */
  static async update(
    id: number,
    config: Partial<
      Omit<ProviderConfig, 'apiKey'> & { name: string; apiKey?: string }
    >,
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
      values.push(config.baseUrl || null);
    }
    if (config.organization !== undefined) {
      updates.push('organization = ?');
      values.push(config.organization || null);
    }
    if (config.customHeaders !== undefined) {
      updates.push('custom_headers = ?');
      values.push(
        config.customHeaders ? JSON.stringify(config.customHeaders) : null,
      );
    }

    if (updates.length === 0) return;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db.get(
      `UPDATE provider_configs SET ${updates.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Set a provider as default
   */
  static async setDefault(id: number): Promise<void> {
    // Unset other defaults first
    await db.get(
      'UPDATE provider_configs SET is_default = 0 WHERE is_default = 1',
    );

    // Set the new default
    await db.get('UPDATE provider_configs SET is_default = 1 WHERE id = ?', [
      id,
    ]);
  }

  /**
   * Delete a provider configuration
   */
  static async delete(id: number): Promise<void> {
    await db.get('DELETE FROM provider_configs WHERE id = ?', [id]);
  }

  /**
   * Save a message to the database
   */
  static async saveMessage(message: {
    chatId: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    model?: string;
    providerId?: number;
    tokensPrompt?: number;
    tokensCompletion?: number;
  }): Promise<number> {
    const result = (await db.get(
      `INSERT INTO messages (chat_id, role, content, model, provider_id, tokens_prompt, tokens_completion)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        message.chatId,
        message.role,
        message.content,
        message.model ?? null,
        message.providerId ?? null,
        message.tokensPrompt ?? null,
        message.tokensCompletion ?? null,
      ],
    )) as { id: number };

    return result.id;
  }

  /**
   * Get messages for a chat
   */
  static async getMessages(chatId: string): Promise<MessageRow[]> {
    return (await db.getAll(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
      [chatId],
    )) as MessageRow[];
  }

  /**
   * Update model preference (last used time)
   */
  static async updateModelPreference(
    providerId: number,
    modelId: string,
    modelName: string,
  ): Promise<void> {
    await db.get(
      `INSERT INTO model_preferences (provider_id, model_id, model_name, last_used)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(provider_id, model_id)
       DO UPDATE SET last_used = datetime('now'), model_name = ?`,
      [providerId, modelId, modelName, modelName],
    );
  }

  /**
   * Get model preferences for a provider
   */
  static async getModelPreferences(
    providerId: number,
  ): Promise<ModelPreferenceRow[]> {
    return (await db.getAll(
      'SELECT * FROM model_preferences WHERE provider_id = ? ORDER BY is_favorite DESC, last_used DESC',
      [providerId],
    )) as ModelPreferenceRow[];
  }

  /**
   * Toggle favorite status for a model
   */
  static async toggleFavorite(
    providerId: number,
    modelId: string,
  ): Promise<void> {
    await db.get(
      `UPDATE model_preferences
       SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END
       WHERE provider_id = ? AND model_id = ?`,
      [providerId, modelId],
    );
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(): Promise<{
    selectedProviderId: number | null;
    selectedModelId: string | null;
  } | null> {
    const row = (await db.get(
      'SELECT * FROM user_preferences WHERE id = 1',
    )) as UserPreferencesRow | undefined;

    if (!row) return null;

    return {
      selectedProviderId: row.selected_provider_id,
      selectedModelId: row.selected_model_id,
    };
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    selectedProviderId: number | null,
    selectedModelId: string | null,
  ): Promise<void> {
    await db.get(
      `INSERT INTO user_preferences (id, selected_provider_id, selected_model_id, updated_at)
       VALUES (1, ?, ?, datetime('now'))
       ON CONFLICT(id)
       DO UPDATE SET
         selected_provider_id = ?,
         selected_model_id = ?,
         updated_at = datetime('now')`,
      [
        selectedProviderId,
        selectedModelId,
        selectedProviderId,
        selectedModelId,
      ],
    );
  }
}
