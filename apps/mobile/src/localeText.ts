import { additionalJapaneseLabels } from './japaneseLabels';
export type Locale = 'ar' | 'en' | 'ja';
export const contentLocale = (locale: Locale): 'ar' | 'en' => locale === 'ar' ? 'ar' : 'en';
export const isLocale = (value: unknown): value is Locale => value === 'ar' || value === 'en' || value === 'ja';

// Initial Japanese interface. Original catalog / community content retains its source language.
// Labels are translated at the call site, never by rewriting user text in the Text component.
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
  'Direct message': 'ダイレクトメッセージ', 'coffeeHO accounts': 'coffeeHOのアカウント', 'Search by name or username': '名前やユーザー名で検索',
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
export function localeLabel(locale: Locale, arabic: string, english: string, japanese?: string): string {
  return locale === 'ar' ? arabic : locale === 'ja' ? japanese ?? ja[english] ?? english : english;
}
