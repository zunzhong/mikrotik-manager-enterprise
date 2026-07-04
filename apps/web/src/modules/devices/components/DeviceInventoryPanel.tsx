import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceInventoryApi, type DeviceInventorySection } from '../device-inventory.api';

export function DeviceInventoryPanel({ deviceId }: { deviceId: string }) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [actionMessage, setActionMessage] = useState('');

  const overview = useAsyncData(
    useCallback(() => deviceInventoryApi.overview(deviceId), [deviceId]),
  );
  const tree = useAsyncData(useCallback(() => deviceInventoryApi.tree(deviceId), [deviceId]));

  const section = useAsyncData(
    useCallback(() => {
      if (!selectedSectionId)
        return Promise.resolve(undefined as unknown as DeviceInventorySection);
      return deviceInventoryApi.section(deviceId, selectedSectionId);
    }, [deviceId, selectedSectionId]),
  );

  async function collectInventory() {
    setActionMessage('Collecting inventory...');
    try {
      await deviceInventoryApi.collect(deviceId);
      setActionMessage('Inventory collection requested.');
      overview.refresh();
      tree.refresh();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Collect failed');
    }
  }

  async function diffLatest() {
    setActionMessage('Creating diff...');
    try {
      await deviceInventoryApi.diffLatest(deviceId);
      setActionMessage('Diff latest requested.');
      overview.refresh();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Diff failed');
    }
  }

  return (
    <div className="device-inventory-panel">
      <div className="inventory-action-row">
        <div>
          <h3>Inventory Overview</h3>
          <p>Snapshot, tree and RouterOS inventory sections for this device.</p>
        </div>
        <div className="toolbar-actions">
          <button className="small-button" onClick={collectInventory}>
            Collect Inventory
          </button>
          <button className="small-button" onClick={diffLatest}>
            Diff Latest
          </button>
        </div>
      </div>

      {actionMessage ? <div className="info-banner">{actionMessage}</div> : null}
      {overview.error ? <div className="error-banner">{overview.error}</div> : null}

      <div className="inventory-summary compact">
        <div className="summary-card">
          <span>Snapshot</span>
          <strong>{overview.data?.hasSnapshot ? 'Yes' : 'No'}</strong>
          <small>
            {overview.data?.snapshot?.collectedAt
              ? new Date(overview.data.snapshot.collectedAt).toLocaleString()
              : 'not collected'}
          </small>
        </div>
        <div className="summary-card">
          <span>Sections</span>
          <strong>{overview.data?.totals.sections ?? 0}</strong>
          <small>latest snapshot</small>
        </div>
        <div className="summary-card">
          <span>Items</span>
          <strong>{overview.data?.totals.items ?? 0}</strong>
          <small>inventory objects</small>
        </div>
        <div className="summary-card">
          <span>Latest Diff</span>
          <strong>{overview.data?.latestDiff?.changeCount ?? 0}</strong>
          <small>changes</small>
        </div>
      </div>

      <div className="inventory-browser">
        <aside className="inventory-tree">
          <h3>Inventory Tree</h3>

          {(tree.data?.categories ?? []).map((category) => (
            <div className="tree-category" key={category.category}>
              <strong>{category.category}</strong>
              <small>
                {category.sectionCount} sections • {category.itemCount} items
              </small>

              <div className="tree-section-list">
                {category.sections.map((item) => (
                  <button
                    key={item.id}
                    className={`tree-section ${selectedSectionId === item.id ? 'active' : ''}`}
                    onClick={() => setSelectedSectionId(item.id)}
                    type="button"
                  >
                    <span>{item.name}</span>
                    <small>{item.itemCount}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!tree.loading && (tree.data?.categories.length ?? 0) === 0 ? (
            <p className="muted">No inventory tree yet.</p>
          ) : null}
        </aside>

        <section className="inventory-section-view">
          {!selectedSectionId ? (
            <div className="empty-state large">
              <strong>Select a section</strong>
              <p>Choose an inventory section to inspect RouterOS objects.</p>
            </div>
          ) : (
            <>
              <div className="section-view-header">
                <div>
                  <h3>{section.data?.name ?? 'Loading section...'}</h3>
                  <p>{section.data?.path}</p>
                </div>
                <span className="status-badge">{section.data?.itemCount ?? 0} items</span>
              </div>

              <div className="object-table">
                {(section.data?.items ?? []).map((item) => (
                  <div className="object-row" key={item.id}>
                    <div>
                      <strong>{item.name ?? item.externalId ?? item.id}</strong>
                      <small>{item.externalId}</small>
                    </div>
                    <code>{JSON.stringify(item.raw)}</code>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
