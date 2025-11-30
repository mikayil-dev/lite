import type { Chat } from "./types/chatService.types";

export class ChatService {
  private static chats: Map<string, Chat> = $state(new Map<string, Chat>())

  get chats(): Map<string, Chat> {
    return ChatService.chats;
  }
}
