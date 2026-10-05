import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { supabase } from './client';
import type { CoffeeItem, RecipeItem } from './data';
import { CoffeePhoto } from './CoffeeScreens';
import { Language, Txt, Icon, colors, styles } from './ui';

type PostRow={id:string;user_id:string;recipe_id:string|null;brew_log_id:string|null;bean_id:string|null;brew_method:string|null;dose_grams:number|null;water_grams:number|null;actual_time_seconds:number|null;outcome:string|null;body:string|null;created_at:string};
type BrewRow={id:string;recipe_id:string|null;bean_id:string|null;brew_method:string|null;dose_grams:number|null;water_grams:number|null;actual_time_seconds:number|null;outcome_submission:unknown;created_at:string};
type ProfileRow={id:string;name:string;username:string;country:string|null};
type LikeRow={post_id:string;user_id:string};
type CommentRow={id:string;post_id:string;user_id:string;body:string;created_at:string};
const brewOutcome=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).outcome==='string'?String((value as Record<string,unknown>).outcome):null;
const timeLabel=(v:number|null)=>!v?'—':v>=60?Math.floor(v/60)+':'+String(v%60).padStart(2,'0'):v+'s';
const outcomeLabel=(value:string|null,ar:boolean)=>value==='excellent'?(ar?'ممتازة':'Excellent'):value==='good'?(ar?'جيدة':'Good'):value==='needs_adjustment'?(ar?'تحتاج تعديل':'Needs adjustment'):value==='poor'?(ar?'غير مرضية':'Poor'):'—';

