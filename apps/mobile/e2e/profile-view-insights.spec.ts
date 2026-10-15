import { test, expect, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { setLanguage } from './settings';
const uid = '11111111-1111-4111-8111-111111111111', friendId = '22222222-2222-4222-8222-222222222222';
const ownStory = '33333333-3333-4333-8333-333333333333', photoStory = '44444444-4444-4444-8444-444444444444', videoStory = '55555555-5555-4555-8555-555555555555';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'views@example.test', is_anonymous: false, app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' };
const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
const token = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub: uid, role: 'authenticated', is_anonymous: false, exp: Math.floor(Date.now()/1000)+3600 })}.isolated_signature`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
async function fixture(page: Page) {
  const profile = { id: uid, name: 'Coffee Owner', username: 'owner', bio: '', avatar_url: null, is_private: false, share_collection: false, hide_followers: false, hide_following: false };
  const friend = { id: friendId, name: 'Coffee Visitor', username: 'visitor', avatar_url: null, is_private: false };
  const stories = [ownStory, photoStory, videoStory].map((id, i) => ({ id, user_id: i ? friendId : uid, media_path: (i ? friendId : uid) + '/' + id + (i === 2 ? '.webm' : '.png'), media_type: i === 2 ? 'video' : 'image', category: 'coffee', caption: i ? 'Visitor coffee story' : 'Owner coffee story', status: 'approved', created_at: new Date(Date.now() + i).toISOString(), expires_at: new Date(Date.now()+86400000).toISOString(), review_reason: null }));
  const visits: string[] = [], views: string[] = [], exchanges: Record<string, unknown>[] = [];
  const reply = (r: Route, data: unknown, count?: number) => r.fulfill({ status: 200, contentType: 'application/json', headers: count === undefined ? {} : { 'content-range': `0-${Math.max(0,count-1)}/${count}`, 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(data) });
  await page.route('https://mobilefixture.supabase.co/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname, method = route.request().method();
    if (path.endsWith('/settings')) return reply(route, { external: { google: true, apple: false } });
    if (path.endsWith('/token')) { if (url.searchParams.get('grant_type') === 'pkce') exchanges.push(route.request().postDataJSON()); return reply(route, { access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user }); }
    if (path.endsWith('/user')) return reply(route, user);
    if (path.endsWith('/profiles')) { if (method === 'PATCH') { Object.assign(profile,route.request().postDataJSON()); return reply(route,{id:uid}); } return reply(route, url.searchParams.get('select') === 'username' ? { username: 'owner' } : [profile,friend]); }
    if (path.endsWith('/rpc/get_member_profile')) { const own = route.request().postDataJSON().p_username === 'owner'; return reply(route,{profile:own?profile:friend,is_owner:own,can_view:true,relationship:'accepted',can_view_followers:own,can_view_following:own,follower_count:own?1:null,following_count:own?1:null,followers:own?[friend]:[],following:own?[friend]:[],equipment:[],beans:[],recipes:[],favorites:[],comments:[],photos:[]}); }
    if (path.endsWith('/rpc/search_member_profiles')) return reply(route,[friend]);
    if (path.endsWith('/rpc/record_profile_visit')) { visits.push(route.request().postDataJSON().p_profile_id); return reply(route,true); }
    if (path.endsWith('/rpc/record_coffee_story_view')) { views.push(route.request().postDataJSON().p_story_id); return reply(route,true); }
    if (path.endsWith('/profile_visits') || path.endsWith('/coffee_story_views')) return reply(route,[{ member: friend, viewed_at: new Date().toISOString() }],1);
    if (path.endsWith('/coffee_stories')) return reply(route, stories);
    if (path.startsWith('/storage/v1/object/sign/coffee-stories/')) return reply(route,{signedURL:'/object/sign/fixture/' + (path.endsWith('.webm') ? 'video.webm':'photo.png')});
    if (path.endsWith('/storage/v1/object/sign/fixture/photo.png')) return route.fulfill({contentType:'image/png',body:png});
    if (path.endsWith('/storage/v1/object/sign/fixture/video.webm')) return route.fulfill({contentType:'video/webm',body:readFileSync('e2e/fixtures/story-test-video.webm')});
    return reply(route,[]);
  });
  return { visits,views,exchanges,profile };
}
async function login(page: Page, ar = false) {
  await page.goto('/'); await setLanguage(page, ar ? 'ar' : 'en');
  await page.getByRole('button',{name:ar?'فتح حسابي':'Open account',exact:true}).click();
  await page.getByLabel(ar?'البريد الإلكتروني':'Email',{exact:true}).fill(user.email);
  await page.getByLabel(ar?'كلمة المرور':'Password',{exact:true}).fill('fixture-password');
  await page.getByRole('button',{name:ar?'تسجيل الدخول':'Sign in',exact:true}).click();
  await expect(page.getByTestId('member-profile')).toBeVisible();
}
test('Google callback survives an invalid prior session, completes once and cleans its address', async ({ page }) => {
  const f = await fixture(page);
  await page.addInitScript(() => {
    if (location.search === '?code=google-callback') {
      localStorage.setItem('sb-mobilefixture-auth-token', JSON.stringify({stale:true}));
      localStorage.setItem('sb-mobilefixture-auth-token-code-verifier', JSON.stringify('saved-browser-proof'));
    }
  });
  await page.goto('/');
  await page.goto('/?code=google-callback');
  await expect.poll(()=>f.exchanges.length).toBe(1);
  expect(f.exchanges[0]).toEqual({auth_code:'google-callback',code_verifier:'saved-browser-proof'});
  await expect(page).toHaveURL('http://127.0.0.1:8088/');
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sb-mobilefixture-auth-token-code-verifier'))).toBeNull();
});
test('Google starts only after expired-session recovery, keeping the generated proof through redirect', async ({page}) => {
  const f = await fixture(page);
  let refreshStarted = false, finishRefresh: (() => void) | undefined, challenge = '';
  const waitForRefresh = new Promise<void>(resolve => { finishRefresh = resolve; });
  await page.addInitScript(({token,user}) => {
    if (!location.search) localStorage.setItem('sb-mobilefixture-auth-token',JSON.stringify({access_token:token,refresh_token:'stale-refresh',expires_at:Math.floor(Date.now()/1000)-10,token_type:'bearer',user}));
  },{token,user});
  await page.route('https://mobilefixture.supabase.co/auth/v1/token?grant_type=refresh_token',async route => {
    refreshStarted = true; await waitForRefresh;
    await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'invalid_grant',error_description:'stale fixture refresh token'})});
  });
  await page.route('https://mobilefixture.supabase.co/auth/v1/authorize**',async route => {
    challenge = new URL(route.request().url()).searchParams.get('code_challenge') ?? '';
    await route.fulfill({status:302,headers:{location:'http://127.0.0.1:8088/?code=after-recovery'}});
  });
  await page.goto('/'); await expect.poll(()=>refreshStarted).toBe(true);
  await setLanguage(page,'en');
  await page.getByRole('button',{name:'Open account',exact:true}).click();
  await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
  expect(challenge).toBe(''); // Old cleanup is still outstanding; no proof is generated yet.
  finishRefresh!();
  await expect.poll(()=>f.exchanges.length).toBe(1);
  expect(challenge).not.toBe('');
  expect(String(f.exchanges[0].code_verifier).length).toBeGreaterThanOrEqual(43);
  await expect(page).toHaveURL('http://127.0.0.1:8088/');
});
for (const ar of [false,true]) test(`independent list privacy, unique header links and owner visitors (${ar?'ar':'en'})`, async ({page}, info) => {
  await page.setViewportSize({width:ar?1536:390,height:950});
  const f = await fixture(page); await login(page,ar);
  const profile = page.getByTestId('member-profile'), sections = page.getByTestId('profile-sections');
  await expect(sections.getByRole('button')).toHaveCount(7);
  for (const name of ar?['المتابعون','أتابع']:['Followers','Following']) await expect(sections.getByRole('button',{name,exact:true})).toHaveCount(0);
  await profile.getByRole('button',{name:ar?'تعديل الملف':'Edit profile',exact:true}).click();
  await page.getByRole('checkbox',{name:ar?'إخفاء المتابعين':'Hide followers',exact:true}).click();
  await page.getByRole('button',{name:ar?'حفظ الملف':'Save profile',exact:true}).click();
  await expect.poll(()=>f.profile.hide_followers).toBe(true); expect(f.profile.hide_following).toBe(false);
  await page.getByTestId('profile-visitors').click();
  await expect(page.getByTestId('view-insights-count')).toContainText('1');
  await expect(page.getByTestId('view-insights-panel').getByText('@visitor',{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath(`profile-visitors-${ar?'ar':'en'}.png`)});
  await page.getByRole('button',{name:ar?'إغلاق المشاهدين':'Close viewers',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('only owners see viewer names; photo and video playback record once without self-views', async ({page}, info) => {
  const f=await fixture(page);await login(page);
  await page.getByRole('button',{name:'BeanMora',exact:true}).click();
  await page.getByRole('button',{name:'Story by Coffee Owner',exact:true}).click();
  await page.getByTestId('story-view-count').click();
  await expect(page.getByTestId('view-insights-panel').getByText('@visitor',{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('story-owner-viewers.png')});
  expect(f.views).not.toContain(ownStory);
  await page.getByRole('button',{name:'Close viewers',exact:true}).click();
  await page.getByRole('button',{name:'Close story',exact:true}).click();
  await page.getByRole('button',{name:'Story by Coffee Visitor',exact:true}).click();
  await expect.poll(()=>f.views.filter(id=>id===photoStory).length).toBe(1);
  await expect(page.getByTestId('story-view-count')).toHaveCount(0);
  await page.getByRole('button',{name:'Next story',exact:true}).click();
  await expect.poll(()=>f.views.filter(id=>id===videoStory).length).toBe(1);
  await page.getByRole('button',{name:'Close story',exact:true}).click();
  await page.getByRole('button',{name:'BeanMora accounts',exact:true}).click();
  await page.getByRole('button',{name:'Coffee Visitor @visitor',exact:true}).click();
  await expect.poll(()=>f.visits).toEqual([friendId]);
  await expect(page.getByTestId('profile-visitors')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'followers · Private',exact:true})).toBeDisabled();
});
