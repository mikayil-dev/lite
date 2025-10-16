<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { triggerChatRefresh } from '$lib/stores/chatStore';
  import MessageInput from '$lib/components/chat/MessageInput.svelte';
  import Message from '$lib/components/chat/Message.svelte';
  import type { MessageRole, Model } from '$lib/server/providers';
  import { message as tauriMessage } from '@tauri-apps/plugin-dialog';

  interface MessageData {
    id?: number;
    role: MessageRole;
    content: string;
    tempId?: string; // Temporary ID for messages not yet saved
  }

  let messages = $state<MessageData[]>([]);
  let isLoading = $state(false);
  let streamingMessage = $state('');
  let isStreaming = $state(false);
  let messagesContainer: HTMLDivElement;
  let selectedModel = $state<string>('');
  let availableModels = $state<Model[]>([]);
  let isLoadingModels = $state(false);
  let chatTitle = $state<string>('');

  const chatId = $derived($page.params.id);

  onMount(async () => {
    await loadPreferencesAndModels();

    // Check for model query param (overrides preferences)
    const modelParam = $page.url.searchParams.get('model');
    if (modelParam) {
      selectedModel = modelParam;
    }

    // Check for initialMessage query param
    const initialMessage = $page.url.searchParams.get('initialMessage');
    if (initialMessage) {
      await handleSendMessage(initialMessage);
    }
  });

  // Reload messages when chatId changes
  $effect(() => {
    if (chatId) {
      loadMessages();
    }
  });

  async function loadPreferencesAndModels(): Promise<void> {
    try {
      // Load user preferences
      const prefsResponse = await fetch('/api/preferences');
      const prefsData = await prefsResponse.json();

      if (prefsData.preferences && prefsData.preferences.selectedProviderId) {
        // Load models for the selected provider
        isLoadingModels = true;
        const modelsResponse = await fetch(
          `/api/models?providerId=${prefsData.preferences.selectedProviderId}`,
        );
        const modelsData = await modelsResponse.json();
        availableModels = modelsData.models || [];

        // Set selected model from preferences or use first available
        selectedModel =
          prefsData.preferences.selectedModelId ||
          (availableModels.length > 0 ? availableModels[0].id : 'gpt-4o-mini');
      } else {
        selectedModel = 'gpt-4o-mini'; // Fallback
      }
    } catch (error) {
      console.error('Failed to load preferences and models:', error);
      selectedModel = 'gpt-4o-mini'; // Fallback
    } finally {
      isLoadingModels = false;
    }
  }

  async function loadMessages(): Promise<void> {
    try {
      const response = await fetch(`/api/chat/${chatId}/messages`);
      const data = await response.json();

      if (data.messages) {
        messages = data.messages.map(
          (m: { id: number; role: MessageRole; content: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            tempId: undefined, // Clear temp IDs for saved messages
          }),
        );
      } else {
        messages = [];
      }

      // Also load chat title
      const chatResponse = await fetch(`/api/chats/${chatId}`);
      const chatData = await chatResponse.json();
      chatTitle = chatData.title || 'Untitled Chat';

      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
      messages = [];
      chatTitle = 'Untitled Chat';
    }
  }

  async function updateChatTitle(): Promise<void> {
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chatTitle }),
      });

      // Trigger sidebar refresh to show updated title
      triggerChatRefresh();
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  }

  async function handleSendMessage(message: string): Promise<void> {
    if (isLoading) return;

    isLoading = true;
    streamingMessage = '';
    isStreaming = true;

    // Add user message immediately with temporary ID
    const userTempId = `temp-user-${Date.now()}`;
    messages = [
      ...messages,
      { role: 'user', content: message, tempId: userTempId },
    ];
    scrollToBottom();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          chatId,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Add final assistant message with temporary ID
                const assistantTempId = `temp-assistant-${Date.now()}`;
                messages = [
                  ...messages,
                  {
                    role: 'assistant',
                    content: streamingMessage,
                    tempId: assistantTempId,
                  },
                ];
                streamingMessage = '';
                isStreaming = false;
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.delta) {
                  streamingMessage += parsed.delta;
                  scrollToBottom();
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Reload messages to get proper IDs from database
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      await tauriMessage(
        'Failed to send message. Please check your provider configuration.',
        {
          title: 'Error',
          kind: 'error',
        },
      );
    } finally {
      isLoading = false;
    }
  }

  function scrollToBottom(): void {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 0);
  }

  async function handleDeleteMessage(messageId: number): Promise<void> {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Remove the message from the UI
      messages = messages.filter((m) => m.id !== messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      await tauriMessage('Failed to delete message. Please try again.', {
        title: 'Error',
        kind: 'error',
      });
    }
  }

  async function handleEditMessage(
    messageId: number,
    newContent: string,
  ): Promise<void> {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to update message');
      }

      // Update the message in the UI
      messages = messages.map((m) =>
        m.id === messageId ? { ...m, content: newContent } : m,
      );
    } catch (error) {
      console.error('Failed to update message:', error);
      await tauriMessage('Failed to update message. Please try again.', {
        title: 'Error',
        kind: 'error',
      });
    }
  }
