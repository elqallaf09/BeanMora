-- Generated from the shared bilingual search vocabulary; aliases do not change source facts.
create or replace function public.recipe_discovery_search_text(p_value text) returns text language plpgsql immutable set search_path='' as $search$
declare original text:=public.recipe_discovery_normalize(p_value); words text[]:=regexp_split_to_array(original,'[^[:alnum:]]+'); result text:=original;
begin
 if words && array['rawi','rawee','راوي']::text[] then result:=result||' rawi rawee راوي'; end if;
 if words && array['jebla','jabla','جبله']::text[] then result:=result||' jebla jabla جبله'; end if;
 if words && array['strawberry','strawberries','فراوله','fraise','fraises','fresa','fresas','草莓','イチコ']::text[] or strpos(original,'🍓')>0 then result:=result||' strawberry strawberries فراوله fraise fraises fresa fresas 草莓 イチコ 🍓'; end if;
 if words && array['blueberry','blueberries','بلوبيري']::text[] or strpos(original,'توت ازرق')>0 then result:=result||' blueberry blueberries توت ازرق بلوبيري'; end if;
 if words && array['raspberry','raspberries','رازبيري']::text[] or strpos(original,'توت العليق')>0 then result:=result||' raspberry raspberries توت العليق رازبيري'; end if;
 if words && array['peach','peaches','خوخ']::text[] then result:=result||' peach peaches خوخ'; end if;
 if words && array['chocolate','شوكولاته']::text[] then result:=result||' chocolate شوكولاته'; end if;
 if words && array['cocoa','cacao','كاكاو']::text[] then result:=result||' cocoa cacao كاكاو'; end if;
 if words && array['jasmine','ياسمين']::text[] then result:=result||' jasmine ياسمين'; end if;
 if words && array['caramel','كراميل']::text[] then result:=result||' caramel كراميل'; end if;
 if words && array['vanilla','فانيلا','فانيليا']::text[] then result:=result||' vanilla فانيلا فانيليا'; end if;
 if words && array['cherry','cherries','كرز']::text[] then result:=result||' cherry cherries كرز'; end if;
 if words && array['orange','برتقال']::text[] then result:=result||' orange برتقال'; end if;
 if words && array['lemon','ليمون']::text[] then result:=result||' lemon ليمون'; end if;
 if words && array['mango','مانجو','منجا']::text[] then result:=result||' mango مانجو منجا'; end if;
 if words && array['pineapple','اناناس']::text[] then result:=result||' pineapple اناناس'; end if;
 if strpos(original,'passion fruit')>0 or strpos(original,'باشن فروت')>0 or strpos(original,'فاكهه العاطفه')>0 then result:=result||' passion fruit باشن فروت فاكهه العاطفه'; end if;
 if words && array['hazelnut','بندق']::text[] then result:=result||' hazelnut بندق'; end if;
 if words && array['almond','لوز']::text[] then result:=result||' almond لوز'; end if;
 if words && array['honey','عسل']::text[] then result:=result||' honey عسل'; end if;
 if words && array['floral','زهور','زهري']::text[] then result:=result||' floral زهور زهري'; end if;
 if words && array['ethiopia','ethiopian','اثيوبيا']::text[] then result:=result||' ethiopia ethiopian اثيوبيا'; end if;
 if words && array['colombia','colombian','كولومبيا']::text[] then result:=result||' colombia colombian كولومبيا'; end if;
 if words && array['cold','iced','ice','بارد','مثلج']::text[] then result:=result||' cold iced ice بارد مثلج'; end if;
 if words && array['allspice']::text[] or strpos(original,'بهار حلو')>0 then result:=result||' allspice بهار حلو'; end if;
 if words && array['amaretto','اماريتو']::text[] then result:=result||' amaretto اماريتو'; end if;
 if strpos(original,'barley tea')>0 or strpos(original,'شاي الشعير')>0 then result:=result||' barley tea شاي الشعير'; end if;
 if words && array['biscuits','بسكويت']::text[] then result:=result||' biscuits بسكويت'; end if;
 if words && array['blackberries']::text[] or strpos(original,'توت اسود')>0 then result:=result||' blackberries توت اسود'; end if;
 if strpos(original,'butter biscuit')>0 or strpos(original,'بسكويت بالزبده')>0 then result:=result||' butter biscuit بسكويت بالزبده'; end if;
 if words && array['butterscotch']::text[] or strpos(original,'كراميل بالزبده')>0 then result:=result||' butterscotch كراميل بالزبده'; end if;
 if strpos(original,'candied almond')>0 or strpos(original,'لوز محلي')>0 then result:=result||' candied almond لوز محلي'; end if;
 if strpos(original,'candied lemon')>0 or strpos(original,'ليمون محلي')>0 then result:=result||' candied lemon ليمون محلي'; end if;
 if strpos(original,'cane sugar')>0 or strpos(original,'سكر القصب')>0 then result:=result||' cane sugar سكر القصب'; end if;
 if strpos(original,'cashew butter')>0 or strpos(original,'زبده الكاجو')>0 then result:=result||' cashew butter زبده الكاجو'; end if;
 if strpos(original,'cherry filled doughnut')>0 or strpos(original,'دونات بحشوه الكرز')>0 then result:=result||' cherry filled doughnut دونات بحشوه الكرز'; end if;
 if strpos(original,'chocolate fudge')>0 or strpos(original,'فدج الشوكولاته')>0 then result:=result||' chocolate fudge فدج الشوكولاته'; end if;
 if strpos(original,'chocolate milk')>0 or strpos(original,'حليب بالشوكولاته')>0 then result:=result||' chocolate milk حليب بالشوكولاته'; end if;
 if words && array['clean','واضحه']::text[] then result:=result||' clean واضحه'; end if;
 if words && array['clementine','كلمنتينا']::text[] then result:=result||' clementine كلمنتينا'; end if;
 if words && array['cola','كولا']::text[] then result:=result||' cola كولا'; end if;
 if words && array['cookies','بسكويت']::text[] then result:=result||' cookies بسكويت'; end if;
 if strpos(original,'creamy white chocolate')>0 or strpos(original,'شوكولاته بيضاء كريميه')>0 then result:=result||' creamy white chocolate شوكولاته بيضاء كريميه'; end if;
 if words && array['currants','كشمش']::text[] then result:=result||' currants كشمش'; end if;
 if strpos(original,'dark grape')>0 or strpos(original,'عنب داكن')>0 then result:=result||' dark grape عنب داكن'; end if;
 if strpos(original,'dried berries')>0 or strpos(original,'توت مجفف')>0 then result:=result||' dried berries توت مجفف'; end if;
 if strpos(original,'earl grey')>0 or strpos(original,'شاي ايرل غراي')>0 then result:=result||' earl grey شاي ايرل غراي'; end if;
 if words && array['fig','تين']::text[] then result:=result||' fig تين'; end if;
 if words && array['florals','زهور']::text[] then result:=result||' florals زهور'; end if;
 if words && array['fruits','فواكه']::text[] then result:=result||' fruits فواكه'; end if;
 if strpos(original,'grape soda')>0 or strpos(original,'مشروب عنب غازي')>0 then result:=result||' grape soda مشروب عنب غازي'; end if;
 if strpos(original,'heavy chocolate')>0 or strpos(original,'شوكولاته كثيفه')>0 then result:=result||' heavy chocolate شوكولاته كثيفه'; end if;
 if words && array['honeycomb']::text[] or strpos(original,'قرص العسل')>0 then result:=result||' honeycomb قرص العسل'; end if;
 if words && array['honeydew']::text[] or strpos(original,'شمام عسلي')>0 then result:=result||' honeydew شمام عسلي'; end if;
 if words && array['honeysuckle']::text[] or strpos(original,'زهره العسله')>0 then result:=result||' honeysuckle زهره العسله'; end if;
 if strpos(original,'juicy & citrus finish')>0 or strpos(original,'قوام عصيري ونهايه حمضيه')>0 then result:=result||' juicy & citrus finish قوام عصيري ونهايه حمضيه'; end if;
 if words && array['لايم']::text[] or strpos(original,'key lime')>0 then result:=result||' key lime لايم'; end if;
 if words && array['kumquat','كمكوات']::text[] then result:=result||' kumquat كمكوات'; end if;
 if words && array['lime','لايم']::text[] then result:=result||' lime لايم'; end if;
 if strpos(original,'lime curd')>0 or strpos(original,'كريمه اللايم')>0 then result:=result||' lime curd كريمه اللايم'; end if;
 if strpos(original,'lotus biscuit')>0 or strpos(original,'بسكويت لوتس')>0 then result:=result||' lotus biscuit بسكويت لوتس'; end if;
 if words && array['malt','شعير']::text[] then result:=result||' malt شعير'; end if;
 if words && array['mandarin','يوسفي']::text[] then result:=result||' mandarin يوسفي'; end if;
 if words && array['maple','قيقب']::text[] then result:=result||' maple قيقب'; end if;
 if strpos(original,'maple syrup')>0 or strpos(original,'شراب القيقب')>0 then result:=result||' maple syrup شراب القيقب'; end if;
 if words && array['matcha','ماتشا']::text[] then result:=result||' matcha ماتشا'; end if;
 if words && array['melon','شمام']::text[] then result:=result||' melon شمام'; end if;
 if strpos(original,'mulled wine')>0 or strpos(original,'نبيذ متبل')>0 then result:=result||' mulled wine نبيذ متبل'; end if;
 if strpos(original,'mulling spice')>0 or strpos(original,'توابل دافيه')>0 then result:=result||' mulling spice توابل دافيه'; end if;
 if strpos(original,'myrtle liquor')>0 or strpos(original,'مشروب الاس')>0 then result:=result||' myrtle liquor مشروب الاس'; end if;
 if words && array['panela']::text[] or strpos(original,'سكر قصب غير مكرر')>0 then result:=result||' panela سكر قصب غير مكرر'; end if;
 if strpos(original,'peanut butter')>0 or strpos(original,'زبده الفول السوداني')>0 then result:=result||' peanut butter زبده الفول السوداني'; end if;
 if words && array['pecan','بيكان']::text[] then result:=result||' pecan بيكان'; end if;
 if strpos(original,'pink grapefruit')>0 or strpos(original,'جريب فروت وردي')>0 then result:=result||' pink grapefruit جريب فروت وردي'; end if;
 if strpos(original,'raspberry candy')>0 or strpos(original,'حلوي توت العليق')>0 then result:=result||' raspberry candy حلوي توت العليق'; end if;
 if strpos(original,'raw honey')>0 or strpos(original,'عسل خام')>0 then result:=result||' raw honey عسل خام'; end if;
 if strpos(original,'red grape')>0 or strpos(original,'عنب احمر')>0 then result:=result||' red grape عنب احمر'; end if;
 if strpos(original,'red wine')>0 or strpos(original,'نبيذ احمر')>0 then result:=result||' red wine نبيذ احمر'; end if;
 if words && array['redcurrant']::text[] or strpos(original,'كشمش احمر')>0 then result:=result||' redcurrant كشمش احمر'; end if;
 if words && array['refined','رقيقه']::text[] then result:=result||' refined رقيقه'; end if;
 if words && array['rhubarb','راوند']::text[] then result:=result||' rhubarb راوند'; end if;
 if strpos(original,'ripe fruits')>0 or strpos(original,'فواكه ناضجه')>0 then result:=result||' ripe fruits فواكه ناضجه'; end if;
 if strpos(original,'ripe orange')>0 or strpos(original,'برتقال ناضج')>0 then result:=result||' ripe orange برتقال ناضج'; end if;
 if strpos(original,'roasted almonds')>0 or strpos(original,'لوز محمص')>0 then result:=result||' roasted almonds لوز محمص'; end if;
 if strpos(original,'roasted macadamia')>0 or strpos(original,'مكاديميا محمصه')>0 then result:=result||' roasted macadamia مكاديميا محمصه'; end if;
 if words && array['round','متوازنه']::text[] then result:=result||' round متوازنه'; end if;
 if words && array['silky','حريريه']::text[] then result:=result||' silky حريريه'; end if;
 if words && array['spearmint','نعناع']::text[] then result:=result||' spearmint نعناع'; end if;
 if words && array['spices','توابل']::text[] then result:=result||' spices توابل'; end if;
 if strpos(original,'stone fruits')>0 or strpos(original,'فواكه ذات نواه')>0 then result:=result||' stone fruits فواكه ذات نواه'; end if;
 if words && array['sugarcane']::text[] or strpos(original,'قصب السكر')>0 then result:=result||' sugarcane قصب السكر'; end if;
 if strpos(original,'sweet berries')>0 or strpos(original,'توت حلو')>0 then result:=result||' sweet berries توت حلو'; end if;
 if strpos(original,'sweet blood orange')>0 or strpos(original,'برتقال احمر حلو')>0 then result:=result||' sweet blood orange برتقال احمر حلو'; end if;
 if strpos(original,'sweet tea')>0 or strpos(original,'شاي حلو')>0 then result:=result||' sweet tea شاي حلو'; end if;
 if strpos(original,'tart apple')>0 or strpos(original,'تفاح حامض')>0 then result:=result||' tart apple تفاح حامض'; end if;
 if strpos(original,'thick & syrupy')>0 or strpos(original,'قوام كثيف')>0 then result:=result||' thick & syrupy قوام كثيف'; end if;
 if strpos(original,'tropical fruits')>0 or strpos(original,'فواكه استواييه')>0 then result:=result||' tropical fruits فواكه استواييه'; end if;
 if strpos(original,'tropical fruit')>0 or strpos(original,'فاكهه استواييه')>0 then result:=result||' tropical fruit فاكهه استواييه'; end if;
 if strpos(original,'vanilla cake')>0 or strpos(original,'كيك الفانيلا')>0 then result:=result||' vanilla cake كيك الفانيلا'; end if;
 if strpos(original,'vanilla malt')>0 or strpos(original,'شعير بالفانيلا')>0 then result:=result||' vanilla malt شعير بالفانيلا'; end if;
 if words && array['violet','بنفسج']::text[] then result:=result||' violet بنفسج'; end if;
 if words && array['waffle','وافل']::text[] then result:=result||' waffle وافل'; end if;
 if strpos(original,'white florals')>0 or strpos(original,'زهور بيضاء')>0 then result:=result||' white florals زهور بيضاء'; end if;
 if strpos(original,'white grape')>0 or strpos(original,'عنب ابيض')>0 then result:=result||' white grape عنب ابيض'; end if;
 if strpos(original,'white wine')>0 or strpos(original,'نبيذ ابيض')>0 then result:=result||' white wine نبيذ ابيض'; end if;
 if strpos(original,'white chocolate')>0 or strpos(original,'شوكولاته بيضاء')>0 then result:=result||' white chocolate شوكولاته بيضاء'; end if;
 if strpos(original,'white peach')>0 or strpos(original,'خوخ ابيض')>0 then result:=result||' white peach خوخ ابيض'; end if;
 if strpos(original,'passion fruit')>0 or strpos(original,'باشن فروت')>0 then result:=result||' passion fruit باشن فروت'; end if;
 if words && array['passionfruit']::text[] or strpos(original,'باشن فروت')>0 then result:=result||' passionfruit باشن فروت'; end if;
 if strpos(original,'burnt sugar')>0 or strpos(original,'سكر محروق')>0 then result:=result||' burnt sugar سكر محروق'; end if;
 if strpos(original,'dried cherry')>0 or strpos(original,'كرز مجفف')>0 then result:=result||' dried cherry كرز مجفف'; end if;
 if strpos(original,'dried apricot')>0 or strpos(original,'مشمش مجفف')>0 then result:=result||' dried apricot مشمش مجفف'; end if;
 if strpos(original,'orange marmalade')>0 or strpos(original,'مربي البرتقال')>0 then result:=result||' orange marmalade مربي البرتقال'; end if;
 if strpos(original,'black cherry')>0 or strpos(original,'كرز اسود')>0 then result:=result||' black cherry كرز اسود'; end if;
 if strpos(original,'red grapes')>0 or strpos(original,'عنب احمر')>0 then result:=result||' red grapes عنب احمر'; end if;
 if words && array['nutmeg']::text[] or strpos(original,'جوزه الطيب')>0 then result:=result||' nutmeg جوزه الطيب'; end if;
 if words && array['marzipan','مرزبان']::text[] then result:=result||' marzipan مرزبان'; end if;
 if words && array['sultana']::text[] or strpos(original,'زبيب سلطاني')>0 then result:=result||' sultana زبيب سلطاني'; end if;
 if strpos(original,'bitter orange')>0 or strpos(original,'برتقال مر')>0 then result:=result||' bitter orange برتقال مر'; end if;
 if words && array['pear','اجاص']::text[] then result:=result||' pear اجاص'; end if;
 if strpos(original,'miso caramel')>0 or strpos(original,'كراميل الميسو')>0 then result:=result||' miso caramel كراميل الميسو'; end if;
 if words && array['stonefruit']::text[] or strpos(original,'فواكه ذات نواه')>0 then result:=result||' stonefruit فواكه ذات نواه'; end if;
 if strpos(original,'star anise')>0 or strpos(original,'يانسون نجمي')>0 then result:=result||' star anise يانسون نجمي'; end if;
 if words && array['kiwi','كيوي']::text[] then result:=result||' kiwi كيوي'; end if;
 if strpos(original,'berries jam')>0 or strpos(original,'مربي توت')>0 then result:=result||' berries jam مربي توت'; end if;
 if strpos(original,'grape yoghurt')>0 or strpos(original,'زبادي العنب')>0 then result:=result||' grape yoghurt زبادي العنب'; end if;
 if words && array['winegum']::text[] or strpos(original,'حلوي فاكهه')>0 then result:=result||' winegum حلوي فاكهه'; end if;
 if strpos(original,'peach iced tea')>0 or strpos(original,'شاي خوخ مثلج')>0 then result:=result||' peach iced tea شاي خوخ مثلج'; end if;
 if strpos(original,'jammy berries')>0 or strpos(original,'توت بقوام مربي')>0 then result:=result||' jammy berries توت بقوام مربي'; end if;
 if words && array['حلوي']::text[] or strpos(original,'sweet candy')>0 then result:=result||' sweet candy حلوي'; end if;
 if strpos(original,'winey fruitiness')>0 or strpos(original,'فاكهه مخمره')>0 then result:=result||' winey fruitiness فاكهه مخمره'; end if;
 if strpos(original,'candy-like finish')>0 or strpos(original,'نهايه حلوه')>0 then result:=result||' candy-like finish نهايه حلوه'; end if;
 if strpos(original,'slight floral')>0 or strpos(original,'لمسه زهريه')>0 then result:=result||' slight floral لمسه زهريه'; end if;
 if strpos(original,'milk chocolate')>0 or strpos(original,'شوكولاته بالحليب')>0 then result:=result||' milk chocolate شوكولاته بالحليب'; end if;
 if strpos(original,'dark chocolate')>0 or strpos(original,'شوكولاته داكنه')>0 then result:=result||' dark chocolate شوكولاته داكنه'; end if;
 if words && array['cocoa','كاكاو']::text[] then result:=result||' cocoa كاكاو'; end if;
 if words && array['cacao','كاكاو']::text[] then result:=result||' cacao كاكاو'; end if;
 if words && array['nutty','مكسرات']::text[] then result:=result||' nutty مكسرات'; end if;
 if words && array['nuts','مكسرات']::text[] then result:=result||' nuts مكسرات'; end if;
 if words && array['almonds','لوز']::text[] then result:=result||' almonds لوز'; end if;
 if words && array['hazelnuts','بندق']::text[] then result:=result||' hazelnuts بندق'; end if;
 if words && array['pistachio','فستق']::text[] then result:=result||' pistachio فستق'; end if;
 if words && array['walnut','جوز']::text[] then result:=result||' walnut جوز'; end if;
 if words && array['fruity','فواكه']::text[] then result:=result||' fruity فواكه'; end if;
 if words && array['fruit','فواكه']::text[] then result:=result||' fruit فواكه'; end if;
 if words && array['citrus','حمضيات']::text[] then result:=result||' citrus حمضيات'; end if;
 if words && array['grapefruit']::text[] or strpos(original,'جريب فروت')>0 then result:=result||' grapefruit جريب فروت'; end if;
 if words && array['bergamot','برغموت']::text[] then result:=result||' bergamot برغموت'; end if;
 if words && array['floral','زهور']::text[] then result:=result||' floral زهور'; end if;
 if words && array['rose','ورد']::text[] then result:=result||' rose ورد'; end if;
 if words && array['hibiscus','كركديه']::text[] then result:=result||' hibiscus كركديه'; end if;
 if words && array['peach','خوخ']::text[] then result:=result||' peach خوخ'; end if;
 if words && array['apricot','مشمش']::text[] then result:=result||' apricot مشمش'; end if;
 if words && array['mango','مانجو']::text[] then result:=result||' mango مانجو'; end if;
 if strpos(original,'stone fruit')>0 or strpos(original,'فواكه ذات نواه')>0 then result:=result||' stone fruit فواكه ذات نواه'; end if;
 if words && array['toffee','توفي']::text[] then result:=result||' toffee توفي'; end if;
 if strpos(original,'brown sugar')>0 or strpos(original,'سكر بني')>0 then result:=result||' brown sugar سكر بني'; end if;
 if words && array['spice','توابل']::text[] then result:=result||' spice توابل'; end if;
 if words && array['cinnamon','قرفه']::text[] then result:=result||' cinnamon قرفه'; end if;
 if words && array['cardamom','هيل']::text[] then result:=result||' cardamom هيل'; end if;
 if words && array['berry','توت']::text[] then result:=result||' berry توت'; end if;
 if words && array['berries','توت']::text[] then result:=result||' berries توت'; end if;
 if words && array['raspberry']::text[] or strpos(original,'توت العليق')>0 then result:=result||' raspberry توت العليق'; end if;
 if words && array['strawberry','فراوله']::text[] then result:=result||' strawberry فراوله'; end if;
 if words && array['blueberry']::text[] or strpos(original,'توت ازرق')>0 then result:=result||' blueberry توت ازرق'; end if;
 if words && array['blackberry']::text[] or strpos(original,'توت اسود')>0 then result:=result||' blackberry توت اسود'; end if;
 if words && array['cherry','كرز']::text[] then result:=result||' cherry كرز'; end if;
 if words && array['apple','تفاح']::text[] then result:=result||' apple تفاح'; end if;
 if strpos(original,'red apple')>0 or strpos(original,'تفاح احمر')>0 then result:=result||' red apple تفاح احمر'; end if;
 if strpos(original,'green apple')>0 or strpos(original,'تفاح اخضر')>0 then result:=result||' green apple تفاح اخضر'; end if;
 if words && array['plum','برقوق']::text[] then result:=result||' plum برقوق'; end if;
 if words && array['grape','عنب']::text[] then result:=result||' grape عنب'; end if;
 if words && array['grapes','عنب']::text[] then result:=result||' grapes عنب'; end if;
 if words && array['raisin','زبيب']::text[] then result:=result||' raisin زبيب'; end if;
 if words && array['raisins','زبيب']::text[] then result:=result||' raisins زبيب'; end if;
 if words && array['vanilla','فانيلا']::text[] then result:=result||' vanilla فانيلا'; end if;
 if words && array['lavender','لافندر']::text[] then result:=result||' lavender لافندر'; end if;
 if words && array['chamomile','بابونج']::text[] then result:=result||' chamomile بابونج'; end if;
 if strpos(original,'black tea')>0 or strpos(original,'شاي اسود')>0 then result:=result||' black tea شاي اسود'; end if;
 if strpos(original,'yellow plum')>0 or strpos(original,'برقوق اصفر')>0 then result:=result||' yellow plum برقوق اصفر'; end if;
 if words && array['dates','تمر']::text[] then result:=result||' dates تمر'; end if;
 if words && array['cloves','قرنفل']::text[] then result:=result||' cloves قرنفل'; end if;
 if words && array['lychee','ليتشي']::text[] then result:=result||' lychee ليتشي'; end if;
 if words && array['cantaloupe','شمام']::text[] then result:=result||' cantaloupe شمام'; end if;
 if words && array['mandarine','يوسفي']::text[] then result:=result||' mandarine يوسفي'; end if;
 if words && array['tangerine','يوسفي']::text[] then result:=result||' tangerine يوسفي'; end if;
 if words && array['pomegranate','رمان']::text[] then result:=result||' pomegranate رمان'; end if;
 if strpos(original,'dried fig')>0 or strpos(original,'تين مجفف')>0 then result:=result||' dried fig تين مجفف'; end if;
 if strpos(original,'red berries')>0 or strpos(original,'توت احمر')>0 then result:=result||' red berries توت احمر'; end if;
 if strpos(original,'red berry')>0 or strpos(original,'توت احمر')>0 then result:=result||' red berry توت احمر'; end if;
 if strpos(original,'mixed berries')>0 or strpos(original,'توت مشكل')>0 then result:=result||' mixed berries توت مشكل'; end if;
 if strpos(original,'black berries')>0 or strpos(original,'توت داكن')>0 then result:=result||' black berries توت داكن'; end if;
 if strpos(original,'almond cream')>0 or strpos(original,'كريمه اللوز')>0 then result:=result||' almond cream كريمه اللوز'; end if;
 if strpos(original,'blood orange')>0 or strpos(original,'برتقال احمر')>0 then result:=result||' blood orange برتقال احمر'; end if;
 if words && array['nectarine','نكتارين']::text[] then result:=result||' nectarine نكتارين'; end if;
 if words && array['lemongrass']::text[] or strpos(original,'عشبه الليمون')>0 then result:=result||' lemongrass عشبه الليمون'; end if;
 if strpos(original,'dried fruit')>0 or strpos(original,'فواكه مجففه')>0 then result:=result||' dried fruit فواكه مجففه'; end if;
 if strpos(original,'dried fruits')>0 or strpos(original,'فواكه مجففه')>0 then result:=result||' dried fruits فواكه مجففه'; end if;
 if words && array['blackcurrant']::text[] or strpos(original,'كشمش اسود')>0 then result:=result||' blackcurrant كشمش اسود'; end if;
 if strpos(original,'white grapes')>0 or strpos(original,'عنب ابيض')>0 then result:=result||' white grapes عنب ابيض'; end if;
 if strpos(original,'blueberry pie')>0 or strpos(original,'فطيره التوت الازرق')>0 then result:=result||' blueberry pie فطيره التوت الازرق'; end if;
 if strpos(original,'candied pecan')>0 or strpos(original,'بيكان محلي')>0 then result:=result||' candied pecan بيكان محلي'; end if;
 if strpos(original,'roasted walnuts')>0 or strpos(original,'جوز محمص')>0 then result:=result||' roasted walnuts جوز محمص'; end if;
 if strpos(original,'cacao nibs')>0 or strpos(original,'قطع الكاكاو')>0 then result:=result||' cacao nibs قطع الكاكاو'; end if;
 if strpos(original,'candied walnuts')>0 or strpos(original,'جوز محلي')>0 then result:=result||' candied walnuts جوز محلي'; end if;
 if words && array['liquorice']::text[] or strpos(original,'عرق السوس')>0 then result:=result||' liquorice عرق السوس'; end if;
 if words && array['molasses','دبس']::text[] then result:=result||' molasses دبس'; end if;
 if strpos(original,'maraschino cherries')>0 or strpos(original,'كرز ماراشينو')>0 then result:=result||' maraschino cherries كرز ماراشينو'; end if;
 if strpos(original,'fruit-smoked')>0 or strpos(original,'فواكه مع لمسه دخان')>0 then result:=result||' fruit-smoked فواكه مع لمسه دخان'; end if;
 if words && array['nougat','نوجا']::text[] then result:=result||' nougat نوجا'; end if;
 if words && array['praline','برالين']::text[] then result:=result||' praline برالين'; end if;
 if words && array['maltesers','مالتيزرز']::text[] then result:=result||' maltesers مالتيزرز'; end if;
 if words && array['sweet','حلوه']::text[] then result:=result||' sweet حلوه'; end if;
 if words && array['elegant','انيقه']::text[] then result:=result||' elegant انيقه'; end if;
 if words && array['botanical','نباتيه']::text[] then result:=result||' botanical نباتيه'; end if;
 if strpos(original,'sweet citrus')>0 or strpos(original,'حمضيات حلوه')>0 then result:=result||' sweet citrus حمضيات حلوه'; end if;
 if strpos(original,'orange zest')>0 or strpos(original,'قشر البرتقال')>0 then result:=result||' orange zest قشر البرتقال'; end if;
 if strpos(original,'sugar cane')>0 or strpos(original,'قصب السكر')>0 then result:=result||' sugar cane قصب السكر'; end if;
 if words && array['beeswax']::text[] or strpos(original,'شمع العسل')>0 then result:=result||' beeswax شمع العسل'; end if;
 if strpos(original,'yellow peach')>0 or strpos(original,'خوخ اصفر')>0 then result:=result||' yellow peach خوخ اصفر'; end if;
 if strpos(original,'french press')>0 or strpos(original,'فرنش برس')>0 then result:=result||' french press فرنش برس'; end if;
 if strpos(original,'cold brew')>0 or strpos(original,'كولد برو')>0 then result:=result||' cold brew كولد برو'; end if;
 if strpos(original,'pour over')>0 or strpos(original,'ترشيح يدوي')>0 then result:=result||' pour over ترشيح يدوي'; end if;
 if strpos(original,'single origin')>0 or strpos(original,'احادي المنشا')>0 then result:=result||' single origin احادي المنشا'; end if;
 if strpos(original,'black honey')>0 or strpos(original,'عسلي اسود')>0 then result:=result||' black honey عسلي اسود'; end if;
 if strpos(original,'double anaerobic')>0 or strpos(original,'لاهوايي مزدوج')>0 then result:=result||' double anaerobic لاهوايي مزدوج'; end if;
 if strpos(original,'wet hulled')>0 or strpos(original,'تقشير رطب')>0 then result:=result||' wet hulled تقشير رطب'; end if;
 if strpos(original,'thermal shock')>0 or strpos(original,'صدمه حراريه')>0 then result:=result||' thermal shock صدمه حراريه'; end if;
 if strpos(original,'xbloom official')>0 or strpos(original,'xbloom الرسمي')>0 then result:=result||' xbloom official xbloom الرسمي'; end if;
 if strpos(original,'jeed roastery')>0 or strpos(original,'محمصه جيد')>0 then result:=result||' jeed roastery محمصه جيد'; end if;
 if strpos(original,'onyx coffee lab')>0 or strpos(original,'مختبر اونيكس للقهوه')>0 then result:=result||' onyx coffee lab مختبر اونيكس للقهوه'; end if;
 if strpos(original,'workshop coffee')>0 or strpos(original,'وركشوب كوفي')>0 then result:=result||' workshop coffee وركشوب كوفي'; end if;
 if strpos(original,'verve''s coffee department')>0 or strpos(original,'قسم القهوه في فيرف')>0 then result:=result||' verve''s coffee department قسم القهوه في فيرف'; end if;
 if strpos(original,'toby''s estate')>0 or strpos(original,'توبيز ايستيت')>0 then result:=result||' toby''s estate توبيز ايستيت'; end if;
 if strpos(original,'ona coffee')>0 or strpos(original,'اونا كوفي')>0 then result:=result||' ona coffee اونا كوفي'; end if;
 if strpos(original,'nomad coffee')>0 or strpos(original,'نوماد كوفي')>0 then result:=result||' nomad coffee نوماد كوفي'; end if;
 if strpos(original,'methods roastery')>0 or strpos(original,'محمصه ميثودز')>0 then result:=result||' methods roastery محمصه ميثودز'; end if;
 if strpos(original,'april coffee roasters')>0 or strpos(original,'محمصه ابريل')>0 then result:=result||' april coffee roasters محمصه ابريل'; end if;
 if strpos(original,'quarter horse coffee')>0 or strpos(original,'كوارتر هورس كوفي')>0 then result:=result||' quarter horse coffee كوارتر هورس كوفي'; end if;
 if strpos(original,'five senses coffee')>0 or strpos(original,'فايف سينسز كوفي')>0 then result:=result||' five senses coffee فايف سينسز كوفي'; end if;
 if strpos(original,'rubens gardelli')>0 or strpos(original,'روبينز غارديلي')>0 then result:=result||' rubens gardelli روبينز غارديلي'; end if;
 if strpos(original,'roots roastery')>0 or strpos(original,'محمصه روتس')>0 then result:=result||' roots roastery محمصه روتس'; end if;
 if strpos(original,'coffee collective')>0 or strpos(original,'كوفي كولكتيف')>0 then result:=result||' coffee collective كوفي كولكتيف'; end if;
 if strpos(original,'stumptown coffee roasters')>0 or strpos(original,'محمصه ستامبتاون')>0 then result:=result||' stumptown coffee roasters محمصه ستامبتاون'; end if;
 if strpos(original,'origin coffee roasters')>0 or strpos(original,'محمصه اوريجن')>0 then result:=result||' origin coffee roasters محمصه اوريجن'; end if;
 if strpos(original,'carmo de minas')>0 or strpos(original,'كارمو دي ميناس')>0 then result:=result||' carmo de minas كارمو دي ميناس'; end if;
 if strpos(original,'central america & africa')>0 or strpos(original,'امريكا الوسطي وافريقيا')>0 then result:=result||' central america & africa امريكا الوسطي وافريقيا'; end if;
 if strpos(original,'east africa')>0 or strpos(original,'شرق افريقيا')>0 then result:=result||' east africa شرق افريقيا'; end if;
 if strpos(original,'papua new guinea')>0 or strpos(original,'بابوا غينيا الجديده')>0 then result:=result||' papua new guinea بابوا غينيا الجديده'; end if;
 if words && array['كوستاريكا']::text[] or strpos(original,'costa rica')>0 then result:=result||' costa rica كوستاريكا'; end if;
 if words && array['السلفادور']::text[] or strpos(original,'el salvador')>0 then result:=result||' el salvador السلفادور'; end if;
 if words && array['السعوديه']::text[] or strpos(original,'saudi arabia')>0 then result:=result||' saudi arabia السعوديه'; end if;
 if strpos(original,'united states')>0 or strpos(original,'الولايات المتحده')>0 then result:=result||' united states الولايات المتحده'; end if;
 if strpos(original,'united kingdom')>0 or strpos(original,'المملكه المتحده')>0 then result:=result||' united kingdom المملكه المتحده'; end if;
 if words && array['نيوزيلندا']::text[] or strpos(original,'new zealand')>0 then result:=result||' new zealand نيوزيلندا'; end if;
 if strpos(original,'south korea')>0 or strpos(original,'كوريا الجنوبيه')>0 then result:=result||' south korea كوريا الجنوبيه'; end if;
 if words && array['bolivia','بوليفيا']::text[] then result:=result||' bolivia بوليفيا'; end if;
 if words && array['brazil','البرازيل']::text[] then result:=result||' brazil البرازيل'; end if;
 if words && array['colombia','كولومبيا']::text[] then result:=result||' colombia كولومبيا'; end if;
 if words && array['ecuador','الاكوادور']::text[] then result:=result||' ecuador الاكوادور'; end if;
 if words && array['ethiopia','اثيوبيا']::text[] then result:=result||' ethiopia اثيوبيا'; end if;
 if words && array['guatemala','غواتيمالا']::text[] then result:=result||' guatemala غواتيمالا'; end if;
 if words && array['honduras','هندوراس']::text[] then result:=result||' honduras هندوراس'; end if;
 if words && array['india','الهند']::text[] then result:=result||' india الهند'; end if;
 if words && array['indonesia','اندونيسيا']::text[] then result:=result||' indonesia اندونيسيا'; end if;
 if words && array['kenya','كينيا']::text[] then result:=result||' kenya كينيا'; end if;
 if words && array['mexico','المكسيك']::text[] then result:=result||' mexico المكسيك'; end if;
 if words && array['panama','بنما']::text[] then result:=result||' panama بنما'; end if;
 if words && array['peru','بيرو']::text[] then result:=result||' peru بيرو'; end if;
 if words && array['rwanda','رواندا']::text[] then result:=result||' rwanda رواندا'; end if;
 if words && array['tanzania','تنزانيا']::text[] then result:=result||' tanzania تنزانيا'; end if;
 if words && array['uganda','اوغندا']::text[] then result:=result||' uganda اوغندا'; end if;
 if words && array['yemen','اليمن']::text[] then result:=result||' yemen اليمن'; end if;
 if words && array['china','الصين']::text[] then result:=result||' china الصين'; end if;
 if words && array['thailand','تايلند']::text[] then result:=result||' thailand تايلند'; end if;
 if words && array['germany','المانيا']::text[] then result:=result||' germany المانيا'; end if;
 if words && array['netherlands','هولندا']::text[] then result:=result||' netherlands هولندا'; end if;
 if words && array['denmark','الدنمارك']::text[] then result:=result||' denmark الدنمارك'; end if;
 if words && array['france','فرنسا']::text[] then result:=result||' france فرنسا'; end if;
 if words && array['spain','اسبانيا']::text[] then result:=result||' spain اسبانيا'; end if;
 if words && array['sweden','السويد']::text[] then result:=result||' sweden السويد'; end if;
 if words && array['japan','اليابان']::text[] then result:=result||' japan اليابان'; end if;
 if words && array['australia','استراليا']::text[] then result:=result||' australia استراليا'; end if;
 if words && array['singapore','سنغافوره']::text[] then result:=result||' singapore سنغافوره'; end if;
 if words && array['canada','كندا']::text[] then result:=result||' canada كندا'; end if;
 if words && array['italy','ايطاليا']::text[] then result:=result||' italy ايطاليا'; end if;
 if words && array['kuwait','الكويت']::text[] then result:=result||' kuwait الكويت'; end if;
 if words && array['qatar','قطر']::text[] then result:=result||' qatar قطر'; end if;
 if words && array['bahrain','البحرين']::text[] then result:=result||' bahrain البحرين'; end if;
 if words && array['oman','عمان']::text[] then result:=result||' oman عمان'; end if;
 if words && array['uae','الامارات']::text[] then result:=result||' uae الامارات'; end if;
 if strpos(original,'hong kong')>0 or strpos(original,'هونغ كونغ')>0 then result:=result||' hong kong هونغ كونغ'; end if;
 if words && array['taiwan','تايوان']::text[] then result:=result||' taiwan تايوان'; end if;
 if words && array['ice','مثلج']::text[] then result:=result||' ice مثلج'; end if;
 if words && array['iced','مثلج']::text[] then result:=result||' iced مثلج'; end if;
 if words && array['hot','حار']::text[] then result:=result||' hot حار'; end if;
 if words && array['cold','بارد']::text[] then result:=result||' cold بارد'; end if;
 if words && array['natural','طبيعي']::text[] then result:=result||' natural طبيعي'; end if;
 if words && array['washed','مغسول']::text[] then result:=result||' washed مغسول'; end if;
 if words && array['honey','عسلي']::text[] then result:=result||' honey عسلي'; end if;
 if words && array['anaerobic','لاهوايي']::text[] then result:=result||' anaerobic لاهوايي'; end if;
 if words && array['blend','خلطه']::text[] then result:=result||' blend خلطه'; end if;
 if words && array['decaf']::text[] or strpos(original,'منزوع الكافيين')>0 then result:=result||' decaf منزوع الكافيين'; end if;
 if words && array['coffee','قهوه']::text[] then result:=result||' coffee قهوه'; end if;
 if words && array['roastery','محمصه']::text[] then result:=result||' roastery محمصه'; end if;
 if words && array['roasters','محمصه']::text[] then result:=result||' roasters محمصه'; end if;
 if words && array['roaster','محمصه']::text[] then result:=result||' roaster محمصه'; end if;
 if words && array['official','رسمي']::text[] then result:=result||' official رسمي'; end if;
 if words && array['recipe','وصفه']::text[] then result:=result||' recipe وصفه'; end if;
 if words && array['filter','ترشيح']::text[] then result:=result||' filter ترشيح'; end if;
 if words && array['espresso','اسبريسو']::text[] then result:=result||' espresso اسبريسو'; end if;
 if words && array['classic','كلاسيك']::text[] then result:=result||' classic كلاسيك'; end if;
 if words && array['original','الاصلي']::text[] then result:=result||' original الاصلي'; end if;
 if words && array['studio','ستوديو']::text[] then result:=result||' studio ستوديو'; end if;
 if words && array['pro','برو']::text[] then result:=result||' pro برو'; end if;
 if words && array['plus','بلس']::text[] then result:=result||' plus بلس'; end if;
 if words && array['gen','الجيل']::text[] then result:=result||' gen الجيل'; end if;
 if words && array['cup','كوب']::text[] then result:=result||' cup كوب'; end if;
 if words && array['cups','اكواب']::text[] then result:=result||' cups اكواب'; end if;
 if words && array['bomb','بومب']::text[] then result:=result||' bomb بومب'; end if;
 if words && array['bombe','بومب']::text[] then result:=result||' bombe بومب'; end if;
 if words && array['jeed','جيد']::text[] then result:=result||' jeed جيد'; end if;
 if words && array['single','مفرد']::text[] then result:=result||' single مفرد'; end if;
 if words && array['origin','منشا']::text[] then result:=result||' origin منشا'; end if;
 if words && array['milk','حليب']::text[] then result:=result||' milk حليب'; end if;
 if words && array['milky','حليبي']::text[] then result:=result||' milky حليبي'; end if;
 if words && array['cake','كيك']::text[] then result:=result||' cake كيك'; end if;
 if words && array['watermelon','بطيخ']::text[] then result:=result||' watermelon بطيخ'; end if;
 if words && array['whisky','ويسكي']::text[] then result:=result||' whisky ويسكي'; end if;
 if words && array['washedwet','مغسول']::text[] then result:=result||' washedwet مغسول'; end if;
 if words && array['process','معالجه']::text[] then result:=result||' process معالجه'; end if;
 if words && array['geisha','غيشا']::text[] then result:=result||' geisha غيشا'; end if;
 if words && array['gesha','غيشا']::text[] then result:=result||' gesha غيشا'; end if;
 if words && array['holiday','العطلات']::text[] then result:=result||' holiday العطلات'; end if;
 if words && array['house','المنزل']::text[] then result:=result||' house المنزل'; end if;
 if words && array['fruity','فاكهي']::text[] then result:=result||' fruity فاكهي'; end if;
 if words && array['light','فاتح']::text[] then result:=result||' light فاتح'; end if;
 if words && array['medium','متوسط']::text[] then result:=result||' medium متوسط'; end if;
 if words && array['dark','داكن']::text[] then result:=result||' dark داكن'; end if;
 if words && array['roast','تحميص']::text[] then result:=result||' roast تحميص'; end if;
 if words && array['extended','ممتد']::text[] then result:=result||' extended ممتد'; end if;
 if words && array['fermented','مخمر']::text[] then result:=result||' fermented مخمر'; end if;
 if words && array['arabica','ارابيكا']::text[] then result:=result||' arabica ارابيكا'; end if;
 if words && array['robusta','روبوستا']::text[] then result:=result||' robusta روبوستا'; end if;
 if words && array['heirloom']::text[] or strpos(original,'سلالات محليه')>0 then result:=result||' heirloom سلالات محليه'; end if;
 if words && array['bourbon','بوربون']::text[] then result:=result||' bourbon بوربون'; end if;
 if words && array['yellow','اصفر']::text[] then result:=result||' yellow اصفر'; end if;
 if words && array['red','احمر']::text[] then result:=result||' red احمر'; end if;
 if words && array['black','اسود']::text[] then result:=result||' black اسود'; end if;
 if words && array['white','ابيض']::text[] then result:=result||' white ابيض'; end if;
 if words && array['blue','ازرق']::text[] then result:=result||' blue ازرق'; end if;
 if words && array['green','اخضر']::text[] then result:=result||' green اخضر'; end if;
 if words && array['greenland','غرينلاند']::text[] then result:=result||' greenland غرينلاند'; end if;
 if words && array['wet','رطب']::text[] then result:=result||' wet رطب'; end if;
 if words && array['fermentednatural']::text[] or strpos(original,'طبيعي مخمر')>0 then result:=result||' fermentednatural طبيعي مخمر'; end if;
 if words && array['omni']::text[] or strpos(original,'متعدد الاستخدام')>0 then result:=result||' omni متعدد الاستخدام'; end if;
 if words && array['pour','صب']::text[] then result:=result||' pour صب'; end if;
 if words && array['over','ترشيح']::text[] then result:=result||' over ترشيح'; end if;
 if words && array['press','كبس']::text[] then result:=result||' press كبس'; end if;
 if words && array['brew','تحضير']::text[] then result:=result||' brew تحضير'; end if;
 if words && array['brewing','تحضير']::text[] then result:=result||' brewing تحضير'; end if;
 if words && array['arabian','عربي']::text[] then result:=result||' arabian عربي'; end if;
 if words && array['ethiopian','اثيوبي']::text[] then result:=result||' ethiopian اثيوبي'; end if;
 if words && array['colombian','كولومبي']::text[] then result:=result||' colombian كولومبي'; end if;
 if words && array['brazilian','برازيلي']::text[] then result:=result||' brazilian برازيلي'; end if;
 if words && array['comandante','كوماندانتي']::text[] then result:=result||' comandante كوماندانتي'; end if;
 if words && array['fellow','فيلو']::text[] then result:=result||' fellow فيلو'; end if;
 if words && array['timemore']::text[] or strpos(original,'تايم مور')>0 then result:=result||' timemore تايم مور'; end if;
 if words && array['breville','بريفيل']::text[] then result:=result||' breville بريفيل'; end if;
 if words && array['baratza','باراتزا']::text[] then result:=result||' baratza باراتزا'; end if;
 if words && array['acaia','اكايا']::text[] then result:=result||' acaia اكايا'; end if;
 if words && array['niche','نيش']::text[] then result:=result||' niche نيش'; end if;
 if words && array['kinu','كينو']::text[] then result:=result||' kinu كينو'; end if;
 if words && array['gaggia','غاجيا']::text[] then result:=result||' gaggia غاجيا'; end if;
 if words && array['lelit','ليليت']::text[] then result:=result||' lelit ليليت'; end if;
 if words && array['rancilio','رانشيليو']::text[] then result:=result||' rancilio رانشيليو'; end if;
 if words && array['hario','هاريو']::text[] then result:=result||' hario هاريو'; end if;
 if words && array['bialetti','بياليتي']::text[] then result:=result||' bialetti بياليتي'; end if;
 if words && array['wacaco','واكاكو']::text[] then result:=result||' wacaco واكاكو'; end if;
 if words && array['aeropress','ايروبريس']::text[] then result:=result||' aeropress ايروبريس'; end if;
 if words && array['chemex','كيمكس']::text[] then result:=result||' chemex كيمكس'; end if;
 if words && array['kalita','كاليتا']::text[] then result:=result||' kalita كاليتا'; end if;
 if words && array['origami','اوريغامي']::text[] then result:=result||' origami اوريغامي'; end if;
 if words && array['orea','اوريا']::text[] then result:=result||' orea اوريا'; end if;
 if words && array['cafec','كافيك']::text[] then result:=result||' cafec كافيك'; end if;
 if words && array['normcore','نورمكور']::text[] then result:=result||' normcore نورمكور'; end if;
 if words && array['default','الافتراضي']::text[] then result:=result||' default الافتراضي'; end if;
 if words && array['new','جديد']::text[] then result:=result||' new جديد'; end if;
 if words && array['double','مزدوج']::text[] then result:=result||' double مزدوج'; end if;
 if words && array['lot','محصول']::text[] then result:=result||' lot محصول'; end if;
 if words && array['finca','فينكا']::text[] then result:=result||' finca فينكا'; end if;
 if words && array['bloom','التزهير']::text[] then result:=result||' bloom التزهير'; end if;
 if words && array['people','بيبل']::text[] then result:=result||' people بيبل'; end if;
 if words && array['possession','بوسيشن']::text[] then result:=result||' possession بوسيشن'; end if;
 if words && array['sidra','سيدرا']::text[] then result:=result||' sidra سيدرا'; end if;
 if words && array['standout']::text[] or strpos(original,'ستاند اوت')>0 then result:=result||' standout ستاند اوت'; end if;
 if words && array['pink','وردي']::text[] then result:=result||' pink وردي'; end if;
 if words && array['paperswan']::text[] or strpos(original,'بيبر سوان')>0 then result:=result||' paperswan بيبر سوان'; end if;
 if words && array['caturra','كاتورا']::text[] then result:=result||' caturra كاتورا'; end if;
 if words && array['catuai','كاتواي']::text[] then result:=result||' catuai كاتواي'; end if;
 if words && array['santa','سانتا']::text[] then result:=result||' santa سانتا'; end if;
 if words && array['future','فيوتشر']::text[] then result:=result||' future فيوتشر'; end if;
 if words && array['aricha','اريشا']::text[] then result:=result||' aricha اريشا'; end if;
 if words && array['brian','براين']::text[] then result:=result||' brian براين'; end if;
 if words && array['burundi','بوروندي']::text[] then result:=result||' burundi بوروندي'; end if;
 if words && array['ombligon','اومبليغون']::text[] then result:=result||' ombligon اومبليغون'; end if;
 if words && array['standard','قياسي']::text[] then result:=result||' standard قياسي'; end if;
 if words && array['passion','باشن']::text[] then result:=result||' passion باشن'; end if;
 if words && array['savage','سافج']::text[] then result:=result||' savage سافج'; end if;
 if words && array['poma','بوما']::text[] then result:=result||' poma بوما'; end if;
 if words && array['chiroso','تشيروزو']::text[] then result:=result||' chiroso تشيروزو'; end if;
 if words && array['fazenda','فازيندا']::text[] then result:=result||' fazenda فازيندا'; end if;
 if words && array['lasso','لاسو']::text[] then result:=result||' lasso لاسو'; end if;
 if words && array['juan','خوان']::text[] then result:=result||' juan خوان'; end if;
 if words && array['fermentation','تخمير']::text[] then result:=result||' fermentation تخمير'; end if;
 if words && array['ferment','تخمير']::text[] then result:=result||' ferment تخمير'; end if;
 if words && array['gotiti','غوتيتي']::text[] then result:=result||' gotiti غوتيتي'; end if;
 if words && array['chelchele','تشيلتشيلي']::text[] then result:=result||' chelchele تشيلتشيلي'; end if;
 if words && array['hacienda','هاسييندا']::text[] then result:=result||' hacienda هاسييندا'; end if;
 if words && array['onyx','اونيكس']::text[] then result:=result||' onyx اونيكس'; end if;
 if words && array['fruit','فاكهه']::text[] then result:=result||' fruit فاكهه'; end if;
 if words && array['school','سكول']::text[] then result:=result||' school سكول'; end if;
 if words && array['pepe','بيبي']::text[] then result:=result||' pepe بيبي'; end if;
 if words && array['andes','انديز']::text[] then result:=result||' andes انديز'; end if;
 if words && array['kebele','كيبيلي']::text[] then result:=result||' kebele كيبيلي'; end if;
 if words && array['blending','خلط']::text[] then result:=result||' blending خلط'; end if;
 if words && array['thermal','حراري']::text[] then result:=result||' thermal حراري'; end if;
 if words && array['shock','صدمه']::text[] then result:=result||' shock صدمه'; end if;
 if words && array['wave','ويف']::text[] then result:=result||' wave ويف'; end if;
 if words && array['fully','كامل']::text[] then result:=result||' fully كامل'; end if;
 if words && array['day','يوم']::text[] then result:=result||' day يوم'; end if;
 if words && array['rainbow']::text[] or strpos(original,'قوس قزح')>0 then result:=result||' rainbow قوس قزح'; end if;
 if words && array['injerto','انخيرتو']::text[] then result:=result||' injerto انخيرتو'; end if;
 if words && array['eighty','ايتي']::text[] then result:=result||' eighty ايتي'; end if;
 if words && array['paraiso','بارايسو']::text[] then result:=result||' paraiso بارايسو'; end if;
 if words && array['bermudez','بيرموديز']::text[] then result:=result||' bermudez بيرموديز'; end if;
 if words && array['java','جافا']::text[] then result:=result||' java جافا'; end if;
 if words && array['perlitas','بيرليتاس']::text[] then result:=result||' perlitas بيرليتاس'; end if;
 if words && array['triangulo','تريانغولو']::text[] then result:=result||' triangulo تريانغولو'; end if;
 if words && array['rodrigo','رودريغو']::text[] then result:=result||' rodrigo رودريغو'; end if;
 if words && array['sanchez','سانشيز']::text[] then result:=result||' sanchez سانشيز'; end if;
 if words && array['zero','زيرو']::text[] then result:=result||' zero زيرو'; end if;
 if words && array['wild','وايلد']::text[] then result:=result||' wild وايلد'; end if;
 if words && array['arriyadh','الرياض']::text[] then result:=result||' arriyadh الرياض'; end if;
 if words && array['mixed','مشكل']::text[] then result:=result||' mixed مشكل'; end if;
 if words && array['test','تجربه']::text[] then result:=result||' test تجربه'; end if;
 if words && array['not','غير']::text[] then result:=result||' not غير'; end if;
 if words && array['the','ال']::text[] then result:=result||' the ال'; end if;
 if words && array['and','و']::text[] then result:=result||' and و'; end if;
 if words && array['with','مع']::text[] then result:=result||' with مع'; end if;
 if words && array['for','ل']::text[] then result:=result||' for ل'; end if;
 if words && array['diego','دييغو']::text[] then result:=result||' diego دييغو'; end if;
 if words && array['parra','بارا']::text[] then result:=result||' parra بارا'; end if;
 if words && array['wilder','وايلدر']::text[] then result:=result||' wilder وايلدر'; end if;
 if words && array['lazo','لازو']::text[] then result:=result||' lazo لازو'; end if;
 if words && array['bella','بيلا']::text[] then result:=result||' bella بيلا'; end if;
 if words && array['alex','اليكس']::text[] then result:=result||' alex اليكس'; end if;
 if words && array['aponte','ابونتي']::text[] then result:=result||' aponte ابونتي'; end if;
 if words && array['proud','براود']::text[] then result:=result||' proud براود'; end if;
 if words && array['mary','ماري']::text[] then result:=result||' mary ماري'; end if;
 if words && array['rhys','ريس']::text[] then result:=result||' rhys ريس'; end if;
 if words && array['sean','شون']::text[] then result:=result||' sean شون'; end if;
 if words && array['chad','تشاد']::text[] then result:=result||' chad تشاد'; end if;
 if words && array['steven','ستيفن']::text[] then result:=result||' steven ستيفن'; end if;
 if words && array['lin','لين']::text[] then result:=result||' lin لين'; end if;
 if words && array['french','فرنسي']::text[] then result:=result||' french فرنسي'; end if;
 if words && array['mattari','مطري']::text[] then result:=result||' mattari مطري'; end if;
 if words && array['guji','غوجي']::text[] then result:=result||' guji غوجي'; end if;
 if words && array['sidama','سيداما']::text[] then result:=result||' sidama سيداما'; end if;
 if words && array['sidamo','سيدامو']::text[] then result:=result||' sidamo سيدامو'; end if;
 if strpos(original,'3056 espresso blend')>0 or strpos(original,'3056 اسبريسو خلطه')>0 then result:=result||' 3056 espresso blend 3056 اسبريسو خلطه'; end if;
 if strpos(original,'360° profile blend')>0 or strpos(original,'360° بروفيلي خلطه')>0 then result:=result||' 360° profile blend 360° بروفيلي خلطه'; end if;
 if strpos(original,'agostinho forest')>0 or strpos(original,'اغوستينهو فوريست')>0 then result:=result||' agostinho forest اغوستينهو فوريست'; end if;
 if strpos(original,'alba — 250 g')>0 or strpos(original,'البا — 250 g')>0 then result:=result||' alba — 250 g البا — 250 g'; end if;
 if strpos(original,'all black knight coffees — iced')>0 or strpos(original,'الل اسود كنيغت كوففيس — مثلج')>0 then result:=result||' all black knight coffees — iced الل اسود كنيغت كوففيس — مثلج'; end if;
 if strpos(original,'amberwood reserve (wood-fired coffee)')>0 or strpos(original,'امبيروود ريسيرفي (وود-فيريد قهوه)')>0 then result:=result||' amberwood reserve (wood-fired coffee) امبيروود ريسيرفي (وود-فيريد قهوه)'; end if;
 if strpos(original,'applewood reserve (wood-fired coffee)')>0 or strpos(original,'اببليوود ريسيرفي (وود-فيريد قهوه)')>0 then result:=result||' applewood reserve (wood-fired coffee) اببليوود ريسيرفي (وود-فيريد قهوه)'; end if;
 if strpos(original,'aquiares — costa rica — natural')>0 or strpos(original,'اكوياريس — كوستاريكا — طبيعي')>0 then result:=result||' aquiares — costa rica — natural اكوياريس — كوستاريكا — طبيعي'; end if;
 if strpos(original,'arabic gahwa')>0 or strpos(original,'ارابيك غاهوا')>0 then result:=result||' arabic gahwa ارابيك غاهوا'; end if;
 if words && array['ardi','اردي']::text[] then result:=result||' ardi اردي'; end if;
 if words && array['aspen','اسبين']::text[] then result:=result||' aspen اسبين'; end if;
 if strpos(original,'atlas coffee')>0 or strpos(original,'اتلاس قهوه')>0 then result:=result||' atlas coffee اتلاس قهوه'; end if;
 if strpos(original,'bani ismail | yemen')>0 or strpos(original,'باني يسمايل | اليمن')>0 then result:=result||' bani ismail | yemen باني يسمايل | اليمن'; end if;
 if strpos(original,'barista elite supremo espresso')>0 or strpos(original,'باريستا يليتي سوبريمو اسبريسو')>0 then result:=result||' barista elite supremo espresso باريستا يليتي سوبريمو اسبريسو'; end if;
 if strpos(original,'benti nenqa — ethiopia — washed')>0 or strpos(original,'بينتي نينقا — اثيوبيا — مغسول')>0 then result:=result||' benti nenqa — ethiopia — washed بينتي نينقا — اثيوبيا — مغسول'; end if;
 if strpos(original,'berry blues')>0 or strpos(original,'بيرري بلويس')>0 then result:=result||' berry blues بيرري بلويس'; end if;
 if strpos(original,'big trouble')>0 or strpos(original,'بيغ تروبلي')>0 then result:=result||' big trouble بيغ تروبلي'; end if;
 if strpos(original,'big truck')>0 or strpos(original,'بيغ تروك')>0 then result:=result||' big truck بيغ تروك'; end if;
 if words && array['bittersweet','بيتتيرسويت']::text[] then result:=result||' bittersweet بيتتيرسويت'; end if;
 if strpos(original,'black cat classic espresso')>0 or strpos(original,'اسود كات كلاسيك اسبريسو')>0 then result:=result||' black cat classic espresso اسود كات كلاسيك اسبريسو'; end if;
 if strpos(original,'black diamond')>0 or strpos(original,'اسود دياموند')>0 then result:=result||' black diamond اسود دياموند'; end if;
 if strpos(original,'black forest blend')>0 or strpos(original,'اسود فوريست خلطه')>0 then result:=result||' black forest blend اسود فوريست خلطه'; end if;
 if strpos(original,'black swan')>0 or strpos(original,'اسود سوان')>0 then result:=result||' black swan اسود سوان'; end if;
 if strpos(original,'blue sky espresso')>0 or strpos(original,'ازرق سكي اسبريسو')>0 then result:=result||' blue sky espresso ازرق سكي اسبريسو'; end if;
 if strpos(original,'bolivia gregorio palli, anoxic washed')>0 or strpos(original,'بوليفيا غريغوريو باللي, انوكسيك مغسول')>0 then result:=result||' bolivia gregorio palli, anoxic washed بوليفيا غريغوريو باللي, انوكسيك مغسول'; end if;
 if strpos(original,'bombe — ethiopia — natural')>0 or strpos(original,'بومب — اثيوبيا — طبيعي')>0 then result:=result||' bombe — ethiopia — natural بومب — اثيوبيا — طبيعي'; end if;
 if strpos(original,'bond street espresso blend')>0 or strpos(original,'بوند ستريت اسبريسو خلطه')>0 then result:=result||' bond street espresso blend بوند ستريت اسبريسو خلطه'; end if;
 if strpos(original,'bossa nova | brazil')>0 or strpos(original,'بوسسا نوفا | البرازيل')>0 then result:=result||' bossa nova | brazil بوسسا نوفا | البرازيل'; end if;
 if strpos(original,'brazil — classic')>0 or strpos(original,'البرازيل — كلاسيك')>0 then result:=result||' brazil — classic البرازيل — كلاسيك'; end if;
 if strpos(original,'brazil alta mogiana')>0 or strpos(original,'البرازيل التا موغيانا')>0 then result:=result||' brazil alta mogiana البرازيل التا موغيانا'; end if;
 if strpos(original,'brazil cascavel vermelha (natural)')>0 or strpos(original,'البرازيل كاسكافيل فيرميلها (طبيعي)')>0 then result:=result||' brazil cascavel vermelha (natural) البرازيل كاسكافيل فيرميلها (طبيعي)'; end if;
 if strpos(original,'brazil diamond')>0 or strpos(original,'البرازيل دياموند')>0 then result:=result||' brazil diamond البرازيل دياموند'; end if;
 if strpos(original,'brazil fazenda samambaia')>0 or strpos(original,'البرازيل فازيندا سامامبايا')>0 then result:=result||' brazil fazenda samambaia البرازيل فازيندا سامامبايا'; end if;
 if strpos(original,'brazil inacio urban')>0 or strpos(original,'البرازيل يناكيو وربان')>0 then result:=result||' brazil inacio urban البرازيل يناكيو وربان'; end if;
 if strpos(original,'brazil rancho grande estate')>0 or strpos(original,'البرازيل رانتشو غراندي يستاتي')>0 then result:=result||' brazil rancho grande estate البرازيل رانتشو غراندي يستاتي'; end if;
 if strpos(original,'brazil roast')>0 or strpos(original,'البرازيل تحميص')>0 then result:=result||' brazil roast البرازيل تحميص'; end if;
 if strpos(original,'brazil santa lucia')>0 or strpos(original,'البرازيل سانتا لوكيا')>0 then result:=result||' brazil santa lucia البرازيل سانتا لوكيا'; end if;
 if strpos(original,'brazil wafer')>0 or strpos(original,'البرازيل وافير')>0 then result:=result||' brazil wafer البرازيل وافير'; end if;
 if strpos(original,'brazilian coffee beans')>0 or strpos(original,'برازيلي قهوه بينس')>0 then result:=result||' brazilian coffee beans برازيلي قهوه بينس'; end if;
 if strpos(original,'bright eye -- speciality blend')>0 or strpos(original,'بريغت ييي -- سبيكياليتي خلطه')>0 then result:=result||' bright eye -- speciality blend بريغت ييي -- سبيكياليتي خلطه'; end if;
 if words && array['broadway','بروادواي']::text[] then result:=result||' broadway بروادواي'; end if;
 if words && array['brunswick','برونسويك']::text[] then result:=result||' brunswick برونسويك'; end if;
 if strpos(original,'buena vista dark roast')>0 or strpos(original,'بوينا فيستا داكن تحميص')>0 then result:=result||' buena vista dark roast بوينا فيستا داكن تحميص'; end if;
 if strpos(original,'buenos dias')>0 or strpos(original,'بوينوس دياس')>0 then result:=result||' buenos dias بوينوس دياس'; end if;
 if words && array['caramello','كاراميللو']::text[] then result:=result||' caramello كاراميللو'; end if;
 if words && array['chakra','تشاكرا']::text[] then result:=result||' chakra تشاكرا'; end if;
 if words && array['chelelektu','تشيليليكتو']::text[] then result:=result||' chelelektu تشيليليكتو'; end if;
 if words && array['chire','تشيري']::text[] then result:=result||' chire تشيري'; end if;
 if strpos(original,'churupallana 2026')>0 or strpos(original,'تشوروباللانا 2026')>0 then result:=result||' churupallana 2026 تشوروباللانا 2026'; end if;
 if strpos(original,'cocoa caramel blend')>0 or strpos(original,'كوكوا كاراميل خلطه')>0 then result:=result||' cocoa caramel blend كوكوا كاراميل خلطه'; end if;
 if strpos(original,'colombia — buesaco — natural')>0 or strpos(original,'كولومبيا — بويساكو — طبيعي')>0 then result:=result||' colombia — buesaco — natural كولومبيا — بويساكو — طبيعي'; end if;
 if strpos(original,'colombia — cerro azul — honey geisha (competition series)')>0 or strpos(original,'كولومبيا — كيررو ازول — عسلي غيشا (كومبيتيتيون سيريس)')>0 then result:=result||' colombia — cerro azul — honey geisha (competition series) كولومبيا — كيررو ازول — عسلي غيشا (كومبيتيتيون سيريس)'; end if;
 if strpos(original,'colombia — decaf')>0 or strpos(original,'كولومبيا — منزوع الكافيين')>0 then result:=result||' colombia — decaf كولومبيا — منزوع الكافيين'; end if;
 if strpos(original,'colombia arcila - anaerobic honey')>0 or strpos(original,'كولومبيا اركيلا - لاهوايي عسلي')>0 then result:=result||' colombia arcila - anaerobic honey كولومبيا اركيلا - لاهوايي عسلي'; end if;
 if strpos(original,'colombia calderon - anaerobic natural')>0 or strpos(original,'كولومبيا كالديرون - لاهوايي طبيعي')>0 then result:=result||' colombia calderon - anaerobic natural كولومبيا كالديرون - لاهوايي طبيعي'; end if;
 if strpos(original,'colombia catiope bourbon')>0 or strpos(original,'كولومبيا كاتيوبي بوربون')>0 then result:=result||' colombia catiope bourbon كولومبيا كاتيوبي بوربون'; end if;
 if strpos(original,'colombia cauca natural')>0 or strpos(original,'كولومبيا كاوكا طبيعي')>0 then result:=result||' colombia cauca natural كولومبيا كاوكا طبيعي'; end if;
 if strpos(original,'colombia chambaku (online exclusive)')>0 or strpos(original,'كولومبيا تشامباكو (ونليني يكسكلوسيفي)')>0 then result:=result||' colombia chambaku (online exclusive) كولومبيا تشامباكو (ونليني يكسكلوسيفي)'; end if;
 if strpos(original,'colombia cherry')>0 or strpos(original,'كولومبيا كرز')>0 then result:=result||' colombia cherry كولومبيا كرز'; end if;
 if strpos(original,'colombia coconut – mont blanco')>0 or strpos(original,'كولومبيا كوكونوت – مونت بلانكو')>0 then result:=result||' colombia coconut – mont blanco كولومبيا كوكونوت – مونت بلانكو'; end if;
 if strpos(original,'colombia decaf')>0 or strpos(original,'كولومبيا منزوع الكافيين')>0 then result:=result||' colombia decaf كولومبيا منزوع الكافيين'; end if;
 if strpos(original,'colombia decaf – tumbaga sugarcane')>0 or strpos(original,'كولومبيا منزوع الكافيين – تومباغا سوغاركاني')>0 then result:=result||' colombia decaf – tumbaga sugarcane كولومبيا منزوع الكافيين – تومباغا سوغاركاني'; end if;
 if strpos(original,'colombia decaf coffee')>0 or strpos(original,'كولومبيا منزوع الكافيين قهوه')>0 then result:=result||' colombia decaf coffee كولومبيا منزوع الكافيين قهوه'; end if;
 if strpos(original,'colombia el meson – filter')>0 or strpos(original,'كولومبيا يل ميسون – ترشيح')>0 then result:=result||' colombia el meson – filter كولومبيا يل ميسون – ترشيح'; end if;
 if strpos(original,'colombia excelso')>0 or strpos(original,'كولومبيا يكسكيلسو')>0 then result:=result||' colombia excelso كولومبيا يكسكيلسو'; end if;
 if strpos(original,'colombia finca zarza fruit forward papayo natural')>0 or strpos(original,'كولومبيا فينكا زارزا فاكهه فوروارد بابايو طبيعي')>0 then result:=result||' colombia finca zarza fruit forward papayo natural كولومبيا فينكا زارزا فاكهه فوروارد بابايو طبيعي'; end if;
 if strpos(original,'colombia geisha marcela')>0 or strpos(original,'كولومبيا غيشا ماركيلا')>0 then result:=result||' colombia geisha marcela كولومبيا غيشا ماركيلا'; end if;
 if strpos(original,'colombia giesha')>0 or strpos(original,'كولومبيا غيشا')>0 then result:=result||' colombia giesha كولومبيا غيشا'; end if;
 if strpos(original,'colombia hermides meneses')>0 or strpos(original,'كولومبيا هيرميديس مينيسيس')>0 then result:=result||' colombia hermides meneses كولومبيا هيرميديس مينيسيس'; end if;
 if strpos(original,'colombia la cristalina')>0 or strpos(original,'كولومبيا لا كريستالينا')>0 then result:=result||' colombia la cristalina كولومبيا لا كريستالينا'; end if;
 if strpos(original,'colombia laplata')>0 or strpos(original,'كولومبيا لابلاتا')>0 then result:=result||' colombia laplata كولومبيا لابلاتا'; end if;
 if strpos(original,'colombia las palmas')>0 or strpos(original,'كولومبيا لاس بالماس')>0 then result:=result||' colombia las palmas كولومبيا لاس بالماس'; end if;
 if strpos(original,'colombia palladas natural')>0 or strpos(original,'كولومبيا باللاداس طبيعي')>0 then result:=result||' colombia palladas natural كولومبيا باللاداس طبيعي'; end if;
 if strpos(original,'colombia passion fruit')>0 or strpos(original,'كولومبيا باشن فاكهه')>0 then result:=result||' colombia passion fruit كولومبيا باشن فاكهه'; end if;
 if strpos(original,'colombia passion fruit – mont blanco')>0 or strpos(original,'كولومبيا باشن فاكهه – مونت بلانكو')>0 then result:=result||' colombia passion fruit – mont blanco كولومبيا باشن فاكهه – مونت بلانكو'; end if;
 if strpos(original,'colombia sanchez finca monteblanco')>0 or strpos(original,'كولومبيا سانشيز فينكا مونتيبلانكو')>0 then result:=result||' colombia sanchez finca monteblanco كولومبيا سانشيز فينكا مونتيبلانكو'; end if;
 if strpos(original,'colombia santa ana')>0 or strpos(original,'كولومبيا سانتا انا')>0 then result:=result||' colombia santa ana كولومبيا سانتا انا'; end if;
 if strpos(original,'colombia sierra nevada')>0 or strpos(original,'كولومبيا سيررا نيفادا')>0 then result:=result||' colombia sierra nevada كولومبيا سيررا نيفادا'; end if;
 if strpos(original,'colombia supremo')>0 or strpos(original,'كولومبيا سوبريمو')>0 then result:=result||' colombia supremo كولومبيا سوبريمو'; end if;
 if strpos(original,'colombia watermelon')>0 or strpos(original,'كولومبيا بطيخ')>0 then result:=result||' colombia watermelon كولومبيا بطيخ'; end if;
 if strpos(original,'colombian coffee supremo')>0 or strpos(original,'كولومبي قهوه سوبريمو')>0 then result:=result||' colombian coffee supremo كولومبي قهوه سوبريمو'; end if;
 if strpos(original,'costa rica — los robles — natural reposado')>0 or strpos(original,'كوستاريكا — لوس روبليس — طبيعي ريبوسادو')>0 then result:=result||' costa rica — los robles — natural reposado كوستاريكا — لوس روبليس — طبيعي ريبوسادو'; end if;
 if strpos(original,'costa rica adelina fallas honey')>0 or strpos(original,'كوستاريكا اديلينا فاللاس عسلي')>0 then result:=result||' costa rica adelina fallas honey كوستاريكا اديلينا فاللاس عسلي'; end if;
 if strpos(original,'costa rica baratila')>0 or strpos(original,'كوستاريكا باراتيلا')>0 then result:=result||' costa rica baratila كوستاريكا باراتيلا'; end if;
 if strpos(original,'costa rica el patalilo')>0 or strpos(original,'كوستاريكا يل باتاليلو')>0 then result:=result||' costa rica el patalilo كوستاريكا يل باتاليلو'; end if;
 if strpos(original,'costa rica granitos - ortiz 1800, catuai, yellow honey')>0 or strpos(original,'كوستاريكا غرانيتوس - ورتيز 1800, كاتواي, اصفر عسلي')>0 then result:=result||' costa rica granitos - ortiz 1800, catuai, yellow honey كوستاريكا غرانيتوس - ورتيز 1800, كاتواي, اصفر عسلي'; end if;
 if strpos(original,'costa rica las lajas natural')>0 or strpos(original,'كوستاريكا لاس لاجاس طبيعي')>0 then result:=result||' costa rica las lajas natural كوستاريكا لاس لاجاس طبيعي'; end if;
 if strpos(original,'costa rica rio')>0 or strpos(original,'كوستاريكا ريو')>0 then result:=result||' costa rica rio كوستاريكا ريو'; end if;
 if strpos(original,'cream donut')>0 or strpos(original,'كريم دونوت')>0 then result:=result||' cream donut كريم دونوت'; end if;
 if strpos(original,'cumbres decaffeinated')>0 or strpos(original,'كومبريس ديكاففييناتيد')>0 then result:=result||' cumbres decaffeinated كومبريس ديكاففييناتيد'; end if;
 if strpos(original,'dark sugars')>0 or strpos(original,'داكن سوغارس')>0 then result:=result||' dark sugars داكن سوغارس'; end if;
 if strpos(original,'darkness -- speciality blend')>0 or strpos(original,'داركنيسس -- سبيكياليتي خلطه')>0 then result:=result||' darkness -- speciality blend داركنيسس -- سبيكياليتي خلطه'; end if;
 if strpos(original,'dawn - crafted filter blend')>0 or strpos(original,'داون - كرافتيد ترشيح خلطه')>0 then result:=result||' dawn - crafted filter blend داون - كرافتيد ترشيح خلطه'; end if;
 if strpos(original,'desert -- speciality blend')>0 or strpos(original,'ديسيرت -- سبيكياليتي خلطه')>0 then result:=result||' desert -- speciality blend ديسيرت -- سبيكياليتي خلطه'; end if;
 if strpos(original,'dusk - crafted espresso blend')>0 or strpos(original,'دوسك - كرافتيد اسبريسو خلطه')>0 then result:=result||' dusk - crafted espresso blend دوسك - كرافتيد اسبريسو خلطه'; end if;
 if strpos(original,'ecuador finca la aurum - auction lot')>0 or strpos(original,'الاكوادور فينكا لا اوروم - اوكتيون محصول')>0 then result:=result||' ecuador finca la aurum - auction lot الاكوادور فينكا لا اوروم - اوكتيون محصول'; end if;
 if strpos(original,'el angel')>0 or strpos(original,'يل aنغيل')>0 then result:=result||' el angel يل aنغيل'; end if;
 if strpos(original,'el kaif -- speciality blend')>0 or strpos(original,'يل كايف -- سبيكياليتي خلطه')>0 then result:=result||' el kaif -- speciality blend يل كايف -- سبيكياليتي خلطه'; end if;
 if strpos(original,'el salvador -- gourmet')>0 or strpos(original,'السلفادور -- غورميت')>0 then result:=result||' el salvador -- gourmet السلفادور -- غورميت'; end if;
 if strpos(original,'el salvador -- natural')>0 or strpos(original,'السلفادور -- طبيعي')>0 then result:=result||' el salvador -- natural السلفادور -- طبيعي'; end if;
 if strpos(original,'el salvador — finca colombia — natural gesha')>0 or strpos(original,'السلفادور — فينكا كولومبيا — طبيعي غيشا')>0 then result:=result||' el salvador — finca colombia — natural gesha السلفادور — فينكا كولومبيا — طبيعي غيشا'; end if;
 if strpos(original,'el salvador don jaime')>0 or strpos(original,'السلفادور دون جايمي')>0 then result:=result||' el salvador don jaime السلفادور دون جايمي'; end if;
 if strpos(original,'el salvador emerson vasquez pacamara')>0 or strpos(original,'السلفادور يميرسون فاسكويز باكامارا')>0 then result:=result||' el salvador emerson vasquez pacamara السلفادور يميرسون فاسكويز باكامارا'; end if;
 if strpos(original,'el salvador finca argentina, yellow pacamara, natural')>0 or strpos(original,'السلفادور فينكا ارغينتينا, اصفر باكامارا, طبيعي')>0 then result:=result||' el salvador finca argentina, yellow pacamara, natural السلفادور فينكا ارغينتينا, اصفر باكامارا, طبيعي'; end if;
 if strpos(original,'elemental coffee')>0 or strpos(original,'يليمينتال قهوه')>0 then result:=result||' elemental coffee يليمينتال قهوه'; end if;
 if strpos(original,'elida estate torre')>0 or strpos(original,'يليدا يستاتي تورري')>0 then result:=result||' elida estate torre يليدا يستاتي تورري'; end if;
 if strpos(original,'elixir - brazil')>0 or strpos(original,'يليكسير - البرازيل')>0 then result:=result||' elixir - brazil يليكسير - البرازيل'; end if;
 if strpos(original,'epic espresso')>0 or strpos(original,'يبيك اسبريسو')>0 then result:=result||' epic espresso يبيك اسبريسو'; end if;
 if strpos(original,'ethiopia - guji')>0 or strpos(original,'اثيوبيا - غوجي')>0 then result:=result||' ethiopia - guji اثيوبيا - غوجي'; end if;
 if strpos(original,'ethiopia -- guji')>0 or strpos(original,'اثيوبيا -- غوجي')>0 then result:=result||' ethiopia -- guji اثيوبيا -- غوجي'; end if;
 if strpos(original,'ethiopia — bench maji — natural')>0 or strpos(original,'اثيوبيا — بينتش ماجي — طبيعي')>0 then result:=result||' ethiopia — bench maji — natural اثيوبيا — بينتش ماجي — طبيعي'; end if;
 if strpos(original,'ethiopia agaro yukro g1')>0 or strpos(original,'اثيوبيا اغارو يوكرو g1')>0 then result:=result||' ethiopia agaro yukro g1 اثيوبيا اغارو يوكرو g1'; end if;
 if strpos(original,'ethiopia anasora honey 89')>0 or strpos(original,'اثيوبيا اناسورا عسلي 89')>0 then result:=result||' ethiopia anasora honey 89 اثيوبيا اناسورا عسلي 89'; end if;
 if strpos(original,'ethiopia aricha - natural')>0 or strpos(original,'اثيوبيا اريشا - طبيعي')>0 then result:=result||' ethiopia aricha - natural اثيوبيا اريشا - طبيعي'; end if;
 if strpos(original,'ethiopia bisrat melaku washed')>0 or strpos(original,'اثيوبيا بيسرات ميلاكو مغسول')>0 then result:=result||' ethiopia bisrat melaku washed اثيوبيا بيسرات ميلاكو مغسول'; end if;
 if strpos(original,'ethiopia bona zuria fermented')>0 or strpos(original,'اثيوبيا بونا زوريا مخمر')>0 then result:=result||' ethiopia bona zuria fermented اثيوبيا بونا زوريا مخمر'; end if;
 if strpos(original,'ethiopia chelchele')>0 or strpos(original,'اثيوبيا تشيلتشيلي')>0 then result:=result||' ethiopia chelchele اثيوبيا تشيلتشيلي'; end if;
 if strpos(original,'ethiopia chelichele – yirgacheffe')>0 or strpos(original,'اثيوبيا تشيليتشيلي – ييرغاتشيففي')>0 then result:=result||' ethiopia chelichele – yirgacheffe اثيوبيا تشيليتشيلي – ييرغاتشيففي'; end if;
 if strpos(original,'ethiopia daye bensa hamasho natural')>0 or strpos(original,'اثيوبيا دايي بينسا هاماشو طبيعي')>0 then result:=result||' ethiopia daye bensa hamasho natural اثيوبيا دايي بينسا هاماشو طبيعي'; end if;
 if strpos(original,'ethiopia goro bedesa fermented')>0 or strpos(original,'اثيوبيا غورو بيديسا مخمر')>0 then result:=result||' ethiopia goro bedesa fermented اثيوبيا غورو بيديسا مخمر'; end if;
 if strpos(original,'ethiopia gotiti super natural')>0 or strpos(original,'اثيوبيا غوتيتي سوبير طبيعي')>0 then result:=result||' ethiopia gotiti super natural اثيوبيا غوتيتي سوبير طبيعي'; end if;
 if strpos(original,'ethiopia guji — filter')>0 or strpos(original,'اثيوبيا غوجي — ترشيح')>0 then result:=result||' ethiopia guji — filter اثيوبيا غوجي — ترشيح'; end if;
 if strpos(original,'ethiopia guji coffee beans')>0 or strpos(original,'اثيوبيا غوجي قهوه بينس')>0 then result:=result||' ethiopia guji coffee beans اثيوبيا غوجي قهوه بينس'; end if;
 if strpos(original,'ethiopia guji g1 masina')>0 or strpos(original,'اثيوبيا غوجي g1 ماسينا')>0 then result:=result||' ethiopia guji g1 masina اثيوبيا غوجي g1 ماسينا'; end if;
 if strpos(original,'ethiopia guji shakiso')>0 or strpos(original,'اثيوبيا غوجي شاكيسو')>0 then result:=result||' ethiopia guji shakiso اثيوبيا غوجي شاكيسو'; end if;
 if strpos(original,'ethiopia hambela halaka')>0 or strpos(original,'اثيوبيا هامبيلا هالاكا')>0 then result:=result||' ethiopia hambela halaka اثيوبيا هامبيلا هالاكا'; end if;
 if strpos(original,'ethiopia hambella')>0 or strpos(original,'اثيوبيا هامبيللا')>0 then result:=result||' ethiopia hambella اثيوبيا هامبيللا'; end if;
 if strpos(original,'ethiopia jininet')>0 or strpos(original,'اثيوبيا جينينيت')>0 then result:=result||' ethiopia jininet اثيوبيا جينينيت'; end if;
 if strpos(original,'ethiopia kello lalesa – filter')>0 or strpos(original,'اثيوبيا كيللو لاليسا – ترشيح')>0 then result:=result||' ethiopia kello lalesa – filter اثيوبيا كيللو لاليسا – ترشيح'; end if;
 if strpos(original,'ethiopia korma (natural)')>0 or strpos(original,'اثيوبيا كورما (طبيعي)')>0 then result:=result||' ethiopia korma (natural) اثيوبيا كورما (طبيعي)'; end if;
 if strpos(original,'ethiopia rumudamo anaerobic')>0 or strpos(original,'اثيوبيا رومودامو لاهوايي')>0 then result:=result||' ethiopia rumudamo anaerobic اثيوبيا رومودامو لاهوايي'; end if;
 if strpos(original,'ethiopia sidamo anearobic')>0 or strpos(original,'اثيوبيا سيدامو انيروبيك')>0 then result:=result||' ethiopia sidamo anearobic اثيوبيا سيدامو انيروبيك'; end if;
 if strpos(original,'ethiopia uraga')>0 or strpos(original,'اثيوبيا وراغا')>0 then result:=result||' ethiopia uraga اثيوبيا وراغا'; end if;
 if strpos(original,'ethiopia yirgacheffe beans')>0 or strpos(original,'اثيوبيا ييرغاتشيففي بينس')>0 then result:=result||' ethiopia yirgacheffe beans اثيوبيا ييرغاتشيففي بينس'; end if;
 if strpos(original,'ethiopian enaria')>0 or strpos(original,'اثيوبي يناريا')>0 then result:=result||' ethiopian enaria اثيوبي يناريا'; end if;
 if strpos(original,'ex-wife espresso blend')>0 or strpos(original,'يكس-ويفي اسبريسو خلطه')>0 then result:=result||' ex-wife espresso blend يكس-ويفي اسبريسو خلطه'; end if;
 if strpos(original,'excelso (colombia)')>0 or strpos(original,'يكسكيلسو (كولومبيا)')>0 then result:=result||' excelso (colombia) يكسكيلسو (كولومبيا)'; end if;
 if strpos(original,'finca ecuador – honey')>0 or strpos(original,'فينكا الاكوادور – عسلي')>0 then result:=result||' finca ecuador – honey فينكا الاكوادور – عسلي'; end if;
 if strpos(original,'finca el bosque')>0 or strpos(original,'فينكا يل بوسكوي')>0 then result:=result||' finca el bosque فينكا يل بوسكوي'; end if;
 if strpos(original,'finca el diviso')>0 or strpos(original,'فينكا يل ديفيسو')>0 then result:=result||' finca el diviso فينكا يل ديفيسو'; end if;
 if strpos(original,'finca tamana caturron')>0 or strpos(original,'فينكا تامانا كاتوررون')>0 then result:=result||' finca tamana caturron فينكا تامانا كاتوررون'; end if;
 if strpos(original,'freddy mellado | peru')>0 or strpos(original,'فريددي ميللادو | بيرو')>0 then result:=result||' freddy mellado | peru فريددي ميللادو | بيرو'; end if;
 if strpos(original,'funky weekend blend')>0 or strpos(original,'فونكي ويكيند خلطه')>0 then result:=result||' funky weekend blend فونكي ويكيند خلطه'; end if;
 if words && array['gachatha','غاتشاثا']::text[] then result:=result||' gachatha غاتشاثا'; end if;
 if strpos(original,'gargari gutity g1 red')>0 or strpos(original,'غارغاري غوتيتي g1 احمر')>0 then result:=result||' gargari gutity g1 red غارغاري غوتيتي g1 احمر'; end if;
 if strpos(original,'geisha 72 honey process')>0 or strpos(original,'غيشا 72 عسلي معالجه')>0 then result:=result||' geisha 72 honey process غيشا 72 عسلي معالجه'; end if;
 if strpos(original,'genesis coffee')>0 or strpos(original,'غينيسيس قهوه')>0 then result:=result||' genesis coffee غينيسيس قهوه'; end if;
 if words && array['geometry','غيوميتري']::text[] then result:=result||' geometry غيوميتري'; end if;
 if strpos(original,'golden waffle')>0 or strpos(original,'غولدين واففلي')>0 then result:=result||' golden waffle غولدين واففلي'; end if;
 if strpos(original,'guatemala roast')>0 or strpos(original,'غواتيمالا تحميص')>0 then result:=result||' guatemala roast غواتيمالا تحميص'; end if;
 if words && array['guayata','غواياتا']::text[] then result:=result||' guayata غواياتا'; end if;
 if strpos(original,'habmela - ethiopia (hambela)')>0 or strpos(original,'هابميلا - اثيوبيا (هامبيلا)')>0 then result:=result||' habmela - ethiopia (hambela) هابميلا - اثيوبيا (هامبيلا)'; end if;
 if strpos(original,'hambela supernatural')>0 or strpos(original,'هامبيلا سوبيرناتورال')>0 then result:=result||' hambela supernatural هامبيلا سوبيرناتورال'; end if;
 if strpos(original,'honduras fredy perez')>0 or strpos(original,'هندوراس فريدي بيريز')>0 then result:=result||' honduras fredy perez هندوراس فريدي بيريز'; end if;
 if strpos(original,'india single origin coffee beans')>0 or strpos(original,'الهند احادي المنشا قهوه بينس')>0 then result:=result||' india single origin coffee beans الهند احادي المنشا قهوه بينس'; end if;
 if strpos(original,'indonesia frinsa estate weninggalih')>0 or strpos(original,'اندونيسيا فرينسا يستاتي وينينغغاليه')>0 then result:=result||' indonesia frinsa estate weninggalih اندونيسيا فرينسا يستاتي وينينغغاليه'; end if;
 if strpos(original,'indonesia pantan musara (washed)')>0 or strpos(original,'اندونيسيا بانتان موسارا (مغسول)')>0 then result:=result||' indonesia pantan musara (washed) اندونيسيا بانتان موسارا (مغسول)'; end if;
 if strpos(original,'jhenrry chavez')>0 or strpos(original,'جهينرري تشافيز')>0 then result:=result||' jhenrry chavez جهينرري تشافيز'; end if;
 if strpos(original,'juice box')>0 or strpos(original,'جويكي بوكس')>0 then result:=result||' juice box جويكي بوكس'; end if;
 if strpos(original,'julian calderon pink bourbon')>0 or strpos(original,'جوليان كالديرون وردي بوربون')>0 then result:=result||' julian calderon pink bourbon جوليان كالديرون وردي بوربون'; end if;
 if words && array['kafipamba','كافيبامبا']::text[] then result:=result||' kafipamba كافيبامبا'; end if;
 if strpos(original,'kaliluni aa')>0 or strpos(original,'كاليلوني aa')>0 then result:=result||' kaliluni aa كاليلوني aa'; end if;
 if strpos(original,'kamavindi washed sl28 & sl34 aa')>0 or strpos(original,'كامافيندي مغسول sl28 & sl34 aa')>0 then result:=result||' kamavindi washed sl28 & sl34 aa كامافيندي مغسول sl28 & sl34 aa'; end if;
 if strpos(original,'kayon mountain natural heirloom')>0 or strpos(original,'كايون مونتاين طبيعي سلالات محليه')>0 then result:=result||' kayon mountain natural heirloom كايون مونتاين طبيعي سلالات محليه'; end if;
 if strpos(original,'kenya anaerobic')>0 or strpos(original,'كينيا لاهوايي')>0 then result:=result||' kenya anaerobic كينيا لاهوايي'; end if;
 if strpos(original,'kenya gatomboya ab')>0 or strpos(original,'كينيا غاتومبويا ab')>0 then result:=result||' kenya gatomboya ab كينيا غاتومبويا ab'; end if;
 if strpos(original,'kenya gicherori washed')>0 or strpos(original,'كينيا غيتشيروري مغسول')>0 then result:=result||' kenya gicherori washed كينيا غيتشيروري مغسول'; end if;
 if strpos(original,'kenya kamunyaka aa')>0 or strpos(original,'كينيا كامونياكا aa')>0 then result:=result||' kenya kamunyaka aa كينيا كامونياكا aa'; end if;
 if strpos(original,'kenya kangocho aa')>0 or strpos(original,'كينيا كانغوتشو aa')>0 then result:=result||' kenya kangocho aa كينيا كانغوتشو aa'; end if;
 if strpos(original,'kenya ruiruiru - anaerobic natural')>0 or strpos(original,'كينيا رويرويرو - لاهوايي طبيعي')>0 then result:=result||' kenya ruiruiru - anaerobic natural كينيا رويرويرو - لاهوايي طبيعي'; end if;
 if strpos(original,'kenya sasha')>0 or strpos(original,'كينيا ساشا')>0 then result:=result||' kenya sasha كينيا ساشا'; end if;
 if strpos(original,'kenya thunguri aa – filter')>0 or strpos(original,'كينيا ثونغوري aa – ترشيح')>0 then result:=result||' kenya thunguri aa – filter كينيا ثونغوري aa – ترشيح'; end if;
 if strpos(original,'khayalah mountain')>0 or strpos(original,'خايالاه مونتاين')>0 then result:=result||' khayalah mountain خايالاه مونتاين'; end if;
 if strpos(original,'kiambu regional c')>0 or strpos(original,'كيامبو ريغيونال c')>0 then result:=result||' kiambu regional c كيامبو ريغيونال c'; end if;
 if words && array['kii','كيي']::text[] then result:=result||' kii كيي'; end if;
 if strpos(original,'la plata decaf')>0 or strpos(original,'لا بلاتا منزوع الكافيين')>0 then result:=result||' la plata decaf لا بلاتا منزوع الكافيين'; end if;
 if strpos(original,'la torre mejia geisha')>0 or strpos(original,'لا تورري ميجيا غيشا')>0 then result:=result||' la torre mejia geisha لا تورري ميجيا غيشا'; end if;
 if strpos(original,'lalesa ephtah')>0 or strpos(original,'لاليسا يفتاه')>0 then result:=result||' lalesa ephtah لاليسا يفتاه'; end if;
 if strpos(original,'laymoon twist (costa rica red honey)')>0 or strpos(original,'لايمون تويست (كوستاريكا احمر عسلي)')>0 then result:=result||' laymoon twist (costa rica red honey) لايمون تويست (كوستاريكا احمر عسلي)'; end if;
 if strpos(original,'lollit (ethiopia)')>0 or strpos(original,'لولليت (اثيوبيا)')>0 then result:=result||' lollit (ethiopia) لولليت (اثيوبيا)'; end if;
 if strpos(original,'los colores | el salvador')>0 or strpos(original,'لوس كولوريس | السلفادور')>0 then result:=result||' los colores | el salvador لوس كولوريس | السلفادور'; end if;
 if strpos(original,'los pirineos pacamara')>0 or strpos(original,'لوس بيرينيوس باكامارا')>0 then result:=result||' los pirineos pacamara لوس بيرينيوس باكامارا'; end if;
 if strpos(original,'maguta estate lot 432')>0 or strpos(original,'ماغوتا يستاتي محصول 432')>0 then result:=result||' maguta estate lot 432 ماغوتا يستاتي محصول 432'; end if;
 if strpos(original,'maidy bocanegra pink bourbon')>0 or strpos(original,'مايدي بوكانيغرا وردي بوربون')>0 then result:=result||' maidy bocanegra pink bourbon مايدي بوكانيغرا وردي بوربون'; end if;
 if strpos(original,'mameria native community | peru')>0 or strpos(original,'ماميريا ناتيفي كوممونيتي | بيرو')>0 then result:=result||' mameria native community | peru ماميريا ناتيفي كوممونيتي | بيرو'; end if;
 if words && array['maple','مابلي']::text[] then result:=result||' maple مابلي'; end if;
 if strpos(original,'masar (yemen)')>0 or strpos(original,'ماسار (اليمن)')>0 then result:=result||' masar (yemen) ماسار (اليمن)'; end if;
 if strpos(original,'meloraa (costa rica)')>0 or strpos(original,'ميلورا (كوستاريكا)')>0 then result:=result||' meloraa (costa rica) ميلورا (كوستاريكا)'; end if;
 if strpos(original,'mexico altura high grown')>0 or strpos(original,'المكسيك التورا هيغ غروون')>0 then result:=result||' mexico altura high grown المكسيك التورا هيغ غروون'; end if;
 if strpos(original,'mexico oaxaca yogondoy gesha')>0 or strpos(original,'المكسيك واكساكا يوغوندوي غيشا')>0 then result:=result||' mexico oaxaca yogondoy gesha المكسيك واكساكا يوغوندوي غيشا'; end if;
 if strpos(original,'midnight - crafted blend')>0 or strpos(original,'ميدنيغت - كرافتيد خلطه')>0 then result:=result||' midnight - crafted blend ميدنيغت - كرافتيد خلطه'; end if;
 if strpos(original,'milky cake')>0 or strpos(original,'حليبي كيك')>0 then result:=result||' milky cake حليبي كيك'; end if;
 if words && array['miramundo','ميراموندو']::text[] then result:=result||' miramundo ميراموندو'; end if;
 if words && array['mogiana','موغيانا']::text[] then result:=result||' mogiana موغيانا'; end if;
 if words && array['monarch','مونارتش']::text[] then result:=result||' monarch مونارتش'; end if;
 if strpos(original,'mystery -- speciality blend')>0 or strpos(original,'ميستيري -- سبيكياليتي خلطه')>0 then result:=result||' mystery -- speciality blend ميستيري -- سبيكياليتي خلطه'; end if;
 if strpos(original,'nardos (ethiopia)')>0 or strpos(original,'ناردوس (اثيوبيا)')>0 then result:=result||' nardos (ethiopia) ناردوس (اثيوبيا)'; end if;
 if strpos(original,'oasis blend')>0 or strpos(original,'واسيس خلطه')>0 then result:=result||' oasis blend واسيس خلطه'; end if;
 if strpos(original,'old lady -- speciality blend')>0 or strpos(original,'ولد لادي -- سبيكياليتي خلطه')>0 then result:=result||' old lady -- speciality blend ولد لادي -- سبيكياليتي خلطه'; end if;
 if strpos(original,'old school espresso')>0 or strpos(original,'ولد سكول اسبريسو')>0 then result:=result||' old school espresso ولد سكول اسبريسو'; end if;
 if strpos(original,'organic blend')>0 or strpos(original,'ورغانيك خلطه')>0 then result:=result||' organic blend ورغانيك خلطه'; end if;
 if strpos(original,'oru blend')>0 or strpos(original,'ورو خلطه')>0 then result:=result||' oru blend ورو خلطه'; end if;
 if strpos(original,'pacas 2026')>0 or strpos(original,'باكاس 2026')>0 then result:=result||' pacas 2026 باكاس 2026'; end if;
 if strpos(original,'panama finca kotowa silvia marina geisha natural lot 26-4320')>0 or strpos(original,'بنما فينكا كوتووا سيلفيا مارينا غيشا طبيعي محصول 26-4320')>0 then result:=result||' panama finca kotowa silvia marina geisha natural lot 26-4320 بنما فينكا كوتووا سيلفيا مارينا غيشا طبيعي محصول 26-4320'; end if;
 if strpos(original,'panama janson coffee geisha washed lot 26-178')>0 or strpos(original,'بنما جانسون قهوه غيشا مغسول محصول 26-178')>0 then result:=result||' panama janson coffee geisha washed lot 26-178 بنما جانسون قهوه غيشا مغسول محصول 26-178'; end if;
 if strpos(original,'panama janson family hacienda')>0 or strpos(original,'بنما جانسون فاميلي هاسييندا')>0 then result:=result||' panama janson family hacienda بنما جانسون فاميلي هاسييندا'; end if;
 if strpos(original,'papayo hydro natural')>0 or strpos(original,'بابايو هيدرو طبيعي')>0 then result:=result||' papayo hydro natural بابايو هيدرو طبيعي'; end if;
 if strpos(original,'papua new guinea sigri peaberry')>0 or strpos(original,'بابوا غينيا الجديده سيغري بيبيرري')>0 then result:=result||' papua new guinea sigri peaberry بابوا غينيا الجديده سيغري بيبيرري'; end if;
 if strpos(original,'parainema 2026')>0 or strpos(original,'باراينيما 2026')>0 then result:=result||' parainema 2026 باراينيما 2026'; end if;
 if strpos(original,'peru - cajamarca')>0 or strpos(original,'بيرو - كاجاماركا')>0 then result:=result||' peru - cajamarca بيرو - كاجاماركا'; end if;
 if strpos(original,'peru la margarita gesha')>0 or strpos(original,'بيرو لا مارغاريتا غيشا')>0 then result:=result||' peru la margarita gesha بيرو لا مارغاريتا غيشا'; end if;
 if words && array['pillar','بيللار']::text[] then result:=result||' pillar بيللار'; end if;
 if strpos(original,'png keto tapasi (2022 competition coffee)')>0 or strpos(original,'بنغ كيتو تاباسي (2022 كومبيتيتيون قهوه)')>0 then result:=result||' png keto tapasi (2022 competition coffee) بنغ كيتو تاباسي (2022 كومبيتيتيون قهوه)'; end if;
 if strpos(original,'power nap')>0 or strpos(original,'بووير ناب')>0 then result:=result||' power nap بووير ناب'; end if;
 if strpos(original,'raspberry candy')>0 or strpos(original,'راسببيرري كاندي')>0 then result:=result||' raspberry candy راسببيرري كاندي'; end if;
 if strpos(original,'raspberry candy filter')>0 or strpos(original,'راسببيرري كاندي ترشيح')>0 then result:=result||' raspberry candy filter راسببيرري كاندي ترشيح'; end if;
 if strpos(original,'red brick')>0 or strpos(original,'احمر بريك')>0 then result:=result||' red brick احمر بريك'; end if;
 if strpos(original,'reset half caff')>0 or strpos(original,'ريسيت هالف كافف')>0 then result:=result||' reset half caff ريسيت هالف كافف'; end if;
 if words && array['rico','ريكو']::text[] then result:=result||' rico ريكو'; end if;
 if strpos(original,'rivense la guaca')>0 or strpos(original,'ريفينسي لا غواكا')>0 then result:=result||' rivense la guaca ريفينسي لا غواكا'; end if;
 if strpos(original,'rocko mountain')>0 or strpos(original,'روكو مونتاين')>0 then result:=result||' rocko mountain روكو مونتاين'; end if;
 if strpos(original,'romario — brazil')>0 or strpos(original,'روماريو — البرازيل')>0 then result:=result||' romario — brazil روماريو — البرازيل'; end if;
 if strpos(original,'rungeto c')>0 or strpos(original,'رونغيتو c')>0 then result:=result||' rungeto c رونغيتو c'; end if;
 if strpos(original,'rwanda mbilima soil project lot.0704')>0 or strpos(original,'رواندا مبيليما سويل بروجيكت لوت.0704')>0 then result:=result||' rwanda mbilima soil project lot.0704 رواندا مبيليما سويل بروجيكت لوت.0704'; end if;
 if strpos(original,'sagastume typica 2023')>0 or strpos(original,'ساغاستومي تيبيكا 2023')>0 then result:=result||' sagastume typica 2023 ساغاستومي تيبيكا 2023'; end if;
 if strpos(original,'salvador akato anearobic')>0 or strpos(original,'سالفادور اكاتو انيروبيك')>0 then result:=result||' salvador akato anearobic سالفادور اكاتو انيروبيك'; end if;
 if strpos(original,'salvador divisadero')>0 or strpos(original,'سالفادور ديفيساديرو')>0 then result:=result||' salvador divisadero سالفادور ديفيساديرو'; end if;
 if strpos(original,'salvador ruby')>0 or strpos(original,'سالفادور روبي')>0 then result:=result||' salvador ruby سالفادور روبي'; end if;
 if strpos(original,'salvador sarchimor')>0 or strpos(original,'سالفادور سارتشيمور')>0 then result:=result||' salvador sarchimor سالفادور سارتشيمور'; end if;
 if strpos(original,'seabright house blend')>0 or strpos(original,'سيبريغت المنزل خلطه')>0 then result:=result||' seabright house blend سيبريغت المنزل خلطه'; end if;
 if strpos(original,'seasonal espresso blend')>0 or strpos(original,'سيسونال اسبريسو خلطه')>0 then result:=result||' seasonal espresso blend سيسونال اسبريسو خلطه'; end if;
 if words && array['sermon','سيرمون']::text[] then result:=result||' sermon سيرمون'; end if;
 if words && array['shantawene','شانتاويني']::text[] then result:=result||' shantawene شانتاويني'; end if;
 if strpos(original,'shepherd -- speciality blend')>0 or strpos(original,'شيفيرد -- سبيكياليتي خلطه')>0 then result:=result||' shepherd -- speciality blend شيفيرد -- سبيكياليتي خلطه'; end if;
 if strpos(original,'silky way')>0 or strpos(original,'سيلكي واي')>0 then result:=result||' silky way سيلكي واي'; end if;
 if strpos(original,'south blend')>0 or strpos(original,'سوث خلطه')>0 then result:=result||' south blend سوث خلطه'; end if;
 if strpos(original,'southern weather')>0 or strpos(original,'سوثيرن ويثير')>0 then result:=result||' southern weather سوثيرن ويثير'; end if;
 if words && array['streetlevel','ستريتليفيل']::text[] then result:=result||' streetlevel ستريتليفيل'; end if;
 if strpos(original,'sunda wanoja')>0 or strpos(original,'سوندا وانوجا')>0 then result:=result||' sunda wanoja سوندا وانوجا'; end if;
 if strpos(original,'supernatural karibu')>0 or strpos(original,'سوبيرناتورال كاريبو')>0 then result:=result||' supernatural karibu سوبيرناتورال كاريبو'; end if;
 if strpos(original,'sweater weather blend')>0 or strpos(original,'سويتير ويثير خلطه')>0 then result:=result||' sweater weather blend سويتير ويثير خلطه'; end if;
 if strpos(original,'tadesse washed krume')>0 or strpos(original,'تاديسسي مغسول كرومي')>0 then result:=result||' tadesse washed krume تاديسسي مغسول كرومي'; end if;
 if strpos(original,'thageini indigo | kenya')>0 or strpos(original,'ثاغييني ينديغو | كينيا')>0 then result:=result||' thageini indigo | kenya ثاغييني ينديغو | كينيا'; end if;
 if strpos(original,'the alchemist')>0 or strpos(original,'ال التشيميست')>0 then result:=result||' the alchemist ال التشيميست'; end if;
 if strpos(original,'the answer')>0 or strpos(original,'ال انسوير')>0 then result:=result||' the answer ال انسوير'; end if;
 if strpos(original,'the best friends blend')>0 or strpos(original,'ال بيست فريندس خلطه')>0 then result:=result||' the best friends blend ال بيست فريندس خلطه'; end if;
 if strpos(original,'tropical canopy | ethiopia')>0 or strpos(original,'تروبيكال كانوبي | اثيوبيا')>0 then result:=result||' tropical canopy | ethiopia تروبيكال كانوبي | اثيوبيا'; end if;
 if strpos(original,'tropical weather')>0 or strpos(original,'تروبيكال ويثير')>0 then result:=result||' tropical weather تروبيكال ويثير'; end if;
 if strpos(original,'twilight - crafted blend')>0 or strpos(original,'تويليغت - كرافتيد خلطه')>0 then result:=result||' twilight - crafted blend تويليغت - كرافتيد خلطه'; end if;
 if strpos(original,'uganda elgon anaerobic natural')>0 or strpos(original,'اوغندا يلغون لاهوايي طبيعي')>0 then result:=result||' uganda elgon anaerobic natural اوغندا يلغون لاهوايي طبيعي'; end if;
 if strpos(original,'uganda mama betty')>0 or strpos(original,'اوغندا ماما بيتتي')>0 then result:=result||' uganda mama betty اوغندا ماما بيتتي'; end if;
 if strpos(original,'uganda mukhoto')>0 or strpos(original,'اوغندا موخوتو')>0 then result:=result||' uganda mukhoto اوغندا موخوتو'; end if;
 if strpos(original,'umoja washed')>0 or strpos(original,'وموجا مغسول')>0 then result:=result||' umoja washed وموجا مغسول'; end if;
 if strpos(original,'volcan azul washed sl28')>0 or strpos(original,'فولكان ازول مغسول sl28')>0 then result:=result||' volcan azul washed sl28 فولكان ازول مغسول sl28'; end if;
 if strpos(original,'watad mountain')>0 or strpos(original,'واتاد مونتاين')>0 then result:=result||' watad mountain واتاد مونتاين'; end if;
 if strpos(original,'wild arabian -- speciality blend')>0 or strpos(original,'وايلد عربي -- سبيكياليتي خلطه')>0 then result:=result||' wild arabian -- speciality blend وايلد عربي -- سبيكياليتي خلطه'; end if;
 if strpos(original,'wilderness -- speciality blend')>0 or strpos(original,'ويلديرنيسس -- سبيكياليتي خلطه')>0 then result:=result||' wilderness -- speciality blend ويلديرنيسس -- سبيكياليتي خلطه'; end if;
 if words && array['woolloomooloo','ووللومولو']::text[] then result:=result||' woolloomooloo ووللومولو'; end if;
 if strpos(original,'yemen - kholani')>0 or strpos(original,'اليمن - خولاني')>0 then result:=result||' yemen - kholani اليمن - خولاني'; end if;
 if strpos(original,'yemen – anas – anaerobic')>0 or strpos(original,'اليمن – اناس – لاهوايي')>0 then result:=result||' yemen – anas – anaerobic اليمن – اناس – لاهوايي'; end if;
 if strpos(original,'yemen abu wudiyyan')>0 or strpos(original,'اليمن ابو ووديييان')>0 then result:=result||' yemen abu wudiyyan اليمن ابو ووديييان'; end if;
 if strpos(original,'yemen atarah anearobic')>0 or strpos(original,'اليمن اتاراه انيروبيك')>0 then result:=result||' yemen atarah anearobic اليمن اتاراه انيروبيك'; end if;
 if strpos(original,'yemen muhammad zidan - natural')>0 or strpos(original,'اليمن موهامماد زيدان - طبيعي')>0 then result:=result||' yemen muhammad zidan - natural اليمن موهامماد زيدان - طبيعي'; end if;
 if strpos(original,'yemen rare single origin coffee beans')>0 or strpos(original,'اليمن راري احادي المنشا قهوه بينس')>0 then result:=result||' yemen rare single origin coffee beans اليمن راري احادي المنشا قهوه بينس'; end if;
 if strpos(original,'yemen shai''an hiwar - natural')>0 or strpos(original,'اليمن شاي''ان هيوار - طبيعي')>0 then result:=result||' yemen shai''an hiwar - natural اليمن شاي''ان هيوار - طبيعي'; end if;
 if strpos(original,'yemen shai''an hiwar - peaberry')>0 or strpos(original,'اليمن شاي''ان هيوار - بيبيرري')>0 then result:=result||' yemen shai''an hiwar - peaberry اليمن شاي''ان هيوار - بيبيرري'; end if;
 if strpos(original,'yirgacheffe chelchele')>0 or strpos(original,'ييرغاتشيففي تشيلتشيلي')>0 then result:=result||' yirgacheffe chelchele ييرغاتشيففي تشيلتشيلي'; end if;
 if strpos(original,'yirgacheffe washed halo bariti')>0 or strpos(original,'ييرغاتشيففي مغسول هالو باريتي')>0 then result:=result||' yirgacheffe washed halo bariti ييرغاتشيففي مغسول هالو باريتي'; end if;
 if strpos(original,'yula regional lot')>0 or strpos(original,'يولا ريغيونال محصول')>0 then result:=result||' yula regional lot يولا ريغيونال محصول'; end if;
 if words && array['coffee','قهوه','القهوه','بن','البن']::text[] then result:=result||' coffee قهوه القهوه بن البن'; end if;
 if words && array['gesha','geisha','قيشا','قيشه','غيشا','جيشا']::text[] then result:=result||' gesha geisha قيشا قيشه غيشا جيشا'; end if;
 if words && array['zill','زل','زيل']::text[] then result:=result||' zill زل زيل'; end if;
 return result; end $search$;

