<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { chatRefreshTrigger } from '$lib/stores/chatStore';
  import IconButton from './buttons/IconButton.svelte';
  import SettingsIcon from '~icons/solar/settings-linear';
  import TrashIcon from '~icons/solar/trash-bin-trash-linear';
  import SortIcon from '~icons/solar/sort-linear';
  import { ask, message as tauriMessage } from '@tauri-apps/plugin-dialog';

  interface Chat {
    id: string;
    title: string;
    created_at: string;
    last_message_at: string;
  }

  interface GroupedChats {
    label: string;
    chats: Chat[];
  }

  let chats = $state<Chat[]>([]);
  let isLoading = $state(true);
  let selectedChatIds = $state<Set<string>>(new Set());
  let isSelectionMode = $state(false);
  let sortBy = $state<'created_at' | 'last_message'>('last_message');

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
      const response = await fetch(`/api/chats?sortBy=${sortBy}`);
      const data = await response.json();
      chats = data.chats;
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      isLoading = false;
    }
  }

  function groupChatsByDate(chats: Chat[]): GroupedChats[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const groups: GroupedChats[] = [
      { label: 'Today', chats: [] },
      { label: 'Yesterday', chats: [] },
      { label: 'Last 7 days', chats: [] },
      { label: 'Last 30 days', chats: [] },
      { label: 'Older', chats: [] },
    ];

    for (const chat of chats) {
      const dateToCompare =
        sortBy === 'last_message' ? chat.last_message_at : chat.created_at;
      const chatDate = new Date(dateToCompare);

      if (chatDate >= today) {
        groups[0].chats.push(chat);
      } else if (chatDate >= yesterday) {
        groups[1].chats.push(chat);
      } else if (chatDate >= lastWeek) {
        groups[2].chats.push(chat);
      } else if (chatDate >= lastMonth) {
        groups[3].chats.push(chat);
      } else {
        groups[4].chats.push(chat);
      }
    }

    return groups.filter((group) => group.chats.length > 0);
  }

  const groupedChats = $derived(groupChatsByDate(chats));

  function toggleChatSelection(chatId: string) {
    if (selectedChatIds.has(chatId)) {
      selectedChatIds.delete(chatId);
    } else {
      selectedChatIds.add(chatId);
    }
    selectedChatIds = new Set(selectedChatIds);
  }

  function toggleSelectAll() {
    if (selectedChatIds.size === chats.length) {
      selectedChatIds.clear();
    } else {
      selectedChatIds = new Set(chats.map((c) => c.id));
    }
  }

  function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    if (!isSelectionMode) {
      selectedChatIds.clear();
    }
  }

  async function toggleSortBy() {
    sortBy = sortBy === 'created_at' ? 'last_message' : 'created_at';
    await loadChats();
  }

  async function deleteChat(chatId: string) {
    const confirmed = await ask('Are you sure you want to delete this chat?', {
      title: 'Delete Chat',
      kind: 'warning',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // If we're currently viewing this chat, redirect to home
      if (currentChatId === chatId) {
        await goto('/chat');
      }

      await loadChats();
    } catch (error) {
      console.error('Failed to delete chat:', error);
      await tauriMessage('Failed to delete chat. Please try again.', {
        title: 'Error',
        kind: 'error',
      });
    }
  }

  async function deleteSelectedChats() {
    if (selectedChatIds.size === 0) return;

    const confirmed = await ask(
      `Are you sure you want to delete ${selectedChatIds.size} chat${selectedChatIds.size > 1 ? 's' : ''}?`,
      {
        title: 'Delete Chats',
        kind: 'warning',
      },
    );

    if (!confirmed) return;

    try {
      const deletePromises = Array.from(selectedChatIds).map((chatId) =>
        fetch(`/api/chats/${chatId}`, { method: 'DELETE' }),
      );

      await Promise.all(deletePromises);

      // If we're currently viewing a deleted chat, redirect to home
      if (currentChatId && selectedChatIds.has(currentChatId)) {
        await goto('/chat');
      }

      selectedChatIds.clear();
      isSelectionMode = false;
      await loadChats();
    } catch (error) {
      console.error('Failed to delete chats:', error);
      await tauriMessage('Failed to delete some chats. Please try again.', {
        title: 'Error',
        kind: 'error',
      });
    }
  }
</script>

<aside>
  <div class="action-container">
    <a href="/chat" class="new-chat">New Chat</a>
  </div>

  <div class="toolbar">
    <button
      class="toolbar-btn"
      class:active={isSelectionMode}
      onclick={toggleSelectionMode}
      title={isSelectionMode ? 'Cancel selection' : 'Select chats'}
      aria-label={isSelectionMode ? 'Cancel selection' : 'Select chats'}
    >
      <input type="checkbox" checked={isSelectionMode} readonly />
      Select
    </button>

    <button
      class="toolbar-btn"
      onclick={toggleSortBy}
      title={sortBy === 'last_message'
        ? 'Sort by creation date'
        : 'Sort by last message'}
      aria-label="Toggle sort order"
    >
      <SortIcon />
      {sortBy === 'last_message' ? 'Recent' : 'Created'}
    </button>

    {#if isSelectionMode}
      <button
        class="toolbar-btn"
        onclick={toggleSelectAll}
        title={selectedChatIds.size === chats.length
          ? 'Deselect all'
          : 'Select all'}
        aria-label={selectedChatIds.size === chats.length
          ? 'Deselect all'
          : 'Select all'}
      >
        {selectedChatIds.size === chats.length ? 'None' : 'All'}
      </button>

      {#if selectedChatIds.size > 0}
        <button
          class="toolbar-btn delete-btn"
          onclick={deleteSelectedChats}
          title="Delete selected chats"
          aria-label="Delete selected chats"
        >
          <TrashIcon />
          ({selectedChatIds.size})
        </button>
      {/if}
    {/if}
  </div>

  <nav>
    {#if isLoading}
      <p class="loading-text">Loading chats...</p>
    {:else if chats.length === 0}
      <p class="empty-text">No chats yet</p>
    {:else}
      {#each groupedChats as group}
        <div class="chat-group">
          <h3 class="group-label">{group.label}</h3>
          {#each group.chats as chat (chat.id)}
            <div
              class="chat-item"
              class:selected={selectedChatIds.has(chat.id)}
            >
              {#if isSelectionMode}
                <input
                  type="checkbox"
                  checked={selectedChatIds.has(chat.id)}
                  onchange={() => toggleChatSelection(chat.id)}
                  aria-label="Select chat"
                />
              {/if}
              <a
                class="chat-link"
                class:active={currentChatId === chat.id}
                href="/chat/{chat.id}"
              >
                {chat.title}
              </a>
              {#if !isSelectionMode}
                <button
                  class="delete-chat-btn"
                  onclick={() => deleteChat(chat.id)}
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  <TrashIcon />
                </button>
              {/if}
            </div>
          {/each}
        </div>
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
      border-radius: 8px;
    }

    .action-container {
      padding-bottom: 16px;
      margin-bottom: 12px;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--darkgray);

      .toolbar-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: var(--darkgray);
        border: 1px solid transparent;
        border-radius: 6px;
        font-size: 0.85em;
        cursor: pointer;
        transition: all 0.2s ease;
        color: inherit;

        &:hover {
          background: var(--gray);
        }

        &.active {
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.1);
        }

        &.delete-btn {
          color: #ef4444;

          &:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: #ef4444;
          }
        }

        input[type='checkbox'] {
          margin: 0;
          cursor: pointer;
          pointer-events: none;
        }
      }
    }

    nav {
      flex: 1;
      overflow-y: auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scrollbar-width: thin;
      scrollbar-color: var(--darkgray) transparent;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--darkgray);
        border-radius: 3px;

        &:hover {
          background: var(--gray);
        }
      }

      .loading-text,
      .empty-text {
        padding: 12px 16px;
        text-align: center;
        opacity: 0.6;
        font-size: 0.9em;
      }

      .chat-group {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .group-label {
          font-size: 0.75em;
          font-weight: 600;
          text-transform: uppercase;
          opacity: 0.5;
          padding: 4px 8px;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 2px;
          border-radius: 8px;
          transition: background-color 0.2s ease;

          &.selected {
            background-color: rgba(59, 130, 246, 0.1);
          }

          &:hover {
            background-color: var(--darkgray);

            .delete-chat-btn {
              opacity: 1;
            }
          }

          input[type='checkbox'] {
            margin-left: 8px;
            cursor: pointer;
          }

          .chat-link {
            flex: 1;
            display: flex;
            align-items: center;
            padding: 10px 8px;
            border-radius: 6px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            line-height: 1;
            min-width: 0;

            &.active {
              background-color: var(--gray);
              font-weight: 500;
            }
          }

          .delete-chat-btn {
            flex-shrink: 0;
            padding: 6px;
            background: transparent;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0;
            transition: all 0.2s ease;
            color: inherit;
            display: flex;
            align-items: center;
            justify-content: center;

            &:hover {
              background: rgba(239, 68, 68, 0.1);
              color: #ef4444;
            }
          }
        }
      }
    }

    .settings-container {
      margin-top: auto;
      border-top: 1px solid var(--darkgray);
      padding-top: 20px;
      display: flex;
      align-items: flex-start;
    }
  }
</style>
