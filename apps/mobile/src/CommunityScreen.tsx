import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { supabase } from './client';
import type { RecipeItem } from './data';
import { Language, Txt, Icon, colors, styles } from './ui';

type PostRow={id:string;user_id:string;recipe_id:string|null;body:string|null;created_at:string};
type ProfileRow={id:string;name:string;username:string;country:string|null};
type LikeRow={post_id:string;user_id:string};

export function CommunityScreen({userId,recipes,login}:{userId:string|null;recipes:RecipeItem[];login:()=>void}) {
  const locale=useContext(Language); const ar=locale==='ar';
  const [posts,setPosts]=useState<PostRow[]>([]); const [profiles,setProfiles]=useState<Record<string,ProfileRow>>({});
  const [likes,setLikes]=useState<LikeRow[]>([]); const [filter,setFilter]=useState<string>('all');
  const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [body,setBody]=useState(''); const [sending,setSending]=useState(false);
  const load=async()=>{if(!supabase)return;setLoading(true);setError('');
    try{
      const {data:postRows,error:postError}=await supabase.from('posts').select('id,user_id,recipe_id,body,created_at').eq('visibility','public').eq('is_hidden',false).order('created_at',{ascending:false}).limit(60);
      if(postError)throw postError;
      const rows=(postRows??[]) as PostRow[];setPosts(rows);
      const ids=[...new Set(rows.map(p=>p.user_id))];if(ids.length){const {data:profileRows}=await supabase.from('profiles').select('id,name,username,country').in('id',ids);const map:Record<string,ProfileRow>={};for(const p of (profileRows??[]) as ProfileRow[])map[p.id]=p;setProfiles(map);}else setProfiles({});
      const postIds=rows.map(p=>p.id);if(postIds.length){const {data:likeRows}=await supabase.from('post_likes').select('post_id,user_id').in('post_id',postIds);setLikes((likeRows??[]) as LikeRow[]);}else setLikes([]);
    }catch{setError(ar?'تعذّر تحميل المجتمع.':'Could not load community.');}finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[ar]);

  const methods=useMemo(()=>['all',...new Set(posts.map(p=>p.recipe_id?recipes.find(r=>r.id===p.recipe_id)?.method:null).filter((v):v is string=>Boolean(v)))],[posts,recipes]);
  const visible=useMemo(()=>posts.filter(p=>filter==='all'||(p.recipe_id&&recipes.find(r=>r.id===p.recipe_id)?.method===filter)),[posts,recipes,filter]);
  const likeCount=(postId:string)=>likes.filter(l=>l.post_id===postId).length;
  const liked=(postId:string)=>!!userId&&likes.some(l=>l.post_id===postId&&l.user_id===userId);
  const toggleLike=async(postId:string)=>{if(!userId||!supabase){login();return;}const active=liked(postId);setLikes(current=>active?current.filter(l=>!(l.post_id===postId&&l.user_id===userId)):[...current,{post_id:postId,user_id:userId}]);const result=active?await supabase.from('post_likes').delete().eq('post_id',postId).eq('user_id',userId):await supabase.from('post_likes').insert({post_id:postId,user_id:userId});if(result.error)void load();};
  const publish=async()=>{const text=body.trim();if(!text)return;if(!userId||!supabase){login();return;}setSending(true);const {error}=await supabase.from('posts').insert({user_id:userId,body:text,content_language:locale,visibility:'public',is_hidden:false});setSending(false);if(error){setError(ar?'تعذّر نشر التجربة.':'Could not publish your experience.');return;}setBody('');void load();};

  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.header}><View style={{flex:1}}><Txt heading style={styles.title}>{ar?'مجتمع القهوة':'Coffee community'}</Txt><Txt style={styles.muted}>{ar?'تجارب حقيقية من مستخدمين شاركوها باختيارهم.':'Real experiences shared by users who chose to publish them.'}</Txt></View><View style={s.icon}><Icon name="globe" size={28} color={colors.copper}/></View></View>
    <View style={s.compose}><Txt style={s.composeTitle}>{ar?'شارك تجربتك':'Share your brew'}</Txt><TextInput accessibilityLabel={ar?'اكتب تجربتك':'Write your experience'} multiline value={body} onChangeText={setBody} placeholder={ar?'شنو ضبط معاك؟ شنو غيرت؟':'What worked? What did you change?'} placeholderTextColor={colors.muted} style={[s.input,{textAlign:ar?'right':'left',writingDirection:ar?'rtl':'ltr'}]}/><Pressable accessibilityRole="button" onPress={()=>void publish()} disabled={sending||!body.trim()} style={[s.publish,(sending||!body.trim())&&{opacity:.45}]}><Txt style={s.publishText}>{sending?(ar?'جاري النشر...':'Publishing...'):(ar?'انشر التجربة':'Publish')}</Txt></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{methods.map(m=><Pressable key={m} accessibilityRole="button" accessibilityState={{selected:filter===m}} onPress={()=>setFilter(m)} style={[s.filter,filter===m&&s.filterActive]}><Txt style={[s.filterText,filter===m&&{color:'#FFF'}]}>{m==='all'?(ar?'الكل':'All'):m.toUpperCase()}</Txt></Pressable>)}</ScrollView>
    {loading?<ActivityIndicator color={colors.teal}/>:error&&!posts.length?<Txt style={styles.error}>{error}</Txt>:visible.length?<View style={s.feed}>{visible.map(post=>{const profile=profiles[post.user_id];const recipe=post.recipe_id?recipes.find(r=>r.id===post.recipe_id):null;return <View key={post.id} style={s.post}><View style={s.authorRow}><View style={s.avatar}><Txt style={s.avatarText}>{(profile?.name??profile?.username??'?').slice(0,1).toUpperCase()}</Txt></View><View style={{flex:1}}><Txt style={s.author}>{profile?.name??profile?.username??(ar?'مستخدم BeanMora':'BeanMora user')}</Txt><Txt style={styles.muted}>{[profile?.country,recipe?.method?.toUpperCase()].filter(Boolean).join(' · ')}</Txt></View></View>{recipe?<View style={s.recipe}><Icon name="bean" size={18} color={colors.copper}/><View style={{flex:1}}><Txt numberOfLines={1} style={s.recipeTitle}>{recipe.title}</Txt><Txt style={styles.muted}>{ar?'وصفة مرتبطة بالتجربة':'Recipe linked to this post'}</Txt></View></View>:null}{post.body?<Txt style={s.body}>{post.body}</Txt>:null}<View style={s.postFooter}><Pressable accessibilityRole="button" accessibilityLabel={ar?'إعجاب':'Like'} accessibilityState={{selected:liked(post.id)}} onPress={()=>void toggleLike(post.id)} style={s.like}><Icon name="heart" size={19} color={liked(post.id)?colors.teal:colors.muted} filled={liked(post.id)}/><Txt style={s.likeText}>{likeCount(post.id)}</Txt></Pressable><Txt style={styles.muted}>{new Date(post.created_at).toLocaleDateString(locale+'-u-nu-latn')}</Txt></View></View>})}</View>:<View style={s.empty}><Txt style={s.emptyTitle}>{ar?'ما في مشاركات بهالفلتر للحين':'No posts in this filter yet'}</Txt><Txt style={styles.muted}>{ar?'أول تجربة تنشرها ممكن تكون البداية.':'Your first shared brew could start the conversation.'}</Txt></View>}
    {error&&posts.length?<Txt style={styles.warning}>{error}</Txt>:null}
  </ScrollView>;
}

