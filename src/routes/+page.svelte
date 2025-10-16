<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getAllProviders } from '$lib/services/providers';

  onMount(async () => {
    // Check if a valid provider is configured
    try {
      const providers = await getAllProviders();
      
      if (!providers || providers.length === 0) {
        // No providers configured, redirect to settings
        goto('/chat/settings', { replaceState: true });
      } else {
        // Providers exist, go to chat
        goto('/chat', { replaceState: true });
      }
    } catch (error) {
      console.error('Error checking providers:', error);
      // On error, still try to go to chat
      goto('/chat', { replaceState: true });
    }
  });
</script>
