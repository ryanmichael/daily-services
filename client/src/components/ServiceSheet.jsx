import React, { useMemo } from 'react';
import ServiceBlock from './ServiceBlock.jsx';
import './ServiceSheet.css';

const SERVICE_LABELS = {
  ve: 'Vespers',
  ma: 'Matins',
  li: 'Divine Liturgy',
};

const SOURCE_BOOKS = ['Octoechos', 'Triodion', 'Pentecostarion', 'Menaion', 'Horologion', 'Euchologion', 'Typikon', 'Psalter'];

// Returns true for GOA website artifact blocks that should never be rendered.
function isArtifactBlock(text) {
  if (!text) return false;
  const t = text.trim();
  // Chanter attribution lines: "c1011 - SDedes/ c1232 - GTheodoridis/ ..."
  if (/^c\d+\s*-/.test(t)) return true;
  // UI button labels
  if (/^(Show|Hide)\s+Stichologia$/i.test(t)) return true;
  return false;
}

// Returns true for blocks that are structural headers / book labels, not liturgical content.
function isHeaderBlock(text) {
  if (!text) return true;
  const t = text.trim();
  // Pure source book name or book + " - detail" (e.g. "Menaion - March 9")
  if (SOURCE_BOOKS.includes(t)) return true;
  if (SOURCE_BOOKS.some(book => t.startsWith(book + ' - '))) return true;
  // All-caps service / section headings (e.g. "VESPERS", "AT LORD I HAVE CRIED")
  if (/^[A-Z\s]+$/.test(t) && t.length < 60) return true;
  // Separator lines (dashes, underscores)
  if (/^[-_—\s]{2,}$/.test(t)) return true;
  // Short ambiguous labels (≤ 25 chars) not already caught above (e.g. "Books - Sources")
  if (t.length <= 25) return true;
  return false;
}

// Splits blocks into preamble context (shown below header) and body blocks (shown in sections).
// Preamble = all blocks before the first speaker-tagged or glory block.
function splitPreambleFromBody(blocks) {
  let bodyStart = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].speaker || blocks[i].type === 'glory') {
      bodyStart = i;
      break;
    }
  }
  // No speaker found — treat everything as body
  if (bodyStart === -1) return { context: [], bodyBlocks: blocks };

  const preamble = blocks.slice(0, bodyStart);
  const bodyBlocks = blocks.slice(bodyStart);
  // Keep only meaningful context lines; discard headers / empty blocks
  const context = preamble.filter(b => b.type !== 'empty' && !isHeaderBlock(b.text));
  return { context, bodyBlocks };
}

// Collapse consecutive blocks with the same source book into named sections.
function groupIntoSections(blocks) {
  const sections = [];
  let current = null;

  for (const block of blocks) {
    const sectionKey = block.sourceBook || '__default__';
    if (!current || current.key !== sectionKey) {
      current = { key: sectionKey, label: block.sourceBook || null, blocks: [] };
      sections.push(current);
    }
    current.blocks.push(block);
  }

  return sections;
}

function formatDate(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ServiceSheet({ data }) {
  const { date, type, serviceTitle, blocks } = data;
  const cleanBlocks = useMemo(() => blocks.filter(b => !isArtifactBlock(b.text)), [blocks]);
  const { context, bodyBlocks } = useMemo(() => splitPreambleFromBody(cleanBlocks), [cleanBlocks]);
  const sections = useMemo(() => groupIntoSections(bodyBlocks), [bodyBlocks]);
  const formattedDate = useMemo(() => formatDate(date), [date]);

  return (
    <article className="service-sheet" aria-label={`${serviceTitle} — ${formattedDate}`}>
      {/* ── Header ── */}
      <header className="sheet-header">
        <div className="sheet-header-rule" />
        <p className="sheet-header-date">{formattedDate}</p>
        <h1 className="sheet-header-title">{serviceTitle || SERVICE_LABELS[type] || 'Service'}</h1>
        <div className="sheet-header-subtitle">Greek Orthodox Archdiocese of America</div>
        {context.length > 0 && (
          <div className="sheet-context">
            {context.map((block, i) => (
              <p key={i} className="sheet-context-line">{block.text}</p>
            ))}
          </div>
        )}
        <div className="sheet-header-rule sheet-header-rule--bottom" />
      </header>

      {/* ── Body: sections ── */}
      <div className="sheet-body">
        {sections.map((section, si) => (
          <section key={`${section.key}-${si}`} className="sheet-section">
            {section.label && (
              <div className="section-divider" role="separator">
                <span className="section-divider-rule" />
                <span className="section-divider-label">{section.label}</span>
                <span className="section-divider-rule" />
              </div>
            )}
            {section.blocks.map((block, bi) => (
              <ServiceBlock key={`${si}-${bi}`} block={block} serviceType={type} />
            ))}
          </section>
        ))}
      </div>

      {/* ── Footer ── */}
      <footer className="sheet-footer">
        <div className="sheet-footer-rule" />
        <p className="sheet-footer-text">
          Text courtesy of the Greek Orthodox Archdiocese Digital Chant Stand
        </p>
      </footer>
    </article>
  );
}
