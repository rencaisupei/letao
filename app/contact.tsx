import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import {
  CircleCheck,
  CircleHelp,
  Clock,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserPlus,
} from 'lucide-react-native';

import { SelectChip } from '@/components/SelectChip';
import { showAlert } from '@/lib/alert';
import { SAGE } from '@/lib/constants';
import { useAppStore } from '@/lib/store';
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  SUBJECT_MAX_LENGTH,
  SUPPORT_CATEGORIES,
  SUPPORT_EMAIL,
  SUPPORT_STATUS_LABEL,
  type SupportCategory,
  type SupportMessage,
  categoryLabel,
  fetchAccountEmail,
  fetchMySupportMessages,
  isValidEmail,
  submitSupportMessage,
} from '@/lib/support';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ContactScreen() {
  const userId = useAppStore((state) => state.userId);

  const [category, setCategory] = useState<SupportCategory>('other');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<SupportMessage[]>([]);

  useEffect(() => {
    if (!userId) return;
    void fetchAccountEmail().then((email) => {
      if (email) setReplyEmail((current) => (current === '' ? email : current));
    });
  }, [userId]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setHistory(await fetchMySupportMessages(userId));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const openMail = () => {
    void Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[易拍通] ${categoryLabel(category)}`)}`,
    );
  };

  const handleSend = async () => {
    if (!userId) return;

    if (subject.trim().length < 2) {
      showAlert({
        title: '請填寫主旨',
        tone: 'danger',
        message: '用一句話描述問題，例如「訂單無法標記完成」，客服比較快找到原因。',
      });
      return;
    }
    if (message.trim().length < MESSAGE_MIN_LENGTH) {
      showAlert({
        title: '問題描述太短',
        tone: 'danger',
        message: `請至少寫 ${MESSAGE_MIN_LENGTH} 個字，附上商品名稱、訂單時間或錯誤訊息會更快處理。`,
      });
      return;
    }
    if (!isValidEmail(replyEmail)) {
      showAlert({
        title: '回覆信箱格式不正確',
        tone: 'danger',
        message: '請確認信箱有 @ 與網域，客服可能需要用電子郵件與您聯絡。',
      });
      return;
    }

    setIsSending(true);
    const result = await submitSupportMessage({
      userId,
      replyEmail,
      category,
      subject,
      message,
    });
    setIsSending(false);

    if (!result.ok) {
      if (result.reason === 'quota') {
        showAlert({
          title: '今天的來信次數已達上限',
          tone: 'danger',
          message: `為避免重複來信，每 24 小時最多可送出 10 封。如有急事請直接寄信到 ${SUPPORT_EMAIL}。`,
        });
        return;
      }
      if (result.reason === 'invalid') {
        showAlert({
          title: '內容不符合格式',
          tone: 'danger',
          message: `主旨限 ${SUBJECT_MAX_LENGTH} 字，內容需 ${MESSAGE_MIN_LENGTH} 到 ${MESSAGE_MAX_LENGTH} 字。`,
        });
        return;
      }
      showAlert({
        title: '沒有送出成功',
        tone: 'danger',
        message: '請確認網路狀態後再試一次；若持續失敗，可以直接寄電子郵件給我們。',
      });
      return;
    }

    setSubject('');
    setMessage('');
    await loadHistory();
    showAlert({
      title: '已送出，客服會盡快處理',
      tone: 'success',
      message: '處理進度會顯示在下方「我的來信紀錄」，客服回覆時也會發一則站內通知給您。',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-canvas flex-1"
    >
      <Stack.Screen options={{ title: '聯絡我們' }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background rounded-2xl border border-neutral-200 p-5">
          <View className="flex-row items-center gap-2">
            <MessageSquare size={18} color={SAGE} strokeWidth={2} />
            <Text className="text-foreground text-base font-bold">需要協助嗎</Text>
          </View>
          <Text className="text-muted mt-2 text-[12px] leading-5">
            帳號、上架審核、交易糾紛、付款或安全問題都可以在這裡回報。請盡量附上商品名稱與發生時間，客服會直接看到您的訊息。
          </Text>
          <View className="bg-mint mt-3 rounded-xl p-3.5">
            <View className="flex-row items-center gap-1.5">
              <Mail size={14} color={SAGE} strokeWidth={2.2} />
              <Text className="text-sage-deep text-[12px] font-bold">客服信箱</Text>
            </View>
            <Text selectable className="text-sage-deep mt-1 text-[12px] font-semibold">
              {SUPPORT_EMAIL}
            </Text>
            <Text className="text-sage-deep/90 mt-1 text-[11px] leading-4">
              服務時間為週一至週五 10:00–18:00（台灣時間），我們會依來信順序回覆。
            </Text>
            <Button size="sm" variant="secondary" className="mt-2.5 self-start" onPress={openMail}>
              <Button.Label>用電子郵件寄信</Button.Label>
            </Button>
          </View>

          <View className="bg-canvas mt-3 rounded-xl p-3.5">
            <View className="flex-row items-center gap-1.5">
              <CircleHelp size={14} color={SAGE} strokeWidth={2.2} />
              <Text className="text-foreground text-[12px] font-bold">先看看常見問題</Text>
            </View>
            <Text className="text-muted mt-1 text-[11px] leading-4">
              運費怎麼算、可以用哪些付款方式、對方不出貨怎麼辦，這些都已經有現成答案，通常比等回信更快。
            </Text>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2.5 self-start"
              onPress={() => router.push('/faq')}
            >
              <Button.Label>開啟常見問題</Button.Label>
            </Button>
          </View>
        </View>

        {userId ? (
          <View className="bg-background mt-3 rounded-2xl border border-neutral-200 p-5">
            <Text className="text-foreground text-[13px] font-bold">用站內表單聯絡</Text>

            <Text className="text-foreground mt-4 text-[12px] font-semibold">問題類型</Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {SUPPORT_CATEGORIES.map((option) => (
                <SelectChip
                  key={option.code}
                  size="sm"
                  label={option.label}
                  isSelected={category === option.code}
                  onPress={() => setCategory(option.code)}
                />
              ))}
            </View>

            <Text className="text-foreground mt-4 text-[12px] font-semibold">主旨</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              maxLength={SUBJECT_MAX_LENGTH}
              editable={!isSending}
              placeholder="一句話描述問題"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
            />

            <Text className="text-foreground mt-4 text-[12px] font-semibold">問題描述</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MESSAGE_MAX_LENGTH}
              textAlignVertical="top"
              editable={!isSending}
              placeholder="發生了什麼、涉及哪件商品或訂單、您已經試過什麼"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-background text-foreground mt-2 h-32 rounded-xl border border-neutral-200 px-4 pt-3 text-[13px]"
            />
            <Text className="text-muted mt-1 text-right text-[10px]">
              {message.trim().length} / {MESSAGE_MAX_LENGTH}
            </Text>

            <Text className="text-foreground mt-3 text-[12px] font-semibold">回覆信箱</Text>
            <TextInput
              value={replyEmail}
              onChangeText={setReplyEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isSending}
              placeholder="you@example.com"
              placeholderTextColorClassName="accent-neutral-400"
              className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-[13px]"
            />
            <Text className="text-muted mt-1 text-[11px] leading-4">
              預設是您的帳號信箱，可以改成其他常看的信箱。客服也會同時發送站內通知。
            </Text>

            <Button
              className="mt-4"
              isDisabled={isSending}
              onPress={() => {
                void handleSend();
              }}
            >
              <Button.Label>{isSending ? '送出中...' : '送出給客服'}</Button.Label>
            </Button>
          </View>
        ) : (
          <View className="bg-background mt-3 items-center rounded-2xl border border-neutral-200 px-6 py-8">
            <UserPlus size={28} color={SAGE} strokeWidth={1.6} />
            <Text className="text-foreground mt-3 text-[14px] font-bold">登入後可使用站內表單</Text>
            <Text className="text-muted mt-2 text-center text-[12px] leading-5">
              站內表單會帶上您的帳號，客服才能查到相關的商品與訂單。尚未登入也可以直接寄電子郵件給我們。
            </Text>
            <Button className="mt-4" onPress={() => router.push('/sign-in')}>
              <Button.Label>註冊 / 登入</Button.Label>
            </Button>
          </View>
        )}

        {history.length > 0 ? (
          <View className="mt-5">
            <Text className="text-foreground text-[13px] font-semibold">我的來信紀錄</Text>
            {history.map((item) => (
              <View
                key={item.id}
                className="bg-background mt-2 rounded-2xl border border-neutral-200 p-4"
              >
                <View className="flex-row items-center gap-1.5">
                  {item.status === 'resolved' ? (
                    <CircleCheck size={13} color={SAGE} strokeWidth={2.2} />
                  ) : (
                    <Clock size={13} color="#B45309" strokeWidth={2.2} />
                  )}
                  <Text
                    className={`text-[11px] font-bold ${
                      item.status === 'resolved' ? 'text-sage-deep' : 'text-amber-700'
                    }`}
                  >
                    {SUPPORT_STATUS_LABEL[item.status]}
                  </Text>
                  <Text className="text-muted flex-1 text-right text-[10px]">
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                <Text className="text-foreground mt-1.5 text-[13px] font-semibold">
                  {item.subject}
                </Text>
                <Text className="text-muted mt-0.5 text-[11px]">
                  {categoryLabel(item.category)}
                </Text>
                <Text className="text-muted mt-1.5 text-[12px] leading-5">{item.message}</Text>
                {item.admin_reply ? (
                  <View className="bg-mint mt-2.5 rounded-xl p-3">
                    <Text className="text-sage-deep text-[11px] font-bold">客服回覆</Text>
                    <Text className="text-sage-deep/90 mt-1 text-[12px] leading-5">
                      {item.admin_reply}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <View className="bg-background mt-5 rounded-2xl border border-neutral-200 p-4">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={15} color={SAGE} strokeWidth={2} />
            <Text className="text-foreground flex-1 text-[12px] font-semibold">
              您的資料怎麼被使用
            </Text>
            <Button size="sm" variant="tertiary" onPress={() => router.push('/privacy')}>
              <Button.Label>隱私權政策</Button.Label>
            </Button>
          </View>
          <Text className="text-muted mt-2 text-[11px] leading-4">
            客服來信只有管理員看得到，內容會與您的帳號綁定以便查詢交易紀錄，處理完成後保留於客服紀錄中。
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
