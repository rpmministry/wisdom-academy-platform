export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando panel de administración"
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '3rem 1.25rem',
        fontFamily: 'var(--wa-font-sans, sans-serif)',
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: '0.85rem', textAlign: 'center' }}>
        <span className="paz-nav-spinner paz-nav-spinner--lg" aria-hidden="true" />
        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--paz-muted, #66615b)' }}>
          Cargando panel de administración…
        </p>
      </div>
    </div>
  );
}
