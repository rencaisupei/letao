import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { Button } from 'heroui-native';
import { Check, ChevronRight, Tag, X } from 'lucide-react-native';

import { ALL_CATEGORY, CATEGORY_GROUPS, SAGE, categoryGroupTitle } from '@/lib/constants';
import { cn } from '@/lib/utils';

type CategoryPickerProps = {
  value: string;
  onChange: (category: string) => void;
  isDisabled?: boolean;
  /** Adds a 「全部」 row at the top, for the explore filters. */
  includeAll?: boolean;
  className?: string;
};

/**
 * The 36 categories are far too many for one flat chip wall, so the field opens
 * a sheet that shows a handful of large targets per group.
 */
export function CategoryPicker({
  value,
  onChange,
  isDisabled = false,
  includeAll = false,
  className,
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const groupTitle = categoryGroupTitle(value);

  const pick = (category: string) => {
    onChange(category);
    setIsOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`商品類別，目前選擇 ${value}`}
        disabled={isDisabled}
        onPress={() => setIsOpen(true)}
        className={cn(
          'bg-background flex-row items-center rounded-xl border border-neutral-200 px-4 py-3',
          isDisabled ? 'opacity-60' : '',
          className,
        )}
      >
        <Tag size={15} color={SAGE} strokeWidth={2.2} />
        <View className="ml-2.5 flex-1">
          <Text className="text-foreground text-sm font-semibold">{value}</Text>
          <Text className="text-muted text-2xs mt-0.5">
            {groupTitle ? `${groupTitle} ∙ 點此更換類別` : '點此選擇類別'}
          </Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-background max-h-[88%] rounded-t-3xl">
            <View className="flex-row items-center justify-between border-b border-neutral-100 px-4 py-3.5">
              <View className="flex-1">
                <Text className="text-foreground text-base font-bold">選擇商品類別</Text>
                <Text className="text-muted text-2xs mt-0.5">
                  依類型分成 {CATEGORY_GROUPS.length} 區，點一下即選定
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="關閉"
                onPress={() => setIsOpen(false)}
                className="h-9 w-9 items-center justify-center"
              >
                <X size={18} color="#9CA3AF" strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {includeAll ? (
                <CategoryRow
                  label={ALL_CATEGORY}
                  hint="不限類別，顯示所有商品"
                  isSelected={value === ALL_CATEGORY}
                  onPress={() => pick(ALL_CATEGORY)}
                  className="mb-4"
                />
              ) : null}

              {CATEGORY_GROUPS.map((group, index) => (
                <View key={group.title} className={index === 0 ? '' : 'mt-5'}>
                  <Text className="text-muted text-xs font-bold">
                    {group.emoji} {group.title}
                  </Text>
                  <View className="mt-2 gap-1.5">
                    {group.items.map((item) => (
                      <CategoryRow
                        key={item}
                        label={item}
                        isSelected={value === item}
                        onPress={() => pick(item)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View className="bg-background pb-safe-offset-3 border-t border-neutral-100 px-4 pt-3">
              <Button variant="secondary" onPress={() => setIsOpen(false)}>
                <Button.Label>關閉</Button.Label>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Inline variant for surfaces that already live inside a modal (the explore
 * filter sheet), where opening a second modal would be fragile: pick a group,
 * then one of its six categories.
 */
export function InlineCategorySelect({
  value,
  onChange,
  includeAll = false,
}: {
  value: string;
  onChange: (category: string) => void;
  includeAll?: boolean;
}) {
  const selectedGroup = CATEGORY_GROUPS.find((group) => group.items.includes(value)) ?? null;
  const [openTitle, setOpenTitle] = useState(selectedGroup?.title ?? CATEGORY_GROUPS[0].title);
  const openGroup = CATEGORY_GROUPS.find((group) => group.title === openTitle);

  return (
    <View>
      <View className="flex-row flex-wrap gap-1.5">
        {includeAll ? (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: value === ALL_CATEGORY }}
            onPress={() => onChange(ALL_CATEGORY)}
            className={cn(
              'h-9 justify-center rounded-lg border px-3',
              value === ALL_CATEGORY ? 'border-sage bg-sage' : 'bg-canvas border-neutral-200',
            )}
          >
            <Text
              className={cn(
                'text-xs',
                value === ALL_CATEGORY ? 'font-bold text-white' : 'text-muted font-medium',
              )}
            >
              不限
            </Text>
          </Pressable>
        ) : null}
        {CATEGORY_GROUPS.map((group) => {
          const isOpen = group.title === openTitle;
          const holdsValue = group.items.includes(value);
          return (
            <Pressable
              key={group.title}
              accessibilityRole="tab"
              accessibilityState={{ selected: isOpen }}
              onPress={() => setOpenTitle(group.title)}
              className={cn(
                'h-9 flex-row items-center justify-center rounded-lg border px-3',
                isOpen ? 'border-sage bg-mint' : 'bg-canvas border-neutral-200',
              )}
            >
              <Text
                className={cn(
                  'text-xs',
                  isOpen ? 'text-sage-deep font-bold' : 'text-muted font-medium',
                )}
              >
                {group.emoji} {group.title}
              </Text>
              {holdsValue ? <View className="bg-sage ml-1.5 h-1.5 w-1.5 rounded-full" /> : null}
            </Pressable>
          );
        })}
      </View>

      {openGroup ? (
        <View className="mt-2 gap-1.5">
          {openGroup.items.map((item) => (
            <CategoryRow
              key={item}
              label={item}
              isSelected={value === item}
              onPress={() => onChange(item)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CategoryRow({
  label,
  hint,
  isSelected,
  onPress,
  className,
}: {
  label: string;
  hint?: string;
  isSelected: boolean;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      className={cn(
        'min-h-12 flex-row items-center rounded-xl border px-4 py-2.5',
        isSelected ? 'border-sage bg-mint' : 'bg-canvas border-neutral-200',
        className,
      )}
    >
      <View className="flex-1">
        <Text
          className={cn(
            'text-sm',
            isSelected ? 'text-sage-deep font-bold' : 'text-foreground font-medium',
          )}
        >
          {label}
        </Text>
        {hint ? <Text className="text-muted text-2xs mt-0.5">{hint}</Text> : null}
      </View>
      {isSelected ? <Check size={16} color={SAGE} strokeWidth={2.6} /> : null}
    </Pressable>
  );
}
