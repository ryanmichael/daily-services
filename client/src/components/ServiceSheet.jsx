import React, { useMemo } from 'react';
import ServiceBlock from './ServiceBlock.jsx';
import './ServiceSheet.css';

const SERVICE_LABELS = {
  ve: 'Vespers',
  ma: 'Matins',
  li: 'Divine Liturgy',
};

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
  const sections = useMemo(() => groupIntoSections(blocks), [blocks]);
  const formattedDate = useMemo(() => formatDate(date), [date]);

  return (
    <article className="service-sheet" aria-label={`${serviceTitle} — ${formattedDate}`}>
      {/* ── Header ── */}
      <header className="sheet-header">
        <div className="sheet-header-rule" />
        <p className="sheet-header-date">{formattedDate}</p>
        <h1 className="sheet-header-title">{serviceTitle || SERVICE_LABELS[type] || 'Service'}</h1>
        <div className="sheet-header-subtitle">Greek Orthodox Archdiocese of America</div>
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
