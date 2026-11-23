// 景點與路線資料（座標為約略位置，WGS84）
const P = {
  KIX:[34.4326,135.2440], RINKU:[34.4087,135.2970], HINENO:[34.4089,135.3246], HKISHI:[34.4560,135.3970],
  IFUCHU:[34.4875,135.4241], OTORI:[34.5285,135.4560], MIKUNI:[34.5640,135.4900], SUGI:[34.5935,135.5115],
  TENNOJI:[34.6469,135.5135], SHINIMA:[34.6503,135.5011], BENTEN:[34.6696,135.4615], NISHIKU:[34.6828,135.4664],
  OSAKA:[34.7050,135.4950], SHINOSAKA:[34.7335,135.5003], IBARAKI:[34.8155,135.5626], TAKATSUKI:[34.8516,135.6178],
  NAGAOKA:[34.9265,135.6953], MUKO:[34.9533,135.7059], KYOTO:[34.9858,135.7588],
  // 奈良線
  TOFUKUJI_ST:[34.9806,135.7701], INARI_ST:[34.9669,135.7700], MOMOYAMA:[34.9380,135.7770], ROKUJIZO:[34.9317,135.7932], KOHATA:[34.9090,135.8000], UJI_ST:[34.8939,135.8003],
  // 山陰線＋京都丹後鐵道
  NIJO:[35.0113,135.7417], SAGA:[35.0181,135.6813], KAMEOKA:[35.0170,135.5765], SONOBE:[35.1062,135.4688], HIYOSHI:[35.1650,135.4250], WACHI:[35.2580,135.3900],
  AYABE:[35.3020,135.2570], FUKUCHI:[35.2965,135.1206], OE:[35.3880,135.1310], MIYAZU:[35.5348,135.1962], AMANO:[35.5570,135.1835],
  // 伊根
  FUCHU:[35.5840,135.1960], COAST1:[35.6000,135.2140], COAST2:[35.6200,135.2500], COAST3:[35.6420,135.2720], HIJI:[35.6655,135.2835], INE:[35.6770,135.2880],
  // 湖西線
  YAMASHINA:[34.9928,135.8157], OTSUKYO:[35.0242,135.8600], KATATA:[35.1160,135.9150], MAIKO:[35.2050,135.9870], KITAKOMATSU:[35.2440,135.9930],
  TAKASHIMA:[35.2924,136.0149], ADOGAWA:[35.3353,136.0430], IMAZU:[35.4110,136.0310], NAKASHO:[35.4360,136.0480], MAKINO:[35.4530,136.0580],
  // 大和路線
  HIRANO:[34.6255,135.5560], KYUHOJI:[34.6220,135.5900], KASHIWARA:[34.5795,135.6230], OJI:[34.5970,135.7065], HORYUJI:[34.6010,135.7380], KORIYAMA:[34.6505,135.7855], NARA:[34.6810,135.8195]
};
const pth = (...keys) => keys.map(k => Array.isArray(k) ? k : P[k]);
const HARUKA_KIX_KYOTO = ['KIX','RINKU','HINENO','HKISHI','IFUCHU','OTORI','MIKUNI','SUGI','TENNOJI','SHINIMA','BENTEN','NISHIKU','OSAKA','SHINOSAKA','IBARAKI','TAKATSUKI','NAGAOKA','MUKO','KYOTO'];
const HARUKA_KYOTO_TENNOJI = HARUKA_KIX_KYOTO.slice(HARUKA_KIX_KYOTO.indexOf('TENNOJI')).reverse();
const HARUKA_TENNOJI_KIX = HARUKA_KIX_KYOTO.slice(0, HARUKA_KIX_KYOTO.indexOf('TENNOJI') + 1).reverse();
const SANIN = ['KYOTO','NIJO','SAGA','KAMEOKA','SONOBE','HIYOSHI','WACHI','AYABE','FUKUCHI','OE','MIYAZU','AMANO'];
const INE_BUS = ['AMANO','FUCHU','COAST1','COAST2','COAST3','HIJI'];
const KOSEI = ['KYOTO','YAMASHINA','OTSUKYO','KATATA','MAIKO','KITAKOMATSU','TAKASHIMA','ADOGAWA','IMAZU','NAKASHO','MAKINO'];
const YAMATOJI = ['TENNOJI','HIRANO','KYUHOJI','KASHIWARA','OJI','HORYUJI','KORIYAMA','NARA'];

const MODES = {
  rail:  {label:'JR／鐵道', dash:null,     weight:5},
  bus:   {label:'巴士',     dash:'9 7',    weight:4},
  boat:  {label:'遊覽船',   dash:'2 7',    weight:4},
  walk:  {label:'步行',     dash:'1 6',    weight:3},
  open:  {label:'交通方式未定（只表示順序）', dash:'4 8', weight:2}
};