export function CommunityScreen({userId,recipes,coffees,login}:{userId:string|null;recipes:RecipeItem[];coffees:CoffeeItem[];login:()=>void}) {
  const locale=useContext(Language); const ar=locale==='ar';
  const [posts,setPosts]=useState<PostRow[]>([]); const [profiles,setProfiles]=useState<Record<string,ProfileRow>>({});
  const [likes,setLikes]=useState<LikeRow[]>([]); const [comments,setComments]=useState<CommentRow[]>([]); const [recentBrews,setRecentBrews]=useState<BrewRow[]>([]); const [selectedBrew,setSelectedBrew]=useState<string|null>(null);
  const [commentsOpen,setCommentsOpen]=useState<string|null>(null); const [commentText,setCommentText]=useState(''); const [commentBusy,setCommentBusy]=useState(false);
  const [filter,setFilter]=useState<string>('all'); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [body,setBody]=useState(''); const [sending,setSending]=useState(false);

  const load=async()=>{if(!supabase)return;setLoading(true);setError('');
    try{
      const {data:postRows,error:postError}=await supabase.from('posts').select('id,user_id,recipe_id,brew_log_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome,body,created_at').eq('visibility','public').eq('is_hidden',false).order('created_at',{ascending:false}).limit(60);
      if(postError)throw postError;const rows=(postRows??[]) as PostRow[];setPosts(rows);
      const postIds=rows.map(p=>p.id);
      let commentRows:CommentRow[]=[];
      if(postIds.length){
        const [likeResult,commentResult]=await Promise.all([
          supabase.from('post_likes').select('post_id,user_id').in('post_id',postIds),
          supabase.from('comments').select('id,post_id,user_id,body,created_at').in('post_id',postIds).is('parent_comment_id',null).eq('is_hidden',false).order('created_at',{ascending:true}).limit(300),
        ]);
        setLikes((likeResult.data??[]) as LikeRow[]);
        commentRows=(commentResult.data??[]) as CommentRow[];
        setComments(commentRows);
      }else{setLikes([]);setComments([]);}
      const ids=[...new Set([...rows.map(p=>p.user_id),...commentRows.map(row=>row.user_id)])];
      if(ids.length){const {data:profileRows}=await supabase.from('profiles').select('id,name,username,country').in('id',ids);const map:Record<string,ProfileRow>={};for(const p of (profileRows??[]) as ProfileRow[])map[p.id]=p;setProfiles(map);}else setProfiles({});
      if(userId){const {data:brewRows}=await supabase.from('brew_logs').select('id,recipe_id,bean_id,brew_method,dose_grams,water_grams,actual_time_seconds,outcome_submission,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(12);setRecentBrews((brewRows??[]) as BrewRow[]);}else setRecentBrews([]);
    }catch{setError(ar?'تعذّر تحميل المجتمع.':'Could not load community.');}finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[ar,userId]);

  const methods=useMemo(()=>{const values=new Set<string>();for(const post of posts){const method=post.brew_method||(post.recipe_id?recipes.find(r=>r.id===post.recipe_id)?.method:null);if(method)values.add(method);}return ['all',...values];},[posts,recipes]);
  const visible=useMemo(()=>posts.filter(p=>filter==='all'||p.brew_method===filter||(p.recipe_id&&recipes.find(r=>r.id===p.recipe_id)?.method===filter)),[posts,recipes,filter]);
  const likeCount=(postId:string)=>likes.filter(l=>l.post_id===postId).length;
  const commentRows=(postId:string)=>comments.filter(row=>row.post_id===postId);
  const liked=(postId:string)=>!!userId&&likes.some(l=>l.post_id===postId&&l.user_id===userId);
  const toggleLike=async(postId:string)=>{if(!userId||!supabase){login();return;}const active=liked(postId);setLikes(current=>active?current.filter(l=>!(l.post_id===postId&&l.user_id===userId)):[...current,{post_id:postId,user_id:userId}]);const result=active?await supabase.from('post_likes').delete().eq('post_id',postId).eq('user_id',userId):await supabase.from('post_likes').insert({post_id:postId,user_id:userId});if(result.error)void load();};
  const sendComment=async(postId:string)=>{const text=commentText.trim();if(!text)return;if(!userId||!supabase){login();return;}setCommentBusy(true);const {error}=await supabase.from('comments').insert({user_id:userId,post_id:postId,recipe_id:null,parent_comment_id:null,body:text,content_language:locale,is_hidden:false});setCommentBusy(false);if(error){setError(ar?'تعذّر إرسال التعليق.':'Could not send comment.');return;}setCommentText('');void load();};

  const publish=async()=>{if(!userId||!supabase){login();return;}const text=body.trim();const brew=recentBrews.find(b=>b.id===selectedBrew)??null;if(!text&&!brew?.recipe_id)return;
    setSending(true);setError('');
    const payload={user_id:userId,body:text||null,content_language:locale,visibility:'public',is_hidden:false,recipe_id:brew?.recipe_id??null,brew_log_id:brew?.id??null,bean_id:brew?.bean_id??null,brew_method:brew?.brew_method??null,dose_grams:brew?.dose_grams??null,water_grams:brew?.water_grams??null,actual_time_seconds:brew?.actual_time_seconds??null,outcome:brew?brewOutcome(brew.outcome_submission):null};
    const {error}=await supabase.from('posts').insert(payload);setSending(false);if(error){setError(ar?'تعذّر نشر التجربة.':'Could not publish your experience.');return;}setBody('');setSelectedBrew(null);void load();
  };

  const brewTitle=(brew:BrewRow)=>{const recipe=brew.recipe_id?recipes.find(r=>r.id===brew.recipe_id):null;const coffee=brew.bean_id?coffees.find(c=>(c.beanId??c.id)===brew.bean_id):null;return coffee?.name??recipe?.discovery?.coffeeName??recipe?.title??brew.brew_method??(ar?'تحضير محفوظ':'Saved brew');};

  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.header}><View style={{flex:1}}><Txt heading style={styles.title}>{ar?'مجتمع القهوة':'Coffee community'}</Txt><Txt style={styles.muted}>{ar?'شارك التجربة نفسها: البن والوصفة والمقادير والنتيجة، مو مجرد كلام منفصل.':'Share the actual brew: coffee, recipe, amounts and result.'}</Txt></View><View style={s.icon}><Icon name="globe" size={28} color={colors.copper}/></View></View>

    <View style={s.compose}><Txt style={s.composeTitle}>{ar?'شارك تجربتك':'Share your brew'}</Txt>{userId&&recentBrews.length?<><Txt style={styles.muted}>{ar?'اختَر تحضيرًا محفوظًا لإرفاق بياناته بالمنشور:':'Choose a saved brew to attach its data:'}</Txt><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.brewPicker}>{recentBrews.slice(0,8).map(brew=><Pressable key={brew.id} accessibilityRole="button" accessibilityState={{selected:selectedBrew===brew.id}} onPress={()=>setSelectedBrew(v=>v===brew.id?null:brew.id)} style={[s.brewPick,selectedBrew===brew.id&&s.brewPickActive]}><Txt numberOfLines={1} style={[s.brewPickTitle,selectedBrew===brew.id&&{color:'#FFF'}]}>{brewTitle(brew)}</Txt><Txt style={[s.brewPickMeta,selectedBrew===brew.id&&{color:'#E9F6F4'}]}>{[brew.dose_grams?brew.dose_grams+'g':null,brew.water_grams?brew.water_grams+'g':null,timeLabel(brew.actual_time_seconds)].filter(Boolean).join(' · ')}</Txt></Pressable>)}</ScrollView></>:null}
      <TextInput accessibilityLabel={ar?'اكتب تجربتك':'Write your experience'} multiline value={body} onChangeText={setBody} placeholder={ar?'شنو ضبط معاك؟ شنو غيرت؟':'What worked? What did you change?'} placeholderTextColor={colors.muted} style={[s.input,{textAlign:ar?'right':'left',writingDirection:ar?'rtl':'ltr'}]}/>
      <Pressable accessibilityRole="button" onPress={()=>void publish()} disabled={sending||(!body.trim()&&!selectedBrew)} style={[s.publish,(sending||(!body.trim()&&!selectedBrew))&&{opacity:.45}]}><Txt style={s.publishText}>{sending?(ar?'جاري النشر...':'Publishing...'):(ar?'انشر التجربة':'Publish')}</Txt></Pressable>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{methods.map(m=><Pressable key={m} accessibilityRole="button" accessibilityState={{selected:filter===m}} onPress={()=>setFilter(m)} style={[s.filter,filter===m&&s.filterActive]}><Txt style={[s.filterText,filter===m&&{color:'#FFF'}]}>{m==='all'?(ar?'الكل':'All'):m.toUpperCase()}</Txt></Pressable>)}</ScrollView>

    {loading?<ActivityIndicator color={colors.teal}/>:error&&!posts.length?<Txt style={styles.error}>{error}</Txt>:visible.length?<View style={s.feed}>{visible.map(post=>{const profile=profiles[post.user_id];const recipe=post.recipe_id?recipes.find(r=>r.id===post.recipe_id):null;const coffee=post.bean_id?coffees.find(c=>(c.beanId??c.id)===post.bean_id):null;return <View key={post.id} style={s.post}>
      <View style={s.authorRow}><View style={s.avatar}><Txt style={s.avatarText}>{(profile?.name??profile?.username??'?').slice(0,1).toUpperCase()}</Txt></View><View style={{flex:1}}><Txt style={s.author}>{profile?.name??profile?.username??(ar?'مستخدم BeanMora':'BeanMora user')}</Txt><Txt style={styles.muted}>{[profile?.country,post.brew_method?.toUpperCase()||recipe?.method?.toUpperCase()].filter(Boolean).join(' · ')}</Txt></View></View>
      {post.brew_log_id?<View style={s.sharedBrew}><View style={s.sharedTop}>{coffee?<View style={s.sharedPhoto}><CoffeePhoto uri={coffee.imageUrl} uris={coffee.images} kind={coffee.imageKind}/></View>:<Icon name="bean" size={19} color={colors.copper}/>}<View style={{flex:1}}><Txt numberOfLines={1} style={s.recipeTitle}>{coffee?.name??recipe?.discovery?.coffeeName??recipe?.title??(ar?'تحضير محفوظ':'Saved brew')}</Txt>{coffee?.roaster?<Txt numberOfLines={1} style={styles.muted}>{coffee.roaster}</Txt>:recipe?<Txt numberOfLines={1} style={styles.muted}>{recipe.title}</Txt>:null}</View><Txt style={s.outcome}>{outcomeLabel(post.outcome,ar)}</Txt></View><View style={s.metrics}><Metric value={post.dose_grams?post.dose_grams+' g':'—'} label={ar?'بن':'Dose'}/><Metric value={post.water_grams?post.water_grams+' g':'—'} label={ar?'ماء':'Water'}/><Metric value={timeLabel(post.actual_time_seconds)} label={ar?'وقت':'Time'}/><Metric value={post.brew_method??recipe?.method??'—'} label={ar?'طريقة':'Method'}/></View></View>:recipe?<View style={s.recipe}><Icon name="bean" size={18} color={colors.copper}/><View style={{flex:1}}><Txt numberOfLines={1} style={s.recipeTitle}>{recipe.title}</Txt><Txt style={styles.muted}>{ar?'وصفة مرتبطة بالتجربة':'Recipe linked to this post'}</Txt></View></View>:null}
      {post.body?<Txt style={s.body}>{post.body}</Txt>:null}
      <View style={s.postFooter}><View style={s.socialActions}><Pressable accessibilityRole="button" accessibilityLabel={ar?'إعجاب':'Like'} accessibilityState={{selected:liked(post.id)}} onPress={()=>void toggleLike(post.id)} style={s.like}><Icon name="heart" size={19} color={liked(post.id)?colors.teal:colors.muted} filled={liked(post.id)}/><Txt style={s.likeText}>{likeCount(post.id)}</Txt></Pressable><Pressable accessibilityRole="button" accessibilityLabel={ar?'التعليقات':'Comments'} accessibilityState={{expanded:commentsOpen===post.id}} onPress={()=>{setCommentsOpen(value=>value===post.id?null:post.id);setCommentText('');}} style={s.like}><Icon name="more" size={19} color={colors.muted}/><Txt style={s.likeText}>{commentRows(post.id).length}</Txt></Pressable></View><Txt style={styles.muted}>{new Date(post.created_at).toLocaleDateString(locale+'-u-nu-latn')}</Txt></View>
      {commentsOpen===post.id?<View style={s.commentsBox}>{commentRows(post.id).slice(-5).map(comment=><View key={comment.id} style={s.commentRow}><View style={s.commentAvatar}><Txt style={s.commentAvatarText}>{(profiles[comment.user_id]?.name??profiles[comment.user_id]?.username??'?').slice(0,1).toUpperCase()}</Txt></View><View style={{flex:1}}><Txt style={s.commentAuthor}>{profiles[comment.user_id]?.name??profiles[comment.user_id]?.username??(ar?'مستخدم BeanMora':'BeanMora user')}</Txt><Txt style={s.commentBody}>{comment.body}</Txt></View></View>)}<View style={s.commentComposer}><TextInput accessibilityLabel={ar?'اكتب تعليقًا':'Write a comment'} value={commentText} onChangeText={setCommentText} placeholder={ar?'اكتب تعليق…':'Write a comment…'} placeholderTextColor={colors.muted} style={[s.commentInput,{textAlign:ar?'right':'left'}]}/><Pressable accessibilityRole="button" accessibilityLabel={ar?'إرسال التعليق':'Send comment'} disabled={commentBusy||!commentText.trim()} onPress={()=>void sendComment(post.id)} style={[s.commentSend,(commentBusy||!commentText.trim())&&{opacity:.45}]}><Icon name="arrow" size={18} color="#FFF"/></Pressable></View></View>:null}
    </View>})}</View>:<View style={s.empty}><Txt style={s.emptyTitle}>{ar?'ما في مشاركات بهالفلتر للحين':'No posts in this filter yet'}</Txt><Txt style={styles.muted}>{ar?'أول تجربة تنشرها ممكن تكون البداية.':'Your first shared brew could start the conversation.'}</Txt></View>}
    {error&&posts.length?<Txt style={styles.warning}>{error}</Txt>:null}
  </ScrollView>;
}
function Metric({value,label}:{value:string;label:string}){return <View style={s.metric}><Txt style={s.metricValue}>{value}</Txt><Txt style={s.metricLabel}>{label}</Txt></View>}

