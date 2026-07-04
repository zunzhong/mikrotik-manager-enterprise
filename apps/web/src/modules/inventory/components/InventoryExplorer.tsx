import { useCallback, useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { inventoryApi } from '../inventory.api';

export function InventoryExplorer() {
  const loadSections = useCallback(() => inventoryApi.sections(), []);
  const { data, loading, error, refresh } = useAsyncData(loadSections);
  const [category, setCategory] = useState('all');

  const sections = data ?? [];
  const categories = useMemo(
    () => ['all', ...Array.from(new Set(sections.map((item) => item.category))).sort()],
    [sections],
  );
  const filtered =
    category === 'all' ? sections : sections.filter((item) => item.category === category);
  const enabledCount = sections.filter((item) => item.enabledByDefault).length;

  return (
    <div className="inventory-explorer">
      <div className="inventory-summary">
        <div className="summary-card">
          <span>Total Sections</span>
          <strong>{sections.length}</strong>
          <small>enterprise paths</small>
        </div>
        <div className="summary-card">
          <span>Enabled Default</span>
          <strong>{enabledCount}</strong>
          <small>collected by pipeline</small>
        </div>
        <div className="summary-card">
          <span>Categories</span>
          <strong>{categories.length - 1}</strong>
          <small>inventory groups</small>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div>
          <h3>Inventory Catalog</h3>
          <p>RouterOS sections supported by the enterprise collector.</p>
        </div>
        <button className="small-button" onClick={refresh}>
          Refresh
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading inventory sections...</p> : null}

      <div className="filter-row">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={`filter-chip ${item === category ? 'active' : ''}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="inventory-section-grid">
        {filtered.map((section) => (
          <article className="inventory-section-card" key={section.key}>
            <div className="section-card-header">
              <div>
                <h4>{section.label}</h4>
                <span>{section.category}</span>
              </div>
              <strong>{section.enabledByDefault ? 'Default' : 'Optional'}</strong>
            </div>
            <code>{section.path}</code>
            <p>{section.key}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
