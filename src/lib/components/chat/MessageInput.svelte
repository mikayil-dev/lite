<script lang="ts">
  import IconButton from '../buttons/IconButton.svelte';
  import SettingsIcon from '~icons/solar/settings-linear';
  import ArrowUp from '~icons/solar/arrow-up-linear';

  interface Props {
    onSend?: (message: string) => void | Promise<void>;
    disabled?: boolean;
    placeholder?: string;
  }

  let { onSend, disabled = false, placeholder = 'Type a message...' }: Props = $props();

  let message = $state('');
  let textarea: HTMLTextAreaElement;

  function handleKeydown(
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: Event): void {
    if (!e.target) return;
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  async function handleSend(): Promise<void> {
    if (!message.trim() || disabled) return;

    const messageToSend = message.trim();
    message = '';

    // Reset textarea height
    if (textarea) {
      textarea.style.height = 'auto';
    }

    if (onSend) {
      await onSend(messageToSend);
    }
  }
</script>

<div class="message-input-container">
  <textarea
    bind:this={textarea}
    bind:value={message}
    name="message"
    id="message"
    {placeholder}
    {disabled}
    onkeydown={handleKeydown}
    oninput={handleInput}
  ></textarea>
  <div class="toolbar">
    <IconButton primary style="margin-left: auto;" disabled={!message.trim() || disabled} onclick={handleSend}>
      <ArrowUp />
    </IconButton>
  </div>
</div>

<style lang="scss">
  .message-input-container {
    border-radius: 24px;
    background-color: var(--darkgray);
    box-shadow: 0 4px 8px #00000011;
    padding: 12px 16px 14px;

    textarea {
      padding: 8px;
      border-radius: 12px;
      appearance: none;
      background: transparent;
      border: none;
      resize: none;
      width: 100%;
      height: 100%;
      max-height: 300px;
      scrollbar-width: thin;
    }

    .toolbar {
      display: flex;
      gap: 8px;
    }
  }
</style>