const s=StyleSheet.create({
  page:{width:'100%',maxWidth:850,alignSelf:'center',paddingHorizontal:18,paddingTop:14,paddingBottom:30,gap:14},header:{flexDirection:'row',alignItems:'center',gap:12},icon:{width:56,height:56,borderRadius:28,backgroundColor:'#F2E7D8',alignItems:'center',justifyContent:'center'},
  compose:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:14,gap:10},composeTitle:{fontSize:16,lineHeight:23,fontWeight:'800'},input:{minHeight:88,maxHeight:180,borderWidth:1,borderColor:colors.line,borderRadius:15,backgroundColor:'#F9F6F0',padding:12,fontSize:15,color:colors.ink,textAlignVertical:'top'},publish:{alignSelf:'flex-start',backgroundColor:colors.teal,borderRadius:13,minHeight:43,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},publishText:{color:'#FFF',fontSize:12,lineHeight:18,fontWeight:'800'},
  brewPicker:{gap:8,paddingBottom:2},brewPick:{width:180,minHeight:64,borderRadius:15,borderWidth:1,borderColor:colors.line,backgroundColor:'#F8F2E9',padding:10,gap:3},brewPickActive:{backgroundColor:colors.teal,borderColor:colors.teal},brewPickTitle:{fontSize:12,lineHeight:18,fontWeight:'800'},brewPickMeta:{fontSize:10,lineHeight:16,color:colors.muted,writingDirection:'ltr',textAlign:'left'},
  filters:{gap:8,paddingBottom:2},filter:{minHeight:39,paddingHorizontal:15,borderRadius:999,borderWidth:1,borderColor:colors.line,backgroundColor:colors.paper,alignItems:'center',justifyContent:'center'},filterActive:{backgroundColor:colors.brown,borderColor:colors.brown},filterText:{fontSize:11,lineHeight:17,fontWeight:'800'},
  feed:{gap:10},post:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:14,gap:11},authorRow:{flexDirection:'row',alignItems:'center',gap:10},avatar:{width:42,height:42,borderRadius:21,backgroundColor:'#EDE1D4',alignItems:'center',justifyContent:'center'},avatarText:{fontSize:16,lineHeight:22,fontWeight:'800',color:colors.brown},author:{fontSize:14,lineHeight:21,fontWeight:'800'},
  recipe:{flexDirection:'row',gap:9,alignItems:'center',backgroundColor:'#F5EBDD',borderRadius:14,padding:10},recipeTitle:{fontSize:13,lineHeight:19,fontWeight:'800'},sharedBrew:{backgroundColor:'#F3EBDD',borderRadius:16,padding:11,gap:9},sharedTop:{flexDirection:'row',alignItems:'center',gap:9},sharedPhoto:{width:58,height:66,borderRadius:11,overflow:'hidden',backgroundColor:'#FFF9F0'},outcome:{fontSize:10,lineHeight:16,fontWeight:'800',color:colors.teal},metrics:{flexDirection:'row',flexWrap:'wrap',gap:7},metric:{width:'48%',backgroundColor:'#FFF9F0',borderRadius:11,padding:8},metricValue:{fontSize:12,lineHeight:18,fontWeight:'800',writingDirection:'ltr',textAlign:'left'},metricLabel:{fontSize:9,lineHeight:14,color:colors.muted},
  body:{fontSize:14,lineHeight:23},postFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},socialActions:{flexDirection:'row',alignItems:'center',gap:14},like:{flexDirection:'row',alignItems:'center',gap:5,minHeight:38},likeText:{fontSize:12,lineHeight:18,fontWeight:'800',color:colors.muted},
  commentsBox:{backgroundColor:'#FAF5EC',borderRadius:14,padding:10,gap:9},commentRow:{flexDirection:'row',gap:8,alignItems:'flex-start'},commentAvatar:{width:28,height:28,borderRadius:14,backgroundColor:'#E8DCCE',alignItems:'center',justifyContent:'center'},commentAvatarText:{fontSize:10,lineHeight:15,fontWeight:'800'},commentAuthor:{fontSize:10,lineHeight:15,fontWeight:'800',color:colors.teal},commentBody:{fontSize:12,lineHeight:19},commentComposer:{flexDirection:'row',gap:7,alignItems:'center'},commentInput:{flex:1,minHeight:42,borderWidth:1,borderColor:colors.line,borderRadius:12,backgroundColor:colors.paper,paddingHorizontal:11,color:colors.ink,fontSize:13},commentSend:{width:42,height:42,borderRadius:12,backgroundColor:colors.teal,alignItems:'center',justifyContent:'center'},
  empty:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:22,gap:7,alignItems:'center'},emptyTitle:{fontSize:16,lineHeight:23,fontWeight:'800',textAlign:'center'},
});
