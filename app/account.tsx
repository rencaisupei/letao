import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Text, TextInput } from '@/components/ui/primitives/Text';
import { screenContent } from '@/lib/layout';
import { Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import { Camera, Trash2, UserPlus } from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { PasswordField } from '@/components/PasswordField';
import { SelectChip } from '@/components/SelectChip';
import { showAlert } from '@/lib/alert';
import { MIN_PASSWORD_LENGTH, describePasswordUpdateError } from '@/lib/authErrors';
import { bilt } from '@/lib/bilt';
import { ROLE_OPTIONS, SAGE, type UserRole } from '@/lib/constants';
import { goBackOrReplace } from '@/lib/navigation';
import { useAppStore } from '@/lib/store';
import { pickPhotosFromLibrary, uploadAvatar, uploadFailureMessage } from '@/lib/uploads';

// Typed confirmation for the irreversible action, so a mis-tap cannot delete an account.
const DELETE_PHRASE = '刪除帳號';

export default function AccountScreen() {
  const userId = useAppStore((state) => state.userId);
  const storedUsername = useAppStore((state) => state.username);
  const storedBio = useAppStore((state) => state.bio);
  const storedRole = useAppStore((state) => state.role);
  const storedAvatar = useAppStore((state) => state.avatarUrl);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const deleteAccount = useAppStore((state) => state.deleteAccount);

  const [username, setUsername] = useState(storedUsername ?? '');
  const [bio, setBio] = useState(storedBio ?? '');
  const [role, setRole] = useState<UserRole>(storedRole);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(storedAvatar);
  const [progress, setProgress] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isBusy = progress !== null;

  const changeAvatar = async () => {
    if (!userId) return;

    const picked = await pickPhotosFromLibrary(1);
    if (!picked.ok) {
      if (picked.reason === 'permission') {
        showAlert({
          title: '需要相簿權限',
          message: '請到系統設定開啟相簿權限，才能更換頭像。',
        });
      }
      return;
    }

    const photo = picked.photos[0];
    if (!photo) return;

    setProgress('正在上傳頭像...');
    const outcome = await uploadAvatar(userId, photo);
    setProgress(null);

    if (!outcome.ok) {
      showAlert({
        title: '頭像上傳失敗',
        tone: 'danger',
        message: uploadFailureMessage(outcome.reason),
      });
      return;
    }
    setAvatarUrl(outcome.url);
  };

  const handleSave = async () => {
    if (username.trim() === '') {
      showAlert({
        title: '請填寫暱稱',
        tone: 'danger',
        message: '暱稱會顯示在商品卡、私訊與評價上，不能留空。',
      });
      return;
    }

    setProgress('正在儲存...');
    const ok = await updateProfile({ username, role, bio, avatarUrl });
    setProgress(null);

    if (!ok) {
      showAlert({
        title: '沒有儲存成功',
        tone: 'danger',
        message: '請確認網路狀態後再試一次。',
      });
      return;
    }

    showAlert({
      title: '個人資料已更新',
      tone: 'success',
      message: '新的暱稱、頭像與身分會立刻套用到商品卡與賣家主頁。',
      onConfirm: () => goBackOrReplace('/(tabs)/profile'),
    });
  };

  const savePassword = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      showAlert({
        title: '密碼太短',
        tone: 'danger',
        message: `請設定至少 ${MIN_PASSWORD_LENGTH} 個字的密碼，建議混合英文與數字。`,
      });
      return;
    }
    if (password !== confirmPassword) {
      showAlert({
        title: '兩次密碼不一致',
        tone: 'danger',
        message: '請確認「新密碼」與「再次輸入新密碼」相同。',
      });
      return;
    }

    setIsSavingPassword(true);
    const { error } = await bilt.auth.updateUser({ password });
    setIsSavingPassword(false);

    if (error) {
      const info = describePasswordUpdateError(error);
      showAlert({ title: info.title, tone: 'danger', message: info.message });
      return;
    }

    setPassword('');
    setConfirmPassword('');
    showAlert({
      title: '登入密碼已設定',
      tone: 'success',
      message: '下次可以直接用 Email 與這組密碼登入，不用等驗證碼。',
    });
  };

  const runDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);

    if (result.ok) {
      setDeleteConfirm('');
      router.replace('/(tabs)');
      showAlert({
        title: '帳號已刪除',
        message: '你的個人檔案、商品、私訊、評價與上傳的照片都已移除。感謝你使用易拍通。',
      });
      return;
    }

    if (result.reason === 'pending_orders') {
      showAlert({
        title: '還有進行中的交易',
        tone: 'danger',
        confirmLabel: '查看我的交易',
        dismissLabel: '稍後處理',
        message: `目前有 ${result.pendingOrders} 筆交易尚未完成或取消。為了不讓交易對象的紀錄突然消失，請先處理完再刪除帳號。`,
        onConfirm: () => router.push('/orders'),
      });
      return;
    }

    showAlert({
      title: '刪除沒有完成',
      tone: 'danger',
      message: '請確認網路狀態後再試一次。若持續失敗，可透過「聯絡我們」告知客服。',
    });
  };

  const confirmDelete = () => {
    if (deleteConfirm.trim() !== DELETE_PHRASE) {
      showAlert({
        title: '請再確認一次',
        tone: 'danger',
        message: `刪除帳號無法復原。請在欄位輸入「${DELETE_PHRASE}」四個字後再送出。`,
      });
      return;
    }

    showAlert({
      title: '確定要刪除帳號嗎？',
      tone: 'danger',
      confirmLabel: '永久刪除',
      dismissLabel: '取消',
      message:
        '你的個人檔案、上架商品、私訊、訂單紀錄、評價、通知與上傳的照片都會一併刪除，且無法復原。EcoCoins 餘額也會失效。',
      onConfirm: () => {
        void runDelete();
      },
    });
  };

  if (!userId) {
    return (
      <ScrollView
        className="bg-canvas flex-1"
        contentContainerStyle={screenContent}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ title: '編輯個人資料' }} />
        <View className="bg-background items-center rounded-2xl border border-neutral-200 px-6 py-10">
          <UserPlus size={30} color={SAGE} strokeWidth={1.6} />
          <Text className="text-foreground mt-4 text-base font-bold">需要先註冊帳號</Text>
          <Button className="mt-4" onPress={() => router.push('/sign-in')}>
            <Button.Label>註冊 / 登入</Button.Label>
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-canvas flex-1"
    >
      <Stack.Screen options={{ title: '編輯個人資料' }} />

      <ScrollView
        contentContainerStyle={screenContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-background items-center rounded-2xl border border-neutral-200 p-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="更換頭像"
            onPress={() => {
              void changeAvatar();
            }}
            disabled={isBusy}
          >
            <Avatar uri={avatarUrl} name={username} size={84} />
            <View className="bg-sage absolute right-0 bottom-0 h-7 w-7 items-center justify-center rounded-full border-2 border-white">
              <Camera size={13} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          </Pressable>
          <Text className="text-muted text-2xs mt-3">點頭像可從相簿更換</Text>
        </View>

        <Text className="text-foreground mt-5 text-sm font-semibold">暱稱</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          maxLength={20}
          editable={!isBusy}
          placeholder="顯示在商品卡與評價上的名稱"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 h-11 rounded-xl border border-neutral-200 px-4 text-sm"
        />

        <Text className="text-foreground mt-5 text-sm font-semibold">個人簡介</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={200}
          textAlignVertical="top"
          editable={!isBusy}
          placeholder="介紹一下你常釋出的品類、回覆時間或面交習慣（選填）"
          placeholderTextColorClassName="accent-neutral-400"
          className="bg-background text-foreground mt-2 min-h-24 rounded-xl border border-neutral-200 px-4 pt-3 text-sm"
        />
        <Text className="text-muted text-2xs mt-1 text-right">{bio.length} / 200</Text>

        <Text className="text-foreground mt-4 text-sm font-semibold">我的身分</Text>
        <View className="mt-2 gap-1.5">
          {ROLE_OPTIONS.map((option) => (
            <SelectChip
              key={option.code}
              label={`${option.label} ｜ ${option.hint}`}
              isSelected={role === option.code}
              onPress={() => setRole(option.code)}
              className="min-h-11 w-full items-start justify-center rounded-xl px-4"
            />
          ))}
        </View>

        <View className="bg-mint mt-4 rounded-xl p-4">
          <Text className="text-sage-deep text-2xs leading-4">
            信任度、驗證標章與管理員權限由平台依評價與審核紀錄決定，無法自行修改。
          </Text>
        </View>

        <Button
          className="mt-6"
          isDisabled={isBusy}
          onPress={() => {
            void handleSave();
          }}
        >
          <Button.Label>{progress ?? '儲存變更'}</Button.Label>
        </Button>

        <View className="bg-background mt-6 rounded-2xl border border-neutral-200 p-4">
          <Text className="text-foreground text-sm font-semibold">登入密碼</Text>
          <Text className="text-muted text-2xs mt-1 leading-4">
            設定一組密碼後，下次登入輸入 Email
            與密碼就能直接進入，不必等驗證碼。已有密碼的話這裡也可以直接換一組。
          </Text>
          <PasswordField
            value={password}
            onChangeText={setPassword}
            isEditable={!isSavingPassword}
            placeholder={`新密碼（至少 ${MIN_PASSWORD_LENGTH} 個字）`}
            className="mt-3"
          />
          <PasswordField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isEditable={!isSavingPassword}
            placeholder="再次輸入新密碼"
          />
          <Button
            variant="secondary"
            className="mt-3"
            isDisabled={isSavingPassword}
            onPress={() => {
              void savePassword();
            }}
          >
            <Button.Label>{isSavingPassword ? '設定中...' : '設定登入密碼'}</Button.Label>
          </Button>
        </View>

        <View className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <View className="flex-row items-center gap-2">
            <Trash2 size={17} color="#B91C1C" strokeWidth={2} />
            <Text className="text-sm font-semibold text-red-700">刪除帳號</Text>
          </View>
          <Text className="mt-2 text-xs leading-5 text-red-700/90">
            刪除後，個人檔案、上架商品、私訊、訂單紀錄、評價、通知與上傳的照片都會一併移除，無法復原，EcoCoins
            餘額同時失效。若仍有進行中的交易，請先完成或取消。
          </Text>
          <Text className="mt-3 text-xs font-semibold text-red-700">
            請輸入「{DELETE_PHRASE}」以確認
          </Text>
          <TextInput
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            editable={!isDeleting}
            autoCapitalize="none"
            placeholder={DELETE_PHRASE}
            placeholderTextColorClassName="accent-red-300"
            className="bg-background text-foreground mt-2 h-11 rounded-xl border border-red-200 px-4 text-sm"
          />
          <Button
            variant="danger"
            className="mt-3"
            isDisabled={isDeleting || deleteConfirm.trim() !== DELETE_PHRASE}
            onPress={confirmDelete}
          >
            <Button.Label>{isDeleting ? '刪除中...' : '永久刪除我的帳號'}</Button.Label>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
