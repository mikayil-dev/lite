<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    children: Snippet;
    href?: string;
    [key: string]: any;
  }

  let { children, href, ...rest }: Props = $props();
</script>

{#if href}
  <a class="icon-btn" {href} {...rest}>
    {@render children()}
  </a>
{:else}
  <button class="icon-btn" {...rest}>
    {@render children()}
  </button>
{/if}

<style lang="scss">
  .icon-btn {
    border-radius: 200px;
    min-width: 32px;
    min-height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text);
    background-color: var(--darkgray);
    font-size: 1em;

    @include hover {
      background-color: var(--gray);
    }
  }
</style>
