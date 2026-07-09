import type {
  RouterOsConfigChange,
  RouterOsConfigDiff,
  RouterOsConfigItem,
  RouterOsConfigSnapshot,
} from '../models/config-diff.js';

function diffAttributes(
  before: RouterOsConfigItem,
  after: RouterOsConfigItem,
): RouterOsConfigChange['changedAttributes'] {
  const keys = new Set([...Object.keys(before.attributes), ...Object.keys(after.attributes)]);

  const changedAttributes: RouterOsConfigChange['changedAttributes'] = {};

  for (const key of keys) {
    const beforeValue = before.attributes[key];
    const afterValue = after.attributes[key];

    if (beforeValue !== afterValue) {
      changedAttributes[key] = {
        before: beforeValue,
        after: afterValue,
      };
    }
  }

  return Object.keys(changedAttributes).length > 0 ? changedAttributes : undefined;
}

export function diffConfigSnapshots(
  source: RouterOsConfigSnapshot,
  target: RouterOsConfigSnapshot,
): RouterOsConfigDiff {
  const sourceMap = new Map(source.items.map((item) => [item.key, item]));
  const targetMap = new Map(target.items.map((item) => [item.key, item]));
  const changes: RouterOsConfigChange[] = [];

  for (const targetItem of target.items) {
    const sourceItem = sourceMap.get(targetItem.key);

    if (!sourceItem) {
      changes.push({
        type: 'added',
        key: targetItem.key,
        path: targetItem.path,
        after: targetItem,
      });
      continue;
    }

    const changedAttributes = diffAttributes(sourceItem, targetItem);
    if (changedAttributes) {
      changes.push({
        type: 'changed',
        key: targetItem.key,
        path: targetItem.path,
        before: sourceItem,
        after: targetItem,
        changedAttributes,
      });
    }
  }

  for (const sourceItem of source.items) {
    if (!targetMap.has(sourceItem.key)) {
      changes.push({
        type: 'removed',
        key: sourceItem.key,
        path: sourceItem.path,
        before: sourceItem,
      });
    }
  }

  return {
    id: `diff-${Date.now()}`,
    sourceSnapshotId: source.id,
    targetSnapshotId: target.id,
    createdAt: new Date().toISOString(),
    changes,
  };
}
