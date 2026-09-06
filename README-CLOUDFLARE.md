# Original 10 Dashboard Sites

This bundle contains the complete source for the original ten dashboard websites.

## Included

1. RecallScope
2. DisasterScope
3. FilingPulse
4. SafetyWatch
5. SalaryScope
6. Canada Economy
7. World Economy Explorer
8. Earthquake Live
9. Global Natural Events
10. Ontario Roads & Weather

## Recommended production architecture

Use a private GitHub monorepository with one directory per dashboard and one Cloudflare project per site.

- RecallScope and DisasterScope can be deployed as static Cloudflare Pages sites.
- Sites 3–10 include Cloudflare-compatible server builds and should be deployed as Workers.
- Connect every Cloudflare project to its matching directory in the GitHub repository.
- Configure build-watch paths so only the changed dashboard is rebuilt.
- Attach a separate subdomain to every dashboard.

## Automated data updates

The dashboards already retrieve fresh API data when opened. For a stronger production system, add one shared scheduled Cloudflare Worker that:

1. Fetches every upstream feed on a schedule.
2. Validates and normalizes the data.
3. Writes the latest successful snapshots to Workers KV.
4. Keeps the previous snapshot if an API fails.
5. Exposes cached JSON endpoints used by the dashboards.

Recommended schedules:

- Earthquakes, disasters, roads and weather: every 10–15 minutes.
- Recalls and SEC filings: every 1–3 hours.
- Salary and economic indicators: daily.

Start on Cloudflare's free plan. Move to a paid Workers plan only when real traffic or advertising revenue makes the higher limits necessary.

Do not commit API credentials. Store any future keys as Cloudflare secrets.
