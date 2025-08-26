<script lang="ts">
  import Lite from '$lib/assets/images/Lite-robot.svelte';
</script>

<header>
  <a href="/" class="logo">
    <Lite />
  </a>

  <nav>
    <a href="/chat">Chat</a>
  </nav>
</header>

<style lang="scss">
  header {
    background-color: var(--dark-bg);
    border-bottom: 1px solid var(--darkgray);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    height: var(--header-height);

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
