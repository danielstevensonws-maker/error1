/**
 * Attribution / credits (ADR-0010) — the licence screen, reachable from
 * everywhere.
 *
 * WHY THIS SHIPS NOW AND NOT AT M8. Brief 14 §3 is explicit that the
 * attribution/legal screen "lives here — ships with the first shell", and
 * ADR-0010 is explicit that the SRD's required attribution statement "renders
 * on an accessible legal/credits screen from the first release". Questra ships
 * SRD 5.2.1 content — 339 spells, 330 monsters, twelve full class tables — and
 * CC-BY-4.0 makes the attribution a CONDITION of that use, not a courtesy. A
 * build that ships the data without this screen is out of compliance.
 *
 * THE STATEMENT BELOW IS VERBATIM AND MUST STAY THAT WAY. It is transcribed
 * from the Legal Information page of the SRD itself
 * (packages/engine/ingest/.extracted/srd-raw.txt, lines 8-11), not paraphrased
 * from memory. Do not reword it, do not "improve" its punctuation, and do not
 * fold it into the surrounding prose — the licence requires this text.
 *
 * The same page also instructs: "Please do not include any other attribution to
 * Wizards or its parent or affiliates other than that provided above." That is
 * why this screen carries exactly one Wizards attribution and no logos, no
 * trademarks, and no further credit. It is also why the plain-language summary
 * beside it never names Wizards again.
 *
 * NOT LEGAL ADVICE AND NOT THE END OF THE JOB. ADR-0010 requires real legal
 * review before public launch, covering the AI-art and UGC policies too
 * (owner deliverable C4, engage by M6). This screen discharges the SRD
 * attribution condition; it does not discharge that review.
 */
import type { ReactElement } from 'react';
import { ShellStyles } from './ShellStyles.js';
import { Road } from './road/Road.js';
import { usePrefersReducedMotion } from './shared.js';

/**
 * The required statement, exactly as the SRD prints it. Split into segments
 * only so the two URLs can be real links — a licence notice whose links are
 * not clickable is worse at doing its job, and the CC-BY deed is the thing a
 * reader most plausibly wants to open.
 */
function RequiredStatement(): ReactElement {
  return (
    <blockquote className="qa-legal-statement">
      This work includes material from the System Reference Document 5.2.1
      (&ldquo;SRD 5.2.1&rdquo;) by Wizards of the Coast LLC, available at{' '}
      <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noreferrer noopener">https://www.dndbeyond.com/srd</a>.
      {' '}The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0
      International License, available at{' '}
      <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer noopener">https://creativecommons.org/licenses/by/4.0/legalcode</a>.
    </blockquote>
  );
}

export function Attribution({ onBack }: { onBack: () => void }): ReactElement {
  const reduced = usePrefersReducedMotion();

  return (
    <div className={'rd qa-legal' + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="camp" />

      <main className="rd-panel qa-legal-panel">
        <header className="qa-legal-head">
          <p className="rd-label">Credits and licences</p>
          <h1 className="rd-title">What Questra is built from</h1>
        </header>

        <section className="qa-legal-section">
          <p className="rd-label">The rules</p>
          <p className="rd-detail">
            The rules Questra plays by — the classes, spells, monsters, conditions and
            tables — come from the System Reference Document 5.2.1, published under a
            licence that allows anyone to build on it. That licence asks us to say so
            in exactly these words:
          </p>
          <RequiredStatement />
          <p className="rd-detail">
            Questra is compatible with fifth edition. It is not published, endorsed or
            supported by anyone; it is an independent tool built on freely licensed
            rules.
          </p>
        </section>

        <section className="qa-legal-section">
          <p className="rd-label">Pictures made by a machine</p>
          <p className="rd-detail">
            Some artwork in Questra is generated. Where it is, it is labelled. Generated
            images are anchored to a house style set we own, and nothing is trained on
            your campaign without you asking for it.
          </p>
        </section>

        <section className="qa-legal-section">
          <p className="rd-label">What you write</p>
          <p className="rd-detail">
            Your campaigns, characters and notes stay yours. You can export a campaign —
            everything in it, in a format you can read without us — and you can delete
            your account and take it with you.
          </p>
        </section>

        <div className="rd-actions">
          <button type="button" className="qa2-cta" onClick={onBack}>Back</button>
        </div>
      </main>
    </div>
  );
}
