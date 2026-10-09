import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Route } from '@playwright/test';
import { setLanguage } from './settings';
import { selectProfileExtra } from './profile-navigation';
import { voiceDuration } from '../../../supabase/functions/verify-direct-audio/duration';

test.use({ permissions: ['microphone'], launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

const uid = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const thread = '33333333-3333-4333-8333-333333333333', ownPost = '44444444-4444-4444-8444-444444444444';
const legacyPost = '55555555-5555-4555-8555-555555555555', privatePost = '66666666-6666-4666-8666-666666666666';
const galleryId = '77777777-7777-4777-8777-777777777777';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b1sAAAAASUVORK5CYII=', 'base64');
const encoded = (x: object) => Buffer.from(JSON.stringify(x)).toString('base64url');
const date = () => new Date().toISOString(), tomorrow = () => new Date(Date.now() + 86400000).toISOString();
async function fixture(page: Page, { reviewer = false, expiresSoon = false } = {}) {
  const profile = { id: uid, name: 'Coffee Owner', username: 'owner', avatar_url: null, is_private: false, share_collection: true };
  const friend = { id: other, name: 'Coffee Friend', username: 'friend', avatar_url: null, is_private: false };
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'owner@example.test', is_anonymous: false, app_metadata: { provider: 'email' }, user_metadata: {}, identities: [], created_at: date() };
  const token = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 7200 })}.isolated_signature`;
  const post = (id: string, body: string, extra: Record<string, unknown> = {}) => ({ id, user_id: uid, body, content_language: 'en', created_at: date(), recipe_id: null, roast_profile_id: null, roast: null, brew_log_id: null, bean_id: null, brew_method: null, dose_grams: null, water_grams: null, actual_time_seconds: null, outcome: null, content_type: 'topic', primary_media_path: null, visibility: 'public', is_hidden: false, media: [] as { url: string; media_type: string }[], ...extra });
  const posts = [post(ownPost, 'My first coffee topic', { brew_method: 'espresso' }), post(legacyPost, 'Legacy coffee photos', { content_type: 'image', media: [{ url: 'https://social-photo-fixture.test/one.png', media_type: 'image' }, { url: 'https://social-photo-fixture.test/two.png', media_type: 'image' }] }), post(privatePost, 'My private coffee note', { visibility: 'private', is_hidden: true }), post('88888888-8888-4888-8888-888888888888', 'A friend’s coffee topic', { user_id: other })];
  const messages: Record<string, any>[] = expiresSoon ? [{ id: '99999999-9999-4999-8999-999999999999', conversation_id: thread, sender_id: other, kind: 'text', body: 'Short-lived test message', post_id: null, audio_path: null, duration_seconds: null, created_at: date(), expires_at: new Date(Date.now() + 12000).toISOString() }] : [];
  const stories: Record<string, any>[] = [];
  let photos: Record<string, any>[] = [{ id: galleryId, kind: 'extraction', image_url: 'storage://profile-gallery/' + uid + '/initial.png', image_path: uid + '/initial.png', caption: 'Original coffee extraction', created_at: date() }];
  let audience = 'everyone', allowed = true, failPost = false, failSend = false, failPhoto = false;
  const postWrites: Record<string, any>[] = [], messageWrites: Record<string, any>[] = [], uploads: { bucket: string; path: string; bytes: Buffer }[] = [], profilePostQueries: URLSearchParams[] = [];
  const reply = (r: Route, data: unknown, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' }, body: JSON.stringify(data) });
  await page.route('https://social-photo-fixture.test/**', r => r.fulfill({ contentType: 'image/png', body: png }));
  await page.route('https://mobilefixture.supabase.co/**', r => {
    const url = new URL(r.request().url()), p = url.pathname, method = r.request().method();
    const body = () => r.request().postDataJSON();
    if (p.endsWith('/settings')) return reply(r, { external: { google: true, apple: false } });
    if (p.endsWith('/token')) return reply(r, { access_token: token, refresh_token: 'isolated_refresh', expires_in: 7200, token_type: 'bearer', user });
    if (p.endsWith('/user')) return reply(r, user);
    if (p === '/storage/v1/object/sign/fixture/coffee.webm') return r.fulfill({ contentType: 'video/webm', body: readFileSync('e2e/fixtures/social-test-video.webm') });
    if (p === '/storage/v1/object/sign/fixture/coffee.mp4') return r.fulfill({ contentType: 'video/mp4', body: readFileSync('e2e/fixtures/social-test-video.mp4') });
    if (p === '/storage/v1/object/sign/fixture/story.webm') return r.fulfill({ contentType: 'video/webm', body: uploads.find(u => u.bucket === 'coffee-stories')!.bytes });
    if (p.startsWith('/storage/v1/object/sign/coffee-stories/') && p.endsWith('.webm')) return reply(r, { signedURL: '/object/sign/fixture/story.webm?token=isolated' });
    if (p === '/storage/v1/object/sign/fixture/voice.webm') return r.fulfill({ contentType: 'audio/webm', body: uploads.find(u => u.bucket === 'direct-audio')!.bytes });
    if (p.startsWith('/storage/v1/object/sign/direct-audio/')) return reply(r, { signedURL: '/object/sign/fixture/voice.webm?token=isolated' });
    if (p.startsWith('/storage/v1/object/sign/post-media/') && p.endsWith('.webm')) return reply(r, { signedURL: '/object/sign/fixture/coffee.webm?token=isolated' });
    if (p.startsWith('/storage/v1/object/sign/post-media/') && p.endsWith('.mp4')) return reply(r, { signedURL: '/object/sign/fixture/coffee.mp4?token=isolated' });
    if (p === '/storage/v1/object/sign/fixture/photo.png') return r.fulfill({ contentType: 'image/png', body: png });
    if (p.startsWith('/storage/v1/object/sign/')) return reply(r, { signedURL: '/object/sign/fixture/photo.png?token=isolated' });
    if (p.startsWith('/storage/v1/object/') && method === 'POST') {
      const [bucket, ...path] = p.replace('/storage/v1/object/', '').split('/');
      uploads.push({ bucket, path: path.join('/'), bytes: r.request().postDataBuffer()! });
      return reply(r, { Key: bucket + '/' + path.join('/') });
    }
    if (p.startsWith('/storage/v1/object/') && method === 'DELETE') return reply(r, []);
    if (p.endsWith('/functions/v1/verify-direct-audio')) {
      const upload = uploads.find(x => x.path === body().path);
      return reply(r, { duration_seconds: voiceDuration(new Uint8Array(upload!.bytes)) });
    }
    if (p.endsWith('/profiles')) return reply(r, url.searchParams.get('select') === 'username' ? { username: 'owner' } : [profile, friend]);
    if (p.endsWith('/rpc/get_member_profile')) return reply(r, { profile, is_owner: true, can_view: true, follower_count: 1, following_count: 1, relationship: null, equipment: [], inventory: [], recipes: [], favorites: [], comments: [], photos });
    if (p.endsWith('/rpc/search_member_profiles')) return reply(r, [profile, friend]);
    if (p.endsWith('/rpc/can_review_coffee_stories')) return reply(r, reviewer);
    if (p.endsWith('/rpc/can_direct_message')) return reply(r, allowed);
    if (p.endsWith('/rpc/start_direct_conversation')) return allowed ? reply(r, thread) : reply(r, { message: 'MESSAGES_CLOSED' }, 403);
    if (p.endsWith('/direct_conversations')) return reply(r, [{ id: thread, user_a: uid, user_b: other, created_at: date() }]);
    if (p.endsWith('/direct_messages')) {
      if (method === 'PATCH' || method === 'DELETE') {
        expect(url.searchParams.get('sender_id')).toBe('eq.' + uid);
        const id = url.searchParams.get('id')?.replace(/^eq\./, ''), row = messages.find(m => m.id === id)!;
        if (failSend) return reply(r, { message: 'isolated mutation failure' }, 503);
        if (method === 'PATCH') { row.body = body().body; row.edited_at = date(); }
        else { const index = messages.indexOf(row); if (index >= 0) messages.splice(index, 1); }
        return reply(r, { id });
      }
      if (method === 'POST') {
        const value = body(); messageWrites.push(value);
        if (failSend || !allowed) return reply(r, { message: 'isolated send failure' }, 503);
        const row = { ...value, created_at: date(), expires_at: tomorrow() }; messages.push(row); return reply(r, { id: row.id }, 201);
      }
      return reply(r, [...messages].filter(m => Date.parse(m.expires_at) > Date.now()).reverse());
    }
    if (p.endsWith('/blocks') && method === 'POST') { allowed = false; return reply(r, body()); }
    if (p.endsWith('/direct_message_preferences')) {
      if (method === 'POST') audience = body().audience;
      return reply(r, { audience });
    }
    if (p.endsWith('/rpc/save_community_post')) {
      const value = body(); postWrites.push(value);
      if (failPost) return reply(r, { message: 'isolated post failure' }, 503);
      let row = posts.find(x => x.id === value.p_id);
      if (!row) { row = post(value.p_id, value.p_body); posts.unshift(row); }
      row.body = value.p_body;
      if (value.p_replace_media) { row.primary_media_path = value.p_media_path; row.content_type = value.p_media_type ?? 'topic'; row.media = value.p_media_path ? [{ url: 'storage://post-media/' + value.p_media_path, media_type: value.p_media_type }] : []; }
      return reply(r, row.id);
    }
    if (p.endsWith('/posts')) {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      if (method === 'DELETE') { expect(url.searchParams.get('user_id')).toBe('eq.' + uid); const at = posts.findIndex(x => x.id === id); if (at >= 0) posts.splice(at, 1); return reply(r, { id }); }
      let rows = posts;
      if (url.searchParams.has('user_id')) { profilePostQueries.push(url.searchParams); rows = rows.filter(x => 'eq.' + x.user_id === url.searchParams.get('user_id')); }
      if (url.searchParams.has('visibility')) rows = rows.filter(x => x.visibility === 'public' && !x.is_hidden);
      if (id) rows = rows.filter(x => x.id === id);
      return reply(r, rows.slice(0, Number(url.searchParams.get('limit') ?? 60)));
    }
    if (p.endsWith('/coffee_stories')) {
      if (method === 'POST') { const row = { ...body(), status: 'approved', created_at: date(), expires_at: tomorrow(), review_reason: null, reviewed_at: null }; stories.push(row); return reply(r, { id: row.id }, 201); }
      if (method === 'DELETE') { const id = url.searchParams.get('id')?.replace(/^eq\./, ''); const at = stories.findIndex(s => s.id === id); if (at >= 0) stories.splice(at, 1); return reply(r, { id }); }
      let rows = stories;
      if (url.searchParams.has('user_id')) rows = rows.filter(s => 'eq.' + s.user_id === url.searchParams.get('user_id'));
      if (url.searchParams.get('status')?.startsWith('eq.')) rows = rows.filter(s => 'eq.' + s.status === url.searchParams.get('status'));
      if (url.searchParams.get('reviewed_at') === 'is.null') rows = rows.filter(s => !s.reviewed_at);
      return reply(r, rows);
    }
    if (p.endsWith('/rpc/review_coffee_story')) { const v = body(), row = stories.find(s => s.id === v.p_id)!; row.status = v.p_approve ? 'approved' : 'rejected'; row.review_reason = v.p_reason; row.reviewed_at = date(); return reply(r, v.p_approve ? 'approved' : 'warned'); }
    if (p.endsWith('/social_sanctions')) return reply(r, null);
    if (p.endsWith('/profile_photos')) {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      expect(url.searchParams.get('user_id')).toBe('eq.' + uid);
      if (failPhoto) return reply(r, { message: 'isolated gallery failure' }, 503);
      const row = photos.find(x => x.id === id)!;
      if (method === 'PATCH') { Object.assign(row, body()); if (body().image_path) row.image_url = 'storage://profile-gallery/' + body().image_path; return reply(r, { id }); }
      if (method === 'DELETE') { photos = photos.filter(x => x.id !== id); return reply(r, { id, image_path: row.image_path }); }
    }
    return reply(r, []);
  });
  return { posts, messages, stories, uploads, postWrites, messageWrites, profilePostQueries, setAllowed: (v: boolean) => { allowed = v; }, failPost: (v: boolean) => { failPost = v; }, failSend: (v: boolean) => { failSend = v; }, failPhoto: (v: boolean) => { failPhoto = v; }, audience: () => audience };
}
async function login(page: Page) {
  await page.goto('/'); await setLanguage(page, 'en');
  await page.getByRole('button', { name: 'Open account', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('owner@example.test');
  await page.getByLabel('Password', { exact: true }).fill('correct-current');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByTestId('member-profile')).toBeVisible();
}
async function direct(page: Page) {
  await page.getByRole('button', { name: 'My messages', exact: true }).click();
  await page.getByTestId('direct-messages').getByRole('button', { name: 'Coffee Friend @friend', exact: true }).click();
  await expect(page.getByLabel('Your message', { exact: true })).toBeVisible();
}
async function pickPhoto(page: Page, click: () => Promise<void>) {
  const chooser = page.waitForEvent('filechooser'); await click();
  await (await chooser).setFiles({ name: 'coffee.png', mimeType: 'image/png', buffer: png });
}

test('all own posts include private notes; commentary edits preserve legacy photos and deletion is confirmed', async ({ page }) => {
  const f = await fixture(page); await login(page);
  await page.getByTestId('profile-sections').getByRole('button', { name: 'Posts', exact: true }).click();
  await expect(page.getByText('My private coffee note', { exact: true })).toBeVisible();
  expect(f.profilePostQueries.at(-1)!.has('is_hidden')).toBe(false);
  const own = page.getByTestId('community-post-' + ownPost);
  await expect(own).toContainText('Topic'); await expect(own).not.toContainText('Espresso');
  const legacy = page.getByTestId('community-post-' + legacyPost);
  await legacy.getByRole('button', { name: 'Edit post', exact: true }).click();
  const editor = page.getByTestId('community-composer');
  await expect(editor.getByRole('img', { name: 'Post media', exact: true })).toHaveCount(2);
  await editor.getByLabel('Write your experience', { exact: true }).fill('Updated commentary with the same two photos');
  await editor.getByRole('button', { name: 'Save post changes', exact: true }).click();
  await expect(legacy).toContainText('Updated commentary'); expect(f.postWrites.at(-1)!.p_replace_media).toBe(false); expect(f.posts.find(p => p.id === legacyPost)!.media).toHaveLength(2);
  await legacy.getByRole('button', { name: 'Delete post', exact: true }).click();
  await expect(legacy).toBeVisible();
  await page.getByRole('button', { name: 'Confirm delete post', exact: true }).click();
  await expect(legacy).toHaveCount(0);
  await page.reload(); await page.getByRole('button', { name: 'Account', exact: true }).click(); await page.getByTestId('profile-sections').getByRole('button', { name: 'Posts', exact: true }).click();
  await expect(legacy).toHaveCount(0);
});

test('clearing post media and discarding a draft wait for confirmation and cancel preserves the draft', async ({ page }) => {
  const f = await fixture(page); await login(page); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  await page.getByRole('button', { name: 'Open experience composer', exact: true }).click();
  const editor = page.getByTestId('community-composer'), confirm = page.getByTestId('confirm-dialog');
  await editor.getByLabel('Write your experience', { exact: true }).fill('My unsaved coffee experience');
  await pickPhoto(page, () => editor.getByRole('button', { name: 'Photo', exact: true }).click());
  await editor.getByRole('button', { name: 'Remove media', exact: true }).click();
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(editor.getByRole('img', { name: 'Post media', exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Remove media', exact: true }).click();
  await confirm.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(editor.getByRole('img', { name: 'Post media', exact: true })).toHaveCount(0);
  await editor.getByRole('button', { name: 'Close composer', exact: true }).click();
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(editor.getByLabel('Write your experience', { exact: true })).toHaveValue('My unsaved coffee experience');
  await editor.getByRole('button', { name: 'Close composer', exact: true }).click();
  await confirm.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(editor).toHaveCount(0); expect(f.postWrites).toHaveLength(0);
});

test('photo-only posts preserve a failed draft, retry one ID, and keep genuine media after reload', async ({ page }) => {
  const f = await fixture(page); await login(page); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  await page.getByRole('button', { name: 'Open experience composer', exact: true }).click();
  const editor = page.getByTestId('community-composer');
  await pickPhoto(page, () => editor.getByRole('button', { name: 'Photo', exact: true }).click());
  await expect(editor.getByRole('img', { name: 'Post media', exact: true })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Video', exact: true })).toBeVisible();
  f.failPost(true); await editor.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('draft is kept');
  f.failPost(false); await editor.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(editor).toHaveCount(0); expect(f.postWrites[0].p_id).toBe(f.postWrites[1].p_id);
  expect(f.postWrites.at(-1)).toMatchObject({ p_body: '', p_media_type: 'image', p_brew_id: null });
  const published = page.getByTestId('community-post-' + f.postWrites.at(-1)!.p_id);
  await expect(published.getByRole('img')).toBeVisible(); await expect(published).not.toContainText('Espresso');
  await page.reload(); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click(); await expect(published).toBeVisible();
});

test('sharing to DM waits for explicit send, opens the post, and outside sharing uses the actual app link', async ({ page }) => {
  const f = await fixture(page); await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: async (value: object) => { (window as any).fixtureShare = value; } }));
  await login(page); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  const post = page.getByTestId('community-post-' + ownPost);
  await post.getByRole('button', { name: 'Share post', exact: true }).click();
  await page.getByRole('button', { name: 'Share outside the app', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).fixtureShare?.text)).toContain('beanmora://post/' + ownPost);
  await post.getByRole('button', { name: 'Share post', exact: true }).click(); await page.getByRole('button', { name: 'Share in a private message', exact: true }).click();
  await page.getByRole('button', { name: 'Coffee Friend @friend', exact: true }).click();
  expect(f.messageWrites).toHaveLength(0);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open shared post', exact: true })).toBeVisible();
  expect(f.messageWrites[0]).toMatchObject({ kind: 'post', post_id: ownPost, body: null });
  await page.getByRole('button', { name: 'Open shared post', exact: true }).click(); await expect(post).toBeVisible();
});

test('DM preserves a failed text draft, retries once, restores history and expires displayed messages', async ({ page }, info) => {
  const f = await fixture(page, { expiresSoon: true }); await login(page); await direct(page);
  await expect(page.getByText('Short-lived test message', { exact: true })).toBeVisible();
  const input = page.getByLabel('Your message', { exact: true }); await input.fill('My brewing question');
  f.failSend(true); await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('draft is kept'); await expect(input).toHaveValue('My brewing question');
  f.failSend(false); await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => f.messageWrites.length).toBe(2); await expect(page.getByTestId('direct-message-' + f.messageWrites[1].id)).toContainText('My brewing question'); expect(f.messageWrites[0].id).toBe(f.messageWrites[1].id); await expect(input).toHaveValue('');
  await page.screenshot({ path: info.outputPath('direct-message-light-phone.png') });
  await expect(page.getByText('Short-lived test message', { exact: true })).toHaveCount(0, { timeout: 14000 });
  await page.reload(); await page.getByRole('button', { name: 'Account', exact: true }).click(); await direct(page); await expect(page.getByText('My brewing question', { exact: true })).toBeVisible();
  f.setAllowed(false); await expect(input).toHaveCount(0, { timeout: 7000 });
  await expect(page.getByText('My brewing question', { exact: true })).toBeVisible();
});

test('settings persist Everyone, accepted Followers or Off and never expose moderation to normal members', async ({ page }) => {
  const f = await fixture(page); await login(page); await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  const settings = page.getByTestId('settings-social');
  await settings.getByRole('button', { name: 'Followers', exact: true }).click(); await expect.poll(f.audience).toBe('followers');
  await settings.getByRole('button', { name: 'Off', exact: true }).click(); await expect.poll(f.audience).toBe('off');
  await expect(settings.getByRole('button', { name: 'Review coffee stories', exact: true })).toHaveCount(0);
  await page.reload(); await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await expect(settings.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await settings.getByRole('button', { name: 'Everyone', exact: true }).click(); await expect.poll(f.audience).toBe('everyone');
});

test('a coffee story publishes immediately, opens fullscreen and can be reviewed after publication', async ({ page }, info) => {
  const f = await fixture(page, { reviewer: true }); await login(page); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  const stories = page.getByTestId('coffee-stories'); await stories.getByRole('button', { name: 'Add my story', exact: true }).click();
  const send = stories.getByRole('button', { name: 'Publish story', exact: true }); await expect(send).toBeDisabled();
  await pickPhoto(page, () => stories.getByRole('button', { name: 'Photo', exact: true }).click()); await expect(send).toBeDisabled();
  await stories.getByLabel('Story caption', { exact: true }).fill('Freshly brewed coffee');
  await stories.getByRole('checkbox').click(); await send.click();
  await expect(stories).toContainText('published for 24 hours'); await expect(stories).not.toContainText('Pending'); expect(f.stories[0].status).toBe('approved');
  await stories.getByRole('button', { name: 'Story by Coffee Owner', exact: true }).click();
  await expect(page.getByTestId('story-viewer').getByRole('img', { name: 'Freshly brewed coffee', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close story', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click(); await page.getByRole('button', { name: 'Review coffee stories', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reject: off-topic', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Approve story', exact: true }).click();
  await expect(page.getByText('All stories have been reviewed.', { exact: true })).toBeVisible(); expect(f.stories[0].status).toBe('approved');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Account', exact: true }).click(); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  await stories.getByRole('button', { name: 'Story by Coffee Owner', exact: true }).click(); await expect(page.getByTestId('story-viewer').getByRole('img', { name: 'Freshly brewed coffee', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('coffee-story-light-phone.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Delete story', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete story', exact: true }).click(); await expect.poll(() => f.stories.length).toBe(0);
});

test('fullscreen story video autoplays, pauses, resumes and advances when the clip ends', async ({ page }) => {
  await fixture(page); await login(page); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  const rail = page.getByTestId('coffee-stories');
  await rail.getByRole('button', { name: 'Add my story', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await rail.getByRole('button', { name: 'Video', exact: true }).click();
  await (await chooser).setFiles('e2e/fixtures/story-test-video.webm');
  await rail.getByRole('checkbox').click(); await rail.getByRole('button', { name: 'Publish story', exact: true }).click();
  await rail.getByRole('button', { name: 'Story by Coffee Owner', exact: true }).click();
  const viewer = page.getByTestId('story-viewer'), video = viewer.locator('video');
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await viewer.getByRole('button', { name: 'Pause story', exact: true }).click();
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  const pausedAt = await video.evaluate(v => (v as HTMLVideoElement).currentTime);
  await viewer.getByRole('button', { name: 'Play story', exact: true }).click();
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(pausedAt);
  await expect(viewer).toHaveCount(0, { timeout: 12000 });
});

test('gallery caption/file replacement and confirmed deletion retain failures and update the account', async ({ page }) => {
  const f = await fixture(page); await login(page); await selectProfileExtra(page, 'Brews & coffee corner');
  await page.getByRole('button', { name: 'Edit gallery photo', exact: true }).click();
  await page.getByLabel('Edit photo caption', { exact: true }).fill('My updated coffee corner');
  await pickPhoto(page, () => page.getByRole('button', { name: 'Replace photo', exact: true }).click());
  f.failPhoto(true); await page.getByRole('button', { name: 'Save photo changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not confirm action'); await expect(page.getByLabel('Edit photo caption', { exact: true })).toHaveValue('My updated coffee corner');
  f.failPhoto(false); await page.getByRole('button', { name: 'Save photo changes', exact: true }).click();
  await expect(page.getByRole('img', { name: 'My updated coffee corner', exact: true })).toBeVisible(); expect(f.uploads.some(u => u.bucket === 'profile-gallery')).toBe(true);
  await page.getByRole('button', { name: 'Delete gallery photo', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete photo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit gallery photo', exact: true })).toHaveCount(0);
});

test.describe('actual browser voice recording', () => {

  test('voice has an explicit send, auto-stops, and sends server-measured duration', async ({ page }) => {
    const f = await fixture(page); await login(page); await direct(page);
    await page.clock.install();
    await page.getByRole('button', { name: 'Record voice', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeDisabled();
    await page.waitForTimeout(1200); await page.clock.fastForward(60000);
    await expect(page.getByRole('button', { name: 'Discard recording', exact: true })).toBeVisible(); expect(f.messageWrites).toHaveLength(0);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect.poll(() => f.messageWrites.length).toBe(1); expect(f.messageWrites[0].kind).toBe('audio'); expect(f.messageWrites[0].duration_seconds).toBeLessThan(60);
    await expect(page.getByRole('button', { name: 'Discard recording', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Play voice', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause voice', exact: true })).toBeVisible();
    expect(f.uploads.find(u => u.bucket === 'direct-audio')!.path).toMatch(new RegExp('^' + uid + '/' + thread + '/.*\\.webm$'));
  });
});


test('video posts use a working media player and retain the uploaded WebM after navigation', async ({ page }) => {
  const f = await fixture(page); await login(page); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  await page.getByRole('button', { name: 'Open experience composer', exact: true }).click();
  const editor = page.getByTestId('community-composer'), chooser = page.waitForEvent('filechooser');
  await editor.getByRole('button', { name: 'Video', exact: true }).click(); await (await chooser).setFiles('e2e/fixtures/social-test-video.webm');
  await expect(editor.locator('video')).toHaveCount(1);
  await expect.poll(() => editor.locator('video').evaluate(el => (el as HTMLVideoElement).duration)).toBeGreaterThan(0);
  await editor.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(editor).toHaveCount(0);
  const value = f.postWrites.at(-1)!, published = page.getByTestId('community-post-' + value.p_id);
  expect(value.p_media_type).toBe('video'); await expect(published).toContainText('Video');
  await expect.poll(() => published.locator('video').evaluate(el => (el as HTMLVideoElement).duration)).toBeGreaterThan(0);
  await published.locator('video').evaluate(el => (el as HTMLVideoElement).play());
  await expect.poll(() => published.locator('video').evaluate(el => (el as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
});

test('own post pagination reaches the complete history and does not include other authors', async ({ page }) => {
  const f = await fixture(page);
  for (let n = 1; n <= 71; n++) f.posts.push({ ...f.posts[0], id: 'aaaaaaaa-aaaa-4aaa-8aaa-' + String(n).padStart(12, '0'), body: 'Historic coffee post ' + n });
  await login(page); await page.getByTestId('profile-sections').getByRole('button', { name: 'Posts', exact: true }).click();
  await expect(page.getByText('Historic coffee post 71', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Older posts', exact: true }).click();
  await expect(page.getByText('Historic coffee post 71', { exact: true })).toBeVisible();
  await expect(page.getByText('A friend’s coffee topic', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Older posts', exact: true })).toHaveCount(0);
});

test('Arabic private messages remain legible and fit a narrow dark screen', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 950 }); const f = await fixture(page); await login(page); await setLanguage(page, 'ar');
  await page.getByRole('button', { name: 'الإعدادات', exact: true }).first().click();
  await page.getByRole('button', { name: 'ليلي', exact: true }).click(); await page.getByRole('button', { name: 'تم', exact: true }).click();
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'رسائلي', exact: true }).click(); await page.getByRole('button', { name: 'Coffee Friend @friend', exact: true }).click();
  await page.getByLabel('رسالتك', { exact: true }).fill('شلون كانت نتيجة الطحن مع هالبن؟'); await page.getByRole('button', { name: 'إرسال الرسالة', exact: true }).click();
  await expect.poll(() => f.messageWrites.length).toBe(1); await expect(page.getByTestId('direct-message-' + f.messageWrites[0].id)).toContainText('شلون');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('direct-message-dark-arabic-phone.png') });
});


test('MP4 uploads remain available even when a browser lacks the H264 decoder', async ({ page }) => {
  const f = await fixture(page); await login(page); await page.getByRole('button', { name: 'coffeeHO', exact: true }).click();
  await page.getByRole('button', { name: 'Open experience composer', exact: true }).click(); const editor = page.getByTestId('community-composer');
  const chooser = page.waitForEvent('filechooser'); await editor.getByRole('button', { name: 'Video', exact: true }).click(); await (await chooser).setFiles('e2e/fixtures/social-test-video.mp4');
  const supported = await editor.locator('video').evaluate(v => Boolean((v as HTMLVideoElement).canPlayType('video/mp4; codecs="avc1.42E01E"')));
  if (supported) await expect.poll(() => editor.locator('video').evaluate(v => (v as HTMLVideoElement).duration)).toBeGreaterThan(0);
  else await expect(editor.getByRole('alert')).toContainText('could not be played on this device');
  await editor.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(editor).toHaveCount(0);
  expect(f.postWrites.at(-1)!.p_media_path).toMatch(/\.mp4$/); expect(f.postWrites.at(-1)!.p_media_type).toBe('video');
});


test('DM editing keeps original expiry, failed changes keep drafts, deletion and blocking need confirmation', async ({ page }) => {
  const f = await fixture(page); await login(page); await direct(page);
  await page.getByLabel('Your message', { exact: true }).fill('Original message');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => f.messages.length).toBe(1);
  const id = String(f.messages[0].id), expiry = f.messages[0].expires_at;
  const row = page.getByTestId('direct-message-' + id);
  await row.getByRole('button', { name: 'Message options', exact: true }).click();
  await page.getByRole('button', { name: 'Edit message', exact: true }).click();
  await page.getByLabel('Edit message text', { exact: true }).fill('Edited brewing message');
  f.failSend(true); await page.getByRole('button', { name: 'Save message changes', exact: true }).click();
  await expect(page.getByTestId('message-editor').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Edit message text', { exact: true })).toHaveValue('Edited brewing message');
  f.failSend(false); await page.getByRole('button', { name: 'Save message changes', exact: true }).click();
  await expect(row).toContainText('Edited brewing message'); await expect(row).toContainText('Edited');
  expect(f.messages[0].expires_at).toBe(expiry);
  await row.getByRole('button', { name: 'Message options', exact: true }).click();
  await page.getByRole('button', { name: 'Delete message', exact: true }).click();
  await page.getByTestId('confirm-dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(f.messages).toHaveLength(1);
  await row.getByRole('button', { name: 'Message options', exact: true }).click();
  await page.getByRole('button', { name: 'Delete message', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete message', exact: true }).click();
  await expect(row).toHaveCount(0); expect(f.messages).toHaveLength(0);
  await page.getByRole('button', { name: 'Block this member', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm block', exact: true }).click();
  await expect(page.getByLabel('Your message', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Messages are closed or available only to this account’s followers.', { exact: true })).toBeVisible();
});

test('profile extras are visible directly and the message entry is an icon above the profile', async ({ page }, info) => {
  await page.setViewportSize({ width: 1536, height: 1009 }); await fixture(page); await login(page); await setLanguage(page, 'ar');
  const primary = page.getByTestId('profile-sections');
  for (const name of ['المعدات', 'البن', 'الوصفات', 'منشوراتي', 'المزيد من أقسام الحساب']) await expect(primary.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.getByTestId('profile-extra-sections').getByRole('button', { name: 'التعليقات', exact: true })).toBeVisible();
  const inbox = page.getByRole('button', { name: 'رسائلي', exact: true }); await expect(inbox).toBeVisible();
  expect(await inbox.innerText()).toBe('');
  await page.screenshot({ path: info.outputPath('compact-account-arabic-tablet.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'المزيد', exact: true }).click();
  const menu = page.getByTestId('quick-library-menu'); await expect(menu).toBeVisible();
  expect((await menu.boundingBox())!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('compact-shortcuts-arabic-tablet.png'), animations: 'disabled' });
});
