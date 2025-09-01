<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    children: Snippet;
    href?: string;
    primary?: boolean;
    [key: string]: any;
  }

  let { children, href, primary, ...rest }: Props = $props();
</script>

{#if href}
  <a class="icon-btn" class:primary {href} {...rest}>
    {@render children()}
  </a>
{:else}
  <button class="icon-btn" class:primary {...rest}>
    {@render children()}
  </button>
{/if}

<style lang="scss">
  // in case class prop gets overwritten by ...rest
  a,
  button,
  .icon-btn {
    border-radius: 200px;
    min-width: 33px;
    min-height: 33px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text);
    background-color: var(--darkgray);
    font-size: 1em;

    &.primary {
      background-color: white;
      border: 2px solid white;

      :global * {
        color: var(--darkgray);
      }

      @include hover {
        background-color: transparent;

        :global * {
          color: white;
        }
      }
    }

    @include hover {
      background-color: var(--gray);
    }
  }
</style>
