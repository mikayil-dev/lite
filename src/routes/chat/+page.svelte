<script lang="ts">
  import MessageInput from 'lib/components/chat/MessageInput.svelte';
</script>

<section class="new-chat-page">
  <h2>Start a new chat</h2>
  <div class="message-input-wrapper">
    <MessageInput />
  </div>
</section>

<style lang="scss">
  .new-chat-page {
    max-width: 768px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));

    h2 {
      margin-bottom: 40px;
      margin-top: -1em;
    }

    .message-input-wrapper {
      width: 100%;
    }
  }
</style>
