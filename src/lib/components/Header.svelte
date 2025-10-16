<script lang="ts">
  import Lite from '$lib/assets/images/Lite-robot.svelte';
  import MenuIcon from '~icons/solar/hamburger-menu-linear';
  import { sidebarOpen, toggleSidebar } from '$lib/stores/chatStore';
</script>

<header>
  <div class="left-section">
    <button class="sidebar-toggle" onclick={toggleSidebar} aria-label="Toggle sidebar">
      <MenuIcon />
    </button>
    <a href="/" class="logo">
      <Lite />
    </a>
  </div>

  <nav>
    <a href="/chat">Chat</a>
  </nav>
</header>

<style lang="scss">
  header {
    background-color: var(--contrast-bg);
    border-bottom: 1px solid var(--darkgray);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    height: var(--header-height);

    .left-section {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 100%;
    }

    .sidebar-toggle {
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      transition: color 0.2s ease;
      font-size: 20px;
      border-radius: 4px;

      &:hover {
        color: var(--text-primary);
      }

      @media (min-width: 769px) {
        display: none;
      }
    }

    .logo {
      height: 100%;
      width: 22px;
    }

    nav {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }
</style>
