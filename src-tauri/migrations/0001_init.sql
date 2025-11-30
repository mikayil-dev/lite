CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT
);


-- REAL MESSAGES TABLE (not directly written to from the app)
CREATE TABLE IF NOT EXISTS messages_real (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  seq_in_chat INTEGER NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id)
);


-- VIEW that the app uses
CREATE VIEW IF NOT EXISTS messages AS
SELECT
  id,
  chat_id,
  content,
  role,
  created_at,
  seq_in_chat
FROM
  messages_real;


-- INDEXES on the REAL table
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_chat_seq ON messages_real (chat_id, seq_in_chat);


CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages_real (chat_id, created_at);


-- NOTE: SQLite-only: Need to take care of this, when migrating to another DB.
CREATE TRIGGER IF NOT EXISTS messages_insert_seq_in_chat INSTEAD OF
INSERT
  ON messages FOR EACH ROW
BEGIN
INSERT INTO
  messages_real (
    id,
    chat_id,
    content,
    role,
    created_at,
    seq_in_chat
  )
VALUES
  (
    NEW.id,
    NEW.chat_id,
    NEW.content,
    NEW.role,
    COALESCE(
      NEW.created_at,
      strftime('%Y-%m-%dT%H:%M:%fZ', 'now') -- fallback if created_at is not passed
    ),
    COALESCE(
      NEW.seq_in_chat,
      (
        SELECT
          COALESCE(MAX(seq_in_chat), 0) + 1
        FROM
          messages_real
        WHERE
          chat_id = NEW.chat_id
      )
    )
  );


END;
