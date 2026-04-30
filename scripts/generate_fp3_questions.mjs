import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");

const categories = [
  "life_planning",
  "risk_management",
  "financial_assets",
  "tax_planning",
  "real_estate",
  "inheritance",
];

const termRows = {
  life_planning: `
ライフプラン|raifu puran
ファイナンシャルプランナー|fainansharu puranna
資金計画|shikin keikaku
キャッシュフロー表|kyasshu furo hyou
バランスシート|baransu shito
可処分所得|kashobun shotoku
ライフイベント表|raifu ibento hyou
教育資金|kyouiku shikin
住宅資金|juutaku shikin
老後資金|rougo shikin
公的年金|kouteki nenkin
厚生年金|kousei nenkin
国民年金|kokumin nenkin
企業年金|kigyou nenkin
個人年金|kojin nenkin
退職給付|taishoku kyuufu
雇用保険|koyou hoken
労災保険|rousai hoken
健康保険|kenkou hoken
介護保険|kaigo hoken
公的医療保険|kouteki iryou hoken
後期高齢者医療|kouki koureisha iryou
奨学金|shougakukin
教育ローン|kyouiku ron
住宅ローン|juutaku ron
繰上返済|kuriage hensai
固定金利|kotei kinri
変動金利|hendou kinri
元利均等返済|ganri kintou hensai
元金均等返済|gankin kintou hensai
団体信用生命保険|dantai shinyou seimei hoken
財形貯蓄|zaikei chochiku
確定拠出年金|kakutei kyoshutsu nenkin
確定給付企業年金|kakutei kyuufu kigyou nenkin
付加年金|fuka nenkin
任意加入|nini kanyuu
老齢給付|rourei kyuufu
障害給付|shougai kyuufu
遺族給付|izoku kyuufu
被保険者|hihokensha
保険料免除|hokenryou menjo
受給資格|jukyuu shikaku
在職老齢年金|zaishoku rourei nenkin
高年齢雇用継続|kourei koyou keizoku
基本手当|kihon teate
育児休業給付|ikuji kyuugyou kyuufu
介護休業給付|kaigo kyuugyou kyuufu
ライフデザイン|raifu dezain
リタイアメントプラン|ritaiamento puran
社会保険|shakai hoken
`,
  risk_management: `
リスク管理|risuku kanri
生命保険|seimei hoken
損害保険|songai hoken
第三分野保険|daisan bunya hoken
定期保険|teiki hoken
終身保険|shuushin hoken
養老保険|yourou hoken
医療保険|iryou hoken
がん保険|gan hoken
介護保険|kaigo hoken
個人年金保険|kojin nenkin hoken
収入保障保険|shuunyuu hoshou hoken
学資保険|gakushi hoken
火災保険|kasai hoken
地震保険|jishin hoken
自動車保険|jidousha hoken
傷害保険|shougai hoken
賠償責任保険|baishou sekinin hoken
保険契約者|hoken keiyakusha
被保険者|hihokensha
保険金受取人|hokenkin uketorinin
保険料|hokenryou
保険金|hokenkin
解約返戻金|kaiyaku henreikin
告知義務|kokuchi gimu
免責|menseki
約款|yakkan
契約者貸付|keiyakusha kashitsuke
クーリングオフ|kuringu ofu
予定利率|yotei riritsu
配当金|haitoukin
主契約|shu keiyaku
特約|tokuyaku
払込期間|haraikomi kikan
保険期間|hoken kikan
更新型|koushin gata
全期型|zenki gata
告知|kokuchi
診査|shinsa
保険証券|hoken shouken
契約転換|keiyaku tenkan
減額|gengaku
払済保険|haraizumi hoken
延長保険|enchou hoken
自動振替貸付|jidou furikae kashitsuke
失効|shikkou
復活|fukkatsu
ソルベンシーマージン|sorubenshi majin
少額短期保険|shougaku tanki hoken
リスク移転|risuku iten
`,
  financial_assets: `
金融資産運用|kinyuu shisan unyou
預貯金|yochokin
普通預金|futsuu yokin
定期預金|teiki yokin
外貨預金|gaika yokin
金利|kinri
利回り|rimawari
単利|tanri
複利|fukuri
債券|saiken
国債|kokusai
社債|shasai
株式|kabushiki
投資信託|toushi shintaku
上場投資信託|joujou toushi shintaku
不動産投資信託|fudousan toushi shintaku
分配金|bunpaikin
配当金|haitoukin
売却益|baikyaku eki
キャピタルゲイン|kyapitaru gein
インカムゲイン|inkamu gein
ポートフォリオ|potoforio
アセットアロケーション|asetto arokeishon
分散投資|bunsan toushi
リスク|risuku
リターン|ritan
流動性|ryuudousei
信用リスク|shinyou risuku
価格変動リスク|kakaku hendou risuku
為替リスク|kawase risuku
金利変動リスク|kinri hendou risuku
インフレーション|infureshon
デフレーション|defureshon
景気動向|keiki doukou
経済指標|keizai shihyou
金融政策|kinyuu seisaku
財政政策|zaisei seisaku
日経平均株価|nikkei heikin kabuka
東証株価指数|toushou kabuka shisuu
円高|endaka
円安|enyasu
為替相場|kawase souba
指値注文|sashine chuumon
成行注文|nariyuki chuumon
目論見書|mokuromisho
基準価額|kijun kagaku
信託報酬|shintaku houshuu
短期金融商品|tanki kinyuu shouhin
上場株式|joujou kabushiki
証券会社|shouken gaisha
`,
  tax_planning: `
タックスプランニング|takkusu puranningu
所得税|shotoku zei
住民税|juumin zei
法人税|houjin zei
消費税|shouhi zei
相続税|souzoku zei
贈与税|zouyo zei
固定資産税|kotei shisan zei
所得|shotoku
収入|shuunyuu
必要経費|hitsuyou keihi
所得控除|shotoku koujo
税額控除|zeigaku koujo
課税所得|kazei shotoku
確定申告|kakutei shinkoku
源泉徴収|gensen choushuu
年末調整|nenmatsu chousei
青色申告|aoiro shinkoku
白色申告|shiroiro shinkoku
給与所得|kyuuyo shotoku
事業所得|jigyou shotoku
不動産所得|fudousan shotoku
利子所得|rishi shotoku
配当所得|haitou shotoku
退職所得|taishoku shotoku
譲渡所得|jouto shotoku
一時所得|ichiji shotoku
雑所得|zatsu shotoku
総合課税|sougou kazei
分離課税|bunri kazei
損益通算|soneki tsuusan
繰越控除|kurikoshi koujo
医療費控除|iryouhi koujo
社会保険料控除|shakai hokenryou koujo
生命保険料控除|seimei hokenryou koujo
地震保険料控除|jishin hokenryou koujo
配偶者控除|haiguusha koujo
扶養控除|fuyou koujo
基礎控除|kiso koujo
寄附金控除|kifukin koujo
住宅ローン控除|juutaku ron koujo
源泉徴収票|gensen choushuuhyou
確定申告書|kakutei shinkokusho
税務署|zeimusho
納税|nouzei
還付|kanpu
予定納税|yotei nouzei
申告納税|shinkoku nouzei
賦課課税|fuka kazei
課税標準|kazei hyoujun
`,
  real_estate: `
不動産|fudousan
土地|tochi
建物|tatemono
宅地|takuchi
地目|chimoku
地積|chiseki
登記簿|toukibo
登記事項証明書|touki jikou shoumeisho
所有権|shoyuuken
抵当権|teitouken
借地権|shakuchiken
借家権|shakkaken
賃貸借契約|chintaishaku keiyaku
売買契約|baibai keiyaku
重要事項説明|juuyou jikou setsumei
宅地建物取引士|takuchi tatemono torihikishi
不動産広告|fudousan koukoku
建ぺい率|kenpei ritsu
容積率|youseki ritsu
用途地域|youto chiiki
都市計画区域|toshi keikaku kuiki
市街化区域|shigaika kuiki
市街化調整区域|shigaika chousei kuiki
接道義務|setsudou gimu
建築確認|kenchiku kakunin
固定資産税評価額|kotei shisan zei hyoukagaku
公示価格|kouji kakaku
基準地標準価格|kijunchi hyoujun kakaku
路線価|rosenka
鑑定評価|kantei hyouka
取引事例比較法|torihiki jirei hikaku hou
原価法|genka hou
収益還元法|shuueki kangen hou
不動産所得|fudousan shotoku
管理費|kanrihi
修繕積立金|shuuzen tsumitatekin
敷金|shikikin
礼金|reikin
更新料|koushinryou
借地借家法|shakuchi shakka hou
区分所有法|kubun shoyuu hou
マンション管理|manshon kanri
専有部分|senyuu bubun
共用部分|kyouyou bubun
抵当権設定|teitouken settei
所有権移転登記|shoyuuken iten touki
不動産取得税|fudousan shutoku zei
登録免許税|touroku menkyo zei
譲渡所得|jouto shotoku
空き家|akiya
`,
  inheritance: `
相続|souzoku
贈与|zouyo
遺言|yuigon
遺産分割|isan bunkatsu
法定相続人|houtei souzokunin
推定相続人|suitei souzokunin
相続財産|souzoku zaisan
遺留分|iryubun
遺贈|izou
死因贈与|shiin zouyo
生前贈与|seizen zouyo
相続放棄|souzoku houki
限定承認|gentei shounin
単純承認|tanjun shounin
代襲相続|daishuu souzoku
配偶者|haiguusha
直系尊属|chokkei sonzoku
直系卑属|chokkei hizoku
兄弟姉妹|kyoudai shimai
親族|shinzoku
戸籍|koseki
遺言書|yuigonsho
自筆証書遺言|jihitsu shousho yuigon
公正証書遺言|kousei shousho yuigon
秘密証書遺言|himitsu shousho yuigon
検認|kennin
遺言執行者|yuigon shikkousha
遺産分割協議|isan bunkatsu kyougi
遺産分割協議書|isan bunkatsu kyougisho
寄与分|kiyobun
特別受益|tokubetsu jueki
遺産評価|isan hyouka
小規模宅地|shoukibo takuchi
生命保険金|seimei hokenkin
死亡退職金|shibou taishokukin
債務控除|saimu koujo
葬式費用|soushiki hiyou
贈与契約|zouyo keiyaku
暦年贈与|rekinen zouyo
相続時精算課税|souzokuji seisan kazei
事業承継|jigyou shoukei
後継者|koukeisha
自社株|jishakabu
株式評価|kabushiki hyouka
取引相場|torihiki souba
類似業種比準|ruiji gyoushu hijun
純資産価額|junshisan kagaku
遺産目録|isan mokuroku
財産管理|zaisan kanri
成年後見|seinen kouken
`,
};

