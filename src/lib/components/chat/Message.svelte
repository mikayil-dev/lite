<script lang="ts">
  import { marked } from 'marked';
  import hljs from 'highlight.js';
  import type { MessageRole } from '$lib/server/providers';

  interface Props {
    role: MessageRole;
    content: string;
    isStreaming?: boolean;
  }

  let { role, content, isStreaming = false }: Props = $props();

  // Custom renderer for code blocks with language labels
  const renderer = new marked.Renderer();

  renderer.code = function({ text, lang }: { text: string; lang?: string }) {
    const language = lang || 'text';
    const langLabel = language.charAt(0).toUpperCase() + language.slice(1);

    // Get highlighted code
    let highlightedCode = text;
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlightedCode = hljs.highlight(text, { language: lang }).value;
      } catch (e) {
        console.error('Highlight error:', e);
      }
    } else {
      // Escape HTML if not highlighted
      highlightedCode = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-block-lang">${langLabel}</span>
        </div>
        <pre><code class="hljs language-${language}">${highlightedCode}</code></pre>
      </div>
    `;
  };

  // Configure marked
  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer: renderer,
  });

  // Parse markdown for assistant messages
  const parsedContent = $derived.by(() => {
    if (role === 'assistant' && content) {
      try {
        return marked.parse(content) as string;
      } catch (e) {
        console.error('Markdown parse error:', e);
        return content;
      }
    }
    return content;
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
</svelte:head>

<div class="message" class:user={role === 'user'} class:assistant={role === 'assistant'} class:system={role === 'system'}>
  <div class="message-header">
    <span class="role">{role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}</span>
  </div>
  <div class="message-content">
    {#if role === 'assistant'}
      {@html parsedContent}
    {:else}
      {content}
    {/if}
    {#if isStreaming}
      <span class="cursor">▋</span>
    {/if}
  </div>
</div>

<style lang="scss">
  .message {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 12px;

    &.user {
      background-color: var(--darkgray);
      margin-left: auto;
      max-width: 80%;
    }

    &.assistant {
      background-color: var(--contrast-bg);
      margin-right: auto;
      max-width: 80%;
    }

    &.system {
      background-color: var(--darkgray);
      opacity: 0.7;
      font-size: 0.9em;
      max-width: 90%;
      margin-left: auto;
      margin-right: auto;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;

      .role {
        font-weight: 600;
        font-size: 0.875em;
        opacity: 0.8;
        text-transform: capitalize;
      }
    }

    .message-content {
      line-height: 1.6;
      word-wrap: break-word;

      .cursor {
        animation: blink 1s infinite;
        margin-left: 2px;
      }

      // Markdown styling for assistant messages
      :global(p) {
        margin: 0 0 1em 0;

        &:last-child {
          margin-bottom: 0;
        }
      }

      :global(code) {
        background: rgba(0, 0, 0, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.9em;
      }

      :global(.code-block-wrapper) {
        margin: 0.75em 0;
        border-radius: 8px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.3);
      }

      :global(.code-block-header) {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 6px 12px;
        background: rgba(0, 0, 0, 0.4);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin: 0;
      }

      :global(.code-block-lang) {
        font-size: 0.7em;
        font-weight: 600;
        text-transform: uppercase;
        opacity: 0.6;
        letter-spacing: 0.5px;
        margin: 0;
      }

      :global(.code-block-wrapper pre) {
        background: transparent !important;
        padding: 12px !important;
        overflow-x: auto;
        margin: 0 !important;
        line-height: 1.5;
        border-radius: 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;

        &::-webkit-scrollbar {
          height: 8px;
        }

        &::-webkit-scrollbar-track {
          background: transparent;
        }

        &::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;

          &:hover {
            background: rgba(255, 255, 255, 0.4);
          }
        }

        :global(code) {
          background: none !important;
          padding: 0 !important;
          padding-bottom: 12px !important;
          white-space: pre;
          word-wrap: normal;
          overflow-wrap: normal;
          display: block;
        }
      }

      :global(pre) {
        background: rgba(0, 0, 0, 0.3);
        padding: 12px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 0.75em 0;
        line-height: 1.5;

        :global(code) {
          background: none;
          padding: 0;
          white-space: pre;
          word-wrap: normal;
          overflow-wrap: normal;
          display: block;
        }
      }

      :global(ul), :global(ol) {
        margin: 0.5em 0;
        padding-left: 1.5em;
      }

      :global(li) {
        margin: 0.25em 0;
      }

      :global(blockquote) {
        border-left: 3px solid var(--primary);
        padding-left: 1em;
        margin: 1em 0;
        opacity: 0.8;
      }

      :global(a) {
        color: var(--primary);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      :global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6) {
        margin: 1em 0 0.5em 0;
        font-weight: 600;

        &:first-child {
          margin-top: 0;
        }
      }

      :global(h1) { font-size: 1.5em; }
      :global(h2) { font-size: 1.3em; }
      :global(h3) { font-size: 1.1em; }

      :global(table) {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }

      :global(th), :global(td) {
        border: 1px solid var(--darkgray);
        padding: 8px 12px;
        text-align: left;
      }

      :global(th) {
        background: rgba(0, 0, 0, 0.2);
        font-weight: 600;
      }

      :global(hr) {
        border: none;
        border-top: 1px solid var(--darkgray);
        margin: 1.5em 0;
      }

      :global(strong) {
        font-weight: 600;
      }

      :global(em) {
        font-style: italic;
      }
    }
  }

  @keyframes blink {
    0%, 50% {
      opacity: 1;
    }
    51%, 100% {
      opacity: 0;
    }
  }
</style>
