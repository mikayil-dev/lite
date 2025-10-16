<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { triggerChatRefresh } from '$lib/stores/chatStore';
  import MessageInput from '$lib/components/chat/MessageInput.svelte';
  import Message from '$lib/components/chat/Message.svelte';
  import type { MessageRole, Model } from '$lib/providers';
  import { message as tauriMessage } from '@tauri-apps/plugin-dialog';
  import ChevronUpIcon from '~icons/solar/alt-arrow-up-linear';
  import ChevronDownIcon from '~icons/solar/alt-arrow-down-linear';
  import {
    getMessagesByChatId,
    createMessage,
    updateMessage,
    deleteMessage,
  } from '$lib/services/messages';
  import {
    getChatById,
    updateChatTitle as updateChatTitleService,
    updateChatLastMessage,
    createChat,
  } from '$lib/services/chats';
  import { getPreferences } from '$lib/services/preferences';
  import { getDefaultProvider } from '$lib/services/providers';
  import { getModelsForProvider, createChatStream } from '$lib/services/llm';

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
  let isTopBarVisible = $state(true);

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
      const prefsData = await getPreferences();

      if (prefsData && prefsData.selectedProviderId) {
        isLoadingModels = true;
        const provider = await getDefaultProvider();

        if (provider) {
          const models = await getModelsForProvider(provider);
          availableModels = models || [];

          selectedModel =
            prefsData.selectedModelId ||
            (availableModels.length > 0
              ? availableModels[0].id
              : 'gpt-4o-mini');
        } else {
          selectedModel = 'gpt-4o-mini'; // Fallback
        }
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
      const messagesList = await getMessagesByChatId(chatId);

      if (messagesList) {
        messages = messagesList.map(
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
      const chat = await getChatById(chatId);
      chatTitle = chat?.title || 'Untitled Chat';

      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
      messages = [];
      chatTitle = 'Untitled Chat';
    }
  }

  async function updateChatTitle(): Promise<void> {
    try {
      await updateChatTitleService(chatId, chatTitle);

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
      console.log('Starting message send...');

      // Get the current provider
      const provider = await getDefaultProvider();
      console.log('Provider:', provider);

      if (!provider) {
        throw new Error('No default provider found');
      }

      // If chatId is 'new', create a new chat first
      let actualChatId = chatId;
      if (chatId === 'new') {
        console.log('Creating new chat...');
        const newChatId = crypto.randomUUID();
        const now = new Date().toISOString();
        await createChat(newChatId, 'New Chat', now);
        actualChatId = newChatId;
        console.log('New chat created:', actualChatId);
        // Navigate to the new chat (update the URL)
        window.history.replaceState({}, '', `/chat/${actualChatId}`);
      }

      // Save the user message
      console.log('Saving user message...');
      await createMessage(actualChatId, 'user', message);
      console.log('User message saved');

      // Build conversation history from messages
      const conversationHistory = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Add the current user message if not already in the list
      if (
        !conversationHistory.find(
          (m) => m.content === message && m.role === 'user',
        )
      ) {
        conversationHistory.push({ role: 'user', content: message });
      }

      console.log('Conversation history:', conversationHistory);
      console.log('Selected model:', selectedModel);

      // Call the streaming API
      console.log('Creating chat stream...');
      const stream = createChatStream(provider, {
        model: selectedModel,
        messages: conversationHistory,
        stream: true,
      });

      console.log('Stream created, iterating...');
      // Iterate through stream chunks
      for await (const chunk of stream) {
        console.log('Received chunk:', chunk);
        if (chunk.delta) {
          streamingMessage += chunk.delta;
          scrollToBottom();
        }
      }

      console.log('Stream complete, saving assistant message...');
      // Save the assistant message
      await createMessage(
        actualChatId,
        'assistant',
        streamingMessage,
        selectedModel,
        provider.id,
      );

      // Update chat's last_message_at
      await updateChatLastMessage(actualChatId);

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

      console.log('Reloading messages...');
      // Reload messages to get proper IDs from database
      await loadMessages();
      console.log('Message send complete!');
    } catch (error) {
      console.error('Failed to send message:', error);
      console.error('Error type:', typeof error);
      console.error(
        'Error details:',
        error instanceof Error ? error.message : JSON.stringify(error),
      );
      console.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack',
      );

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }

      await tauriMessage(`Failed to send message: ${errorMessage}`, {
        title: 'Error',
        kind: 'error',
      });
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
      await deleteMessage(messageId);

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
      await updateMessage(messageId, newContent);

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

<div class="model-selector-bar" class:collapsed={!isTopBarVisible}>
  <button
    class="toggle-bar-btn"
    onclick={() => (isTopBarVisible = !isTopBarVisible)}
    aria-label={isTopBarVisible ? 'Hide top bar' : 'Show top bar'}
  >
    {#if isTopBarVisible}
      <ChevronUpIcon />
    {:else}
      <ChevronDownIcon />
    {/if}
  </button>
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
    transition: all 0.3s ease;

    @media (min-width: 769px) {
      left: 250px; // Width of sidebar

      .toggle-bar-btn {
        display: none;
      }
    }

    &.collapsed {
      .bar-content {
        max-height: 0;
        overflow: hidden;
        padding-top: 0;
        padding-bottom: 0;
      }
    }

    .toggle-bar-btn {
      position: absolute;
      bottom: -32px;
      left: 50%;
      transform: translateX(-50%);
      width: 48px;
      height: 32px;
      background: var(--contrast-bg);
      border: 1px solid var(--darkgray);
      border-top: none;
      border-radius: 0 0 8px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-color);
      opacity: 0.7;
      transition: all 0.2s ease;
      z-index: 11;

      &:hover {
        opacity: 1;
        background: var(--background);
      }

      &:active {
        transform: translateX(-50%) scale(0.95);
      }

      @media (min-width: 769px) {
        display: none;
      }
    }

    .bar-content {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 16px;
      flex-wrap: wrap;

      @media (min-width: 481px) {
        gap: 16px;
        padding: 8px 20px;
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
        padding: 6px 10px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        font-size: 0.95em;
        font-weight: 500;
        color: inherit;
        transition: all 0.2s ease;

        @media (min-width: 481px) {
          font-size: 1em;
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
        padding: 6px 10px;
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
          padding: 6px 12px;
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
    padding-top: 49px; // Height of selector bar
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
        padding-bottom: 160px;
      }

      @media (min-width: 769px) {
        padding: 20px;
        padding-bottom: 160px;
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
