import { useState } from 'react';
import { useContent, useCopy } from '../../i18n/useContent';
import { Reveal } from '../ui/Reveal';
import { OpenToBlock } from './Opportunities';
import styles from './Contact.module.scss';

export function Contact() {
  const { profile, contactLine } = useContent();
  const copy = useCopy();
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the mailto link still works */
    }
  };

  return (
    <section id="contact" className={`section ${styles.section}`} aria-labelledby="contact-title">
      <div className="container">
        <Reveal>
          <span className="eyebrow">{copy.contact.eyebrow}</span>
          <h2 id="contact-title" className={styles.line}>
            {contactLine}
          </h2>
        </Reveal>

        <div className={styles.grid}>
          <Reveal className={styles.primary} delay={80}>
            <div className={styles.emailRow}>
              <a href={`mailto:${profile.email}`} className={styles.email}>
                {profile.email}
              </a>
              <button
                type="button"
                className={styles.copy}
                onClick={copyEmail}
                aria-label={copied ? copy.contact.copied : copy.contact.copy}
              >
                {copied ? copy.contact.copied : copy.contact.copy}
              </button>
            </div>
            <p className={styles.avail}>
              <span className={styles.availDot} aria-hidden="true" />
              {profile.availability} · {profile.location}
            </p>
          </Reveal>

          <Reveal as="ul" className={styles.links} delay={140}>
            <li>
              <a href={`mailto:${profile.email}`}>
                <span className={styles.k}>{copy.contact.email}</span>
                <span className={styles.v}>{profile.email}</span>
              </a>
            </li>
            <li>
              <a href={profile.phoneHref}>
                <span className={styles.k}>{copy.contact.phone}</span>
                <span className={styles.v}>{profile.phone}</span>
              </a>
            </li>
            <li>
              <a href={profile.linkedin.url} target="_blank" rel="noopener noreferrer">
                <span className={styles.k}>{copy.contact.linkedin}</span>
                <span className={styles.v}>{profile.linkedin.handle} ↗</span>
              </a>
            </li>
            <li>
              <a href={profile.github.url} target="_blank" rel="noopener noreferrer">
                <span className={styles.k}>{copy.contact.github}</span>
                <span className={styles.v}>{profile.github.handle} ↗</span>
              </a>
            </li>
          </Reveal>
        </div>

        <OpenToBlock />
      </div>
    </section>
  );
}
