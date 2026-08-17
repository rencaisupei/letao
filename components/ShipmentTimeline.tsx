import { Text, View } from 'react-native';

import {
  SHIPMENT_STATUS_META,
  type ShipmentEvent,
  type ShipmentStatus,
  TRACK_STEPS,
} from '@/lib/shipments';

const SOURCE_LABELS: Record<string, string> = {
  ezship: 'ezShip',
  simulate: '模擬',
  seller: '賣家',
  buyer: '買家',
  system: '系統',
};

function formatMoment(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString('zh-TW')} ${date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

type ShipmentTimelineProps = {
  status: ShipmentStatus;
  events: ShipmentEvent[];
};

/** Step rail plus the raw event log the carrier / the two parties wrote. */
export function ShipmentTimeline({ status, events }: ShipmentTimelineProps) {
  const currentIndex = TRACK_STEPS.indexOf(status);
  const isOffTrack = currentIndex === -1;

  return (
    <View>
      <View className="flex-row">
        {TRACK_STEPS.map((step, index) => {
          const reached = !isOffTrack && index <= currentIndex;
          return (
            <View key={step} className="flex-1 items-center">
              <View className="w-full flex-row items-center">
                <View
                  className={`h-0.5 flex-1 ${index === 0 ? 'bg-transparent' : reached ? 'bg-sage' : 'bg-neutral-200'}`}
                />
                <View
                  className={`h-2.5 w-2.5 rounded-full ${reached ? 'bg-sage' : 'bg-neutral-300'}`}
                />
                <View
                  className={`h-0.5 flex-1 ${
                    index === TRACK_STEPS.length - 1
                      ? 'bg-transparent'
                      : !isOffTrack && index < currentIndex
                        ? 'bg-sage'
                        : 'bg-neutral-200'
                  }`}
                />
              </View>
              <Text
                className={`mt-1.5 text-[10px] ${reached ? 'text-sage-deep font-bold' : 'text-muted font-medium'}`}
              >
                {SHIPMENT_STATUS_META[step].label}
              </Text>
            </View>
          );
        })}
      </View>

      {isOffTrack ? (
        <View className="bg-canvas mt-3 rounded-xl px-3 py-2">
          <Text className="text-foreground text-[11px] font-semibold">
            {SHIPMENT_STATUS_META[status].label}
          </Text>
          <Text className="text-muted mt-0.5 text-[11px] leading-4">
            {SHIPMENT_STATUS_META[status].hint}
          </Text>
        </View>
      ) : null}

      <View className="mt-3.5">
        {events.length === 0 ? (
          <Text className="text-muted text-[11px] leading-4">還沒有配送紀錄。</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} className="flex-row border-t border-neutral-100 py-2">
              <View className="w-[86px]">
                <Text className="text-muted text-[10px] leading-4">
                  {formatMoment(event.occurred_at)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-[11px] font-semibold">
                  {SHIPMENT_STATUS_META[event.status].label}
                  <Text className="text-muted text-[10px] font-medium">
                    {'  '}
                    {SOURCE_LABELS[event.source] ?? event.source}
                  </Text>
                </Text>
                {event.detail ? (
                  <Text className="text-muted mt-0.5 text-[11px] leading-4">{event.detail}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