const shortNotes = {
  life_planning: [
    ["将来の収支と生活設計を結び付けて整理する項目です", "shourai no shuushi to seikatsu sekkei wo seiri suru koumoku desu"],
    ["家計の目標を確認し資金準備の順序を考えるために使います", "kakei no mokuhyou to shikin junbi no junjo wo kangaeru tame ni tsukaimasu"],
    ["相談者の働き方や家族構成に合わせて確認する知識です", "soudansha no hatarakikata ya kazoku kousei ni awasete kakunin suru chishiki desu"],
  ],
  risk_management: [
    ["起こり得る損失に備える手段を選ぶときの基本項目です", "okoriuru sonshitsu ni sonaeru shudan wo erabu toki no kihon koumoku desu"],
    ["契約内容と保障の範囲を照らして確認することが大切です", "keiyaku naiyou to hoshou no hani wo terashite kakunin suru koto ga taisetsu desu"],
    ["家計に残すべきリスクと移転するリスクを分けて考えます", "kakei ni nokosu risuku to iten suru risuku wo wakete kangaemasu"],
  ],
  financial_assets: [
    ["収益性と安全性と流動性のバランスを見て考える項目です", "shuuekisei to anzensei to ryuudousei no baransu wo mite kangaeru koumoku desu"],
    ["値動きや信用状態を確認しながら運用方針を整理します", "neugoki ya shinyou joutai wo kakunin shinagara unyou houshin wo seiri shimasu"],
    ["目的と期間に合わせて商品や配分を選ぶための知識です", "mokuteki to kikan ni awasete shouhin ya haibun wo erabu tame no chishiki desu"],
  ],
  tax_planning: [
    ["所得の種類や控除の考え方を整理するときの基本項目です", "shotoku no shurui ya koujo no kangaekata wo seiri suru toki no kihon koumoku desu"],
    ["申告や納税の流れを理解するために確認する知識です", "shinkoku ya nouzei no nagare wo rikai suru tame ni kakunin suru chishiki desu"],
    ["課税関係を判断するときは所得区分と手続きを分けて考えます", "kazei kankei wo handan suru toki wa shotoku kubun to tetsuzuki wo wakete kangaemasu"],
  ],
  real_estate: [
    ["権利関係と取引条件を確認するときの基本項目です", "kenri kankei to torihiki jouken wo kakunin suru toki no kihon koumoku desu"],
    ["土地や建物の利用制限を整理するために使う知識です", "tochi ya tatemono no riyou seigen wo seiri suru tame ni tsukau chishiki desu"],
    ["価格や契約の判断では資料と説明内容を合わせて確認します", "kakaku ya keiyaku no handan dewa shiryou to setsumei naiyou wo awasete kakunin shimasu"],
  ],
  inheritance: [
    ["財産の移転と家族関係を整理するときの基本項目です", "zaisan no iten to kazoku kankei wo seiri suru toki no kihon koumoku desu"],
    ["手続きや意思表示の有無を確認しながら判断する知識です", "tetsuzuki ya ishi hyouji no umu wo kakunin shinagara handan suru chishiki desu"],
    ["遺産の分け方や承継の準備を考える場面で使います", "isan no wakekata ya shoukei no junbi wo kangaeru bamen de tsukaimasu"],
  ],
};

