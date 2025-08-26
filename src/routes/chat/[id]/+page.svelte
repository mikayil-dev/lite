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
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));

    .message-input-wrapper {
      margin-bottom: 20px;
      margin-top: auto;
    }
  }
</style>
