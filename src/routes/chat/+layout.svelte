<script lang="ts">
  import Sidebar from 'lib/components/Sidebar.svelte';

  let { children, data } = $props();
  let chats = $derived(data.chats);
  1;
</script>

<div class="layout">
  <Sidebar {chats} />

  <main>
    {@render children?.()}
  </main>
</div>

<style lang="scss">
  .layout {
    padding-left: 250px;

    main {
      padding: 0 80px;
    }
  }
</style>
