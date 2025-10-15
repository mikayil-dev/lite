<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { chatRefreshTrigger } from '$lib/stores/chatStore';
  import IconButton from './buttons/IconButton.svelte';
  import SettingsIcon from '~icons/solar/settings-linear';

  interface Chat {
    id: string;
    title: string;
    created_at: string;
  }

  let chats = $state<Chat[]>([]);
  let isLoading = $state(true);

  const currentChatId = $derived($page.params.id);

  onMount(async () => {
    await loadChats();
  });

  // Refresh chats when the trigger changes
  $effect(() => {
    $chatRefreshTrigger; // Subscribe to changes
    loadChats();
  });

  async function loadChats(): Promise<void> {
    try {
      const response = await fetch('/api/chats');
      const data = await response.json();
      chats = data.chats;
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<aside>
  <div class="action-container">
    <a href="/chat" class="new-chat">New Chat</a>
  </div>

  <nav>
    {#if isLoading}
      <p class="loading-text">Loading chats...</p>
    {:else if chats.length === 0}
      <p class="empty-text">No chats yet</p>
    {:else}
      {#each chats as chat}
        <a
          class="chat-link"
          class:active={currentChatId === chat.id}
          href="/chat/{chat.id}"
        >
          {chat.title}
        </a>
      {/each}
    {/if}
  </nav>

  <div class="settings-container">
    <IconButton href="/chat/settings">
      <SettingsIcon />
    </IconButton>
  </div>
</aside>

<style lang="scss">
  aside {
    display: flex;
    flex-direction: column;
    padding: 20px;
    width: 250px;
    background-color: var(--contrast-bg);
    position: fixed;
    left: 0;
    top: var(--header-height);
    border-right: 1px solid var(--darkgray);
    height: calc(100% - var(--header-height));

    .new-chat {
      background-color: var(--gray);
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 12px;
    }

    .action-container {
      padding-bottom: 20px;
      border-bottom: 1px solid var(--darkgray);
      margin-bottom: 20px;
    }

    nav {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1px;

      .loading-text,
      .empty-text {
        padding: 12px 16px;
        text-align: center;
        opacity: 0.6;
        font-size: 0.9em;
      }
    }

    .settings-container {
      margin-top: auto;
      border-top: 1px solid var(--darkgray);
      padding-top: 20px;
      display: flex;
      align-items: flex-start;
    }

    a {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      width: 100%;
      border-radius: 8px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      line-height: 1;

      &:hover {
        background-color: var(--darkgray);
      }

      &.active {
        background-color: var(--darkgray);
        font-weight: 500;
      }
    }
  }
</style>
