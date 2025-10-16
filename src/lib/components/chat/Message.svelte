<script lang="ts">
  import { marked } from 'marked';
  import hljs from 'highlight.js';
  import type { MessageRole } from '$lib/server/providers';
  import TrashIcon from '~icons/solar/trash-bin-trash-linear';
  import EditIcon from '~icons/solar/pen-linear';
  import CheckIcon from '~icons/solar/check-circle-linear';
  import CloseIcon from '~icons/solar/close-circle-linear';
  import { ask } from '@tauri-apps/plugin-dialog';

  interface Props {
    id?: number;
    role: MessageRole;
    content: string;
    isStreaming?: boolean;
    onDelete?: (id: number) => void;
    onEdit?: (id: number, newContent: string) => void;
  }

  let {
    id,
    role,
    content,
    isStreaming = false,
    onDelete,
    onEdit,
  }: Props = $props();

  let isEditing = $state(false);
  let editedContent = $state(content);
  let isDeleting = $state(false);

  // Update editedContent when content changes
  $effect(() => {
    editedContent = content;
  });

  async function handleDelete() {
    if (id && onDelete) {
      isDeleting = true;
      const confirmed = await ask(
        'Are you sure you want to delete this message?',
        {
          title: 'Delete Message',
          kind: 'warning',
        },
      );
      if (confirmed) {
        onDelete(id);
      }
      isDeleting = false;
    }
  }

  function handleEditStart() {
    editedContent = content;
    isEditing = true;
  }

  function handleEditSave() {
    if (id && onEdit && editedContent.trim() !== content) {
      onEdit(id, editedContent.trim());
    }
    isEditing = false;
  }

  function handleEditCancel() {
    editedContent = content;
    isEditing = false;
  }

  // Custom renderer for code blocks with language labels
  const renderer = new marked.Renderer();

  renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
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
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
  />
</svelte:head>

<div
  class="message"
  class:user={role === 'user'}
  class:assistant={role === 'assistant'}
  class:system={role === 'system'}
  class:editing={isEditing}
  class:deleting={isDeleting}
>
  <div class="message-header">
    <span class="role"
      >{role === 'user'
        ? 'You'
        : role === 'assistant'
          ? 'Assistant'
          : 'System'}</span
    >
    {#if id && !isStreaming}
      <div class="message-actions">
        {#if role === 'user' && onEdit}
          {#if isEditing}
            <button
              class="action-btn save-btn"
              onclick={handleEditSave}
              title="Save"
              aria-label="Save edited message"
            >
              <CheckIcon />
            </button>
            <button
              class="action-btn cancel-btn"
              onclick={handleEditCancel}
              title="Cancel"
              aria-label="Cancel editing"
            >
              <CloseIcon />
            </button>
          {:else}
            <button
              class="action-btn edit-btn"
              onclick={handleEditStart}
              title="Edit"
              aria-label="Edit message"
            >
              <EditIcon />
            </button>
          {/if}
        {/if}
        {#if onDelete}
          <button
            class="action-btn delete-btn"
            onclick={handleDelete}
            title="Delete"
            aria-label="Delete message"
          >
            <TrashIcon />
          </button>
        {/if}
      </div>
    {/if}
  </div>
  <div class="message-content">
    {#if isEditing}
      <textarea
        bind:value={editedContent}
        class="edit-textarea"
        rows="5"
        aria-label="Edit message content"
        onkeydown={(e) => {
          if (e.key === 'Enter' && e.metaKey) {
            handleEditSave();
          } else if (e.key === 'Escape') {
            handleEditCancel();
          }
        }}
      ></textarea>
    {:else if role === 'assistant'}
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
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 12px;

    @media (min-width: 481px) {
      padding: 14px;
    }

    @media (min-width: 769px) {
      padding: 16px;
    }

    &.user {
      background-color: var(--darkgray);
      margin-left: auto;
      max-width: 95%;

      @media (min-width: 481px) {
        max-width: 85%;
      }

      @media (min-width: 769px) {
        max-width: 80%;
      }
    }

    &.assistant {
      background-color: var(--contrast-bg);
      margin-right: auto;
      max-width: 95%;

      @media (min-width: 481px) {
        max-width: 85%;
      }

      @media (min-width: 769px) {
        max-width: 80%;
      }
    }

    &.system {
      background-color: var(--darkgray);
      opacity: 0.7;
      font-size: 0.9em;
      max-width: 100%;
      margin-left: auto;
      margin-right: auto;

      @media (min-width: 481px) {
        max-width: 95%;
      }

      @media (min-width: 769px) {
        max-width: 90%;
      }
    }

    .message-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      .role {
        font-weight: 600;
        font-size: 0.875em;
        opacity: 0.8;
        text-transform: capitalize;
      }
    }

    .message-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
    }

    &:hover .message-actions {
      opacity: 1;
    }

    // Keep actions visible when editing or deleting
    &.editing .message-actions,
    &.deleting .message-actions {
      opacity: 1;
    }

    // Ensure buttons are not clickable when invisible
    .message-actions > button {
      pointer-events: auto;
    }

    &:not(:hover):not(.editing):not(.deleting) .message-actions > button {
      pointer-events: none;
    }

    .action-btn {
      padding: 4px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: inherit;

      &:focus {
        outline: none;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.2);
      }

      &.edit-btn:hover {
        border-color: var(--primary);
        color: var(--primary);
      }

      &.delete-btn:hover {
        border-color: #ef4444;
        color: #ef4444;
      }

      &.save-btn:hover {
        border-color: #10b981;
        color: #10b981;
      }

      &.cancel-btn:hover {
        border-color: #f59e0b;
        color: #f59e0b;
      }
    }

    .message-content {
      line-height: 1.6;
      word-wrap: break-word;

      .edit-textarea {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 1px solid var(--primary);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.2);
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        line-height: 1.6;
        resize: vertical;

        &:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
      }

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
        padding: 8px !important;
        overflow-x: auto;
        margin: 0 !important;
        line-height: 1.5;
        border-radius: 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;

        @media (min-width: 481px) {
          padding: 10px !important;
        }

        @media (min-width: 769px) {
          padding: 12px !important;
        }

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

      :global(ul),
      :global(ol) {
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

      :global(h1),
      :global(h2),
      :global(h3),
      :global(h4),
      :global(h5),
      :global(h6) {
        margin: 1em 0 0.5em 0;
        font-weight: 600;

        &:first-child {
          margin-top: 0;
        }
      }

      :global(h1) {
        font-size: 1.5em;
      }
      :global(h2) {
        font-size: 1.3em;
      }
      :global(h3) {
        font-size: 1.1em;
      }

      :global(table) {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }

      :global(th),
      :global(td) {
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
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0;
    }
  }
</style>
