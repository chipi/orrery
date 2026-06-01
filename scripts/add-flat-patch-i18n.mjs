/**
 * One-shot: add Slice 6 i18n overrides for the SurfaceFlatPatch strings
 * to scripts/paraglide-key-overrides.json. Translations are LLM first-pass
 * (per ADR-033). Run paraglide-add-keys.mjs afterward to propagate to
 * messages/{locale}.json.
 *
 * Usage:  node scripts/add-flat-patch-i18n.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const overridesPath = path.join(__dirname, 'paraglide-key-overrides.json');
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));

const TRANSLATIONS = {
  es: {
    surface_flat_back_to_planet: '← VOLVER AL PLANETA',
    surface_flat_back_aria: 'Volver al planeta',
    surface_flat_layer_regional: 'REGIONAL',
    surface_flat_layer_detail: 'DETALLE',
    surface_flat_layer_traverse: 'TRAYECTO',
    surface_flat_layer_toggles_aria: 'Controles de capas',
    surface_flat_scale_label: 'ESCALA',
    surface_flat_lat_lon: 'LON {lon}° · LAT {lat}°',
    surface_flat_upsample_warning_mars:
      '⚠ Aproximándose al límite de píxeles nativo (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon:
      '⚠ Aproximándose al límite de píxeles nativo (LROC NAC 50 cm/px)',
  },
  fr: {
    surface_flat_back_to_planet: '← RETOUR À LA PLANÈTE',
    surface_flat_back_aria: 'Retour à la planète',
    surface_flat_layer_regional: 'RÉGIONAL',
    surface_flat_layer_detail: 'DÉTAIL',
    surface_flat_layer_traverse: 'PARCOURS',
    surface_flat_layer_toggles_aria: 'Bascules de couche',
    surface_flat_scale_label: 'ÉCHELLE',
    surface_flat_lat_lon: 'LON {lon}° · LAT {lat}°',
    surface_flat_upsample_warning_mars:
      '⚠ Approche de la limite de pixels native (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon:
      '⚠ Approche de la limite de pixels native (LROC NAC 50 cm/px)',
  },
  de: {
    surface_flat_back_to_planet: '← ZURÜCK ZUM PLANET',
    surface_flat_back_aria: 'Zurück zum Planet',
    surface_flat_layer_regional: 'REGIONAL',
    surface_flat_layer_detail: 'DETAIL',
    surface_flat_layer_traverse: 'ROUTE',
    surface_flat_layer_toggles_aria: 'Layer-Schalter',
    surface_flat_scale_label: 'MAßSTAB',
    surface_flat_lat_lon: 'LON {lon}° · LAT {lat}°',
    surface_flat_upsample_warning_mars: '⚠ Native Pixelgrenze erreicht (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ Native Pixelgrenze erreicht (LROC NAC 50 cm/px)',
  },
  it: {
    surface_flat_back_to_planet: '← TORNA AL PIANETA',
    surface_flat_back_aria: 'Torna al pianeta',
    surface_flat_layer_regional: 'REGIONALE',
    surface_flat_layer_detail: 'DETTAGLIO',
    surface_flat_layer_traverse: 'PERCORSO',
    surface_flat_layer_toggles_aria: 'Interruttori di livello',
    surface_flat_scale_label: 'SCALA',
    surface_flat_lat_lon: 'LON {lon}° · LAT {lat}°',
    surface_flat_upsample_warning_mars: '⚠ Limite di pixel nativo (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ Limite di pixel nativo (LROC NAC 50 cm/px)',
  },
  'pt-BR': {
    surface_flat_back_to_planet: '← VOLTAR AO PLANETA',
    surface_flat_back_aria: 'Voltar ao planeta',
    surface_flat_layer_regional: 'REGIONAL',
    surface_flat_layer_detail: 'DETALHE',
    surface_flat_layer_traverse: 'TRAJETO',
    surface_flat_layer_toggles_aria: 'Alternadores de camada',
    surface_flat_scale_label: 'ESCALA',
    surface_flat_lat_lon: 'LON {lon}° · LAT {lat}°',
    surface_flat_upsample_warning_mars: '⚠ Limite de pixel nativo (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ Limite de pixel nativo (LROC NAC 50 cm/px)',
  },
  nl: {
    surface_flat_back_to_planet: '← TERUG NAAR PLANEET',
    surface_flat_back_aria: 'Terug naar planeet',
    surface_flat_layer_regional: 'REGIONAAL',
    surface_flat_layer_detail: 'DETAIL',
    surface_flat_layer_traverse: 'ROUTE',
    surface_flat_layer_toggles_aria: 'Laagschakelaars',
    surface_flat_scale_label: 'SCHAAL',
    surface_flat_lat_lon: 'LON {lon}° · LAT {lat}°',
    surface_flat_upsample_warning_mars: '⚠ Native pixel limiet (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ Native pixel limiet (LROC NAC 50 cm/px)',
  },
  'zh-CN': {
    surface_flat_back_to_planet: '← 返回行星',
    surface_flat_back_aria: '返回行星',
    surface_flat_layer_regional: '区域',
    surface_flat_layer_detail: '细节',
    surface_flat_layer_traverse: '路径',
    surface_flat_layer_toggles_aria: '图层切换',
    surface_flat_scale_label: '比例尺',
    surface_flat_lat_lon: '经度 {lon}° · 纬度 {lat}°',
    surface_flat_upsample_warning_mars: '⚠ 即将达到原生像素极限 (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ 即将达到原生像素极限 (LROC NAC 50 cm/px)',
  },
  ja: {
    surface_flat_back_to_planet: '← 惑星に戻る',
    surface_flat_back_aria: '惑星に戻る',
    surface_flat_layer_regional: '広域',
    surface_flat_layer_detail: '詳細',
    surface_flat_layer_traverse: '走行経路',
    surface_flat_layer_toggles_aria: 'レイヤー切替',
    surface_flat_scale_label: '縮尺',
    surface_flat_lat_lon: '経度 {lon}° · 緯度 {lat}°',
    surface_flat_upsample_warning_mars: '⚠ ネイティブピクセル限界に到達 (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ ネイティブピクセル限界に到達 (LROC NAC 50 cm/px)',
  },
  ko: {
    surface_flat_back_to_planet: '← 행성으로 돌아가기',
    surface_flat_back_aria: '행성으로 돌아가기',
    surface_flat_layer_regional: '광역',
    surface_flat_layer_detail: '상세',
    surface_flat_layer_traverse: '경로',
    surface_flat_layer_toggles_aria: '레이어 토글',
    surface_flat_scale_label: '축척',
    surface_flat_lat_lon: '경도 {lon}° · 위도 {lat}°',
    surface_flat_upsample_warning_mars: '⚠ 원본 픽셀 한계 접근 중 (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ 원본 픽셀 한계 접근 중 (LROC NAC 50 cm/px)',
  },
  hi: {
    surface_flat_back_to_planet: '← ग्रह पर वापस जाएं',
    surface_flat_back_aria: 'ग्रह पर वापस जाएं',
    surface_flat_layer_regional: 'क्षेत्रीय',
    surface_flat_layer_detail: 'विस्तार',
    surface_flat_layer_traverse: 'मार्ग',
    surface_flat_layer_toggles_aria: 'परत टॉगल',
    surface_flat_scale_label: 'स्केल',
    surface_flat_lat_lon: 'देशा {lon}° · अक्षां {lat}°',
    surface_flat_upsample_warning_mars: '⚠ मूल पिक्सेल सीमा के पास (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ मूल पिक्सेल सीमा के पास (LROC NAC 50 cm/px)',
  },
  ar: {
    surface_flat_back_to_planet: '← العودة إلى الكوكب',
    surface_flat_back_aria: 'العودة إلى الكوكب',
    surface_flat_layer_regional: 'إقليمي',
    surface_flat_layer_detail: 'تفصيل',
    surface_flat_layer_traverse: 'مسار',
    surface_flat_layer_toggles_aria: 'مفاتيح الطبقات',
    surface_flat_scale_label: 'مقياس',
    surface_flat_lat_lon: 'خط الطول {lon}° · خط العرض {lat}°',
    surface_flat_upsample_warning_mars: '⚠ يقترب من حد البكسل الأصلي (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon: '⚠ يقترب من حد البكسل الأصلي (LROC NAC 50 cm/px)',
  },
  ru: {
    surface_flat_back_to_planet: '← НАЗАД К ПЛАНЕТЕ',
    surface_flat_back_aria: 'Назад к планете',
    surface_flat_layer_regional: 'ОБЗОР',
    surface_flat_layer_detail: 'ДЕТАЛИ',
    surface_flat_layer_traverse: 'МАРШРУТ',
    surface_flat_layer_toggles_aria: 'Переключатели слоёв',
    surface_flat_scale_label: 'МАСШТАБ',
    surface_flat_lat_lon: 'ДОЛГ {lon}° · ШИР {lat}°',
    surface_flat_upsample_warning_mars:
      '⚠ Приближение к нативному пределу пикселей (HiRISE 25 см/px)',
    surface_flat_upsample_warning_moon:
      '⚠ Приближение к нативному пределу пикселей (LROC NAC 50 см/px)',
  },
  'sr-Cyrl': {
    surface_flat_back_to_planet: '← НАЗАД НА ПЛАНЕТУ',
    surface_flat_back_aria: 'Назад на планету',
    surface_flat_layer_regional: 'ОБЛАСТ',
    surface_flat_layer_detail: 'ДЕТАЉ',
    surface_flat_layer_traverse: 'ПУТАЊА',
    surface_flat_layer_toggles_aria: 'Прекидачи слојева',
    surface_flat_scale_label: 'РАЗМЕРА',
    surface_flat_lat_lon: 'ДУЖ {lon}° · ШИР {lat}°',
    surface_flat_upsample_warning_mars: '⚠ Приближавање нативном пиксел лимиту (HiRISE 25 cm/px)',
    surface_flat_upsample_warning_moon:
      '⚠ Приближавање нативном пиксел лимиту (LROC NAC 50 cm/px)',
  },
  // sr-Latn dropped in v0.5.0 J.5 — sr-Cyrl is the canonical Serbian.
  // Browser locales sending sr-Latn fall back to sr-Cyrl via
  // normaliseBrowserLocale (see src/lib/locale.test.ts).
};

for (const [locale, keys] of Object.entries(TRANSLATIONS)) {
  if (!overrides[locale]) overrides[locale] = {};
  for (const [key, value] of Object.entries(keys)) {
    overrides[locale][key] = value;
  }
}

fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
console.log(
  `Added ${Object.keys(TRANSLATIONS.es).length} keys × ${Object.keys(TRANSLATIONS).length} locales`,
);