const s=StyleSheet.create({
  page:{width:'100%',maxWidth:850,alignSelf:'center',paddingHorizontal:18,paddingTop:14,paddingBottom:30,gap:14},
  header:{flexDirection:'row',alignItems:'center',gap:12},
  icon:{width:56,height:56,borderRadius:28,backgroundColor:'#F2E7D8',alignItems:'center',justifyContent:'center'},
  compose:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:14,gap:10},
  composeTitle:{fontSize:16,lineHeight:23,fontWeight:'800'},
  input:{minHeight:92,maxHeight:180,borderWidth:1,borderColor:colors.line,borderRadius:15,backgroundColor:'#F9F6F0',padding:12,fontSize:15,color:colors.ink,textAlignVertical:'top'},
  publish:{alignSelf:'flex-start',backgroundColor:colors.teal,borderRadius:13,minHeight:43,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},
  publishText:{color:'#FFF',fontSize:12,lineHeight:18,fontWeight:'800'},
  filters:{gap:8,paddingBottom:2},
  filter:{minHeight:39,paddingHorizontal:15,borderRadius:999,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,alignItems:'center',justifyContent:'center'},
  filterActive:{backgroundColor:colors.brown,borderColor:colors.brown},
  filterText:{fontSize:11,lineHeight:17,fontWeight:'800'},
  feed:{gap:10},
  post:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:14,gap:11},
  authorRow:{flexDirection:'row',alignItems:'center',gap:10},
  avatar:{width:42,height:42,borderRadius:21,backgroundColor:'#EDE1D4',alignItems:'center',justifyContent:'center'},
  avatarText:{fontSize:16,lineHeight:22,fontWeight:'800',color:colors.brown},
  author:{fontSize:14,lineHeight:21,fontWeight:'800'},
  recipe:{flexDirection:'row',gap:9,alignItems:'center',backgroundColor:'#F5EBDD',borderRadius:14,padding:10},
  recipeTitle:{fontSize:13,lineHeight:19,fontWeight:'800'},
  body:{fontSize:14,lineHeight:23},
  postFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  like:{flexDirection:'row',alignItems:'center',gap:5,minHeight:38},
  likeText:{fontSize:12,lineHeight:18,fontWeight:'800',color:colors.muted},
  empty:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:22,gap:7,alignItems:'center'},
  emptyTitle:{fontSize:16,lineHeight:23,fontWeight:'800',textAlign:'center'},
});
