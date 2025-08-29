<script lang="ts">
  import MessageInput from 'lib/components/chat/MessageInput.svelte';
</script>

<section class="new-chat-page">
  <div class="message-input-wrapper">
    <MessageInput />
  </div>
</section>

<style lang="scss">
  .new-chat-page {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));
  }
</style>
