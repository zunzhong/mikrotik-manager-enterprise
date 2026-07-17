import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { NotificationPanel } from '../../notifications/NotificationPanel';
import { notificationApi } from '../../notifications/notification.api';
import { deviceApi } from '../../devices/device.api';

export function AlertNotificationChannels() {
  const channels = useAsyncData(useCallback(() => notificationApi.channels(), []));
  const rules = useAsyncData(useCallback(() => notificationApi.rules(), []));
  const deliveries = useAsyncData(useCallback(() => notificationApi.deliveries(100), []));
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));

  function refreshAll() {
    channels.refresh();
    rules.refresh();
    deliveries.refresh();
  }

  return (
    <NotificationPanel
      channels={channels.data ?? []}
      rules={rules.data ?? []}
      deliveries={deliveries.data ?? []}
      loading={channels.loading || rules.loading || deliveries.loading}
      error={channels.error ?? rules.error ?? deliveries.error}
      devices={devices.data ?? []}
      onChanged={refreshAll}
    />
  );
}