CREATE OR REPLACE FUNCTION private.refresh_recipe_search_documents(p_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from public.recipe_search_documents d where (p_ids is null or d.recipe_id=any(p_ids))
    and not exists(select 1 from public.recipes r where r.id=d.recipe_id and r.visibility='public');
  insert into public.recipe_search_documents(recipe_id,recipe_name,creator_name,creator_country,recipe_country,coffee_name,coffee_type,coffee_origin,roaster_name,source_name,flavor_note,serving_style,search_text)
  select r.id, public.recipe_discovery_search_text(terms.recipe_name), public.recipe_discovery_search_text(terms.creator_name), public.recipe_discovery_search_text(terms.creator_country), public.recipe_discovery_search_text(terms.recipe_country), public.recipe_discovery_search_text(terms.coffee_name), public.recipe_discovery_search_text(terms.coffee_type), public.recipe_discovery_search_text(terms.coffee_origin), public.recipe_discovery_search_text(terms.roaster_name), public.recipe_discovery_search_text(terms.source_name), public.recipe_discovery_search_text(terms.flavor_note), terms.serving_style, public.recipe_discovery_search_text(concat_ws(' ', terms.recipe_name, terms.creator_name, terms.creator_country, terms.recipe_country, terms.coffee_name, terms.coffee_type, terms.coffee_origin, terms.roaster_name, terms.source_name, terms.flavor_note, terms.serving_style, case terms.serving_style when 'hot' then 'ساخن حار' when 'iced' then 'مثلج' when 'cold' then 'بارد' end, r.notes, r.notes_ar, bean.description_ar, bean.description_en, product.short_description))
  from public.recipes r
  left join public.roasted_products product on product.id = r.roasted_product_id and product.requires_review = false
  left join public.beans bean on bean.id = coalesce(r.bean_id, product.legacy_bean_id)
    and bean.is_published = true and bean.requires_review = false
  left join public.coffee_lots lot on lot.id = product.coffee_lot_id and lot.requires_review = false
  left join public.roasters product_roaster on product_roaster.id = product.roaster_id and product_roaster.requires_review = false
  left join public.roasters bean_roaster on bean_roaster.id = bean.roaster_id and bean_roaster.requires_review = false
  left join public.profiles creator on creator.id = r.user_id and r.recipe_type in ('community', 'personal')
  cross join lateral (
    select case when jsonb_typeof(r.source_brew_parameters->'discovery') = 'object'
      then r.source_brew_parameters->'discovery' else '{}'::jsonb end as metadata
  ) raw_discovery
  cross join lateral (
    -- Malformed JSON values are not country/name facts. For list fields retain
    -- string entries only, matching the mobile discovery reader.
    select coalesce(jsonb_object_agg(entry.key,
      case when jsonb_typeof(entry.value) = 'array' then (
        select coalesce(jsonb_agg(atom.value), '[]'::jsonb)
        from jsonb_array_elements(entry.value) atom(value)
        where jsonb_typeof(atom.value) = 'string'
      ) else entry.value end), '{}'::jsonb) as metadata
    from jsonb_each(raw_discovery.metadata) entry(key, value)
    where (entry.key in ('flavor_notes', 'flavor_notes_ar', 'flavor_families', 'source_urls', 'applicable_coffee_names', 'applicable_coffee_names_ar') and jsonb_typeof(entry.value) = 'array')
      or (entry.key not in ('flavor_notes', 'flavor_notes_ar', 'flavor_families', 'source_urls', 'applicable_coffee_names', 'applicable_coffee_names_ar') and jsonb_typeof(entry.value) = 'string')
  ) discovery
  cross join lateral (
    -- These names were verified against the same roaster by the source importer.
    -- Read strings as text so quotes and punctuation remain literal search terms.
    select string_agg(coffee.name, ' ') as names
    from jsonb_array_elements_text(
      coalesce(discovery.metadata->'applicable_coffee_names', '[]'::jsonb)
      || coalesce(discovery.metadata->'applicable_coffee_names_ar', '[]'::jsonb)
    ) coffee(name)
  ) applicable_coffees
  cross join lateral (
    select string_agg(concat_ws(' ', s.source_name, s.source_url), ' ') as source_text
    from public.recipe_sources s where s.recipe_id = r.id
  ) source
  cross join lateral (
    select string_agg(f.flavor, ' ') as flavor_text
    from public.bean_flavor_notes f where f.bean_id = bean.id
  ) bean_flavor
  cross join lateral (
    select
      public.recipe_discovery_normalize(concat_ws(' ', r.title, r.title_ar)) as recipe_name,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_author_name, creator.name, creator.username,
        discovery.metadata->>'creator_name', discovery.metadata->>'creator_name_ar')) as creator_name,
      -- Creator's sourced operating/base country is independent of nationality,
      -- the roaster's address, the recipe's provenance and the coffee's origin.
      public.recipe_discovery_normalize(concat_ws(' ', discovery.metadata->>'creator_country', discovery.metadata->>'creator_country_ar')) as creator_country,
      public.recipe_discovery_normalize(concat_ws(' ', discovery.metadata->>'recipe_country', discovery.metadata->>'recipe_country_ar')) as recipe_country,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_coffee_name, bean.name_en, bean.name_ar, product.name_en, product.name_ar,
        discovery.metadata->>'coffee_name', discovery.metadata->>'coffee_name_ar', applicable_coffees.names)) as coffee_name,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_varietal, bean.varietal, lot.varietal, product.origin_type,
        discovery.metadata->>'coffee_type', discovery.metadata->>'coffee_type_ar')) as coffee_type,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_origin_country, bean.origin_country, lot.origin_country,
        discovery.metadata->>'coffee_origin', discovery.metadata->>'coffee_origin_ar')) as coffee_origin,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_roaster_name, product_roaster.name_en, product_roaster.name_ar,
        bean_roaster.name_en, bean_roaster.name_ar, discovery.metadata->>'roaster_name', discovery.metadata->>'roaster_name_ar')) as roaster_name,
      public.recipe_discovery_normalize(concat_ws(' ', source.source_text, discovery.metadata->>'source_urls')) as source_name,
      public.recipe_discovery_normalize(concat_ws(' ', array_to_string(r.flavor_notes, ' '), r.source_tasting_notes,
        bean_flavor.flavor_text, array_to_string(product.flavor_notes_on_bag, ' '), discovery.metadata->>'flavor_notes',
        discovery.metadata->>'flavor_notes_ar', discovery.metadata->>'flavor_families')) as flavor_note,
      case when r.serving_style in ('hot', 'iced', 'cold') then r.serving_style
        when discovery.metadata->>'serving_style' in ('hot', 'iced', 'cold') then discovery.metadata->>'serving_style'
        else null end as serving_style
  ) terms
  where r.visibility='public' and (p_ids is null or r.id=any(p_ids))
  on conflict(recipe_id) do update set recipe_name=excluded.recipe_name,creator_name=excluded.creator_name,creator_country=excluded.creator_country,recipe_country=excluded.recipe_country,coffee_name=excluded.coffee_name,coffee_type=excluded.coffee_type,coffee_origin=excluded.coffee_origin,roaster_name=excluded.roaster_name,source_name=excluded.source_name,flavor_note=excluded.flavor_note,serving_style=excluded.serving_style,search_text=excluded.search_text,refreshed_at=now();
