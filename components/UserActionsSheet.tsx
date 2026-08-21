import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Button } from 'heroui-native';
import { Ban, Flag, ShieldOff, X } from 'lucide-react-native';

import { SelectChip } from '@/components/SelectChip';
import { Text, TextInput } from '@/components/ui/primitives/Text';
import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import { USER_REPORT_REASONS } from '@/lib/moderation';
import { useAppStore } from '@/lib/store';

type UserActionsSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  targetUserId: string;
  targetName: string;
  /** Attached to the report so admins can read the thread in context. */
  conversationId?: string | null;
  /** Called after a successful block or unblock so screens can refresh. */
  onBlockChange?: (isBlocked: boolean) => void;
};

/** Report-a-member and block-a-member actions, shared by chat and seller pages. */
export function UserActionsSheet({
  isVisible,
  onClose,
  targetUserId,
  targetName,
  conversationId = null,
  onBlockChange,
}: UserActionsSheetProps) {
  const isBlocked = useAppStore((state) => targetUserId in state.blockedUsers);
  const reportUser = useAppStore((state) => state.reportUser);
  const blockUser = useAppStore((state) => state.blockUser);
  const unblockUser = useAppStore((state) => state.unblockUser);

  const [reason, setReason] = useState(USER_REPORT_REASONS[0] ?? '');
  const [detail, setDetail] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const submitReport = async () => {
    setIsBusy(true);
    const ok = await reportUser(targetUserId, reason, detail, conversationId);
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: '檢舉沒有送出',
        tone: 'danger',
        message: '請確認網路狀態後再試一次。若情況緊急，也可以直接用「聯絡我們」寄給客服。',
      });
      return;
    }

    setDetail('');
    onClose();
    showAlert({
      title: '檢舉已送出',
      tone: 'success',
      message: '管理員會盡快查看這位會員的紀錄。若對方仍在騷擾你，建議一併封鎖。',
    });
  };

  const applyBlock = async () => {
    setIsBusy(true);
    const ok = isBlocked ? await unblockUser(targetUserId) : await blockUser(targetUserId);
    setIsBusy(false);

    if (!ok) {
      showAlert({
        title: isBlocked ? '解除封鎖失敗' : '封鎖失敗',
        tone: 'danger',
        message: '請確認網路狀態後再試一次。',
      });
      return;
    }

    onBlockChange?.(!isBlocked);
    onClose();
    showAlert({
      title: isBlocked ? '已解除封鎖' : '已封鎖這位會員',
      tone: 'success',
      message: isBlocked
        ? `${targetName} 現在可以再與你私訊，商品也會回到探索頁。`
        : `${targetName} 無法再傳訊息給你，你也不會在探索頁看到對方的商品。`,
    });
  };

  const confirmBlock = () => {
    if (isBlocked) {
      void applyBlock();
      return;
    }
    showAlert({
      title: `封鎖 ${targetName}？`,
      tone: 'danger',
      confirmLabel: '封鎖',
      dismissLabel: '取消',
      message: '雙方將無法再互傳訊息，對方的商品也會從你的探索頁隱藏。你隨時可以解除封鎖。',
      onConfirm: () => {
        void applyBlock();
      },
    });
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-background max-h-[86%] rounded-t-3xl">
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-foreground text-lg font-bold">安全與檢舉</Text>
                <Text className="text-muted mt-1 text-xs leading-4">對象：{targetName}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="關閉"
                onPress={onClose}
                className="bg-canvas h-9 w-9 items-center justify-center rounded-full"
              >
                <X size={16} color="#6B7280" strokeWidth={2.2} />
              </Pressable>
            </View>

            <View className="mt-5 flex-row items-center gap-2">
              <Flag size={16} color={SAGE} strokeWidth={2} />
              <Text className="text-foreground text-sm font-semibold">檢舉這位會員</Text>
            </View>
            <Text className="text-muted mt-1 text-xs leading-4">
              選擇最接近的原因，管理員會看到你的說明與這段對話。
            </Text>

            <View className="mt-3 gap-1.5">
              {USER_REPORT_REASONS.map((option) => (
                <SelectChip
                  key={option}
                  label={option}
                  isSelected={reason === option}
                  onPress={() => setReason(option)}
                  className="min-h-11 w-full items-start justify-center rounded-xl px-4"
                />
              ))}
            </View>

            <TextInput
              value={detail}
              onChangeText={setDetail}
              multiline
              maxLength={600}
              textAlignVertical="top"
              editable={!isBusy}
              placeholder="補充說明發生了什麼（選填，例如對方要求匯款到私人帳戶）"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-canvas text-foreground mt-3 min-h-24 rounded-xl border border-neutral-200 px-4 pt-3 text-sm"
            />

            <Button
              className="mt-3"
              isDisabled={isBusy || reason === ''}
              onPress={() => {
                void submitReport();
              }}
            >
              <Button.Label>{isBusy ? '處理中...' : '送出檢舉'}</Button.Label>
            </Button>

            <View className="mt-6 border-t border-neutral-200 pt-5">
              <View className="flex-row items-center gap-2">
                {isBlocked ? (
                  <ShieldOff size={16} color={SAGE} strokeWidth={2} />
                ) : (
                  <Ban size={16} color="#DC2626" strokeWidth={2} />
                )}
                <Text className="text-foreground text-sm font-semibold">
                  {isBlocked ? '已封鎖這位會員' : '封鎖這位會員'}
                </Text>
              </View>
              <Text className="text-muted mt-1 text-xs leading-4">
                {isBlocked
                  ? '解除封鎖後，雙方可以再互傳訊息，對方的商品也會回到探索頁。'
                  : '封鎖後雙方都無法再互傳訊息，對方的商品也不會出現在你的探索頁。'}
              </Text>
              <Button
                variant={isBlocked ? 'secondary' : 'danger'}
                className="mt-3"
                isDisabled={isBusy}
                onPress={confirmBlock}
              >
                <Button.Label>{isBlocked ? '解除封鎖' : '封鎖'}</Button.Label>
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
