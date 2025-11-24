import { redirect } from '@sveltejs/kit';

export function load(): void {
  redirect(308, '/chat');
}
