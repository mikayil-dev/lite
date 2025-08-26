<script lang="ts">
  import IconButton from '../buttons/IconButton.svelte';
  import SettingsIcon from '~icons/solar/settings-linear';
</script>

<div class="message-input-container">
  <textarea name="message" id="message"></textarea>
  <div class="toolbar">
    <IconButton class="hi">
      <SettingsIcon />
    </IconButton>
  </div>
</div>

<style lang="scss">
  .message-input-container {
    border-radius: 32px;
    background-color: var(--darkgray);
    box-shadow: 0 4px 8px #00000011;
    padding: 12px 16px;

    textarea {
      padding: 8px;
      border-radius: 12px;
      appearance: none;
      background: transparent;
      border: none;
      resize: none;
      width: 100%;
      height: 100%;
    }
  }
</style>
