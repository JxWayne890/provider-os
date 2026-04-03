import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ProviderOS crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 600, margin: '80px auto' }}>
          <svg viewBox="0 0 500 240" xmlns="http://www.w3.org/2000/svg" style={{ width: 180, marginBottom: 32 }}>
            <g transform="translate(250, 120)" textAnchor="middle">
              <text y="-60" fontSize="70" fill="#0B3060" fontStyle="italic" fontFamily="DM Serif Display, serif">The</text>
              <text y="20" fontSize="95" fill="#0B3060" fontWeight="900" fontFamily="DM Serif Display, serif">PROVIDER</text>
              <text y="95" fontSize="75" fill="#FF9F1C" fontWeight="900" letterSpacing="8" fontFamily="Inter, sans-serif">SYSTEM</text>
            </g>
          </svg>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1A1A2E' }}>Something went wrong</h1>
          <p style={{ color: '#64748B', marginBottom: 24 }}>The Provider System encountered an error. Your data is safe.</p>
          <pre style={{ background: '#F7F8FA', padding: 16, borderRadius: 12, fontSize: 13, overflow: 'auto', marginBottom: 24, color: '#EF4444', border: '1px solid #E2E8F0' }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ background: '#0B3060', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