const level2Suffixes = [
  ["の基本", "no kihon"],
  ["の確認", "no kakunin"],
  ["の見直し", "no minaoshi"],
];

const level4Notes = {
  life_planning: "生活設計では現在の収支だけでなく将来の支出時期や働き方の変化も合わせて確認する",
  risk_management: "保険を検討するときは不安の大きさだけでなく契約者と被保険者と受取人の関係も整理する",
  financial_assets: "運用商品を比較するときは期待できる収益だけでなく価格変動や流動性の違いも確認する",
  tax_planning: "税務の学習では用語の暗記だけでなく所得区分と申告手続きのつながりを整理する",
  real_estate: "不動産取引では価格だけでなく権利関係と法令上の制限と契約前の説明を確認する",
  inheritance: "相続と贈与では財産の内容だけでなく意思表示と家族関係と手続きの流れを整理する",
};

const level4Inputs = {
  life_planning: "seikatsu sekkei dewa genzai no shuushi dake de naku shourai no shishutsu jiki ya hatarakikata no henka mo kakunin suru",
  risk_management: "hoken wo kentou suru toki wa fuan no ookisa dake de naku keiyakusha hihokensha uketorinin no kankei mo seiri suru",
  financial_assets: "unyou shouhin wo hikaku suru toki wa shuueki dake de naku kakaku hendou ya ryuudousei no chigai mo kakunin suru",
  tax_planning: "zeimu no gakushuu dewa yougo no anki dake de naku shotoku kubun to shinkoku tetsuzuki no tsunagari wo seiri suru",
  real_estate: "fudousan torihiki dewa kakaku dake de naku kenri kankei hourei seigen keiyaku mae no setsumei wo kakunin suru",
  inheritance: "souzoku to zouyo dewa zaisan no naiyou dake de naku ishi hyouji kazoku kankei tetsuzuki no nagare wo seiri suru",
};

