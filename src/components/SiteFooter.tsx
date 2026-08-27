import styles from './SiteFooter.module.css';

/**
 * Credit tracks what is actually used. Everything here now comes from
 * FAForever: the dataset is generated from the game repository, the weapon
 * maths is transliterated from the game's own unitviewDetail.lua, the section
 * taxonomy reads the game's build-menu categories, and the unit renders come
 * from FAForever/spooky-db.
 *
 * Keep this in step with the code. If anything from another project is added,
 * it gets a line here.
 */
export function SiteFooter({ version }: { version: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.block}>
        <span className={`lbl ${styles.label}`}>Data</span>
        <span>
          Generated from{' '}
          <a href="https://github.com/FAForever/fa" target="_blank" rel="noopener noreferrer">
            FAForever/fa
          </a>{' '}
          game blueprints; weapon maths from the game&rsquo;s own unit view. Unit renders from{' '}
          <a href="https://github.com/FAForever/spooky-db" target="_blank" rel="noopener noreferrer">
            spooky-db
          </a>
          .
        </span>
      </div>

      <div className={styles.block}>
        <span className={`lbl ${styles.label}`}>Frontend</span>
        {/* Credited by handle, not by legal name. Deliberately unlinked: the
            GitHub profile URL carries the name this is avoiding. */}
        <span className={styles.strong}>RhyZ1ne</span>
      </div>

      <span className={styles.spacer} />
      <span className={`m ${styles.block}`}>Patch {version}</span>

      <p className={styles.fine}>
        An unofficial community project, not affiliated with Forged Alliance Forever or the
        rights holders of Supreme Commander. Unit statistics and renders originate from the game.
      </p>
    </footer>
  );
}
