# Multilingual SEO — get indexed & ranked in each language

**Goal (operator, 2026-08-31):** when someone in Russia googles in Russian (or
Italian/Spanish/Dutch/…), Google should surface the **Russian** version of Orrery
and drop them onto the localized page already in their language — not the English
page with a hidden switcher. The behavioral data shows real users don't find the
in-app language switcher (locale-switch fired once in 30d; ~99.5% of traffic is on
the English base). So the win is at the **search + landing** layer, not the in-app
toggle.

**Status: the technical foundation is already built and mostly correct. The missing
piece is mostly TIME (indexing) + a few incremental boosters.** Verified live on
prod 2026-08-31.

---

## What "Google suggests the Russian version" actually requires

Google swaps to a user's language version in the SERP when a site provides:
1. A separate, crawlable URL per language. ✅ (`/ru/…`, `/de/…`, 14 locales)
2. `hreflang` annotations linking all language versions bidirectionally. ✅
3. A **self-referential canonical** on each localized page (not canonical→English). ✅
4. **Actually-translated content** on each localized URL (title, description, AND
   body) that Google can read. ✅ (prerendered, server-side)
5. Enough crawl coverage + domain trust for Google to index and rank them. ⏳ (early)

All the hard technical parts are done. #5 is time + authority.

## Verified current state (live prod, 2026-08-31)

| Signal | State | Evidence |
|---|---|---|
| Per-locale URLs | ✅ | `/de/`, `/ru/`, `/es/…` all serve 200 |
| `<html lang>` | ✅ correct | `<html lang="de">` etc. |
| `<title>` translated | ✅ | de: "Ein Sonnensystem-Explorer für den Browser"; ru: "Исследователь Солнечной системы" |
| `<meta description>` translated | ✅ | de/es/ru all localized |
| **Body prose translated + prerendered** | ✅ | `/de/science/…/suit-lineage` `<main>` has real German sentences server-side ("Besatzung am Leben halten, wenn das Raumschiff den Druck verliert.") — **no JS needed**; Google reads it directly |
| `hreflang` cluster | ✅ complete | 14 locales + `x-default`, absolute URLs, bidirectional, on every page |
| Canonical | ✅ self-referential | `/de/` canonicals to `/de/`, not to `/` |
| Sitemap | ✅ lists all locales | 3,668 URLs incl. every `/‹locale›/route` |

This is a strong base — better than the zero non-EN traffic implies.

## Why non-EN traffic is still ~0 (honest read)

**Primarily: it's early.** The sitemap was submitted to Search Console on
**2026-08-28** — 3 days before this analysis. On a new, low-authority domain, Google
takes **weeks-to-months** to crawl 3,668 URLs, index the localized ones, trust the
hreflang cluster, and start swapping locales in the SERP. Zero non-EN traffic at day
3 is expected, not a defect. (And Googlebot IS already crawling — 1,294+ hits/24h.)

**The opportunity:** non-English SERPs are far less crowded than English. Well-formed
localized pages can rank faster there than in English — once indexed.

## Gaps / boosters (incremental — none are blockers)

1. **No sitemap `hreflang` annotations.** The HTML `hreflang` tags are present (so it
   works), but the sitemap does NOT include `<xhtml:link rel="alternate" hreflang>`
   per URL. Adding them gives Google a second, stronger discovery channel for the
   locale cluster and speeds localized indexing. **Low effort, high leverage now.**
2. **No `og:locale` / `og:locale:alternate`** (0 present). Add per-locale — helps
   social shares + some crawlers present the right language.
3. **No on-site language suggestion.** A German user who lands on `/` (English) from a
   non-localized link (LinkedIn, a bare share) gets no prompt — verified: `GET /` with
   `Accept-Language: de` returns 200, no redirect/suggestion. This is the on-site
   complement to hreflang: a lightweight "Auf Deutsch ansehen?" banner driven by
   `Accept-Language` catches users hreflang can't (non-search referrals). **Directly
   fixes the behavioral finding that nobody finds the switcher.** (Do NOT hard-redirect
   — Google dislikes auto-redirects on `/`; suggest, don't force.)
4. **#517 protects deep-page localized quality.** Prerendered pages are safe (content
   is in the HTML), but deeply interactive routes that hydrate content client-side
   depend on the i18n bundle; when it fails, Googlebot sees a thinner localized page.
   Fixing #517 hardens localized indexing for those.
5. **Per-locale sitemaps / sitemap index.** Split the 3,668-URL sitemap into a per-
   locale index and submit each in GSC — Google reports per-sitemap coverage, so you
   can watch each language get indexed independently.

## Action plan (accelerate + measure over the first 1-2 months)

**Now (cheap, high-leverage):**
- Add `<xhtml:link hreflang>` alternates to `sitemap.xml` (booster #1).
- Add `og:locale` + `og:locale:alternate` (booster #2).
- Add an `Accept-Language`-based **language-suggestion banner** (suggest, never force)
  — this is the biggest UX lever for the "arrive in your language" goal on non-search
  traffic (booster #3).

**Search Console (this is how we'll SEE it working):**
- Submit per-locale sitemaps (or the current one) and watch **Coverage** per locale.
- Watch the **International Targeting / hreflang** report for errors.
- Track **Performance → filter by country/query language** for per-locale
  impressions → clicks → average position over the coming weeks.
- Request-index a few flagship localized pages (`/de/`, `/ru/`, `/es/`, and the
  popular `/‹locale›/science/life-in-space/suit-lineage`) to prime crawling.

**Longer term (authority):**
- Backlinks + content depth per language are the real ranking lever once indexing is
  in place. Consider sharing the localized URLs directly on language-relevant channels
  (e.g. the Russian version to Russian-speaking space communities) rather than always
  the English URL — this seeds both traffic and locale-specific backlinks.

## Watch-list (revisit monthly with the behavioral log)

- First non-EN organic session (which locale, which query language, which landing page).
- Per-locale GSC impressions/clicks trend.
- hreflang errors in GSC.
- Whether the language-suggestion banner (if shipped) lifts locale-switch / non-EN
  session share.

Cross-refs: `docs/wip/2026-08-31-prod-observability-sweep.md` (usage data),
`docs/wip/behavioral-analytics-log.md` (running log), issues #517 / #518.
