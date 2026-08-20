import { Image, Pressable, Text, View } from 'react-native';
import { Camera, ImagePlus, X } from 'lucide-react-native';

import { MAX_LISTING_PHOTOS, SAGE } from '@/lib/constants';
import { showAlert } from '@/lib/alert';
import { type PickedPhoto, pickPhotosFromLibrary, takePhotoWithCamera } from '@/lib/uploads';

type PhotoPickerProps = {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  isDisabled?: boolean;
};

const THUMB = 78;

export function PhotoPicker({ photos, onChange, isDisabled = false }: PhotoPickerProps) {
  const remaining = MAX_LISTING_PHOTOS - photos.length;

  const handleAdd = async (source: 'library' | 'camera') => {
    if (remaining <= 0) {
      showAlert({
        title: '相片已達上限',
        message: `每件商品最多 ${MAX_LISTING_PHOTOS} 張相片，請先移除其中一張再新增。`,
      });
      return;
    }

    const result =
      source === 'library' ? await pickPhotosFromLibrary(remaining) : await takePhotoWithCamera();

    if (!result.ok) {
      if (result.reason === 'permission') {
        showAlert({
          title: '需要相片權限',
          tone: 'danger',
          message:
            source === 'library'
              ? '請在系統設定允許易拍通讀取相簿，才能挑選商品照片。'
              : '請在系統設定允許易拍通使用相機，才能拍攝商品照片。',
        });
      }
      return;
    }

    onChange([...photos, ...result.photos].slice(0, MAX_LISTING_PHOTOS));
  };

  const handleRemove = (index: number) => {
    onChange(photos.filter((_, position) => position !== index));
  };

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo, index) => (
          <View key={photo.uri} style={{ width: THUMB, height: THUMB }}>
            <Image
              source={{ uri: photo.uri }}
              style={{ width: THUMB, height: THUMB, borderRadius: 10 }}
              resizeMode="cover"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="移除這張相片"
              hitSlop={6}
              onPress={() => handleRemove(index)}
              className="absolute -top-1.5 -right-1.5 h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white"
            >
              <X size={12} color="#4B5563" strokeWidth={2.4} />
            </Pressable>
            {index === 0 ? (
              <View className="bg-sage absolute bottom-1 left-1 rounded px-1.5 py-0.5">
                <Text className="text-[9px] font-bold text-white">封面</Text>
              </View>
            ) : null}
          </View>
        ))}

        {remaining > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="從相簿挑選相片"
            disabled={isDisabled}
            onPress={() => {
              void handleAdd('library');
            }}
            style={{ width: THUMB, height: THUMB }}
            className="items-center justify-center rounded-[10px] border border-dashed border-neutral-300 bg-white"
          >
            <ImagePlus size={20} color={SAGE} strokeWidth={1.8} />
            <Text className="text-sage-deep mt-1 text-[10px] font-semibold">相簿</Text>
          </Pressable>
        ) : null}

        {remaining > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="拍攝商品相片"
            disabled={isDisabled}
            onPress={() => {
              void handleAdd('camera');
            }}
            style={{ width: THUMB, height: THUMB }}
            className="items-center justify-center rounded-[10px] border border-dashed border-neutral-300 bg-white"
          >
            <Camera size={20} color={SAGE} strokeWidth={1.8} />
            <Text className="text-sage-deep mt-1 text-[10px] font-semibold">拍照</Text>
          </Pressable>
        ) : null}
      </View>

      <Text className="text-muted mt-2 text-[11px] leading-4">
        最多 {MAX_LISTING_PHOTOS} 張，第一張會成為封面。相片會在送出時上傳，並一併送入 AI 審核。
      </Text>
    </View>
  );
}
