<script lang="ts">
  import { onMount } from 'svelte';
  import type { ProviderType, Model } from '$lib/server/providers';
  import { ask, message as tauriMessage } from '@tauri-apps/plugin-dialog';

  interface Provider {
    id: number;
    name: string;
    type: ProviderType;
    apiKey: string;
    isDefault?: boolean;
  }

  let providers = $state<Provider[]>([]);
  let models = $state<Model[]>([]);
  let selectedProviderId = $state<number | null>(null);
  let selectedModel = $state<string>('gpt-4o-mini');
  let isLoading = $state(false);
  let showAddProvider = $state(false);
  let isInitialized = $state(false);

  // Save preferences when model changes (after initialization)
  $effect(() => {
    if (isInitialized && selectedModel) {
      savePreferences();
    }
  });

  // New provider form
  let newProvider = $state({
    name: '',
    type: 'openai' as ProviderType,
    apiKey: '',
    baseUrl: '',
    organization: '',
  });

  onMount(async () => {
    await loadProviders();
    await loadPreferences();
  });

  async function loadProviders(): Promise<void> {
    try {
      const response = await fetch('/api/providers');
      const data = await response.json();
      providers = data.providers;
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }

  async function loadPreferences(): Promise<void> {
    try {
      const response = await fetch('/api/preferences');
      const data = await response.json();

      if (data.preferences) {
        // Use saved preferences
        selectedProviderId = data.preferences.selectedProviderId;
        selectedModel = data.preferences.selectedModelId || 'gpt-4o-mini';
      } else if (providers.length > 0) {
        // No saved preferences, use default provider or first one
        const defaultProvider = providers.find((p) => p.isDefault);
        selectedProviderId = defaultProvider
          ? defaultProvider.id
          : providers[0].id;
      }

      // Load models for selected provider
      if (selectedProviderId) {
        await loadModels();
      }

      // Mark as initialized to start saving preferences on changes
      isInitialized = true;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      isInitialized = true;
    }
  }

  async function savePreferences(): Promise<void> {
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedProviderId,
          selectedModelId: selectedModel,
        }),
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  async function loadModels(): Promise<void> {
    if (!selectedProviderId) return;

    isLoading = true;
    try {
      const response = await fetch(
        `/api/models?providerId=${selectedProviderId}`,
      );
      const data = await response.json();
      models = data.models;
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      isLoading = false;
    }
  }

  async function handleProviderChange(): Promise<void> {
    await loadModels();
    await savePreferences();
  }

  async function handleAddProvider(e: Event): Promise<void> {
    e.preventDefault();

    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProvider,
          setAsDefault: (providers?.length ?? 0) === 0, // Set as default if it's the first one
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create provider');
      }

      // Reset form
      newProvider = {
        name: '',
        type: 'openai',
        apiKey: '',
        baseUrl: '',
        organization: '',
      };

      showAddProvider = false;
      await loadProviders();
    } catch (error) {
      console.error('Failed to add provider:', error);
      await tauriMessage(
        `Failed to add provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          title: 'Error',
          kind: 'error',
        },
      );
    }
  }

  async function handleSetDefault(providerId: number): Promise<void> {
    try {
      const response = await fetch(`/api/providers/${providerId}/default`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to set default provider');
      }

      await loadProviders();
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  }

  async function handleDeleteProvider(providerId: number): Promise<void> {
    const confirmed = await ask(
      'Are you sure you want to delete this provider?',
      {
        title: 'Delete Provider',
        kind: 'warning',
      },
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/providers/${providerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete provider');
      }

      if (selectedProviderId === providerId) {
        selectedProviderId = null;
        models = [];
      }

      await loadProviders();
    } catch (error) {
      console.error('Failed to delete provider:', error);
      await tauriMessage('Failed to delete provider. Please try again.', {
        title: 'Error',
        kind: 'error',
      });
    }
  }
</script>

<section class="settings-page">
  <h1>Settings</h1>

  <div class="settings-section">
    <h2>Providers</h2>

    {#if providers.length === 0}
      <p class="empty-state">
        No providers configured. Add one to get started.
      </p>
    {:else}
      <div class="provider-list">
        {#each providers as provider}
          <div class="provider-card">
            <div class="provider-info">
              <h3>{provider.name}</h3>
              <p class="provider-type">{provider.type}</p>
              <p class="provider-key">API Key: {provider.apiKey}</p>
            </div>
            <div class="provider-actions">
              <button
                class="btn-secondary"
                onclick={() => handleSetDefault(provider.id)}
              >
                Set Default
              </button>
              <button
                class="btn-danger"
                onclick={() => handleDeleteProvider(provider.id)}
              >
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <button
      class="btn-primary"
      onclick={() => (showAddProvider = !showAddProvider)}
    >
      {showAddProvider ? 'Cancel' : 'Add Provider'}
    </button>

    {#if showAddProvider}
      <form class="add-provider-form" onsubmit={handleAddProvider}>
        <div class="form-group">
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            bind:value={newProvider.name}
            placeholder="My OpenAI Provider"
            required
          />
        </div>

        <div class="form-group">
          <label for="type">Type</label>
          <select id="type" bind:value={newProvider.type} required>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="form-group">
          <label for="apiKey">API Key</label>
          <input
            type="password"
            id="apiKey"
            bind:value={newProvider.apiKey}
            placeholder="sk-..."
            required
          />
        </div>

        {#if newProvider.type === 'custom' || newProvider.baseUrl}
          <div class="form-group">
            <label for="baseUrl">Base URL (optional)</label>
            <input
              type="url"
              id="baseUrl"
              bind:value={newProvider.baseUrl}
              placeholder="https://api.example.com/v1"
            />
          </div>
        {/if}

        {#if newProvider.type === 'openai'}
          <div class="form-group">
            <label for="organization">Organization ID (optional)</label>
            <input
              type="text"
              id="organization"
              bind:value={newProvider.organization}
              placeholder="org-..."
            />
          </div>
        {/if}

        <button type="submit" class="btn-primary">Add Provider</button>
      </form>
    {/if}
  </div>

  <div class="settings-section">
    <h2>Model Selection</h2>

    <div class="form-group">
      <label for="provider-select">Provider</label>
      <select
        id="provider-select"
        bind:value={selectedProviderId}
        onchange={handleProviderChange}
      >
        {#each providers as provider}
          <option value={provider.id}>{provider.name}</option>
        {/each}
      </select>
    </div>

    {#if isLoading}
      <p>Loading models...</p>
    {:else if models.length > 0}
      <div class="form-group">
        <label for="model-input">Model</label>
        <input
          type="text"
          id="model-input"
          list="model-list"
          bind:value={selectedModel}
          placeholder="Search for a model..."
          autocomplete="off"
        />
        <datalist id="model-list">
          {#each models as model}
            <option value={model.id}>
              {model.name}
              {#if model.pricing}
                - ${model.pricing.promptTokens}/1M input, ${model.pricing
                  .completionTokens}/1M output
              {/if}
            </option>
          {/each}
        </datalist>
      </div>

      {#if selectedModel}
        <p class="help-text">
          Selected: <strong>{selectedModel}</strong>
        </p>
      {/if}
    {:else if selectedProviderId}
      <p class="empty-state">No models available for this provider.</p>
    {/if}
  </div>
</section>

<style lang="scss">
  .settings-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;

    h1 {
      font-size: 2em;
      margin-bottom: 32px;
      font-weight: 300;
    }

    .settings-section {
      margin-bottom: 48px;
      padding-bottom: 48px;
      border-bottom: 1px solid var(--darkgray);

      &:last-child {
        border-bottom: none;
      }

      h2 {
        font-size: 1.5em;
        margin-bottom: 20px;
        font-weight: 400;
      }
    }

    .provider-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .provider-card {
      background: var(--contrast-bg);
      border: 1px solid var(--darkgray);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;

      .provider-info {
        flex: 1;

        h3 {
          font-size: 1.1em;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .provider-type {
          font-size: 0.9em;
          opacity: 0.7;
          text-transform: capitalize;
          margin-bottom: 4px;
        }

        .provider-key {
          font-size: 0.85em;
          opacity: 0.6;
          font-family: monospace;
        }
      }

      .provider-actions {
        display: flex;
        gap: 8px;
      }
    }

    .add-provider-form {
      margin-top: 20px;
      padding: 20px;
      background: var(--contrast-bg);
      border-radius: 12px;
      border: 1px solid var(--darkgray);
    }

    .form-group {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: 0.9em;
        opacity: 0.9;
      }

      input,
      select {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid var(--darkgray);
        border-radius: 8px;
        background: var(--background);
        font-size: 1em;
        color: inherit;
        transition: all 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        &:hover:not(:focus) {
          border-color: var(--lightgray);
        }

        &::placeholder {
          opacity: 0.5;
        }
      }

      select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;

        &:focus {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        }
      }

      input[list] {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;

        &:focus {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%233b82f6' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        }
      }
    }

    .empty-state {
      padding: 20px;
      text-align: center;
      opacity: 0.6;
      font-style: italic;
    }

    .help-text {
      font-size: 0.9em;
      opacity: 0.7;
      margin-top: 12px;
    }

    button {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      font-size: 0.95em;
      cursor: pointer;
      transition: all 0.2s;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: var(--gray);
      color: white;

      &:hover:not(:disabled) {
        opacity: 0.9;
      }
    }

    .btn-secondary {
      background: var(--darkgray);
      color: inherit;

      &:hover:not(:disabled) {
        background: var(--lightgray);
      }
    }

    .btn-danger {
      background: #dc3545;
      color: white;

      &:hover:not(:disabled) {
        background: #c82333;
      }
    }
  }
</style>
