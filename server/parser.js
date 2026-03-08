/**
 * GOA Digital Chant Stand HTML parser.
 *
 * Source pages are two-column bilingual tables: Greek left, English right.
 * This module extracts the English column and annotates each block with
 * speaker (PRIEST | DEACON | CHOIR | READER) and source book
 * (Octoechos | Triodion | Menaion | Horologion | Euchologion | etc.).
 */

const cheerio = require('cheerio');

const SPEAKERS = ['PRIEST', 'DEACON', 'CHOIR', 'READER', 'CHANTER', 'PEOPLE', 'BISHOP', 'SUBDEACON'];
const SOURCE_BOOKS = ['Octoechos', 'Triodion', 'Pentecostarion', 'Menaion', 'Horologion', 'Euchologion', 'Typikon', 'Psalter'];

// Patterns that identify rubric / instruction text (not actual liturgical text)
const RUBRIC_PATTERNS = [
  /^(The|Then|After|And|While|During|At|In|Before|Following)/i,
  /^\[.*\]$/,
  /^(Note:|N\.B\.)/i,
];

// Glory lines pattern
const GLORY_PATTERNS = [
  /^Glory to (the Father|God)/i,
  /^Both now/i,
  /^Glory\.\s*Both now/i,
  /^Alleluia/i,
];

// Patterns that identify GOA website UI artifacts / chanter attribution noise.
// Blocks whose full text matches any of these are discarded entirely.
const ARTIFACT_BLOCK_PATTERNS = [
  // Chanter attribution lines: "c1011 - SDedes/ c1232 - GTheodoridis/ ..."
  /^(c\d+\s*-\s*\w+\/\s*)+$/,
  // UI button labels
  /^(Show|Hide)\s+Stichologia$/i,
];

// Inline noise fragments stripped from text before further processing.
const ARTIFACT_INLINE_PATTERNS = [
  // Bracketed chanter/audio codes: [SAAS], [SD], [GR], etc.
  /\[[A-Z]{1,6}\]/g,
];

function cleanText(text) {
  let t = text
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
  for (const pattern of ARTIFACT_INLINE_PATTERNS) {
    t = t.replace(pattern, '');
  }
  return t.replace(/\s+/g, ' ').trim();
}

function isArtifactBlock(text) {
  return ARTIFACT_BLOCK_PATTERNS.some(p => p.test(text));
}

function detectSpeaker(text) {
  const upper = text.toUpperCase().trim();
  for (const sp of SPEAKERS) {
    if (upper === sp || upper.startsWith(sp + ':') || upper.startsWith(sp + ' ')) {
      return sp;
    }
  }
  return null;
}

function detectSourceBook(text) {
  for (const book of SOURCE_BOOKS) {
    if (text.includes(book)) return book;
  }
  return null;
}

function classifyText(text) {
  if (!text || text.length < 2) return 'empty';
  if (isArtifactBlock(text)) return 'empty';
  if (GLORY_PATTERNS.some(p => p.test(text))) return 'glory';
  if (RUBRIC_PATTERNS.some(p => p.test(text))) return 'rubric';
  return 'text';
}

/**
 * Parse a GOA Digital Chant Stand HTML page and return structured blocks.
 *
 * @param {string} html  Raw HTML from the GOA page
 * @returns {Array<{speaker: string|null, sourceBook: string|null, type: string, text: string}>}
 */
