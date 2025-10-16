<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import MessageInput from '$lib/components/chat/MessageInput.svelte';
  import { triggerChatRefresh } from '$lib/stores/chatStore';
  import type { Model } from '$lib/providers';
  import { getPreferences } from '$lib/services/preferences';
  import { getDefaultProvider } from '$lib/services/providers';
  import { getModelsForProvider } from '$lib/services/llm';
  import { createChat } from '$lib/services/chats';

  let isCreating = $state(false);
  let selectedModel = $state<string>('');
  let availableModels = $state<Model[]>([]);
  let isLoadingModels = $state(false);

  onMount(async () => {
    await loadPreferencesAndModels();
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
            (availableModels.length > 0 ? availableModels[0].id : 'gpt-4o-mini');
        } else {
          selectedModel = 'gpt-4o-mini';
        }
      } else {
        selectedModel = 'gpt-4o-mini';
      }
    } catch (error) {
      console.error('Failed to load preferences and models:', error);
      selectedModel = 'gpt-4o-mini';
    } finally {
      isLoadingModels = false;
    }
  }

  async function handleFirstMessage(message: string): Promise<void> {
    if (isCreating) return;

    isCreating = true;

    try {
      const chatId = crypto.randomUUID();
      const now = new Date().toISOString();
      await createChat(chatId, message.slice(0, 50), now);

      triggerChatRefresh();

      await goto(
        `/chat/${chatId}?initialMessage=${encodeURIComponent(message)}&model=${encodeURIComponent(selectedModel)}`,
      );
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat');
      isCreating = false;
    }
  }
</script>

<div class="model-selector-bar">
  <div class="bar-content">
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

<section class="new-chat-page">
  <h2>Start a new chat</h2>
  <div class="message-input-wrapper">
    <MessageInput onSend={handleFirstMessage} disabled={isCreating} />
  </div>
</section>

<style lang="scss">
  .model-selector-bar {
    position: fixed;
    left: 250px; // Width of sidebar
    right: 0;
    top: var(--header-height);
    z-index: 10;
    border-bottom: 1px solid var(--darkgray);
    background: var(--contrast-bg);

    .bar-content {
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 12px 20px;
    }

    .model-section {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;

      label {
        font-size: 0.9em;
        font-weight: 500;
        opacity: 0.9;
        white-space: nowrap;
      }

      input {
        min-width: 200px;
        max-width: 300px;
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--darkgray);
        border-radius: 6px;
        background: var(--background);
        font-size: 0.9em;
        color: inherit;
        transition: all 0.2s ease;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        padding-right: 28px;

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

  .new-chat-page {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));
    padding-top: 56px; // Height of selector bar

    h2 {
      margin-bottom: 40px;
      margin-top: -1em;
      font-weight: 100;
    }

    .message-input-wrapper {
      width: 100%;
    }
  }
</style>
