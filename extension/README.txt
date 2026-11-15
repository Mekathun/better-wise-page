Better WiSE — browser extension for wise.wesleycollege.net
Version 0.1.2.13 (Manifest V3, Edge / Chrome)

WHAT IT DOES

1. Today's plan panel (home, dashboard)
   A card at the top of the page that answers "what do I have to do today".
   The panel starts collapsed; click its header to open the sections.
   - To do today: one tab per subject, the tasks from today's classes
   - Due: every open assessment, sorted by how close it is, with an
     "in N days" badge; dates are read from the post text ("Due: Monday
     9th November" included) and from the assessment page
   - Attachments: files a teacher attached to a post or an assessment show up
     as cards with their type and size; click one to open or download it
   - "Set due" in a card's detail view lets you pin your own date and time
     (4pm by default) when the site does not give a clear one
   - Tick a card to mark it done; the tick stays in this browser
   - Drag cards around to reorder them, or to move them between sections; the
     order is remembered
   - "Cards" picks which classes show up (all seven of your courses are
     selectable), renames a subject, or adds your own card
   - "↻" reloads the page and re-reads everything from WiSE

2. Timetable
   - The header shows the school week next to the day: "Day 5 · Term 4 · Week 5"
   - "Next day ›" swaps in the next school day's timetable without leaving the
     page; colours match the class colours of today's table, and the room sits
     on its own line
   - On weekends and holidays it shows the last school day instead
   - The "☰" button lists that day's classes; rows with nothing due are not
     clickable

3. BW Search
   - Ctrl/⌘ + K anywhere on the site, or the BW Search entry in the nav bar
   - Searches your posts, files, links and pages, plus WiSE's own search
   - Filter tabs: All / Posts / Files / Links / Pages
   - Esc clears the query, Esc again closes; Ctrl/⌘ + Enter opens the first hit
   - The last five queries stay as chips
   - Handles pinyin, so 中文 file names are findable without switching IME

4. Calendar, with a date button
   The Calendar island on the dashboard keeps the site's own list, untouched,
   and its heading gains three small controls: ‹ › and Today. They sit there all
   the time, so stepping to the next day never means opening anything first.
   Next to them is one small square calendar button. Press it and a month grid
   drops down over the list, with the button lit; pick a day and the grid folds
   away and the island shows that day's events in the site's own list style.
   The data is the same the site publishes, minus the timetable lessons and
   "Day 9" style rotation markers that already live in the timetable island;
   exams, assemblies, sport, due work and college events stay.
   Reloading the page puts the native calendar back.

5. Dark theme
   Dark mode for the whole site, not just the panel: dashboard, news, calendar
   (month / week / day / list), timetable, classes, feedback, pastoral,
   resources, group pages, and BW Search. Colours that carry meaning (class
   colours, event colours) keep their hue and are only dimmed.

6. Settings
   The gear in the site's top-right corner, or the toolbar icon: same panel.
   - Theme: System / Light / Dark
   - More animations, performance mode, animation speed

KEYBOARD

   Alt + K      open search
   Alt + T      switch timetable to the next school day / back
   Alt + D      open the panel and jump to the Due section
   Ctrl/⌘ + K   open search (same as Alt+K)

INSTALL

1. Unzip Better_WiSE_v0.1.3.6.zip
2. Open edge://extensions (or chrome://extensions) and turn on Developer mode
3. Click "Load unpacked" and pick the unzipped folder
4. Pin the icon if you want the toolbar popup on hand

PRIVACY

It does not collect user data. There is no account, no analytics, no crash
reporting and no server of ours. Pages are read with the WiSE session you
already have, and what it keeps (your settings, a page cache) stays in this
browser's local storage. The extension only connects to
wise.wesleycollege.net.

NOTES

- 0.1.3.6: the day picker is gone; the "Day N" heading now sits above the
  summary panel instead of below it. Next day slides the new timetable in
  again, and the heading and week chip follow the day you moved to. Switching
  back from dark to light no longer leaves the panel interior black.
- 0.1.3.5: the week chip and the day picker are two separate pills on the same
  line, and picking a day keeps the day, the title and the timetable together
  (the title used to say one day while the table showed another).
- 0.1.3.4: the month picker in the next-day modal is larger and readable now
  (304 px wide, 26 px arrows, 30 px day cells), and app tiles lose saturation in
  dark mode the way timetable cards already did.

- 0.1.2.16: the next-day modal rebuilds around the site's own timetable grid.
  It shows each period with the room on the same line, hides periods with no
  class, and carries two non-modal pickers: Day 1-10, which follows the same
  numbering as the timetable page, and a month calendar that greys out weekends.
  Choosing a date works out the day number and shows that day; choosing a day
  keeps the date but dims its cell. The heading reads "Day 5" on a school day
  and "Showing Friday 13 Nov" on a weekend, where the site is showing a
  different day than today.

- 0.1.2.13: theme switch is instant again (three fade attempts all looked worse), the /search page is dark-theme complete, the Show-in-All panel is dark with a square close button, Tutor Group is out of the course list, the timetable max-height experiments are reverted, the Next-day pill is back where it belongs, and this account's Upcoming list shows the Term 4 exam timetable.
- 0.1.2.12: theme switch animates every colour at the same 0.3s rate (sheet on adoptedStyleSheets), dark settings panel no longer shows white buttons, card settings spacing/font, Tutor Group back in the subject list, native search no longer hides the page, expanded cards stop getting more saturated, and the mid-week max-height clipping is gone.
- 0.1.2.11 keeps the theme fade on the background layer only (z-index -1) so no
  solid sheet ever covers the content, prints the timetable heading for the day
  the table actually shows, lets the calendar picker replace the site's day list,
  and gives the dark toast / primary buttons their background back.

- 0.1.2.10 fades the whole page instead of transitioning every colour: switching
  theme drops a scrim in the outgoing background and fades it out over 0.24s, so
  every panel moves at the same pace and only one opacity animation runs. The
  timetable heading comes back on weekends ("Showing Monday 16 Nov", week as
  "Week 7"), and the calendar picker now grows the calendar card instead of
  covering the next one.

- 0.1.2.9 stops our buttons turning into white bricks. The site paints any
  focused button with `background: var(--sbx-color-foreground-primary)` (#fff)
  at a specificity our class selectors cannot beat, so a second click left the
  tab-bar settings gear and the calendar button flat white. Every node we build
  now carries `data-wt-ui`, which zeroes those site variables on that node only.
  The settings panel is sized from its iframe content instead of a fixed 640px,
  the next-day modal keeps its close button clear of the heading, and switching
  between light and dark fades the background over 0.3s.

- 0.1.2.8 fixes the settings gear for real: the panel's "is it open" state was
  read from a class that only lands inside requestAnimationFrame, so a frame that
  never ran left the panel displayed at zero opacity with pointer events on, and
  the button kept its pressed background for good. Open state is now an explicit
  boolean, the panel releases pointer events the moment it closes, and an
  invisible panel can no longer sit on top of the page swallowing clicks.
  Frosted glass and drop shadows are gone from the panel in every mode; the
  performance mode no longer turns off transitions.

- 0.1.2.7 moves the month picker to a Sunday-first week (the site's own calendar
  library default). Dropped the "WiSE information is ready" toast.

- 0.1.2.6 gives the calendar ‹ › Today controls in its heading, plus a square
  calendar button that drops a month picker over the list. The day list uses
  the site's own list markup, so it matches the native calendar cell for cell.
  Also paints the logo white in dark mode, where the original artwork's pale
  edges showed as a halo.

- 0.1.2.4 removes the AI feature completely: no API key field, no model
  settings, no request to any server other than WiSE. Task cards are built
  locally from the post text. Old AI settings and caches are cleared on the
  first run after updating.

- You need to be signed in to WiSE; the extension reads pages with the same
  cookies the site already set.
- A skeleton bar holds the panel's place while the page loads, so nothing
  jumps around when the data arrives.
- Data is cached per day, so the panel opens instantly after the first load.
  If the network is down the panel says how old the saved data is and offers
  a retry.
- Posts older than 30 days are ignored, so a class whose teacher deleted the
  recent posts does not show last term's homework as today's work.
- If WiSE changes its layout, the extension logs a warning under Settings →
  Developer rather than failing silently.