function parseTerms(category) {
  return termRows[category]
    .trim()
    .split("\n")
    .map((line) => {
      const [display, input] = line.split("|");
      return { display, input, tags: [category] };
    });
}

function questionId(level, seq) {
  return `fp3_l${level}_${String(seq).padStart(4, "0")}`;
}

function buildLevel1() {
  let seq = 1;
  return categories.flatMap((category) =>
    parseTerms(category).map((term) => ({
      id: questionId(1, seq++),
      level: 1,
      category,
      display: term.display,
      input: term.input,
      tags: term.tags,
    }))
  );
}

function buildLevel2() {
  let seq = 1;
  return categories.flatMap((category) =>
    parseTerms(category)
      .slice(0, 14)
      .flatMap((term) =>
        level2Suffixes.map(([displaySuffix, inputSuffix]) => ({
          id: questionId(2, seq++),
          level: 2,
          category,
          display: `${term.display}${displaySuffix}`,
          input: `${term.input} ${inputSuffix}`,
          tags: [category, "compound"],
        }))
      )
  );
}

function buildLevel3() {
  let seq = 1;
  return categories.flatMap((category) =>
    parseTerms(category)
      .slice(0, 10)
      .flatMap((term) =>
        shortNotes[category].map(([displayNote, inputNote]) => ({
          id: questionId(3, seq++),
          level: 3,
          category,
          display: `${term.display}は、${displayNote}。`,
          input: `${term.input} wa ${inputNote}`,
          tags: [category, "short_sentence"],
        }))
      )
  );
}

