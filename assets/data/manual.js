/* Safety net for contests the daily sync cannot read (for example if a site blocks
   the server). Entries here are added to the contest table and the contest days on
   the activity grid. Anything the sync already found is not duplicated.

   Example:
   { platform: "LeetCode", title: "Weekly Contest 400", at: "2026-05-05", rank: 2150, rating: 1520 }
*/
window.__MANUAL__ = { contests: [] };
