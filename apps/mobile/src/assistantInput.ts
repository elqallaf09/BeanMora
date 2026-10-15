import {englishMessage, type Locale} from './localeText';
import {canonicalSearchQuery} from './core/deepSearch';

// Domain vocabulary for the deterministic assistant. This does not translate
// member content or send questions to any model or translation service.
const vocabulary: Partial<Record<Locale,Record<string,string[]>>> = {
  fr: {
    'how much water':["combien d'eau", 'combien d’eau'], 'how much':['combien'], ice:['glace','glaçons'],
    '':['une','un','pour','ma','mon','avec','des','et','de','du','le','la','les','qui','où','au','aux','en','dans','s’il vous plaît'],
    recipe:['recettes','recette'], cold:['glacée','glacées','glacé','froide','froid'], hot:['chaude','chaud'], coconut:['noix de coco'], honey:['miel'], notes:['notes gustatives','notes de dégustation','arômes','arôme','saveurs','saveur','note'],
    machine:['machines','machine'], espresso:['expresso'], coffee:['café'], beans:['grains'], grinder:['moulins','moulin'], water:['eau'], buy:['acheter','achat','vend','vente'], website:['site web','site'], under:['moins de','sous'],
    roaster:['torréfacteurs','torréfacteur'], find:['trouve','trouver','cherche','chercher','je veux','je voudrais'], how:['comment'], sour:['acide'], bitter:['amer','amère'], ratio:['ratio','rapport'], calculate:['calcule','calculer'], grams:['grammes','gramme'], dose:['dose'], yield:['rendement'], seconds:['secondes'],
    compare:['compare','comparer'], first:['premier','première'], second:['deuxième'], explain:['explique','expliquer'], strawberry:['fraise'], cola:['cola'], store:['conserver','conservation'], learn:['apprendre'], help:['aide'],
    EUR:['euros','euro'], USD:['dollars','dollar'], KWD:['dinars koweïtiens'], SAR:['riyals saoudiens'],
  },
  it: {
    'how much':['quanta','quanto'], ice:['ghiaccio'],
    '':['una','un','per','con','di','e','il','la','mia','mio','che','dove','in'],
    recipe:['ricette','ricetta'], cold:['ghiacciato','ghiacciata','fredda','freddo'], hot:['calda','caldo'], coconut:['cocco'], honey:['miele'], notes:['note di degustazione','note aromatiche','note','nota','aromi','aroma','sapori','sapore'],
    machine:['macchine','macchina'], coffee:['caffè'], beans:['chicchi'], grinder:['macinacaffè'], water:['acqua'], buy:['acquistare','comprare','vendita'], website:['sito web','sito'], under:['meno di','sotto'],
    roaster:['torrefazioni','torrefazione'], find:['trova','trovare','cerco','voglio','vorrei'], how:['come'], sour:['acido','acida'], bitter:['amaro','amara'], ratio:['rapporto'], calculate:['calcola','calcolare'], grams:['grammi','grammo'], dose:['dose'], yield:['resa'], seconds:['secondi'],
    compare:['confronta','confrontare'], first:['primo','prima'], second:['secondo','seconda'], explain:['spiega','spiegare'], strawberry:['fragola'], store:['conservare','conservazione'], learn:['imparare'], help:['aiuto'],
    EUR:['euro'], USD:['dollari','dollaro'], KWD:['dinari kuwaitiani'], SAR:['riyal sauditi'],
  },
  es: {
    'how much':['cuánta','cuánto'], ice:['hielo'],
    '':['una','un','para','con','y','de','mi','el','la','los','las','que','donde','en'],
    recipe:['recetas','receta'], cold:['helado','helada','fría','frío','frio','fria'], hot:['caliente'], coconut:['coco'], honey:['miel'], notes:['notas de cata','notas de sabor','notas','nota','aromas','aroma','sabores','sabor'],
    machine:['máquinas','máquina','maquina','cafeteras','cafetera'], coffee:['café'], beans:['granos'], grinder:['molinillos','molinillo','molinos','molino'], water:['agua'], buy:['comprar','compra','venta','vende','venda'], website:['sitio web','sitio'], under:['menos de','por debajo de'],
    roaster:['tostadores','tostador'], find:['encuentra','encontrar','busca','buscar','quiero'], how:['cómo','como'], sour:['ácido','ácida'], bitter:['amargo','amarga'], ratio:['proporción'], calculate:['calcula','calcular'], grams:['gramos','gramo'], dose:['dosis'], yield:['rendimiento'], seconds:['segundos'],
    compare:['compara','comparar'], first:['primero','primera'], second:['segundo','segunda'], explain:['explica','explicar'], strawberry:['fresa'], store:['almacenar','conservar'], learn:['aprender'], help:['ayuda'],
    EUR:['euros','euro'], USD:['dólares','dólar'], KWD:['dinares kuwaitíes'], SAR:['riales saudíes'],
  },
  'pt-BR': {
    'how much':['quanta','quanto'], ice:['gelo'],
    '':['uma','um','para','com','e','de','meu','minha','no','na','o','a','os','as','que','onde','em'],
    recipe:['receitas','receita'], cold:['gelado','gelada','frio','fria'], hot:['quente'], coconut:['coco'], honey:['mel'], notes:['notas sensoriais','notas de sabor','notas','nota','aromas','aroma','sabores','sabor'],
    machine:['máquinas','máquina','maquina','cafeteiras','cafeteira'], coffee:['café'], beans:['grãos'], grinder:['moedores','moedor'], water:['água'], buy:['comprar','compra','venda','vende'], website:['site'], under:['menos de','abaixo de'],
    roaster:['torrefações','torrefação'], find:['encontre','encontrar','procure','procurar','quero'], how:['como'], sour:['ácido','ácida'], bitter:['amargo','amarga'], ratio:['proporção'], calculate:['calcule','calcular'], grams:['gramas','grama'], dose:['dose'], yield:['rendimento'], seconds:['segundos'],
    compare:['compare','comparar'], first:['primeiro','primeira'], second:['segundo','segunda'], explain:['explique','explicar'], strawberry:['morango'], store:['armazenar','conservar'], learn:['aprender'], help:['ajuda'],
    BRL:['reais','real','r$'], USD:['dólares','dólar'], KWD:['dinares kuwaitianos'], SAR:['riais sauditas'],
  },
  ja: {
    'how much':['どのくらい','何グラム','どれくらい'], ice:['氷'],
    recipe:['レシピ'], cold:['アイス','冷たい','冷やした','冷製'], hot:['ホット','温かい','熱い'], coconut:['ココナッツ'], honey:['はちみつ','ハチミツ','蜂蜜'], notes:['テイスティングノート','風味','香味','味わい'],
    xbloom:['エックスブルーム'], machine:['マシン','機械'], espresso:['エスプレッソ'], coffee:['コーヒー','珈琲'], beans:['コーヒー豆','豆'], grinder:['グラインダー','ミル'], water:['水'], buy:['販売','売って','購入','買う'], website:['ウェブサイト','サイト'], under:['以下','未満'],
    roaster:['ロースター','焙煎業者'], find:['探して','探す','欲しい','見つけて'], how:['方法','どうやって'], sour:['酸っぱい','酸味が強い'], bitter:['苦い','苦味が強い'], ratio:['比率'], calculate:['計算'], dose:['投与量','粉量','用量'], yield:['抽出量'], seconds:['秒'], grams:['グラム'],
    compare:['比較'], first:['最初','1番目'], second:['2番目'], explain:['説明'], strawberry:['イチゴ','苺'], store:['保存','保管'], learn:['学ぶ','教えて'], help:['ヘルプ'],
    JPY:['円','日本円'], USD:['米ドル','ドル'], KWD:['クウェートディナール'], SAR:['サウジリヤル'],
  },
  'zh-CN': {
    'how much':['多少'], ice:['冰块'],
    'espresso machine':['意式浓缩咖啡机','浓缩咖啡机','意式咖啡机'],
    recipe:['配方','食谱'], cold:['冰饮','冰的','冰咖啡','冰镇','冷的','冷饮','冰'], hot:['热的','热饮','热'], coconut:['椰子','椰香'], honey:['蜂蜜'], notes:['风味笔记','风味','香味'],
    xbloom:['爱克斯布鲁姆'], machine:['机器','咖啡机'], espresso:['意式浓缩','浓缩咖啡','浓缩'], coffee:['咖啡'], beans:['咖啡豆','豆子'], grinder:['磨豆机','研磨机'], water:['水'], buy:['出售','销售','购买','买'], website:['网站','网址'], under:['低于','以下'],
    roaster:['烘焙商'], find:['寻找','找到','找','想要','我要'], how:['怎么','如何'], sour:['酸味太重','很酸','酸'], bitter:['苦味太重','很苦','苦'], ratio:['比例'], calculate:['计算'], dose:['粉量','剂量'], yield:['出液量'], seconds:['秒'], grams:['克'],
    compare:['比较','对比'], first:['第一个','第一'], second:['第二个','第二'], explain:['解释','介绍'], strawberry:['草莓'], store:['保存','储存'], learn:['学习','教我'], help:['帮助'],
    CNY:['人民币','元'], USD:['美元','美金'], KWD:['科威特第纳尔'], SAR:['沙特里亚尔'],
  },
};
const expressions = new Map<Locale,{pattern:RegExp;canonical:string}[]>();
const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const vocabularyText=(value:string)=>value.normalize('NFKC').replace(/\p{Script=Latin}+/gu,part=>part.normalize('NFKD').replace(/\p{M}/gu,''));
const accented:Record<string,string>={a:'[aàáâäãåā]',e:'[eèéêëē]',i:'[iìíîïī]',o:'[oòóôöõō]',u:'[uùúûüū]',c:'[cç]',n:'[nñ]'};
const wordExpression=(word:string)=>escape(vocabularyText(word)).replace(/[aeioucn]/g,char=>accented[char]).replace(/[’']/g,"['’]");
export function assistantInput(locale:Locale,input:string):string {
  if(locale==='ar'||locale==='en')return input;
  const exact=englishMessage(locale,input.trim());
  if(exact!==input.trim())return exact;
  let rules=expressions.get(locale);
  if(!rules){
    const cjk=locale==='ja'||locale==='zh-CN';
    rules=Object.entries(vocabulary[locale]??{}).flatMap(([canonical,words])=>words.map(word=>({word,canonical}))).sort((a,b)=>b.word.length-a.word.length).map(({word,canonical})=>({canonical,pattern:new RegExp((cjk?'':'(?<![\\p{L}\\p{N}])')+wordExpression(word)+(cjk?'':'(?![\\p{L}\\p{N}])'),'giu')}));
    expressions.set(locale,rules);
  }
  // One substitution pass avoids matching a replacement a second time.
  const replacements:string[]=[];
  let value=input.normalize('NFKC').replace(/\bA\s+R\s+K\b/giu,'ARK');
  for(const {pattern,canonical} of rules)value=value.replace(pattern,()=>{const index=replacements.push(canonical)-1;return `\u0000${index}\u0000`;});
  value=value.replace(/\u0000(\d+)\u0000/g,(_,index)=>' '+replacements[Number(index)]+' ');
  value=canonicalSearchQuery(value,/\broaster\b/i.test(value)?'country':'general');
  if(['fr','it','es','pt-BR'].includes(locale))value=value.replace(/(\d+),(\d+)(?=\s*(?:grams?|g)\b)/g,'$1.$2').replace(/(1\s*[:/]\s*\d+),(\d+)/g,'$1.$2');
  if(locale==='ja')value=value.replace(/(^|\s)(?:の|と|を|が|に|で|は|です|ください|作って|向け|用)(?=\s|$)/g,' ');
  if(locale==='zh-CN')value=value.replace(/(^|\s)(?:的|和|与|给|请|帮我|制作|我|适用|一份|一个|带有|有)(?=\s|$)/g,' ');
  return value.replace(/\s+/g,' ').trim();
}