end $function$
;
select private.refresh_recipe_search_documents();

-- Preserve the existing account/follower/collection privacy checks.
CREATE OR REPLACE FUNCTION public.get_member_profile(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.profiles; viewer uuid:=(select auth.uid()); allowed boolean; own boolean; result jsonb;
begin
 select pr.* into p from public.profiles pr join auth.users u on u.id=pr.id where pr.username=lower(trim(p_username)) and not coalesce(u.is_anonymous,true);
 if not found then return null;end if;
 own:=coalesce(viewer=p.id,false);allowed:=coalesce(private.can_view_member(p.id),false);
 result:=jsonb_build_object('profile',jsonb_build_object('id',p.id,'name',p.name,'username',p.username,'avatar_url',p.avatar_url,'bio',p.bio,'is_private',p.is_private,'share_collection',case when own then p.share_collection else null end),
  'can_view',allowed,'is_owner',own,'relationship',(select f.status from public.follows f where f.follower_id=viewer and f.following_id=p.id),
  'follower_count',(select count(*) from public.follows f where f.following_id=p.id and f.status='accepted'),
  'following_count',(select count(*) from public.follows f where f.follower_id=p.id and f.status='accepted'));
 if not allowed then return result;end if;
 result:=result||jsonb_build_object(
  'recipes',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.title,r.title_ar,r.brew_method,r.visibility from public.recipes r where r.user_id=p.id and (r.visibility='public' or own) order by r.created_at desc limit 100)x),'[]'::jsonb),
  'photos',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,kind,'storage://profile-gallery/'||image_path as image_url,caption,created_at from public.profile_photos where user_id=p.id order by created_at desc limit 100)x),'[]'::jsonb),
  'followers',coalesce((select jsonb_agg(to_jsonb(x)) from (select pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='accepted' order by f.created_at desc limit 100)x),'[]'::jsonb),
  'following',coalesce((select jsonb_agg(to_jsonb(x)) from (select pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.following_id where f.follower_id=p.id and f.status='accepted' order by f.created_at desc limit 100)x),'[]'::jsonb));
 if own then result:=result||jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(x)) from (select f.id as request_id,pr.id,pr.name,pr.username,pr.avatar_url,pr.is_private from public.follows f join public.profiles pr on pr.id=f.follower_id where f.following_id=p.id and f.status='pending' order by f.created_at desc limit 100)x),'[]'::jsonb));end if;
 if own or p.share_collection then result:=result||jsonb_build_object(
  'equipment',coalesce((select jsonb_agg(to_jsonb(x)) from (select e.id,e.equipment_model_id,e.category,coalesce(m.name,e.custom_name) as name,m.specifications->'catalog'->>'name_ar' as name_ar,m.specifications->'catalog'->'facts'->'operation' as operation,m.image_url,m.image_usage_status from public.user_equipment e left join public.equipment_models m on m.id=e.equipment_model_id where e.user_id=p.id and e.archived_at is null order by e.created_at desc limit 100)x),'[]'::jsonb),
  'beans',coalesce((select jsonb_agg(to_jsonb(x)) from (select i.id,coalesce(b.id,r.id) as coffee_id,case when b.id is not null then 'bean' else 'product' end as kind,coalesce(b.name_ar,r.name_ar) as name_ar,coalesce(b.name_en,r.name_en) as name_en,coalesce(b.slug,r.slug) as slug,coalesce(b.image_url,r.image_url) as image_url,coalesce(b.image_usage_status,r.image_usage_status) as image_usage_status from public.user_bean_inventory i left join public.beans b on b.id=i.legacy_bean_id left join public.roasted_products r on r.id=i.roasted_product_id where i.user_id=p.id and i.archived_at is null and (own or (b.is_published and not b.requires_review) or (not r.requires_review)) order by i.created_at desc limit 100)x),'[]'::jsonb),
  'favorites',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.title,r.title_ar,r.brew_method from public.recipe_saves s join public.recipes r on r.id=s.recipe_id where s.user_id=p.id and (r.visibility='public' and (r.user_id is null or private.can_view_member(r.user_id)) or own and r.user_id=viewer) order by s.created_at desc limit 100)x),'[]'::jsonb));end if;
 result:=result||jsonb_build_object('comments',coalesce((select jsonb_agg(to_jsonb(x)) from (
  select c.id,c.body,c.created_at,'recipe'::text as kind,r.id as target_id,r.title as name_en,r.title_ar as name_ar from public.comments c join public.recipes r on r.id=c.recipe_id where c.user_id=p.id and not c.is_hidden and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select c.id,c.body,c.created_at,case when c.bean_id is not null then 'bean' else 'product' end,coalesce(b.id,pr.id),coalesce(b.name_en,pr.name_en),coalesce(b.name_ar,pr.name_ar) from public.coffee_comments c left join public.beans b on b.id=c.bean_id left join public.roasted_products pr on pr.id=c.product_id where c.user_id=p.id and (own or b.is_published and not b.requires_review or not pr.requires_review)
  union all select v.id,v.review_text,v.created_at,'recipe',r.id,r.title,r.title_ar from public.recipe_reviews v join public.recipes r on r.id=v.recipe_id where v.user_id=p.id and v.review_text is not null and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select v.id,v.review,v.created_at,'recipe',r.id,r.title,r.title_ar from public.recipe_ratings v join public.recipes r on r.id=v.recipe_id where v.user_id=p.id and v.review is not null and (r.visibility='public' and private.can_view_member(r.user_id) or own and r.user_id=viewer)
  union all select v.id,v.review_text,v.created_at,'product',pr.id,pr.name_en,pr.name_ar from public.bean_reviews v join public.roasted_products pr on pr.id=v.roasted_product_id where v.user_id=p.id and v.review_text is not null and (own or not pr.requires_review)
  order by created_at desc limit 100
 )x),'[]'::jsonb));return result;
