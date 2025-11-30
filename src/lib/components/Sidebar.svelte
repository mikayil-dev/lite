<script>
  import { chats } from 'lib/stores/state.svelte';
  import IconButton from './buttons/IconButton.svelte';
  import SettingsIcon from '~icons/solar/settings-linear';
</script>

<aside>
  <div class="action-container">
    <a href="/chat" class="new-chat">New Chat</a>
  </div>

  <nav>
    {#each Object.values(chats) as chat}
      <a class="chat-link" href="/chat/{chat.id}">{chat.title}</a>
    {/each}
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
    }
  }
</style>
