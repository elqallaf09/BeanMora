import { additionalJapaneseLabels } from './japaneseLabels';
import {APP_LOCALES, isAppLocale, type AppLocale} from './core/app-locales';
export const SUPPORTED_LOCALES = APP_LOCALES;
export type Locale = AppLocale;
export const languageOptions: {id: Locale; label: string}[] = [
  {id:'ar',label:'العربية'}, {id:'en',label:'English'}, {id:'ja',label:'日本語'},
  {id:'fr',label:'Français'}, {id:'it',label:'Italiano'}, {id:'es',label:'Español'},
  {id:'pt-BR',label:'Português (Brasil)'}, {id:'zh-CN',label:'简体中文'},
];
export const contentLocale = (locale: Locale): 'ar' | 'en' => locale === 'ar' ? 'ar' : 'en';
export const isLocale = isAppLocale;
const languageNames: Record<Locale,readonly [string,string]> = {
  ar:['العربية','Arabic'],en:['الإنجليزية','English'],ja:['اليابانية','Japanese'],
  fr:['الفرنسية','French'],it:['الإيطالية','Italian'],es:['الإسبانية','Spanish'],
  'pt-BR':['البرتغالية البرازيلية','Brazilian Portuguese'],'zh-CN':['الصينية المبسطة','Simplified Chinese'],
};
export function languageName(locale:Locale,value:string):string {
  const names=isLocale(value)?languageNames[value]:null;
  return names?localeLabel(locale,names[0],names[1]):value;
}

