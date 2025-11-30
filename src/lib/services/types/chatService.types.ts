export interface Chat {
  id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
  seq_in_chat: number;
}