function buildLevel4() {
  let seq = 1;
  return categories.flatMap((category) =>
    parseTerms(category)
      .slice(0, 10)
      .flatMap((term) => [
        {
          id: questionId(4, seq++),
          level: 4,
          category,
          display: `FP3級の学習で${term.display}を扱う場合、制度名だけを覚えるのではなく、相談者の目的、契約や手続きの内容、将来の変化を合わせて読み取る姿勢が重要である。`,
          input: `fp sankyuu no gakushuu de ${term.input} wo atsukau baai seido mei dake de naku soudansha no mokuteki keiyaku ya tetsuzuki no naiyou shourai no henka wo yomitoru`,
          tags: [category, "exam_style"],
        },
        {
          id: questionId(4, seq++),
          level: 4,
          category,
          display: `次の記述は${term.display}に関する学習上の整理である。${level4Notes[category]}ため、細かな数値の暗記よりも考え方の筋道を押さえることが大切である。`,
          input: `tsugi no kijutsu wa ${term.input} ni kansuru gakushuu jou no seiri de aru ${level4Inputs[category]} tame komakai suuchi no anki yori kangaekata no michisuji wo osaeru`,
          tags: [category, "exam_style"],
        },
      ])
  );
}

const levels = new Map([
  [1, buildLevel1()],
  [2, buildLevel2()],
  [3, buildLevel3()],
  [4, buildLevel4()],
]);

await mkdir(dataDir, { recursive: true });

for (const [level, questions] of levels) {
  const file = path.join(dataDir, `questions_level${level}.json`);
  await writeFile(file, `${JSON.stringify(questions, null, 2)}\n`);
  console.log(`level ${level}: ${questions.length} questions -> ${path.relative(rootDir, file)}`);
}
