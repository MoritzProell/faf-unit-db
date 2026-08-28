/**
 * A reading list, not a copy of one.
 *
 * The FAF forum and wiki hold the community's accumulated teaching, and none of
 * it carries a licence: those posts belong to the people who wrote them. So
 * this file points at them and says what each is for, in our own words. Nothing
 * is reproduced. The same reasoning that keeps unit descriptions sourced from
 * the game rather than from the wiki applies here.
 *
 * Signals (votes, views) are recorded as read from the forum on 2026-08-27, so
 * a reader can tell a thread the community actually rates from one post nobody
 * replied to. They are a snapshot and will drift.
 */
export interface LearnLink {
  title: string;
  url: string;
  /** Who wrote it, where the forum names an author. */
  author?: string;
  /** What it is for. Ours, not theirs. */
  blurb: string;
  source: 'FAF forum' | 'FAF wiki';
  /** Rough community signal at time of listing. */
  signal?: string;
  year?: string;
  /** Flags a guide whose specifics go stale. */
  caveat?: string;
}

export interface LearnSection {
  id: string;
  title: string;
  intro: string;
  links: LearnLink[];
}

const F = 'https://forum.faforever.com';
const W = 'https://wiki.faforever.com/en/Play';

export const LEARN: LearnSection[] = [
  {
    id: 'start',
    title: 'Start here',
    intro:
      'Supreme Commander does not explain itself, and the campaign teaches habits that lose games online. These are the two the community points new players at.',
    links: [
      {
        title: 'FAF Guide For New Players',
        url: `${F}/topic/3378/faf-guide-for-new-players`,
        blurb: 'The orientation thread in the forum’s own Tutorials category: what to install, what to play first, and what to stop doing.',
        source: 'FAF forum',
        signal: '4 votes · 2k views',
        year: '2022',
      },
      {
        title: 'Beginner’s Guide to Forged Alliance',
        url: `${W}/Learning-SupCom/Beginners-Guide-to-Forged-Alliance`,
        blurb: 'The long-form version on the wiki, 24k words, covering economy, expansion and the early game in order.',
        source: 'FAF wiki',
      },
      {
        title: 'How To Play FAF & Get Better — Cliff Notes',
        url: `${F}/topic/4765/how-to-play-faf-get-better-cliff-notes`,
        blurb: 'A condensed pass over the same ground for people who would rather have the summary than the essay.',
        source: 'FAF forum',
        signal: '3 votes · 4k views',
        year: '2022',
      },
    ],
  },
  {
    id: 'improving',
    title: 'Getting better',
    intro:
      'Guides about how to practise rather than what to build. These age far better than build orders do.',
    links: [
      {
        title: 'How to improve forever — 6 laws',
        url: `${F}/topic/1222/how-to-improve-forever-6-laws`,
        author: 'Blackheart',
        blurb: 'The most upvoted thread in the Tutorials category by a wide margin, and still being replied to four years on.',
        source: 'FAF forum',
        signal: '38 votes · 21k views',
        year: '2021',
      },
      {
        title: 'FAQ about gameplay',
        url: `${F}/topic/6831/faq-about-gameplay-feedback-welcome`,
        blurb: 'The most-read thread in the category: the questions that come up over and over, answered in one place.',
        source: 'FAF forum',
        signal: '8 votes · 61k views',
        year: '2023',
      },
      {
        title: 'The FAF Dojo: voice-based coaching',
        url: `${F}/topic/9594/the-faf-dojo-voice-based-coaching`,
        author: 'wilson_',
        blurb: 'Coaching with a real person over voice, which is the shortcut no written guide replaces.',
        source: 'FAF forum',
        year: '2025',
      },
    ],
  },
  {
    id: 'mechanics',
    title: 'Mechanics',
    intro:
      'The rules underneath the units on this site: what the engine does with your orders, and why two units with the same stats do not behave the same.',
    links: [
      {
        title: 'Unit Micro',
        url: `${W}/Learning/Unit-Micro`,
        blurb: 'Pathfinding, acceleration, formations, target priorities, reload, fire states, stealth and radar. Explains the behaviour a stats table cannot.',
        source: 'FAF wiki',
      },
      {
        title: 'Stage Comparison Chart',
        url: `${F}/topic/7348/stage-comparison-chart`,
        author: 'Sladow-Noob',
        blurb: 'How the factions compare at each stage of a game, and why the answer differs between 1v1 and team games.',
        source: 'FAF forum',
        signal: '6 votes · 3k views',
        year: '2024',
      },
    ],
  },
  {
    id: 'factions',
    title: 'Faction guides',
    intro:
      'One per faction, on the wiki, and the most useful thing on this page. They are actively maintained — the Cybran one was last edited in January 2025 — and they cover openings by map size rather than by map name, which is what makes them keep working. Read the one you play, then the one you keep losing to.',
    links: [
      { title: 'General 1v1 Guide', url: `${W}/Learning-SupCom/General-1v1-Guide`, blurb: 'The shared fundamentals the four faction guides build on.', source: 'FAF wiki' },
      { title: 'UEF 1v1 Guide', url: `${W}/Learning-SupCom/UEF-1v1-Guide`, blurb: 'Playing the faction with the shields, the Percival and the only T3 point defence.', source: 'FAF wiki' },
      { title: 'Cybran 1v1 Guide', url: `${W}/Learning-SupCom/Cybran-1v1-Guide`, blurb: 'The longest of the four by some distance. Stealth, the Brick, and a navy that walks ashore.', source: 'FAF wiki' },
      { title: 'Aeon 1v1 Guide', url: `${W}/Learning-SupCom/Aeon-1v1-Guide`, blurb: 'Hover units, the efficient shields, and the Mercy.', source: 'FAF wiki' },
      { title: 'Seraphim 1v1 Guide', url: `${W}/Learning-SupCom/Seraphim-1v1-Guide`, blurb: 'The strongest shields in the game, a destroyer that submerges, and the only T3 mobile shield.', source: 'FAF wiki' },
    ],
  },
  {
    id: 'build-orders',
    title: 'Build orders',
    intro:
      'Thinner than you would expect, and the reason is structural. A build order is tied to a specific map, and the ladder pool rotates monthly, so the material goes stale by design. The wiki\u2019s own build-order page is an 842-byte stub. The faction guides above carry more usable opening advice than anything filed under this heading, because they talk about what to do on a KIND of map rather than on one map.',
    links: [
      {
        title: 'Build orders for the ladder pool',
        url: `${F}/topic/2695/build-orders-for-the-may-ladder-pool`,
        blurb: 'Sandboxed build orders for a set of ladder maps, with replay ids and cheat sheets, aimed at players above 1300. Links out to Google Docs.',
        source: 'FAF forum',
        year: '2022',
        caveat: 'Written for one month’s map pool. The maps have rotated many times since; treat it as worked examples, not a current list.',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    intro: 'What experienced players run alongside the game.',
    links: [
      {
        title: 'UI mod guide for the improving player',
        url: `${F}/topic/7346/ui-mod-guide-for-the-improving-player`,
        author: 'Sladow-Noob',
        blurb: 'Which UI mods are worth running and which are allowed, with the legality question addressed directly in the thread.',
        source: 'FAF forum',
        signal: '4 votes · 3k views',
        year: '2024',
      },
    ],
  },
];
