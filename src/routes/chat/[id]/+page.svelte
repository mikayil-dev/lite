<script lang="ts">
  import MessageInput from 'lib/components/chat/MessageInput.svelte';
</script>

<section class="chat-page">
  <div class="message-input-wrapper">
    <MessageInput />
  </div>
</section>

<style lang="scss">
  .chat-page {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));
    position: relative;

    .message-input-wrapper {
      position: absolute;
      bottom: 0;
      width: 100%;
      padding-bottom: 32px;
      background: linear-gradient(
        to bottom,
        transparent 50%,
        var(--background) 50%
      );
    }
  }
</style>
