import React, { useState, useCallback } from 'react';
import Controls from './components/Controls.jsx';
import ServiceSheet from './components/ServiceSheet.jsx';
import './App.css';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [date, setDate] = useState(todayISO());
  const [serviceType, setServiceType] = useState('ve');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchService = useCallback(async (d, t) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/service?date=${d}&type=${t}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load service text.');
      } else {
        setData(json);
      }
    } catch {
      setError('Service text not available for this date. The GOA site may not have content for this day yet.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoad = useCallback(() => {
    fetchService(date, serviceType);
  }, [date, serviceType, fetchService]);

  return (
    <div className="app">
      <Controls
        date={date}
        serviceType={serviceType}
        onDateChange={setDate}
        onServiceTypeChange={setServiceType}
        onLoad={handleLoad}
        loading={loading}
      />
      <main className="app-main">
        {loading && (
          <div className="loading-state">
            <div className="loading-cross">✦</div>
            <p>Loading service text…</p>
          </div>
        )}
        {error && !loading && (
          <div className="error-state">
            <div className="error-icon">†</div>
            <p className="error-message">{error}</p>
          </div>
        )}
        {data && !loading && (
          <ServiceSheet data={data} />
        )}
        {!data && !loading && !error && (
          <div className="welcome-state">
            <div className="welcome-cross">☩</div>
            <h1 className="welcome-title">Orthodox Daily Services</h1>
            <p className="welcome-subtitle">
              Select a date and service type, then press <em>Load Service</em>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
