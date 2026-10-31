cd /work/orrery/main
while IFS='|' read -r loc s; do
  [ -z "$loc" ] && continue
  hit=$(git log -S"$s" --reverse --format="%h|%ad|%s" --date=short -- "i18n-src/$loc" "messages/$loc.json" | head -1)
  now=$(grep -rlF "$s" "i18n-src/$loc" 2>/dev/null | head -1 | sed "s#i18n-src/$loc/##")
  printf '%-7s %-28s | %s | now: %s\n' "$loc" "$s" "${hit:-NOT FOUND}" "${now:-gone}"
done <<'LIST'
nl|kruisfoortdrijving
nl|vlaggenschipbissies
nl|suborbiale
nl|middeltauw
nl|humaan-gerateerde
nl|het lanceerbasis
nl|deorbitale afbraak
nl|Trans-Marsinjectionop
hi|भारे
hi|अनुक्रमित उड़ान
it|lavanda Philae
it|barca a vita
it|preblocco
it|venose
fr|tremplin
fr|tricorps
fr|tank externe
fr|cislunairedans
es|superligero
es|Teutates
es|cajas polares
ar|يُقبض
ar|محرقات
ar|هذا المناورة
ja|溅着
ja|十万吨
zh-CN|梅西尔德星
zh-CN|戈尔登·库勃
sr-Cyrl|IZVRŠENO
sr-Cyrl|ФЛОВН
sr-Cyrl|безтежинског
ru|Это была не конец
ru|внекосмическим
de|eine Sprengkopf
pt-BR|missão espacial em solo
ko|월간 이동 주입
LIST
