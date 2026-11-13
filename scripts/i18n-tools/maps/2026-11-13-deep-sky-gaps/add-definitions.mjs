// One-sentence definitions for the 7 terms of add-terms.mjs, in en-US and the 13 locales
// (i18n-src/<loc>/glossary/terms.json; /science/glossary needs one per `term` entry).
// Sources read (none of them Wikipedia):
//   anemic spiral: arxiv.org/abs/astro-ph/0205105 ("Anemic galaxies have less prominent star formation
//     than normal galaxies of the same Hubble type", deficient gas content)
//   flocculent spiral: arxiv.org/abs/2205.08733 (flocculents "have patchy and low-contrast spiral
//     features"; grand-designs "almost continuous and high contrast spiral arms")
//   millisecond pulsar: astronomy.com/science/the-art-of-recycling-pulsars ("old neutron stars in binary
//     systems that have been spun up to high rotational frequencies by accumulation of mass and angular
//     momentum from a companion star", periods of about 1 to 10 milliseconds)
//   core-collapsed cluster: export.arxiv.org abstract "Understanding the Dynamical State of Globular
//     Clusters: Core-Collapsed vs Non Core-Collapsed" (core-collapsed clusters have reached or are about to
//     reach the equilibrium binary-burning phase; core collapse is where dynamical evolution drives clusters)
//   galactic wind: arxiv.org/abs/astro-ph/0504435 (Veilleux et al., "Galactic Winds": the primary mechanism
//     by which energy and metals are recycled in galaxies); supernova and radiation driving as in the site's
//     M82 text
//   OB association: arxiv.org/abs/2412.10769 ("Low-density and unbound stellar groups ... delineated through
//     their bright and massive members")
//   metallicity: an arXiv abstract reading "an enrichment of elements heavier than helium relative to the
//     Sun" (metallicity as the abundance of elements heavier than helium)
//   node scripts/i18n-tools/maps/2026-11-13-deep-sky-gaps/add-definitions.mjs
import fs from 'node:fs';