// Only application-owned strings enter this translator. User content, names,
// URLs and identifiers are never intercepted in the Text component.
const ja: Record<string, string> = {
  ...additionalJapaneseLabels,
  'Home': 'ホーム', 'Discover': '見つける', 'Brew': '淹れる', 'Account': 'マイページ',
  'Settings': '設定', 'Done': '完了', 'Appearance': '表示', 'Light': 'ライト', 'Dark': 'ダーク', 'Device': '端末に合わせる', 'Language': '言語',
  'More': 'その他', 'Close': '閉じる', 'Close menu': 'メニューを閉じる', 'Choose': '選択', 'Search': '検索',
  'Coffee & tasting notes': 'コーヒーと風味', 'Recipe library': 'レシピ一覧', 'Equipment': '器具', 'Roasters': 'ロースター',
  'Coffee expert': 'コーヒーガイド', 'Capsules': 'カプセル', 'Saved recipes': '保存したレシピ', 'For you': 'おすすめ', 'Saved coffees': '保存したコーヒー',
  'Add recipe': 'レシピを追加', 'Add coffee': 'コーヒーを追加', 'My recipes': '自分のレシピ', 'My equipment': '自分の器具', 'My bags': 'コーヒー在庫', 'Roast Lab': '焙煎ラボ',
  'Open account': 'マイページを開く', 'My messages': 'メッセージ', 'Notifications': '通知', 'View all': 'すべて見る', 'All': 'すべて',
  'Discover the world of coffee.': 'コーヒーの世界を見つけよう。', 'Coffee for your next cup': '次の一杯のコーヒー', 'Tools & recommendations': '器具とおすすめ', 'Choose a brew method': '抽出方法を選ぶ',
  'Your coffee journey starts here': 'コーヒーの旅を始めよう', 'Welcome back': 'おかえりなさい',
  'Save recipes, organize your coffees, and track your brews.': 'レシピを保存し、コーヒー在庫と抽出記録を管理しましょう。',
  'Sign in to follow recipes and save your favorite beans.': 'ログインしてレシピとお気に入りのコーヒーを保存しましょう。',
  'Explore coffees and recipes right away': 'コーヒーとレシピをすぐに探せます', 'Use email sign in': 'メールでログイン', 'Create account': 'アカウントを作成',
  'Enter a valid email address.': '有効なメールアドレスを入力してください。', 'Use at least 8 characters for your password.': 'パスワードは8文字以上にしてください。',
  'Use at least 8 characters.': '8文字以上にしてください。', 'The passwords do not match.': 'パスワードが一致しません。',
  'Confirm password': 'パスワードの確認', 'Re-enter your password': 'パスワードを再入力', 'Forgot password?': 'パスワードを忘れた場合',
  'Check your email to confirm your account.': '確認メールからアカウントを有効にしてください。', 'Enter your email first.': '先にメールアドレスを入力してください。',
  'Could not complete sign-in. Please try again.': 'ログインできませんでした。もう一度お試しください。',
  'Please wait…': 'お待ちください…', 'Or continue with': 'または次の方法で続ける', 'Continue with Google': 'Googleで続ける', 'Continue with Apple': 'Appleで続ける',
  'Name': '名前', 'Username': 'ユーザー名', 'Bio': '自己紹介', 'Edit profile': 'プロフィールを編集', 'Change username': 'ユーザー名を変更',
  'Public account': '公開アカウント', 'Private account': '非公開アカウント', 'Public': '公開', 'Private': '非公開',
  'followers': 'フォロワー', 'following': 'フォロー中', 'Followers': 'フォロワー', 'Following': 'フォロー中',
  'Save profile': 'プロフィールを保存', 'Cancel editing': '編集をキャンセル', 'Name, username and profile settings updated.': 'プロフィールを更新しました。',
  'Direct message': 'ダイレクトメッセージ', 'BeanMora accounts': 'BeanMoraのアカウント', 'Search by name or username': '名前やユーザー名で検索',
  'No matching accounts.': '一致するアカウントがありません。', 'Retry accounts': '再読み込み', 'More accounts': 'さらに表示', 'Loading…': '読み込み中…',
  'Recipes': 'レシピ', 'Coffee': 'コーヒー', 'My posts': '自分の投稿', 'Favorite recipes': 'お気に入りのレシピ', 'Comments': 'コメント', 'Extraction & coffee corner': '抽出とコーヒーコーナー',
  'Follow': 'フォロー', 'Unfollow': 'フォロー解除', 'Request to follow': 'フォローをリクエスト', 'Follow request sent': 'フォローリクエスト送信済み',
  'Search this list': '一覧を検索', 'Country': '国・地域', 'Phone number': '電話番号', 'Save account details': 'アカウント情報を保存',
  'Retry loading account details': 'アカウント情報を再読み込み', 'Account details': 'アカウント情報', 'Search countries': '国・地域を検索', 'No matching countries.': '一致する国・地域がありません。',
  'Edit bio': '自己紹介を編集', 'Add a bio': '自己紹介を追加', 'Show full bio': '自己紹介をすべて表示', 'Show less': '折りたたむ',
  'Privacy policy': 'プライバシーポリシー', 'Terms of use': '利用規約', 'Updated: ': '更新日：',
  'Delete account and data': 'アカウントとデータを削除', 'Could not sign out. Please retry.': 'ログアウトできませんでした。もう一度お試しください。',
  'Save': '保存', 'Cancel': 'キャンセル', 'Delete': '削除', 'Edit': '編集', 'Retry': '再試行',
};
type PackLocale = Exclude<Locale,'ar'|'en'>;
type Pack = Record<string,string>;
const loadPack: Record<PackLocale,()=>Pack> = {
  ja:()=>require('./locales/ja.json'), fr:()=>require('./locales/fr.json'),
  it:()=>require('./locales/it.json'), es:()=>require('./locales/es.json'),
  'pt-BR':()=>require('./locales/pt-BR.json'), 'zh-CN':()=>require('./locales/zh-CN.json'),
};
const packs = new Map<PackLocale,Pack>();
const reversePacks = new Map<PackLocale,Map<string,string>>();
const importedPourTemplate = 'Water: {0} ml; source temperature: {1}; flow: {2} ml/s; pause: {3} s. Check the original link for pouring pattern.';
const patterns = new Map<PackLocale,{pattern:RegExp; slots:number[]; translation:string; importedPour:boolean}[]>();
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function translated(locale:PackLocale,text:string): string {
  let pack=packs.get(locale);if(!pack){pack=loadPack[locale]();packs.set(locale,pack);}
  if(pack[text])return pack[text];
  let templates=patterns.get(locale);
  if(!templates){
    templates=Object.entries(pack).filter(([key])=>/\{\d+\}/.test(key)).sort((a,b)=>b[0].length-a[0].length).map(([key,translation])=>{
      const slots:number[]=[];let start=0,pattern='';for(const match of key.matchAll(/\{(\d+)\}/g)){pattern+=escape(key.slice(start,match.index))+'([\\s\\S]*?)';slots.push(Number(match[1]));start=match.index!+match[0].length;}pattern+=escape(key.slice(start));return {pattern:new RegExp('^'+pattern+'$','u'),slots,translation,importedPour:key===importedPourTemplate};
    });patterns.set(locale,templates);
  }
  for(const template of templates){const match=template.pattern.exec(text);if(!match)continue;const values=new Map(template.slots.map((slot,index)=>{
    const value=match[index+1];
    // Only the importer's missing-value sentinel is translated. Numeric source
    // values and arbitrary template slots retain their original bytes.
    return [slot,template.importedPour&&value==='unspecified'?pack!['unspecified']??value:value] as const;
  }));return template.translation.replace(/\{(\d+)\}/g,(_,slot)=>values.get(Number(slot))??'');}
  return locale==='ja'?ja[text]??text:text;
}
export function localeLabel(locale: Locale, arabic: string, english: string, japanese?: string): string {
  return locale==='ar'?arabic:locale==='en'?english:locale==='ja'&&japanese?japanese:translated(locale,english);
}
export function uiMessage(locale:Locale,english:string):string {return localeLabel(locale,english,english);}
/** Reverse only registered application messages, for the assistant's buttons. */
export function englishMessage(locale:Locale,text:string):string {
  if(locale==='ar'||locale==='en')return text;
  let reverse=reversePacks.get(locale);
  if(!reverse){const pack=loadPack[locale]();reverse=new Map(Object.entries(pack).filter(([key])=>!key.includes('{')).map(([key,value])=>[value,key]));reversePacks.set(locale,reverse);}
  return reverse.get(text)??text;
}
export function localizedRecords<T extends Record<string,string>>(records:{ar:T;en:T;ja:T}):Record<Locale,T>{
  const result={...records} as Record<Locale,T>;
  for(const locale of SUPPORTED_LOCALES){
    if(locale in records)continue;
    Object.defineProperty(result,locale,{enumerable:true,configurable:true,get(){
      const value=Object.fromEntries(Object.entries(records.en).map(([key,text])=>[key,uiMessage(locale,text)])) as T;
      Object.defineProperty(result,locale,{value,enumerable:true});return value;
    }});
  }
  return result;
}
/** Localization of composed system replies is bounded to registered messages. */
export function systemText(locale:Locale,text:string):string {
  if(locale==='ar'||locale==='en')return text;
  const exact=uiMessage(locale,text);if(exact!==text)return exact;
  return text.split('\n').map(line=>{
    const bullet=line.match(/^(\s*•\s*)(.*)$/);const body=bullet?bullet[2]:line;
    const direct=uiMessage(locale,body);if(direct!==body)return (bullet?.[1]??'')+direct;
    const colon=body.indexOf(': ');if(colon>0){const label=body.slice(0,colon);const translated=uiMessage(locale,label);if(translated!==label)return (bullet?.[1]??'')+translated+body.slice(colon);}
    return line;
  }).join('\n');
}
