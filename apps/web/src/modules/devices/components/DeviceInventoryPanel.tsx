import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceInventoryApi, type DeviceInventorySection } from '../device-inventory.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export function DeviceInventoryPanel({ deviceId }: { deviceId: string }) {
  const { formatDateTime, tr } = useLanguage();
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
          <h3>{tr('Tổng quan Inventory', 'Inventory Overview')}</h3>
          <p>
            {tr(
              'Dữ liệu RouterOS mới nhất, phân nhóm rõ ràng theo từng khu vực.',
              'Latest RouterOS data, clearly grouped by area.',
            )}
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="small-button" onClick={collectInventory}>
            {tr('Thu thập Inventory', 'Collect Inventory')}
          </button>
          <button className="small-button" onClick={diffLatest}>
            {tr('So sánh bản mới nhất', 'Diff Latest')}
          </button>
        </div>
      </div>

      {actionMessage ? <div className="info-banner">{actionMessage}</div> : null}
      {overview.error ? <div className="error-banner">{overview.error}</div> : null}

      <div className="inventory-summary compact">
        <div className="summary-card">
          <span>{tr('Dữ liệu Inventory', 'Inventory data')}</span>
          <strong>{overview.data?.hasSnapshot ? 'Yes' : 'No'}</strong>
          <small>
            {overview.data?.snapshot?.collectedAt
              ? formatDateTime(overview.data.snapshot.collectedAt)
              : 'not collected'}
          </small>
        </div>
        <div className="summary-card">
          <span>{tr('Nhóm dữ liệu', 'Sections')}</span>
          <strong>{overview.data?.totals.sections ?? 0}</strong>
          <small>lần thu thập gần nhất</small>
        </div>
        <div className="summary-card">
          <span>{tr('Đối tượng', 'Items')}</span>
          <strong>{overview.data?.totals.items ?? 0}</strong>
          <small>inventory objects</small>
        </div>
        <div className="summary-card">
          <span>{tr('Thay đổi mới nhất', 'Latest Diff')}</span>
          <strong>{overview.data?.latestDiff?.changeCount ?? 0}</strong>
          <small>changes</small>
        </div>
      </div>

      <div className="inventory-browser">
        <aside className="inventory-tree">
          <h3>{tr('Cây Inventory', 'Inventory Tree')}</h3>

          {(tree.data?.categories ?? []).map((category, index) => (
            <details className="tree-category" key={category.category} open={index < 2}>
              <summary>
                <span className="tree-category__arrow">›</span>
                <span>
                  <strong>{category.category}</strong>
                  <small>
                    {category.sectionCount} sections · {category.itemCount} items
                  </small>
                </span>
              </summary>

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
            </details>
          ))}

          {!tree.loading && (tree.data?.categories.length ?? 0) === 0 ? (
            <p className="muted">No inventory tree yet.</p>
          ) : null}
        </aside>

        <section className="inventory-section-view">
          {!selectedSectionId ? (
            <div className="empty-state large">
              <strong>{tr('Chọn một nhóm dữ liệu', 'Select a section')}</strong>
              <p>
                {tr(
                  'Chọn nhóm Inventory để xem các đối tượng RouterOS.',
                  'Choose an inventory section to inspect RouterOS objects.',
                )}
              </p>
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
                      <strong>{item.name ?? 'RouterOS object'}</strong>
                    </div>
                    <InventoryObjectFields
                      raw={item.raw}
                      bridgePort={section.data?.path === '/interface/bridge/port/print'}
                    />
                    <details className="raw-object">
                      <summary>{tr('Dữ liệu RouterOS gốc', 'Raw RouterOS data')}</summary>
                      <code>{JSON.stringify(item.raw, null, 2)}</code>
                    </details>
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

function InventoryObjectFields({
  raw,
  bridgePort,
}: {
  raw: Record<string, unknown>;
  bridgePort: boolean;
}) {
  const entries = Object.entries(raw).filter(([key]) => key !== '.id');
  const basicKeys = new Set([
    'name',
    'interface',
    'bridge',
    'type',
    'address',
    'mac-address',
    'macAddress',
    'running',
    'disabled',
    'status',
    'comment',
  ]);
  const basicEntries = entries.filter(([key]) => basicKeys.has(key)).slice(0, 8);
  const detailEntries = entries.filter(([key]) => !basicEntries.some(([basic]) => basic === key));
  const label = (key: string) => {
    if (bridgePort && key === 'interface') return 'Interface';
    if (bridgePort && key === 'bridge') return 'Bridge';
    return key.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };
  return (
    <>
      <dl className="inventory-field-grid basic-fields">
        {(basicEntries.length > 0 ? basicEntries : entries.slice(0, 5)).map(([key, value]) => (
          <div key={key}>
            <dt>{label(key)}</dt>
            <dd>{String(value ?? '—')}</dd>
          </div>
        ))}
      </dl>
      {detailEntries.length > 0 ? (
        <details className="inventory-field-details">
          <summary>Chi tiết ({detailEntries.length} thuộc tính)</summary>
          <dl className="inventory-field-grid">
            {detailEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{label(key)}</dt>
                <dd>{String(value ?? '—')}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </>
  );
}
