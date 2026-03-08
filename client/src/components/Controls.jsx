import React from 'react';

const SERVICE_TYPES = [
  { value: 've', label: 'Vespers' },
  { value: 'ma', label: 'Matins' },
  { value: 'li', label: 'Divine Liturgy' },
];

export default function Controls({ date, serviceType, onDateChange, onServiceTypeChange, onLoad, loading }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') onLoad();
  }

  return (
    <nav className="controls-bar" role="banner">
      <span className="controls-brand">☩ Daily Services</span>

      <div className="controls-field">
        <label className="controls-label" htmlFor="date-input">Date</label>
        <input
          id="date-input"
          className="controls-input"
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Service date"
        />
      </div>

      <div className="controls-field">
        <label className="controls-label" htmlFor="service-select">Service</label>
        <select
          id="service-select"
          className="controls-select"
          value={serviceType}
          onChange={e => onServiceTypeChange(e.target.value)}
          aria-label="Service type"
        >
          {SERVICE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="controls-spacer" />

      <button
        className="controls-btn"
        onClick={onLoad}
        disabled={loading}
        aria-label="Load service text"
      >
        {loading ? 'Loading…' : 'Load Service'}
      </button>

      <button
        className="controls-btn controls-btn-print"
        onClick={() => window.print()}
        disabled={loading}
        aria-label="Print service sheet"
      >
        Print
      </button>
    </nav>
  );
}
