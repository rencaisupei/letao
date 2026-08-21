import { Linking, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/primitives/Text';
import { screenContent } from '@/lib/layout';
import { Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import { FileText, Mail, ShieldCheck } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import { SUPPORT_EMAIL, TERMS_UPDATED_AT } from '@/lib/support';

type Section = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

// The wording has to keep matching what the app actually does: no escrow, no
// paid EcoCoins, keyword-based listing moderation, in-app account deletion.
const SECTIONS: Section[] = [
  {
    title: '一、服務內容',
    paragraphs: [
      '易拍通（以下稱「本平台」）提供二手物品的刊登、搜尋、私訊聯繫與交易紀錄工具，讓買賣雙方自行約定價格、付款與交付方式。',
      '本平台是提供資訊與聯繫工具的媒介，不是買賣任一方，也不代收代付價金、不提供履約保證或第三方保管服務。',
    ],
  },
  {
    title: '二、帳號與使用資格',
    paragraphs: [
      '註冊時請提供有效的電子郵件並自行保管密碼。以您帳號所做的行為，視為您本人的行為。',
      '未滿十八歲者使用本平台交易，應事先取得法定代理人同意；若我們得知帳號由未取得同意的未成年人建立，將暫停該帳號。',
      '一人不得為規避停權或檢舉而重複註冊帳號。',
    ],
  },
  {
    title: '三、刊登規範與禁止行為',
    paragraphs: ['刊登商品即表示您有權處分該物品，且內容真實。下列行為一律禁止：'],
    bullets: [
      '刊登法令禁止或需特許經營的物品，例如管制藥品、菸酒、槍械彈藥、活體動物、醫療器材、色情物品、個人資料或帳號。',
      '販售仿冒品、盜版品或來源不明的贓物。',
      '不實描述商品狀況、以低價吸引後改價、或在成交後任意變更條件。',
      '騷擾、辱罵、威脅或跟蹤其他會員；散布廣告、垃圾訊息或導向站外的可疑連結。',
      '以自動化程式大量抓取平台內容，或干擾平台正常運作。',
    ],
  },
  {
    title: '四、內容審核與處置',
    paragraphs: [
      '商品上架時會先經過禁售關鍵字規則篩檢，可疑內容會轉由管理員人工複審，審核期間不會出現在探索頁。',
      '收到檢舉或發現違規時，本平台得下架商品、暫停或終止帳號，並保留必要紀錄以處理爭議。',
      '您可以在商品頁檢舉商品，也可以在對話或賣家主頁檢舉、封鎖特定會員。封鎖後雙方無法再互傳訊息。',
    ],
  },
  {
    title: '五、交易、付款與運送',
    paragraphs: [
      '價金與運費由買賣雙方直接往來，本平台不介入收款，也不會代為退款。運費試算僅為參考值，實際費用以物流業者收費為準。',
      '面交請約在人潮眾多、設有監視器的公共場所，並於交付前確認物品狀況。請勿在對話中提供銀行密碼、驗證碼或個人證件。',
      '爭議發生時，本平台可提供必要的交易紀錄協助釐清，但無法強制任一方履約或代為裁決。',
    ],
  },
  {
    title: '六、EcoCoins 點數',
    paragraphs: [
      'EcoCoins 是平台內的免費點數，透過每日簽到等平台活動取得，僅能用於「提升排名」等曝光功能。',
      'EcoCoins 不得購買、不可兌換現金或折抵商品價金、不可轉讓，也不會退還。帳號終止時，剩餘點數即失效。',
    ],
  },
  {
    title: '七、評價與公開內容',
    paragraphs: [
      '暱稱、頭像、個人簡介、通過審核的商品內容與收到的評價屬於公開資訊。上架照片前請避免拍到證件、門牌、車牌或他人臉部。',
      '評價應基於真實交易經驗，不得作為報復或勒索的手段。',
    ],
  },
  {
    title: '八、帳號終止與資料刪除',
    paragraphs: [
      '您可以隨時在「個人主頁 → 編輯個人資料 → 刪除帳號」自行刪除帳號。刪除後，您的個人檔案、商品、私訊、評價、通知與上傳的照片會一併移除，且無法復原。',
      '為保護交易對象，若仍有進行中的交易，請先完成或取消後再刪除帳號。',
    ],
  },
  {
    title: '九、免責聲明與責任限制',
    paragraphs: [
      '本平台以現狀提供服務，不保證服務不中斷、無錯誤，亦不對會員刊登內容的真實性、合法性或品質作擔保。',
      '因會員間交易所生的糾紛、損害或費用，由交易雙方自行負責。於法律允許的範圍內，本平台對間接或衍生性損害不負賠償責任。',
    ],
  },
  {
    title: '十、條款修改與適用法律',
    paragraphs: [
      '本條款如有修改，將於本頁公告並更新生效日期；涉及重大變更時會另以站內通知提醒。修改後繼續使用服務，視為同意修改後的條款。',
      '本條款以中華民國法律為準據法，並以台灣臺北地方法院為第一審管轄法院。',
    ],
  },
];

function openMail() {
  void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('服務條款相關問題')}`);
}

export default function TermsScreen() {
  return (
    <ScrollView
      className="bg-canvas flex-1"
      contentContainerStyle={screenContent}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: '服務條款' }} />

      <View className="bg-background rounded-2xl border border-neutral-200 p-4">
        <View className="flex-row items-center gap-2">
          <FileText size={18} color={SAGE} strokeWidth={2} />
          <Text className="text-foreground text-base font-bold">易拍通服務條款</Text>
        </View>
        <Text className="text-muted mt-2 text-xs leading-5">
          本條款說明使用易拍通的權利與義務。註冊帳號或使用本平台服務，即表示您已閱讀並同意本條款與隱私權政策。
        </Text>
        <Text className="text-sage-deep text-2xs mt-3 font-semibold">
          生效日期：{TERMS_UPDATED_AT}
        </Text>
      </View>

      {SECTIONS.map((section) => (
        <View
          key={section.title}
          className="bg-background mt-3 rounded-2xl border border-neutral-200 p-4"
        >
          <Text className="text-foreground text-sm font-bold">{section.title}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} className="text-muted mt-2 text-xs leading-5">
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((bullet) => (
            <View key={bullet} className="mt-2 flex-row">
              <Text className="text-sage-deep mr-2 text-xs leading-5">•</Text>
              <Text className="text-muted flex-1 text-xs leading-5">{bullet}</Text>
            </View>
          ))}
        </View>
      ))}

      <View className="bg-mint mt-3 rounded-2xl p-4">
        <View className="flex-row items-center gap-2">
          <ShieldCheck size={16} color={SAGE} strokeWidth={2} />
          <Text className="text-sage-deep text-sm font-bold">有疑問或要回報違規？</Text>
        </View>
        <Text className="text-sage-deep/90 mt-2 text-xs leading-5">
          條款內容、帳號處置或違規回報，都可以透過站內表單或電子郵件與我們聯絡。
        </Text>
        <Text selectable className="text-sage-deep mt-2 text-xs font-semibold">
          {SUPPORT_EMAIL}
        </Text>
        <View className="mt-3 flex-row gap-2">
          <Button size="sm" className="flex-1" onPress={() => router.push('/contact')}>
            <Button.Label>用站內表單聯絡</Button.Label>
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onPress={openMail}>
            <Button.Label>寄電子郵件</Button.Label>
          </Button>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-center gap-1.5">
        <Mail size={12} color="#9CA3AF" strokeWidth={2} />
        <Text className="text-muted text-2xs">另請參閱隱私權政策了解資料如何被使用</Text>
      </View>

      <Button variant="tertiary" className="mt-2" onPress={() => router.push('/privacy')}>
        <Button.Label>前往隱私權政策</Button.Label>
      </Button>
    </ScrollView>
  );
}