end $function$
;

-- One owner-scoped transaction saves the cup, its exact grinder and roast context.
alter table public.brew_logs add column grinder_context jsonb not null default '{}'::jsonb
  check (jsonb_typeof(grinder_context) = 'object' and octet_length(grinder_context::text) <= 2000);
create or replace function public.record_configured_brew_v1(p_request_id uuid,p_payload jsonb,p_context jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare uid uuid:=(select auth.uid()); old_context jsonb; result_id uuid; k text; v jsonb; product_id uuid; recipe_product uuid;
begin
 if uid is null or coalesce((select auth.jwt()->>'is_anonymous'),'true')<>'false' then raise exception 'BREW_AUTH_REQUIRED' using errcode='42501'; end if;
 if p_request_id is null or jsonb_typeof(p_context) is distinct from 'object' then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(p_context))<>8 or exists(select 1 from jsonb_object_keys(p_context) key where key<>all(array['grinder_model_id','brewer_model_id','roasted_product_id','grind_setting','roast_level','roast_date','calibration','taste_signal'])) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 for k,v in select * from jsonb_each(p_context) loop
  if jsonb_typeof(v) not in ('string','null') then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
  if v<>'null'::jsonb and (length(btrim(p_context->>k)) not between 1 and 100) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 end loop;
 if p_context->>'roast_level' is not null and (p_context->>'roast_level')<>all(array['light','medium_light','medium','medium_dark','dark']) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 if p_context->>'taste_signal' is not null and (p_context->>'taste_signal')<>all(array['sharp_sour','bitter_dry','thin_weak','balanced','other']) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
 begin
  if p_context->>'grinder_model_id' is not null and not exists(select 1 from public.equipment_models where id=(p_context->>'grinder_model_id')::uuid and not requires_review and category in ('grinder','xbloom')) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
  if p_context->>'brewer_model_id' is not null and not exists(select 1 from public.equipment_models where id=(p_context->>'brewer_model_id')::uuid and not requires_review and category not in ('grinder','scale','filter','distribution_tool','portafilter_basket')) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
  if p_context->>'roast_date' is not null and ((p_context->>'roast_date')!~'^\d{4}-\d{2}-\d{2}$' or to_char((p_context->>'roast_date')::date,'YYYY-MM-DD')<>p_context->>'roast_date') then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
  product_id:=(p_context->>'roasted_product_id')::uuid;
  if product_id is not null then
   if not exists(select 1 from public.roasted_products where id=product_id and not requires_review) then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
   select roasted_product_id into recipe_product from public.recipes where id=(p_payload->>'recipe_id')::uuid;
   if recipe_product is distinct from product_id then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
  end if;
 exception when invalid_text_representation or datetime_field_overflow then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end;
 -- Same lock as the existing idempotent cup RPC: concurrent retries cannot swap settings.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||p_request_id::text,0));
 select grinder_context into old_context from public.brew_logs where id=p_request_id and user_id=uid;
 if found and old_context is distinct from p_context then raise exception 'BREW_REQUEST_CONFLICT' using errcode='22023'; end if;
 result_id:=public.record_brew_outcome_v1(p_request_id,p_payload);
 update public.brew_logs set grinder_context=p_context,grind_setting=p_context->>'grind_setting',taste_signal=p_context->>'taste_signal' where id=result_id and user_id=uid;
 if not found then raise exception 'BREW_AUTH_REQUIRED' using errcode='42501'; end if;
 return result_id;
end $$;
revoke all on function public.record_configured_brew_v1(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.record_configured_brew_v1(uuid,jsonb,jsonb) to authenticated;
