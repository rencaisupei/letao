import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import { AlertTriangle, Flag, ShieldCheck, Sparkles } from 'lucide-react-native';

import { ModerationBadge } from '@/components/ModerationBadge';
import { showAlert } from '@/lib/alert';
import { SAGE, getCondition, shippingSummary } from '@/lib/constants';
import { type AdminReport, useAdminStore } from '@/lib/adminStore';
import { goBackOrReplace } from '@/lib/navigation';
import { type Listing, useLetaoStore } from '@/lib/store';

type AdminTab = 'queue' | 'reports' | 'stats';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'queue', label: '審核佇列' },
  { key: 'reports', label: '檢舉處理' },
  { key: 'stats', label: '平台統計' },
];

export default function AdminScreen() {
  const isAdmin = useLetaoStore((state) => state.isAdmin);
  const refreshFeed = useLetaoStore((state) => state.refresh);

  const stats = useAdminStore((state) => state.stats);
  const queue = useAdminStore((state) => state.queue);
  const reports = useAdminStore((state) => state.reports);
  const isLoading = useAdminStore((state) => state.isLoading);
  const load = useAdminStore((state) => state.load);
  const reviewListing = useAdminStore((state) => state.reviewListing);
  const resolveReport = useAdminStore((state) => state.resolveReport);

  const [tab, setTab] = useState<AdminTab>('queue');
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const reload = useCallback(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleApprove = async (listing: Listing) => {
    setIsBusy(true);
    const ok = await reviewListing(listing.id, 'approved', '管理員人工複審通過');
    setIsBusy(false);
    if (ok) {
      await refreshFeed();
      return;
    }
    showAlert({ title: '操作失敗', tone: 'danger', message: '狀態沒有更新，請稍後再試。' });
  };

  const handleReject = async () => {
    const listing = rejecting;
    if (!listing) return;
    setIsBusy(true);
    const ok = await reviewListing(
      listing.id,
      'rejected',
      reason.trim() === '' ? '管理員判定不符刊登規範' : reason.trim(),
    );
    setIsBusy(false);
    setRejecting(null);
    setReason('');
    if (ok) {
      await refreshFeed();
      return;
    }
    showAlert({ title: '操作失敗', tone: 'danger', message: '狀態沒有更新，請稍後再試。' });
  };

  const handleResolveReport = async (report: AdminReport, status: 'resolved' | 'dismissed') => {
    setIsBusy(true);
    const ok = await resolveReport(report.id, status);
    setIsBusy(false);
    if (!ok) {
      showAlert({ title: '操作失敗', tone: 'danger', message: '檢舉狀態沒有更新，請稍後再試。' });
    }
  };

  if (!isAdmin) {
    return (
      <View className="bg-canvas flex-1 items-center justify-center px-8">
        <Stack.Screen options={{ title: '管理平台' }} />
        <ShieldCheck size={32} color={SAGE} strokeWidth={1.6} />
        <Text className="text-foreground mt-4 text-base font-bold">沒有管理員權限</Text>
        <Text className="text-muted mt-2 text-center text-[13px] leading-5">
          管理平台僅開放給持有邀請碼的管理員。請在個人主頁輸入邀請碼後再進入。
        </Text>
        <Button className="mt-4" onPress={() => goBackOrReplace('/(tabs)/profile')}>
          <Button.Label>回到個人主頁</Button.Label>
        </Button>
      </View>
    );
  }

  const openReports = reports.filter((report) => report.status === 'open');
  const handledReports = reports.filter((report) => report.status !== 'open');
  const waiting = queue.filter((listing) => listing.moderation_status !== 'rejected');
  const rejected = queue.filter((listing) => listing.moderation_status === 'rejected');

  return (
    <View className="bg-canvas flex-1">
      <Stack.Screen options={{ title: '樂淘管理平台' }} />

      <View className="bg-background flex-row gap-1.5 border-b border-neutral-200 px-3 py-2.5">
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === item.key }}
            onPress={() => setTab(item.key)}
            className={`flex-1 items-center rounded-xl py-2 ${
              tab === item.key ? 'bg-sage' : 'bg-canvas'
            }`}
          >
            <Text
              className={`text-[12px] ${
                tab === item.key ? 'font-bold text-white' : 'text-muted font-medium'
              }`}
            >
              {item.label}
              {item.key === 'queue' && waiting.length > 0 ? ` ${waiting.length}` : ''}
              {item.key === 'reports' && openReports.length > 0 ? ` ${openReports.length}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'queue' ? (
          <>
            <View className="bg-mint flex-row items-start gap-2 rounded-xl p-3.5">
              <Sparkles size={15} color={SAGE} strokeWidth={2} />
              <Text className="text-sage-deep flex-1 text-[11px] leading-4">
                AI
                已先做第一層判定：命中禁售關鍵字會直接退回，語意可疑會標成「待人工複審」並排在這裡等你決定。
              </Text>
            </View>

            {waiting.length === 0 ? (
              <View className="bg-background rounded-2xl border border-neutral-200 p-5">
                <Text className="text-muted text-center text-[13px]">
                  {isLoading ? '載入中...' : '目前沒有待複審的商品。'}
                </Text>
              </View>
            ) : (
              waiting.map((listing) => (
                <QueueCard
                  key={listing.id}
                  listing={listing}
                  isBusy={isBusy}
                  onApprove={() => {
                    void handleApprove(listing);
                  }}
                  onReject={() => {
                    setReason('');
                    setRejecting(listing);
                  }}
                />
              ))
            )}

            {rejected.length > 0 ? (
              <>
                <Text className="text-foreground mt-2 px-1 text-[13px] font-semibold">
                  已退回（{rejected.length}）
                </Text>
                {rejected.map((listing) => (
                  <QueueCard
                    key={listing.id}
                    listing={listing}
                    isBusy={isBusy}
                    onApprove={() => {
                      void handleApprove(listing);
                    }}
                  />
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'reports' ? (
          <>
            {openReports.length === 0 ? (
              <View className="bg-background rounded-2xl border border-neutral-200 p-5">
                <Text className="text-muted text-center text-[13px]">
                  {isLoading ? '載入中...' : '目前沒有待處理的檢舉。'}
                </Text>
              </View>
            ) : (
              openReports.map((report) => (
                <View
                  key={report.id}
                  className="bg-background rounded-2xl border border-neutral-200 p-4"
                >
                  <View className="flex-row items-center gap-2">
                    <Flag size={14} color="#DC2626" strokeWidth={2.2} />
                    <Text className="text-[12px] font-bold text-red-700">{report.reason}</Text>
                  </View>
                  <Text className="text-foreground mt-2 text-[13px] font-semibold">
                    {report.listings?.title ?? '（商品已刪除）'}
                  </Text>
                  {report.detail ? (
                    <Text className="text-muted mt-1.5 text-[12px] leading-5">{report.detail}</Text>
                  ) : null}
                  <Text className="text-muted mt-2 text-[10px]">
                    {new Date(report.created_at).toLocaleString('zh-TW')}
                  </Text>

                  <View className="mt-3 flex-row gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      isDisabled={isBusy}
                      onPress={() => {
                        void handleResolveReport(report, 'dismissed');
                      }}
                    >
                      <Button.Label>檢舉不成立</Button.Label>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      isDisabled={isBusy}
                      onPress={() => {
                        void handleResolveReport(report, 'resolved');
                      }}
                    >
                      <Button.Label>已處理</Button.Label>
                    </Button>
                  </View>
                  {report.listings ? (
                    <Button
                      size="sm"
                      variant="tertiary"
                      className="mt-1.5"
                      onPress={() =>
                        router.push({
                          pathname: '/listing/[id]',
                          params: { id: report.listing_id },
                        })
                      }
                    >
                      <Button.Label>查看商品內容</Button.Label>
                    </Button>
                  ) : null}
                </View>
              ))
            )}

            {handledReports.length > 0 ? (
              <>
                <Text className="text-foreground mt-2 px-1 text-[13px] font-semibold">
                  已結案（{handledReports.length}）
                </Text>
                {handledReports.map((report) => (
                  <View
                    key={report.id}
                    className="bg-background rounded-2xl border border-neutral-200 p-3.5"
                  >
                    <Text className="text-muted text-[12px]">
                      {report.reason} ∙ {report.status === 'resolved' ? '已處理' : '不成立'}
                    </Text>
                    <Text className="text-foreground mt-1 text-[12px] font-medium">
                      {report.listings?.title ?? '（商品已刪除）'}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'stats' ? (
          <>
            <View className="flex-row flex-wrap gap-2.5">
              <StatCard label="待審核" value={stats?.pending_count ?? 0} tone="neutral" />
              <StatCard label="待人工複審" value={stats?.flagged_count ?? 0} tone="warning" />
              <StatCard label="已退回" value={stats?.rejected_count ?? 0} tone="danger" />
              <StatCard label="已上架" value={stats?.approved_count ?? 0} tone="success" />
              <StatCard label="待處理檢舉" value={stats?.open_reports ?? 0} tone="danger" />
              <StatCard label="註冊用戶" value={stats?.user_count ?? 0} tone="neutral" />
            </View>

            <View className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4">
              <View className="flex-row items-center gap-2">
                <AlertTriangle size={15} color={SAGE} strokeWidth={2} />
                <Text className="text-foreground text-[13px] font-semibold">審核規則</Text>
              </View>
              <Text className="text-muted mt-2 text-[12px] leading-5">
                第一層是
                AI：命中禁售關鍵字（藥品醫療器材、菸酒電子菸、活體與保育類、仿冒盜版、武器、毒品）直接退回；語意可疑或屬灰色地帶（保健食品、刀具、鋰電池、代購、票券、寵物等）標為待人工複審。第二層是你在這個後台的最終決定，覆核結果會覆寫
                AI 判定。
              </Text>
            </View>

            <Button variant="secondary" className="mt-1" isDisabled={isLoading} onPress={reload}>
              <Button.Label>{isLoading ? '更新中...' : '重新整理統計'}</Button.Label>
            </Button>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={rejecting !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <View className="bg-background w-full max-w-sm rounded-2xl border border-neutral-200 p-5">
            <Text className="text-foreground text-base font-bold">退回這件商品</Text>
            <Text className="text-muted mt-2 text-[12px] leading-4" numberOfLines={2}>
              {rejecting?.title}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              textAlignVertical="top"
              placeholder="退回原因（會顯示給賣家）"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-canvas text-foreground mt-3 h-20 rounded-xl border border-neutral-200 px-3 pt-2.5 text-[13px]"
            />
            <View className="mt-4 flex-row gap-2">
              <Button variant="secondary" className="flex-1" onPress={() => setRejecting(null)}>
                <Button.Label>取消</Button.Label>
              </Button>
              <Button
                className="flex-1"
                isDisabled={isBusy}
                onPress={() => {
                  void handleReject();
                }}
              >
                <Button.Label>確認退回</Button.Label>
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

type QueueCardProps = {
  listing: Listing;
  isBusy: boolean;
  onApprove: () => void;
  onReject?: () => void;
};

function QueueCard({ listing, isBusy, onApprove, onReject }: QueueCardProps) {
  const condition = getCondition(listing.condition_rating);

  return (
    <View className="bg-background rounded-2xl border border-neutral-200 p-4">
      <View className="flex-row items-start justify-between">
        <ModerationBadge status={listing.moderation_status} />
        <Text className="text-muted text-[10px]">
          {new Date(listing.created_at).toLocaleString('zh-TW')}
        </Text>
      </View>

      <Text className="text-foreground mt-2 text-[14px] font-bold">{listing.title}</Text>
      <Text className="text-foreground mt-1 text-[13px] font-bold">
        NT$ {listing.price.toLocaleString('en-US')}
      </Text>
      <Text className="text-muted mt-1 text-[11px]">
        {listing.category ?? '未分類'} ∙ {condition.label} ∙{' '}
        {shippingSummary(listing.shipping_options)} ∙ 賣家 {listing.seller?.username ?? '未命名'}
      </Text>

      {listing.description ? (
        <Text className="text-muted mt-2 text-[12px] leading-5">{listing.description}</Text>
      ) : null}

      {listing.moderation_reason ? (
        <View className="bg-canvas mt-2.5 rounded-xl px-3 py-2">
          <Text className="text-[11px] leading-4 font-medium text-red-700">
            AI 判定：{listing.moderation_reason}
          </Text>
        </View>
      ) : null}

      <View className="mt-3 flex-row gap-2">
        {onReject ? (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            isDisabled={isBusy}
            onPress={onReject}
          >
            <Button.Label>退回</Button.Label>
          </Button>
        ) : null}
        <Button size="sm" className="flex-1" isDisabled={isBusy} onPress={onApprove}>
          <Button.Label>通過上架</Button.Label>
        </Button>
      </View>

      <Button
        size="sm"
        variant="tertiary"
        className="mt-1.5"
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
      >
        <Button.Label>開啟完整商品頁</Button.Label>
      </Button>
    </View>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
};

function StatCard({ label, value, tone }: StatCardProps) {
  const toneClass =
    tone === 'success'
      ? 'text-sage-deep'
      : tone === 'warning'
        ? 'text-yellow-700'
        : tone === 'danger'
          ? 'text-red-700'
          : 'text-foreground';

  return (
    <View className="bg-background w-[48%] rounded-2xl border border-neutral-200 p-4">
      <Text className="text-muted text-[11px]">{label}</Text>
      <Text className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</Text>
    </View>
  );
}
