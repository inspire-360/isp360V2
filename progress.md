Original prompt: use skill [$develop-web-game](C:\\Users\\401ms\\.codex\\skills\\develop-web-game\\SKILL.md) [$frontend-skill](C:\\Users\\401ms\\.codex\\skills\\frontend-skill\\SKILL.md) [$skill-creator](C:\\Users\\401ms\\.codex\\skills\\.system\\skill-creator\\SKILL.md) [$skill-installer](C:\\Users\\401ms\\.codex\\skills\\.system\\skill-installer\\SKILL.md)
1. tranfrom the color shade and gradient to  [ #0D1164 #640D5F #EA2264 #F78D60]
2. use skill to build each Missions to Gamifications style
3. upgrade DU Admin Console to high performance useful
4. develop SOS to DU system to can use and help user to send and follow up

- Loaded the requested skills and confirmed the named system skills were already available locally, so no installation step was needed.
- Inspected the Vite/React app structure and identified the main surfaces to update: landing, layout, dashboard, course list, teacher course room, and new DU routes.
- Planned a connected implementation: shared theme tokens first, gamified mission data and UI second, DU admin and SOS workflows third, then build plus browser validation.
- Added shared course catalog, SOS config, course icon helpers, and a refreshed palette based on `#0D1164`, `#640D5F`, `#EA2264`, and `#F78D60`.
- Rebuilt the landing page, app shell, dashboard, course list, and teacher course room around the new palette and mission-driven UI patterns.
- Added new protected routes for `DU Admin Console` and `SOS to DU`, both backed by Firestore collections and timeline-based follow-up data.
- Introduced route-level lazy loading and manual Vite vendor chunking so the new admin and mission screens do not bloat the first load.
- Installed `playwright` in the workspace and in the `develop-web-game` skill folder, then installed Chromium so the required Playwright client could run.
- Verified with `npm run build` after the refactor and again after performance chunking; final build passed without warnings.
- Ran the `develop-web-game` Playwright client against the built app served locally and visually inspected:
  - `output/web-game/shot-0.png`
  - `output/web-game/shot-1.png`
  - `output/web-game-hero-top/shot-0.png`
- Browser validation covered the public landing page. Protected DU and course screens were not exercised in Playwright because they require authenticated app state.
