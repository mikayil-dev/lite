<script lang="ts">
  import Sidebar from 'lib/components/Sidebar.svelte';
  import { sidebarOpen, toggleSidebar } from '$lib/stores/chatStore';
  import MenuIcon from '~icons/solar/hamburger-menu-linear';

  let { children } = $props();
</script>

<div class="layout" class:sidebar-open={$sidebarOpen}>
  <button class="sidebar-toggle" onclick={toggleSidebar} aria-label="Toggle sidebar">
    <MenuIcon />
  </button>

  {#if $sidebarOpen}
    <button class="sidebar-overlay" onclick={toggleSidebar} aria-label="Close sidebar"></button>
  {/if}

  <Sidebar />
  <main>
    {@render children?.()}
  </main>
</div>

<style lang="scss">
  .layout {
    padding-left: 0;
    transition: padding-left 0.3s ease;

    @media (min-width: 769px) {
      padding-left: 250px;
    }

    main {
      padding: 0 20px;

      @media (min-width: 481px) {
        padding: 0 40px;
      }

      @media (min-width: 769px) {
        padding: 0 80px;
      }
    }
  }

  .sidebar-toggle {
    position: fixed;
    top: calc(var(--header-height) + 12px);
    left: 12px;
    z-index: 101;
    background: var(--gray);
    border: 1px solid var(--darkgray);
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    transition: all 0.2s ease;
    font-size: 20px;

    &:hover {
      background: var(--darkgray);
      border-color: var(--primary);
    }

    @media (min-width: 769px) {
      display: none;
    }
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    cursor: pointer;

    @media (min-width: 769px) {
      display: none;
    }
  }
</style>
