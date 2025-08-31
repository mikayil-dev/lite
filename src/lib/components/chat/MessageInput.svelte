<script lang="ts">
  import IconButton from '../buttons/IconButton.svelte';
  import SettingsIcon from '~icons/solar/settings-linear';
  import ArrowUp from '~icons/solar/arrow-up-linear';

  function onkeydown(
    event: KeyboardEvent & { currentTarget: EventTarget & HTMLTextAreaElement },
  ): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
    }
  }
</script>

<div class="message-input-container">
  <textarea name="message" id="message" {onkeydown}></textarea>
  <div class="toolbar">
    <IconButton>
      <SettingsIcon />
    </IconButton>

    <IconButton primary style="margin-left: auto;">
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
      scrollbar-width: thin;
    }

    .toolbar {
      display: flex;
      gap: 8px;
    }
  }
</style>
