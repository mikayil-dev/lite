CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Provider configurations table
CREATE TABLE IF NOT EXISTS provider_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('openai', 'anthropic', 'openrouter', 'custom')),
  api_key TEXT NOT NULL,
  base_url TEXT,
  organization TEXT,
  custom_headers TEXT, -- JSON string
  is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  model TEXT,
  provider_id INTEGER,
  tokens_prompt INTEGER,
  tokens_completion INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES provider_configs(id) ON DELETE SET NULL
);

-- Model preferences table
CREATE TABLE IF NOT EXISTS model_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  is_favorite INTEGER DEFAULT 0 CHECK(is_favorite IN (0, 1)),
  last_used TEXT,
  FOREIGN KEY (provider_id) REFERENCES provider_configs(id) ON DELETE CASCADE,
  UNIQUE(provider_id, model_id)
);

-- User preferences table (singleton table - should only have one row)
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY CHECK(id = 1), -- Ensure only one row
  selected_provider_id INTEGER,
  selected_model_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (selected_provider_id) REFERENCES provider_configs(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_configs_default ON provider_configs(is_default);
CREATE INDEX IF NOT EXISTS idx_model_preferences_provider ON model_preferences(provider_id);
