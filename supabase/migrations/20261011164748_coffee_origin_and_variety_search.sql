-- Add the same literal country and variety spellings used by local catalog search.
-- Recompile existing public documents; retain all current vocabulary and RLS.
do $patch$
declare definition text; patched text;
begin
 definition:=pg_get_functiondef('public.recipe_discovery_search_text(text)'::regprocedure);
 patched:=regexp_replace(definition,'return result;[[:space:]]*end', $aliases$if words && array['brazil','brasil','brazilian','البرازيل','برازيل','برازيلي']::text[] then result:=result||' brazil brasil brazilian البرازيل برازيل برازيلي'; end if;
if words && array['colombia','colombian','كولومبيا','كولومبي']::text[] then result:=result||' colombia colombian كولومبيا كولومبي'; end if;
if words && array['ethiopia','ethiopian','اثيوبيا','اثيوبي']::text[] then result:=result||' ethiopia ethiopian اثيوبيا اثيوبي'; end if;
if words && array['indonesia','indonesian','اندونيسيا']::text[] then result:=result||' indonesia indonesian اندونيسيا'; end if;
if words && array['kenya','kenyan','كينيا']::text[] then result:=result||' kenya kenyan كينيا'; end if;
if words && array['yemen','yemeni','اليمن','يمن']::text[] then result:=result||' yemen yemeni اليمن يمن'; end if;
if words && array['panama','بنما']::text[] then result:=result||' panama بنما'; end if;
if words && array['guatemala','غواتيمالا']::text[] then result:=result||' guatemala غواتيمالا'; end if;
if words && array['peru','بيرو']::text[] then result:=result||' peru بيرو'; end if;
if words && array['rwanda','رواندا']::text[] then result:=result||' rwanda رواندا'; end if;
if words && array['uganda','اوغندا']::text[] then result:=result||' uganda اوغندا'; end if;
if words && array['india','الهند']::text[] then result:=result||' india الهند'; end if;
if words && array['mexico','المكسيك','مكسيك']::text[] then result:=result||' mexico المكسيك مكسيك'; end if;
if words && array['ecuador','الاكوادور','اكوادور']::text[] then result:=result||' ecuador الاكوادور اكوادور'; end if;
if words && array['bolivia','بوليفيا']::text[] then result:=result||' bolivia بوليفيا'; end if;
if words && array['honduras','هندوراس']::text[] then result:=result||' honduras هندوراس'; end if;
if words && array['nicaragua','نيكاراغوا']::text[] then result:=result||' nicaragua نيكاراغوا'; end if;
if words && array['burundi','بوروندي']::text[] then result:=result||' burundi بوروندي'; end if;
if words && array['كوستاريكا']::text[] or strpos(original,'costa rica')>0 or strpos(original,'كوستا ريكا')>0 then result:=result||' costa rica كوستاريكا كوستا ريكا'; end if;
if words && array['salvador','السلفادور','سلفادور']::text[] or strpos(original,'el salvador')>0 then result:=result||' el salvador salvador السلفادور سلفادور'; end if;
if words && array['china','الصين']::text[] then result:=result||' china الصين'; end if;
if words && array['thailand','تايلند','تايلاند']::text[] then result:=result||' thailand تايلند تايلاند'; end if;
if words && array['castillo','كاستيلو','كاستيو','كاستييو']::text[] then result:=result||' castillo كاستيلو كاستيو كاستييو'; end if;
if words && array['caturra','كاتورا']::text[] then result:=result||' caturra كاتورا'; end if;
if words && array['catuai','كاتواي','كاتوي']::text[] then result:=result||' catuai كاتواي كاتوي'; end if;
if words && array['bourbon','بوربون']::text[] then result:=result||' bourbon بوربون'; end if;
if words && array['typica','تيبيكا']::text[] then result:=result||' typica تيبيكا'; end if;
if words && array['gesha','geisha','غيشا','جيشا','قيشا','قيشه']::text[] then result:=result||' gesha geisha غيشا جيشا قيشا قيشه'; end if;
if words && array['pacamara','باكامارا','باكمارا']::text[] then result:=result||' pacamara باكامارا باكمارا'; end if;
if words && array['sidra','سيدرا']::text[] then result:=result||' sidra سيدرا'; end if;
if words && array['wushwush']::text[] or strpos(original,'wush wush')>0 or strpos(original,'وش وش')>0 or strpos(original,'ووش ووش')>0 then result:=result||' wush wush wushwush وش وش ووش ووش'; end if;
if words && array['heirloom','هيرلوم']::text[] or strpos(original,'سلالات محليه')>0 then result:=result||' heirloom هيرلوم سلالات محليه'; end if;
if words && array['sl28']::text[] or strpos(original,'sl 28')>0 or strpos(original,'اس ال 28')>0 then result:=result||' sl28 sl 28 اس ال 28'; end if;
if words && array['sl34']::text[] or strpos(original,'sl 34')>0 or strpos(original,'اس ال 34')>0 then result:=result||' sl34 sl 34 اس ال 34'; end if;
if words && array['maracaturra','ماراكاتورا']::text[] then result:=result||' maracaturra ماراكاتورا'; end if;
if words && array['java','جاوا']::text[] then result:=result||' java جاوا'; end if;
if words && array['catimor','كاتيمور']::text[] then result:=result||' catimor كاتيمور'; end if;
if words && array['sarchimor','سارتشيمور']::text[] then result:=result||' sarchimor سارتشيمور'; end if;
 return result; end$aliases$);
 if patched=definition then raise exception 'SEARCH_ALIAS_DEFINITION_DRIFT'; end if;
 execute patched;
 definition:=pg_get_functiondef('private.refresh_recipe_search_documents(uuid[])'::regprocedure);
 patched:=replace(replace(definition,
 'public.recipe_discovery_normalize(concat_ws('' '', r.source_varietal',
 'public.recipe_discovery_search_text(concat_ws('' '', r.source_varietal'),
 'public.recipe_discovery_normalize(concat_ws('' '', r.source_origin_country',
 'public.recipe_discovery_search_text(concat_ws('' '', r.source_origin_country');
 if patched=definition then raise exception 'SEARCH_DOCUMENT_DEFINITION_DRIFT'; end if;
 execute patched;
 perform private.refresh_recipe_search_documents();
end $patch$;
