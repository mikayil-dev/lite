# Migration Guide: API Routes to Tauri SQL Plugin

## Problem
The app uses SvelteKit API routes (`/api/*`) with Node.js `sqlite3`, which doesn't work in production with `adapter-static`. API routes need a server, but Tauri apps are client-side only.

## Solution
Use `@tauri-apps/plugin-sql` to access SQLite directly from the frontend.

## What's Been Done
1. ✅ Installed `@tauri-apps/plugin-sql` (npm and cargo)
2. ✅ Configured Tauri plugin in `src-tauri/src/lib.rs` with migrations
3. ✅ Created client-side database wrapper: `src/lib/db/client.ts`
4. ✅ Created client-side providers service: `src/lib/services/providers.ts`

## What Needs to Be Done

### Step 1: Update Settings Page
Replace ALL `fetch('/api/...')` calls in `src/routes/chat/settings/+page.svelte`:

**Before:**
```typescript
const response = await fetch('/api/providers');
const data = await response.json();
providers = data.providers;
```

**After:**
```typescript
import { getAllProviders } from '$lib/services/providers';
providers = await getAllProviders();
```

### Step 2: Create Similar Services for Other Entities
Create these files following the pattern in `src/lib/services/providers.ts`:

- `src/lib/services/chats.ts` - for chat operations
- `src/lib/services/messages.ts` - for message operations  
- `src/lib/services/preferences.ts` - for user preferences
- `src/lib/services/models.ts` - for model operations

### Step 3: Update All Components
Replace fetch calls in:
- `src/routes/chat/[id]/+page.svelte`
- `src/lib/components/Sidebar.svelte`
- `src/lib/components/chat/Message.svelte`

### Step 4: Remove API Routes (Optional)
The `src/routes/api/*` folders can be deleted since they won't work in production anyway.

## Quick Win: Test the Provider Creation
To verify the fix works, update just the provider creation in settings page:

```typescript
// In src/routes/chat/settings/+page.svelte
import { createProvider } from '$lib/services/providers';

async function handleAddProvider(): Promise<void> {
  try {
    const id = await createProvider(newProvider, true);
    await loadProviders();
    // ... rest of the code
  } catch (error) {
    // ... error handling
  }
}
```

## Testing
After migration:
1. Run `npm run tauri dev` - should work
2. Run `npm run tauri build` - should work
3. Test provider creation, chat creation, message sending

## Notes
- The Tauri SQL plugin uses the app data directory automatically
- Migrations run on app startup
- No need for manual database path management