const DAYS = [
 { id:1, date:'12/2 (三)', title:'抵達關西機場 → 京都', color:'#2457c5',
   stops:[
    {id:'kix', name:'關西機場', ll:P.KIX, time:'13:20–14:40', note:'入境領行李；JR 綠色售票機兌換周遊券、劃好四張指定席'},
    {id:'kyo', name:'京都站・飯店', ll:P.KYOTO, time:'傍晚', note:'飯店入住，京都車站周邊吃晚餐'}],
   legs:[{from:'kix', to:'kyo', mode:'rail', label:'HARUKA 32號 14:44 或 34號 15:14（約 76 分鐘）', path:pth(...HARUKA_KIX_KYOTO)}],
   groups:[] },

 { id:2, date:'12/3 (四)', title:'京都東山賞楓', color:'#c8312b',
   stops:[
    {id:'kyo', name:'京都站・飯店', ll:P.KYOTO, time:'上午', note:'刷 ICOCA 搭京都市巴'},
    {id:'gojo', name:'五條坂（巴士站）', ll:[34.9958,135.7746], time:'上午', note:'下車後步行上坡'},
    {id:'kiyo', name:'清水寺', ll:[34.9949,135.7850], time:'上午'},
    {id:'san', name:'三年坂', ll:[34.9963,135.7813], time:'上午'},
    {id:'ni', name:'二年坂', ll:[34.9982,135.7800], time:'上午'},
    {id:'kodai', name:'高台寺', ll:[35.0006,135.7809], time:'下午'},
    {id:'yasaka', name:'八坂神社', ll:[35.0037,135.7785], time:'下午'},
    {id:'hanami', name:'祇園花見小路', ll:[35.0030,135.7749], time:'下午'},
    {id:'kawara', name:'四條河原町', ll:[35.0037,135.7690], time:'晚上', note:'逛街吃晚餐'},
    {id:'kyo2', name:'京都站・飯店', ll:P.KYOTO, time:'晚上', note:'返回飯店休息'}],
   legs:[
    {from:'kyo', to:'gojo', mode:'bus', label:'京都市巴（ICOCA）', path:pth('KYOTO',[34.9874,135.7600],[34.9890,135.7735],[34.9958,135.7746])},
    {from:'gojo', to:'kiyo', mode:'walk', path:pth([34.9958,135.7746],[34.9960,135.7800],[34.9949,135.7850])},
    {from:'kiyo', to:'san', mode:'walk'}, {from:'san', to:'ni', mode:'walk'}, {from:'ni', to:'kodai', mode:'walk'},
    {from:'kodai', to:'yasaka', mode:'walk'}, {from:'yasaka', to:'hanami', mode:'walk'}, {from:'hanami', to:'kawara', mode:'walk'},
    {from:'kawara', to:'kyo2', mode:'open'}],
   groups:[{name:'清水寺～祇園 散步區', stops:['kiyo','san','ni','kodai','yasaka','hanami']}] },

 { id:3, date:'12/4 (五)', title:'東福寺賞楓（周遊券 Day 1）', color:'#c47a00',
   stops:[
    {id:'kyo', name:'京都站・飯店', ll:P.KYOTO, time:'上午', note:'啟用 JR 關西廣域五日券'},
    {id:'tfst', name:'JR 東福寺站', ll:P.TOFUKUJI_ST, time:'上午', note:'JR 奈良線 3 分鐘'},
    {id:'tofuku', name:'東福寺（通天橋）', ll:[34.9767,135.7740], time:'上午', note:'欣賞通天橋楓葉'},
    {id:'inari', name:'伏見稻荷大社', ll:[34.9671,135.7727], time:'下午', note:'可選：與宇治二選一', optional:true},
    {id:'byodo', name:'宇治平等院', ll:[34.8892,135.8077], time:'下午', note:'可選：與伏見稻荷二選一', optional:true},
    {id:'kyo2', name:'京都站・飯店', ll:P.KYOTO, time:'晚上', note:'京都站吃晚餐，採買隔天早餐麵包'}],
   legs:[
    {from:'kyo', to:'tfst', mode:'rail', label:'JR 奈良線', path:pth('KYOTO','TOFUKUJI_ST')},
    {from:'tfst', to:'tofuku', mode:'walk'},
    {from:'tofuku', to:'inari', mode:'rail', optional:true, label:'可選：JR 奈良線到稻荷站', path:pth([34.9767,135.7740],'TOFUKUJI_ST','INARI_ST',[34.9671,135.7727])},
    {from:'tofuku', to:'byodo', mode:'rail', optional:true, label:'可選：JR 奈良線到宇治站', path:pth([34.9767,135.7740],'TOFUKUJI_ST','INARI_ST','MOMOYAMA','ROKUJIZO','KOHATA','UJI_ST',[34.8892,135.8077])},
    {from:'inari', to:'kyo2', mode:'rail', optional:true, label:'JR 奈良線回京都', path:pth([34.9671,135.7727],'INARI_ST','TOFUKUJI_ST','KYOTO')},
    {from:'byodo', to:'kyo2', mode:'rail', optional:true, label:'JR 奈良線回京都', path:pth([34.8892,135.8077],'UJI_ST','KOHATA','ROKUJIZO','MOMOYAMA','INARI_ST','TOFUKUJI_ST','KYOTO')}],
   groups:[] },

 { id:4, date:'12/5 (六)', title:'伊根舟屋・天橋立（周遊券 Day 2）', color:'#18865a',
   stops:[
    {id:'kyo', name:'京都站', ll:P.KYOTO, time:'08:38', note:'大行李留在飯店'},
    {id:'amano', name:'天橋立站', ll:P.AMANO, time:'10:40', note:'到站內櫃台兌換丹後天橋立伊根周遊券'},
    {id:'hiji', name:'伊根灣めぐり・日出（遊覽船碼頭）', ll:P.HIJI, time:'12:00', note:'搭伊根灣遊覽船餵海鷗（周遊券）'},
    {id:'ine', name:'伊根舟屋（伊根站）', ll:P.INE, time:'13:33 搭車', note:'拍水上舟屋、喝咖啡'},
    {id:'lunch', name:'天橋立站前商店街', ll:[35.5577,135.1852], time:'14:35', note:'午餐'},
    {id:'chion', name:'智恩寺', ll:[35.5588,135.1876], time:'15:00'},
    {id:'sand', name:'天橋立沙洲', ll:[35.5660,135.1905], time:'15:20', note:'散步；有空可用周遊券搭觀光船或纜車'},
    {id:'amano2', name:'天橋立站', ll:P.AMANO, time:'15:51'},
    {id:'kyo2', name:'京都站・飯店', ll:P.KYOTO, time:'18:07', note:'吃晚餐後回飯店'}],
   legs:[
    {from:'kyo', to:'amano', mode:'rail', label:'特急 橋立1號 08:38 → 10:40', path:pth(...SANIN)},
    {from:'amano', to:'hiji', mode:'bus', label:'丹海巴士 10:58 → 11:57（周遊券）', path:pth(...INE_BUS)},
    {from:'hiji', to:'hiji', mode:'boat', label:'伊根灣遊覽船（約 25 分鐘）', path:pth('HIJI',[35.6700,135.2945],[35.6815,135.2930],[35.6760,135.2870],[35.6690,135.2850],'HIJI')},
    {from:'hiji', to:'ine', mode:'walk', path:pth('HIJI',[35.6710,135.2860],'INE')},
    {from:'ine', to:'lunch', mode:'bus', label:'丹海巴士 13:33 → 14:31（周遊券）', path:pth('INE','HIJI',...INE_BUS.slice(0,-1).reverse(),[35.5577,135.1852])},
    {from:'lunch', to:'chion', mode:'walk'}, {from:'chion', to:'sand', mode:'walk'},
    {from:'sand', to:'amano2', mode:'walk', path:pth([35.5660,135.1905],[35.5600,135.1880],'AMANO')},
    {from:'amano2', to:'kyo2', mode:'rail', label:'特急 橋立6號 15:51 → 18:07', path:pth(...SANIN.slice().reverse())}],
   groups:[{name:'伊根灣', stops:['hiji','ine']},{name:'天橋立站周邊', stops:['lunch','chion','sand']}] },

 { id:5, date:'12/6 (日)', title:'水杉大道 → 毘沙門堂 → 天王寺（周遊券 Day 3）', color:'#6d3fc4',
   stops:[
    {id:'kyo', name:'京都站', ll:P.KYOTO, time:'08:15', note:'退房，大行李寄放京都站置物櫃'},
    {id:'makino', name:'JR 牧野站', ll:P.MAKINO, time:'09:50', note:'轉乘牧野高原線巴士（現金 ¥220）'},
    {id:'meta', name:'水杉大道（メタセコイア並木）', ll:[35.4665,136.0390], time:'10:00–12:15', note:'拍照、提早吃午餐'},
    {id:'makino2', name:'JR 牧野站', ll:P.MAKINO, time:'12:30'},
    {id:'yama', name:'JR 山科站', ll:P.YAMASHINA, time:'13:50'},
    {id:'bisha', name:'毘沙門堂', ll:[35.0063,135.8190], time:'13:50–15:30', note:'勅使坂紅葉地毯；15:30 前要進本堂'},
    {id:'yama2', name:'JR 山科站', ll:P.YAMASHINA, time:'16:10'},
    {id:'kyo2', name:'京都站', ll:P.KYOTO, time:'16:15–18:15', note:'逛百貨、吃晚餐，18:00 領回行李'},
    {id:'ten', name:'天王寺站・飯店', ll:P.TENNOJI, time:'19:18', note:'入住天王寺飯店'}],
   legs:[
    {from:'kyo', to:'makino', mode:'rail', label:'JR 湖西線 08:40 → 09:50', path:pth(...KOSEI)},
    {from:'makino', to:'meta', mode:'bus', label:'牧野高原線巴士 6 分鐘', path:pth('MAKINO',[35.4600,136.0490],[35.4665,136.0390])},
    {from:'meta', to:'makino2', mode:'bus', label:'牧野高原線巴士', path:pth([35.4665,136.0390],[35.4600,136.0490],'MAKINO')},
    {from:'makino2', to:'yama', mode:'rail', label:'JR 湖西線回山科', path:pth(...KOSEI.slice(1).reverse())},
    {from:'yama', to:'bisha', mode:'walk', label:'步行 15～20 分鐘（或計程車 5 分鐘）', path:pth('YAMASHINA',[35.0000,135.8170],[35.0063,135.8190])},
    {from:'bisha', to:'yama2', mode:'walk', path:pth([35.0063,135.8190],[35.0000,135.8170],'YAMASHINA')},
    {from:'yama2', to:'kyo2', mode:'rail', label:'JR 5 分鐘', path:pth('YAMASHINA','KYOTO')},
    {from:'kyo2', to:'ten', mode:'rail', label:'HARUKA 51號 18:30 → 19:18', path:pth(...HARUKA_KYOTO_TENNOJI)}],
   groups:[] },

 { id:6, date:'12/7 (一)', title:'奈良公園賞楓（周遊券 Day 4）', color:'#c42a7a',
   stops:[
    {id:'ten', name:'天王寺站・飯店', ll:P.TENNOJI, time:'上午'},
    {id:'nara', name:'JR 奈良站', ll:P.NARA, time:'上午', note:'大和路快速約 35 分鐘'},
    {id:'park', name:'奈良公園（餵鹿）', ll:[34.6850,135.8440], time:'下午'},
    {id:'todai', name:'東大寺', ll:[34.6890,135.8398], time:'下午'},
    {id:'kasuga', name:'春日大社', ll:[34.6814,135.8484], time:'下午'},
    {id:'nara2', name:'JR 奈良站', ll:P.NARA, time:'傍晚'},
    {id:'qs', name:'阿倍野 Q\'s Mall／MIO', ll:[34.6440,135.5128], time:'晚上', note:'逛街採買'}],
   legs:[
    {from:'ten', to:'nara', mode:'rail', label:'JR 大和路快速', path:pth(...YAMATOJI)},
    {from:'nara', to:'park', mode:'open', label:'循環巴士或步行'},
    {from:'park', to:'todai', mode:'walk'}, {from:'todai', to:'kasuga', mode:'walk'},
    {from:'kasuga', to:'nara2', mode:'open', label:'循環巴士或步行'},
    {from:'nara2', to:'qs', mode:'rail', label:'JR 大和路快速回天王寺', path:pth(...YAMATOJI.slice().reverse(),[34.6440,135.5128])}],
   groups:[{name:'奈良公園一帶', stops:['park','todai','kasuga']}] },

 { id:7, date:'12/8 (二)', title:'天王寺 → 關西機場返台（周遊券 Day 5）', color:'#0a7d93',
   stops:[
    {id:'ten', name:'天王寺周邊', ll:P.TENNOJI, time:'上午–15:30', note:'退房寄放行李，最後補貨、午餐；15:30 回飯店領行李'},
    {id:'kix', name:'關西機場', ll:P.KIX, time:'16:50', note:'華航 CI173 19:00 起飛'}],
   legs:[{from:'ten', to:'kix', mode:'rail', label:'HARUKA 39號 16:17 → 16:50（已修正）', path:pth(...HARUKA_TENNOJI_KIX)}],
   groups:[] }
];

const PLACES = [
  {n:'京都', ll:[35.0116,135.7681]}, {n:'大阪', ll:[34.6937,135.5023]}, {n:'奈良', ll:[34.6851,135.8048]},
  {n:'神戶', ll:[34.6901,135.1955]}, {n:'宮津', ll:[35.5390,135.1950]}, {n:'舞鶴', ll:[35.4740,135.3860]},
  {n:'大津', ll:[35.0045,135.8686]}, {n:'琵琶湖', ll:[35.25,136.08], lake:true}, {n:'大阪灣', ll:[34.50,135.15], sea:true}, {n:'日本海', ll:[35.75,135.45], sea:true}
];
