<script lang="ts">
  import Sidebar from 'lib/components/Sidebar.svelte';
  import { sidebarOpen, toggleSidebar } from '$lib/stores/chatStore';

  let { children } = $props();
</script>

<div class="layout" class:sidebar-open={$sidebarOpen}>
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
      padding: 0 8px;

      @media (min-width: 481px) {
        padding: 0 40px;
      }

      @media (min-width: 769px) {
        padding: 0 80px;
      }
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