const KEYS = [
  'anemic spiral',
  'flocculent spiral',
  'millisecond pulsar',
  'core-collapsed cluster',
  'galactic wind',
  'OB association',
  'metallicity',
];
const D = {
  'en-US': [
    'A spiral galaxy with unusually little star formation for its type: its arms are smooth and low in contrast, often because it has lost or used up much of its gas.',
    'A spiral galaxy whose arms are patchy, short and low in contrast instead of two long, continuous arms.',
    'A pulsar that spins once every few milliseconds: an old neutron star spun up by gas falling in from a companion star.',
    'A globular cluster whose centre has contracted into an unusually dense knot of stars, the end point of its dynamical evolution.',
    'A flow of gas blown out of a galaxy by the radiation and supernova explosions of its young stars.',
    'A loose group of young, massive stars of spectral types O and B that formed together but are no longer held by gravity and slowly drift apart.',
    "The share of a star's or galaxy's matter made of elements heavier than helium, which astronomers call metals; old stars usually have low metallicity.",
  ],
  ru: [
    'Спиральная галактика со слабым для своего типа звёздообразованием: её рукава гладкие и малоконтрастные, часто потому, что она потеряла или израсходовала значительную часть газа.',
    'Спиральная галактика, рукава которой клочковатые, короткие и малоконтрастные, а не два длинных непрерывных.',
    'Пульсар, делающий один оборот за несколько миллисекунд: старая нейтронная звезда, раскрученная газом, падающим на неё от звезды-компаньона.',
    'Шаровое скопление, центр которого сжался в необычно плотный клубок звёзд, — конечная стадия его динамической эволюции.',
    'Поток газа, выдуваемый из галактики излучением и взрывами сверхновых молодых звёзд.',
    'Рыхлая группа молодых массивных звёзд спектральных классов O и B, возникших вместе, но уже не связанных гравитацией и постепенно разлетающихся.',
    'Доля вещества звезды или галактики, приходящаяся на элементы тяжелее гелия, которые астрономы называют металлами; у старых звёзд металличность обычно низкая.',
  ],
  ja: [
    '同じタイプの銀河に比べて星形成が極端に少ない渦巻銀河。腕は滑らかでコントラストが低く、ガスを失ったか使い果たしたことが多い。',
    '腕が2本の長く連続した腕ではなく、短く途切れた低コントラストの断片でできている渦巻銀河。',
    '数ミリ秒に1回自転するパルサー。連星の相手の星から落ちてくるガスで回転を速められた、古い中性子星。',
    '中心が極めて高密度な星の塊にまで収縮した球状星団。力学的進化の最終段階にあたる。',
    '若い星の放射と超新星爆発によって、銀河から吹き出すガスの流れ。',
    'O型とB型の若く重い星がともに生まれた緩やかな集まり。重力では束縛されておらず、少しずつ散らばっていく。',
    '星や銀河の物質のうち、天文学者が「金属」と呼ぶヘリウムより重い元素が占める割合。古い星は一般に金属量が低い。',
  ],
  'zh-CN': [
    '同类型星系中恒星形成异常稀少的旋涡星系：旋臂平滑、对比度低，往往是因为气体被剥离或已被耗尽。',
    '旋臂呈零碎、短促、低对比度的片段，而不是两条长而连续的旋臂的旋涡星系。',
    '每隔几毫秒自转一圈的脉冲星，是被伴星落下的气体加速自转的古老中子星。',
    '中心收缩成异常致密的恒星团块的球状星团，是其动力学演化的终点。',
    '由年轻恒星的辐射和超新星爆发从星系中吹出的气体流。',
    '由O型和B型年轻大质量恒星组成的松散集团，它们一同诞生，如今已不受引力束缚，正缓慢散开。',
    '恒星或星系物质中比氦重的元素（天文学家称之为金属）所占的比例；古老恒星的金属量通常较低。',
  ],
  ko: [
    '같은 유형의 은하에 비해 별 형성이 유난히 적은 나선 은하로, 팔이 매끄럽고 대비가 낮으며 기체를 잃었거나 소진한 경우가 많습니다.',
    '길고 이어진 두 개의 팔 대신 팔이 짧고 끊어진 조각들로 이루어지고 대비가 낮은 나선 은하입니다.',
    '몇 밀리초에 한 번 자전하는 펄서로, 짝별에서 떨어지는 기체로 자전이 빨라진 오래된 중성자별입니다.',
    '중심이 유난히 조밀한 별 덩어리로 수축한 구상 성단으로, 역학적 진화의 마지막 단계입니다.',
    '젊은 별의 복사와 초신성 폭발이 은하에서 밀어내는 기체의 흐름입니다.',
    '함께 태어났지만 더는 중력으로 묶여 있지 않아 서서히 흩어지는, O형과 B형의 젊고 무거운 별들의 느슨한 무리입니다.',
    '별이나 은하의 물질 가운데 천문학자가 금속이라 부르는 헬륨보다 무거운 원소가 차지하는 비율로, 오래된 별은 대체로 금속함량이 낮습니다.',
  ],
  hi: [
    'अपनी श्रेणी की आकाशगंगाओं की तुलना में असामान्य रूप से कम तारा-निर्माण वाली सर्पिल आकाशगंगा; इसकी भुजाएँ चिकनी और कम कंट्रास्ट वाली होती हैं, अक्सर इसलिए कि इसकी गैस छिन गई या खप गई है।',
    'ऐसी सर्पिल आकाशगंगा जिसकी भुजाएँ दो लंबी, अटूट भुजाओं के बजाय छोटे, टूटे हुए और कम कंट्रास्ट वाले टुकड़ों जैसी होती हैं।',
    'ऐसा पल्सर जो हर कुछ मिलीसेकंड में एक बार घूमता है; यह एक पुराना न्यूट्रॉन तारा है जिसे साथी तारे से गिरती गैस ने तेज़ घुमा दिया है।',
    'ऐसा गोलाकार तारागुच्छ जिसका केंद्र असामान्य रूप से सघन तारों की गाँठ में सिकुड़ गया है; यह उसके गतिकीय विकास का अंतिम पड़ाव है।',
    'आकाशगंगा से बाहर बहने वाली गैस की धारा, जिसे उसके युवा तारों का विकिरण और सुपरनोवा विस्फोट चलाते हैं।',
    'O और B वर्ग के युवा, भारी तारों का ढीला समूह जो साथ जन्मा पर अब गुरुत्वाकर्षण से बँधा नहीं है और धीरे-धीरे बिखर रहा है।',
    'किसी तारे या आकाशगंगा के पदार्थ का वह अंश जो हीलियम से भारी तत्वों से बना है, जिन्हें खगोलविद धातु कहते हैं; पुराने तारों में आम तौर पर धातुता कम होती है।',
  ],
  ar: [
    'مجرة حلزونية يقل فيها تشكل النجوم قلةً غير معتادة بالنسبة إلى نوعها: أذرعها ملساء منخفضة التباين، وغالبًا لأنها فقدت جزءًا كبيرًا من غازها أو استنفدته.',
    'مجرة حلزونية أذرعها قطع متقطعة قصيرة منخفضة التباين بدل ذراعين طويلتين متصلتين.',
    'نجم نابض يدور دورة كاملة كل بضعة أجزاء من ألف من الثانية، وهو نجم نيوتروني قديم زاد غاز متساقط من نجم رفيق سرعة دورانه.',
    'عنقود كروي انكمش مركزه إلى كتلة كثيفة على غير المعتاد من النجوم، وهي المرحلة الأخيرة من تطوره الديناميكي.',
    'تدفق من الغاز يُدفع خارج المجرة بفعل إشعاع نجومها الفتية وانفجارات المستعرات العظمى فيها.',
    'مجموعة متناثرة من نجوم فتية ثقيلة من النوعين الطيفيين O وB وُلدت معًا لكنها لم تعد مرتبطة بالجاذبية وتتباعد ببطء.',
    'نسبة مادة النجم أو المجرة التي تتألف من عناصر أثقل من الهيليوم، ويسميها الفلكيون فلزات؛ وتكون الفلزية عادةً منخفضة في النجوم القديمة.',
  ],
  'sr-Cyrl': [
    'Спирална галаксија са необично слабим формирањем звезда за свој тип: краци су јој глатки и слабог контраста, често зато што је изгубила или потрошила већи део гаса.',
    'Спирална галаксија чији су краци испрекидани, кратки и слабог контраста, уместо два дугачка непрекидна крака.',
    'Пулсар који се окрене једном за неколико милисекунди: стара неутронска звезда коју је убрзао гас који на њу пада од пратиоца.',
    'Кугласто јато чији се центар скупио у необично густ чвор звезда, што је крајња тачка његове динамичке еволуције.',
    'Ток гаса избачен из галаксије зрачењем и експлозијама супернова њених младих звезда.',
    'Растресита група младих масивних звезда спектралних класа O и B које су настале заједно, али више нису гравитационо везане и полако се удаљавају.',
    'Удео материје звезде или галаксије који чине елементи тежи од хелијума, које астрономи зову метали; старе звезде обично имају малу металичност.',
  ],
  de: [
    'Eine Spiralgalaxie mit für ihren Typ ungewöhnlich wenig Sternentstehung: Ihre Arme sind glatt und kontrastarm, oft weil sie viel Gas verloren oder verbraucht hat.',
    'Eine Spiralgalaxie, deren Arme statt zweier langer, durchgehender Arme kurze, zerrissene, kontrastarme Fetzen sind.',
    'Ein Pulsar, der sich alle paar Millisekunden einmal dreht: ein alter Neutronenstern, den Gas von einem Begleitstern auf hohe Drehzahl gebracht hat.',
    'Ein Kugelsternhaufen, dessen Zentrum sich zu einem ungewöhnlich dichten Sternknäuel zusammengezogen hat, dem Endpunkt seiner dynamischen Entwicklung.',
    'Ein Gasstrom, den Strahlung und Supernova-Explosionen der jungen Sterne aus einer Galaxie treiben.',
    'Eine lockere Gruppe junger, massereicher Sterne der Spektraltypen O und B, die gemeinsam entstanden sind, aber nicht mehr durch die Schwerkraft zusammengehalten werden und langsam auseinanderdriften.',
    'Der Anteil der Materie eines Sterns oder einer Galaxie, der aus Elementen schwerer als Helium besteht, die Astronomen Metalle nennen; alte Sterne haben meist eine geringe Metallizität.',
  ],
  fr: [
    "Galaxie spirale dont la formation d'étoiles est anormalement faible pour son type : ses bras sont lisses et peu contrastés, souvent parce qu'elle a perdu ou épuisé une grande part de son gaz.",
    'Galaxie spirale dont les bras, au lieu de deux longs bras continus, sont de courts fragments décousus et peu contrastés.',
    "Pulsar qui tourne sur lui-même en quelques millisecondes : une vieille étoile à neutrons accélérée par le gaz tombant d'une étoile compagne.",
    "Amas globulaire dont le centre s'est contracté en un noyau d'étoiles exceptionnellement dense, aboutissement de son évolution dynamique.",
    "Flux de gaz chassé d'une galaxie par le rayonnement et les explosions de supernovæ de ses jeunes étoiles.",
    'Groupe lâche de jeunes étoiles massives de type spectral O et B, nées ensemble mais qui ne sont plus liées par la gravité et se dispersent lentement.',
    "Part de la matière d'une étoile ou d'une galaxie constituée d'éléments plus lourds que l'hélium, que les astronomes appellent métaux ; les vieilles étoiles ont en général une faible métallicité.",
  ],
  es: [
    'Galaxia espiral con una formación estelar inusualmente baja para su tipo: sus brazos son lisos y de poco contraste, a menudo porque ha perdido o agotado buena parte de su gas.',
    'Galaxia espiral cuyos brazos, en lugar de dos brazos largos y continuos, son fragmentos cortos, entrecortados y de poco contraste.',
    'Púlsar que gira una vez cada pocos milisegundos: una estrella de neutrones vieja acelerada por el gas que cae desde una estrella compañera.',
    'Cúmulo globular cuyo centro se ha contraído hasta formar un nudo de estrellas inusualmente denso, el punto final de su evolución dinámica.',
    'Flujo de gas expulsado de una galaxia por la radiación y las explosiones de supernova de sus estrellas jóvenes.',
    'Grupo disperso de estrellas jóvenes y masivas de tipos espectrales O y B que nacieron juntas, pero que ya no están ligadas por la gravedad y se alejan despacio.',
    'Fracción de la materia de una estrella o galaxia formada por elementos más pesados que el helio, que los astrónomos llaman metales; las estrellas viejas suelen tener poca metalicidad.',
  ],
  it: [
    'Galassia a spirale con una formazione stellare insolitamente scarsa per il suo tipo: i bracci sono lisci e poco contrastati, spesso perché ha perso o esaurito gran parte del suo gas.',
    'Galassia a spirale i cui bracci, invece di due bracci lunghi e continui, sono frammenti corti, spezzati e poco contrastati.',
    'Pulsar che ruota su sé stesso in pochi millisecondi: una vecchia stella di neutroni accelerata dal gas che cade da una stella compagna.',
    "Ammasso globulare il cui centro si è contratto in un nodo di stelle insolitamente denso, punto d'arrivo della sua evoluzione dinamica.",
    'Flusso di gas spinto fuori da una galassia dalla radiazione e dalle esplosioni di supernova delle sue stelle giovani.',
    'Gruppo diffuso di stelle giovani e massicce di tipo spettrale O e B, nate insieme ma non più legate dalla gravità, che si disperdono lentamente.',
    "Frazione della materia di una stella o di una galassia fatta di elementi più pesanti dell'elio, che gli astronomi chiamano metalli; le stelle vecchie hanno di solito una bassa metallicità.",
  ],
  nl: [
    'Een spiraalstelsel met voor zijn type ongewoon weinig stervorming: de armen zijn glad en contrastarm, vaak omdat het veel gas is kwijtgeraakt of heeft opgebruikt.',
    'Een spiraalstelsel waarvan de armen, in plaats van twee lange doorlopende armen, korte, onderbroken en contrastarme stukjes zijn.',
    'Een pulsar die om de paar milliseconden één keer draait: een oude neutronenster die door gas van een begeleidende ster sneller is gaan draaien.',
    'Een bolvormige sterrenhoop waarvan het centrum is samengetrokken tot een ongewoon dichte kluwen sterren, het eindpunt van zijn dynamische evolutie.',
    'Een gasstroom die door straling en supernova-explosies van de jonge sterren uit een sterrenstelsel wordt geblazen.',
    'Een losse groep jonge, zware sterren van spectraaltype O en B die samen zijn ontstaan maar niet meer door de zwaartekracht bijeen worden gehouden en langzaam uit elkaar drijven.',
    'Het aandeel van de materie van een ster of sterrenstelsel dat uit elementen zwaarder dan helium bestaat, die astronomen metalen noemen; oude sterren hebben meestal een lage metalliciteit.',
  ],
  'pt-BR': [
    'Galáxia espiral com formação estelar incomumente baixa para o seu tipo: seus braços são lisos e de pouco contraste, muitas vezes porque perdeu ou esgotou boa parte do gás.',
    'Galáxia espiral cujos braços, em vez de dois braços longos e contínuos, são fragmentos curtos, interrompidos e de pouco contraste.',
    'Pulsar que gira uma vez a cada poucos milissegundos: uma estrela de nêutrons antiga acelerada pelo gás que cai de uma estrela companheira.',
    'Aglomerado globular cujo centro se contraiu num nó de estrelas incomumente denso, o ponto final de sua evolução dinâmica.',
    'Fluxo de gás expulso de uma galáxia pela radiação e pelas explosões de supernova de suas estrelas jovens.',
    'Grupo disperso de estrelas jovens e massivas de tipo espectral O e B que nasceram juntas, mas já não estão presas pela gravidade e se afastam devagar.',
    'Fração da matéria de uma estrela ou galáxia formada por elementos mais pesados que o hélio, que os astrônomos chamam de metais; estrelas velhas costumam ter baixa metalicidade.',
  ],
};
for (const [loc, defs] of Object.entries(D)) {
  const f = `i18n-src/${loc}/glossary/terms.json`;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  KEYS.forEach((k, i) => {
    j[k] = defs[i];
  });
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
console.log('definitions written for', Object.keys(D).length, 'locales');