</script>

<div class="model-selector-bar">
  <div class="bar-content">
    <div class="title-section">
      <input
        type="text"
        class="chat-title-input"
        bind:value={chatTitle}
        onblur={updateChatTitle}
        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder="Chat title..."
      />
    </div>
    <div class="model-section">
      {#if isLoadingModels}
        <span class="loading-text">Loading models...</span>
      {:else if availableModels.length > 0}
        <label for="model-select">Model:</label>
        <input
          type="text"
          id="model-select"
          list="model-list"
          bind:value={selectedModel}
          placeholder="Select a model..."
          autocomplete="off"
        />
        <datalist id="model-list">
          {#each availableModels as model}
            <option value={model.id}>
              {model.name}
              {#if model.pricing}
                - ${model.pricing.promptTokens}/1M input, ${model.pricing
                  .completionTokens}/1M output
              {/if}
            </option>
          {/each}
        </datalist>
      {:else}
        <span class="model-name">{selectedModel}</span>
      {/if}
    </div>
  </div>
</div>

<section class="chat-page">
  <div class="messages-container" bind:this={messagesContainer}>
    {#each messages as message (message.id ?? message.tempId)}
      <Message
        id={message.id}
        role={message.role}
        content={message.content}
        onDelete={message.id ? handleDeleteMessage : undefined}
        onEdit={message.id && message.role === 'user'
          ? handleEditMessage
          : undefined}
      />
    {/each}

    {#if isStreaming && streamingMessage}
      <Message role="assistant" content={streamingMessage} isStreaming={true} />
    {/if}
  </div>

  <div class="message-input-wrapper">
    <MessageInput onSend={handleSendMessage} disabled={isLoading} />
  </div>
</section>

<style lang="scss">
  .model-selector-bar {
    position: fixed;
    left: 0;
    right: 0;
    top: var(--header-height);
    z-index: 10;
    border-bottom: 1px solid var(--darkgray);
    background: var(--contrast-bg);
    transition: left 0.3s ease;

    @media (min-width: 769px) {
      left: 250px; // Width of sidebar
    }

    .bar-content {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      flex-wrap: wrap;

      @media (min-width: 481px) {
        gap: 20px;
        padding: 12px 20px;
        flex-wrap: nowrap;
      }
    }

    .title-section {
      flex: 1;
      min-width: 0;
      width: 100%;

      @media (min-width: 481px) {
        width: auto;
      }

      .chat-title-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        font-size: 1em;
        font-weight: 500;
        color: inherit;
        transition: all 0.2s ease;

        @media (min-width: 481px) {
          font-size: 1.1em;
        }

        &:hover {
          background: var(--background);
          border-color: var(--darkgray);
        }

        &:focus {
          outline: none;
          background: var(--background);
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        &::placeholder {
          opacity: 0.5;
        }
      }
    }

    .model-section {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-shrink: 0;
      flex-grow: 1;
      width: 100%;

      @media (min-width: 481px) {
        gap: 12px;
        width: auto;
      }

      label {
        font-size: 0.85em;
        font-weight: 500;
        opacity: 0.9;
        white-space: nowrap;
        display: none;

        @media (min-width: 481px) {
          display: block;
          font-size: 0.9em;
        }
      }

      input {
        min-width: 140px;
        max-width: 300px;
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--darkgray);
        border-radius: 6px;
        background: var(--background);
        font-size: 0.85em;
        color: inherit;
        transition: all 0.2s ease;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        padding-right: 28px;

        @media (min-width: 481px) {
          min-width: 200px;
          padding: 8px 12px;
          font-size: 0.9em;
        }

        &:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        }

        &:hover:not(:focus) {
          border-color: var(--lightgray);
        }

        &::placeholder {
          opacity: 0.5;
        }
      }

      .loading-text {
        font-size: 0.9em;
        opacity: 0.6;
      }

      .model-name {
        font-size: 0.9em;
        font-family: monospace;
        opacity: 0.8;
      }
    }
  }

  .chat-page {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));
    padding-top: 56px; // Height of selector bar
    position: relative;

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      padding-bottom: 160px;
      scrollbar-width: none;
      -ms-overflow-style: none;

      @media (min-width: 481px) {
        padding: 16px;
      }

      @media (min-width: 769px) {
        padding: 20px;
      }

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .message-input-wrapper {
      position: absolute;
      bottom: 0;
      width: 100%;
      padding-bottom: 20px;
      padding-top: 16px;
      background: linear-gradient(
        to bottom,
        transparent 0%,
        var(--background) 40%
      );

      @media (min-width: 481px) {
        padding-bottom: 28px;
        padding-top: 18px;
      }

      @media (min-width: 769px) {
        padding-bottom: 32px;
        padding-top: 20px;
      }
    }
  }
</style>