function parseServicePage(html) {
  const $ = cheerio.load(html);
  const blocks = [];

  let currentSpeaker = null;
  let currentSourceBook = null;

  // The GOA page wraps everything in a div with class "dcs-content" or similar,
  // and uses tables. We look for the main bilingual table rows.
  // Each row has two <td> elements; English is always the second (rightmost) td.

  // First attempt: find rows in the main service table
  // GOA pages use various table structures; we try multiple selectors.
  const tableRows = $('table tr').toArray();

  if (tableRows.length === 0) {
    // Fallback: try to grab any paragraph-level English text
    return parseFallback($);
  }

  for (const row of tableRows) {
    const $row = $(row);

    // Skip rows that are purely structural (colgroup, empty, etc.)
    const cells = $row.find('td');
    if (cells.length === 0) continue;

    // Check the entire row's class / text for speaker or source book labels
    const rowClass = ($row.attr('class') || '').toLowerCase();
    const rowId = ($row.attr('id') || '').toLowerCase();

    // Some GOA pages embed speaker info in a single-cell row before the bilingual row
    if (cells.length === 1) {
      const cellText = cleanText($(cells[0]).text());
      const speaker = detectSpeaker(cellText);
      if (speaker) {
        currentSpeaker = speaker;
        continue;
      }
      const book = detectSourceBook(cellText);
      if (book) {
        currentSourceBook = book;
        continue;
      }
      // Could be a section heading or rubric
      if (cellText.length > 0 && cellText.length < 120) {
        blocks.push({
          speaker: null,
          sourceBook: currentSourceBook,
          type: 'rubric',
          text: cellText,
        });
      }
      continue;
    }

    // Two or more cells: treat last cell as English, first as Greek (skip Greek)
    // Some rows have 3 cells (label | greek | english) — check colspan too.
    let englishCell = null;

    if (cells.length === 2) {
      englishCell = cells[1];
    } else if (cells.length >= 3) {
      // Try to find English cell by class name
      const englishByClass = $row.find('td.english, td[lang="en"], td.en').first();
      englishCell = englishByClass.length ? englishByClass[0] : cells[cells.length - 1];
    }

    if (!englishCell) continue;

    // Skip cells that contain only images, links to audio, or are empty
    const $cell = $(englishCell);

    // Remove audio/video/image links and download anchors
    $cell.find('a[href*=".mp3"], a[href*=".wav"], a[href*="download"], img, audio, video').remove();
    $cell.find('a.dcs-download, a.audio-link, span.dcs-audio').remove();

    const rawText = cleanText($cell.text());
    if (!rawText || rawText.length < 2) continue;

    // Check if the cell text IS a speaker label
    const speakerFromCell = detectSpeaker(rawText);
    if (speakerFromCell) {
      currentSpeaker = speakerFromCell;
      continue;
    }

    // Check row classes for speaker hints
    for (const sp of SPEAKERS) {
      if (rowClass.includes(sp.toLowerCase()) || rowId.includes(sp.toLowerCase())) {
        currentSpeaker = sp;
        break;
      }
    }

    // Check for source book in the row's class or a data attribute
    const bookAttr = $row.attr('data-book') || $row.attr('data-source') || '';
    const bookFromAttr = detectSourceBook(bookAttr);
    if (bookFromAttr) currentSourceBook = bookFromAttr;

    // Also scan for book names embedded in rubric-looking spans within the cell
    $cell.find('span, em, i').each((_, el) => {
      const spanText = cleanText($(el).text());
      const book = detectSourceBook(spanText);
      if (book) currentSourceBook = book;
    });

    // Classify the text
    const type = classifyText(rawText);
    if (type === 'empty') continue;

    // Split the cell into sub-blocks if it contains multiple paragraphs
    const paragraphs = [];
    $cell.find('p, br').each((_, el) => {
      const tag = el.name;
      if (tag === 'br') {
        // br elements separate lines within a paragraph
        paragraphs.push(null); // paragraph break marker
      }
    });

    // If the cell has <p> tags, emit one block per <p>
    const pTags = $cell.find('p');
    if (pTags.length > 1) {
      pTags.each((_, p) => {
        const pText = cleanText($(p).text());
        if (!pText || pText.length < 2) return;
        const pType = classifyText(pText);
        if (pType === 'empty') return;
        blocks.push({
          speaker: currentSpeaker,
          sourceBook: currentSourceBook,
          type: pType,
          text: pText,
        });
      });
    } else {
      blocks.push({
        speaker: currentSpeaker,
        sourceBook: currentSourceBook,
        type,
        text: rawText,
      });
    }
  }

  return postProcess(blocks);
}

function parseFallback($) {
  // If no table structure found, grab all text elements
  const blocks = [];
  $('p, div').each((_, el) => {
    const text = cleanText($(el).text());
    if (!text || text.length < 3) return;
    blocks.push({
      speaker: null,
      sourceBook: null,
      type: classifyText(text),
      text,
    });
  });
  return postProcess(blocks);
}

function postProcess(blocks) {
  // Remove purely duplicate consecutive blocks
  const result = [];
  let prev = null;
  for (const block of blocks) {
    if (prev && prev.text === block.text && prev.type === block.type) continue;
    result.push(block);
    prev = block;
  }
  return result;
}

module.exports = { parseServicePage };
