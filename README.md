# Pranav Bairy, portfolio

Static site (no build step) plus one Appwrite Function that refreshes live data once a day.

```
index.html                 all written content
assets/css/styles.css      design tokens and layout
assets/js/app.js           rendering, live data, interactions
assets/js/visuals.js       hand-drawn project visuals
assets/js/config.js        Appwrite endpoint, project and bucket (fill in)
assets/data/snapshot.js    baked fallback data, used until the first sync
assets/logos/              put brand.svg and isro.png here
assets/img/                portrait.png, sat-sample.png, csi-award.jpg, ISRO figures
assets/data/manual.js      contests to add by hand if a site blocks the sync
assets/data/links.js       LinkedIn posts and certificate links to fill in
tools/refresh_data.py      pulls live data into assets/data/snapshot.js from your own computer
.github/workflows/         optional daily refresh run by GitHub instead of Appwrite
functions/sync/            Appwrite Function (Python) and tests
tools/make_fallback.py     regenerates assets/data/snapshot.js
```

## Preview locally

```
python -m http.server 8000
```

Open http://localhost:8000. Add `?slots` to the URL to see a dashed frame wherever an image is still missing. Missing images and logos hide themselves otherwise.

## Things to add yourself

| File or place | Where it appears |
|---|---|
| `assets/img/portrait.png` | Hero, right side on desktop. Black and white PNG with a transparent background, about 800 x 1000. It sits on the bottom edge of a framed panel. The dashed placeholder disappears once the file exists |
| `assets/img/sat-sample.png` | SatHarmoGAN figure. Any satellite scene. It is cropped to a square, shown as the finer sensor, and block-averaged into the coarser one. Without it a generated scene is used |
| `assets/logos/isro.png` | Experience, next to the ISRO NRSC title (88 px square) |
| `assets/logos/brand.svg` | Header, 30 px square, replaces the "PB" box next to your name |
| `assets/img/csi-award.jpg` | Projects, YAG, award block |
| `assets/data/links.js` | One place for every link still to add: the ISRO LinkedIn post, the CSI award post, and the three certificates. Empty ones show as plain text, never as dead links |
| `assets/logos/favicon.png` | Browser tab icon (64 x 64 or 32 x 32 PNG). Until it exists the tab shows a "PB" monogram |
| `assets/img/isro-*.jpg` | Four figures from your NRSC report. Confirm NRSC allows them to be public, or delete the ones you do not want and they disappear |

Add `?slots` to the URL to see a dashed frame wherever any image is missing. Missing images hide themselves otherwise.

## How live data works

1. A daily job calls GitHub, LeetCode, Codeforces and CodeChef and writes one `snapshot` file. The job can be the Appwrite Function, a GitHub Action, or `tools/refresh_data.py` on your own computer.
2. The page loads the baked `assets/data/snapshot.js` first. If Appwrite is configured it then fetches the newer file and re-renders the live parts: header status, contests, both activity grids, the repository list and the "last push" dates.
3. If one source fails, that source keeps its last good data and is marked stale. The footer says so, including when the whole daily run has stopped for more than 36 hours.

### Seeing real LeetCode, Codeforces and CodeChef data locally

The page only shows what is in `assets/data/snapshot.js`. Refresh it from your own computer:

```
python tools/refresh_data.py --serve
```

That refreshes the data and opens the site at http://localhost:8000. Without `--serve` it only refreshes; start your own server with `python -m http.server 8000`.

It prints one line per source. A source that fails prints the reason (for example `HTTP 403 from https://leetcode.com/graphql/`) and keeps its previous data, so send me that line if LeetCode still misbehaves. Set `GH_TOKEN` first to include private GitHub contributions.

### The second activity grid

It shows one square per day for problems and submissions on LeetCode, Codeforces and CodeChef, with contest days outlined. If a repo of yours holds one commit per solved problem (LeetHub does this), name it and its commits are counted as solved problems too:

```
SOLUTION_REPOS=bp2881/your-repo python tools/refresh_data.py
```

Private repos work if `GH_TOKEN` can read them. Only daily counts are stored, never repo names or messages.

| Source | Method | Notes |
|---|---|---|
| GitHub | GraphQL with `GH_TOKEN`, REST for public events and solution repos | Private contributions are counted (numbers only) when the token is set and your profile has "Private contributions" turned on |
| Codeforces | Official public API | Rating, contest history, solved count, daily submissions |
| LeetCode | The GraphQL endpoint its website uses | Unofficial, may change or block server addresses. `assets/data/manual.js` is the fallback for contests |
| CodeChef | Profile page parsed | No public API, best effort |
| LinkedIn | Link only | No public API |

### Optional: let GitHub do the refresh

`.github/workflows/refresh-data.yml` runs `tools/refresh_data.py` daily and commits the new `snapshot.js`. Add a repository secret `GH_TOKEN` and, if you use one, a repository variable `SOLUTION_REPOS`. GitHub's servers are often accepted by sites that refuse a cloud function.

## Deploy on Appwrite

Names in the console change over time, so treat these as a checklist.

1. **Project.** Create an Appwrite Cloud project. Add a Web platform for your site's hostname (the `*.appwrite.network` one Appwrite gives you, and your own domain later) so the browser may fetch the snapshot.
2. **Bucket.** Storage, create bucket with ID `portfolio`, read permission for role Any, file security off.
3. **Function.** Create a function from `functions/sync`:
   - Runtime: Python, entrypoint `src/main.py`, build command `pip install -r requirements.txt`
   - Scopes: `files.read`, `files.write`
   - Schedule (CRON, UTC): `30 20 * * *`, which is 02:00 IST
   - Variables: `GH_TOKEN` (classic token with `read:user`). Optional: `SOLUTION_REPOS` (comma separated `owner/repo`). Overrides: `GITHUB_LOGIN`, `LEETCODE_USER`, `CODEFORCES_HANDLE`, `CODECHEF_HANDLE`, `BUCKET_ID`, `SNAPSHOT_FILE_ID`
   - Execute it once by hand. Check the execution log for one line per source.
4. **Site.** Create a Site from this folder (upload it or connect the repo), static, no build command, output directory `./`.
5. **Config.** Fill `assets/js/config.js` with your endpoint and project ID and redeploy.
6. **GitHub setting.** Profile, Contribution settings, tick "Private contributions", so private counts reach the graph.

To test collectors on your machine: `GH_TOKEN=... python functions/sync/src/local.py > snapshot.json`.

Supabase is not used. Nothing here needs a SQL database.

## Tests

```
pip install pytest
pytest functions/sync/tests
```

The tests cover the calendar parser, the daily-activity parsers, LeetCode failing loudly instead of returning empty data, solution-repo commit counting (against a saved GitHub page), the stale-data merge logic, and the Codeforces and LeetCode transformations with mocked responses. The four live endpoints themselves have not been called from a real Appwrite run yet.
