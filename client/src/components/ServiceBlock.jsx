import React from 'react';

// Speaker colors: these use muted, liturgically-appropriate tones.
const SPEAKER_CLASS = {
  PRIEST: 'speaker--priest',
  DEACON: 'speaker--deacon',
  CHOIR: 'speaker--choir',
  READER: 'speaker--reader',
  CHANTER: 'speaker--choir',
  PEOPLE: 'speaker--people',
  BISHOP: 'speaker--priest',
  SUBDEACON: 'speaker--deacon',
};

export default function ServiceBlock({ block, serviceType }) {
  const { speaker, sourceBook, type, text } = block;

  if (type === 'empty' || !text) return null;

  // "Glory" and "Both now" get a special inline treatment
  if (type === 'glory') {
    return (
      <div className="block block--glory">
        <span className="block-glory-text">{text}</span>
      </div>
    );
  }

  // Rubric / instruction lines
  if (type === 'rubric') {
    return (
      <div className="block block--rubric">
        <p className="block-rubric-text">{text}</p>
      </div>
    );
  }

  // Standard liturgical text
  const speakerClass = speaker ? (SPEAKER_CLASS[speaker] || 'speaker--default') : '';

  return (
    <div className={`block block--text${speaker ? ' block--has-speaker' : ''}`}>
      {speaker && (
        <div className={`block-speaker ${speakerClass}`} aria-label={`Said by ${speaker}`}>
          {speaker}
        </div>
      )}
      {sourceBook && !speaker && (
        <div className="block-source-tag" aria-label={`From ${sourceBook}`}>
          {sourceBook}
        </div>
      )}
      <p className="block-text">{text}</p>
    </div>
  );
}
