import { Linking, ScrollView, Text, View } from 'react-native';
import { Button } from 'heroui-native';
import { Stack, router } from 'expo-router';
import { Lock, Mail, ShieldCheck } from 'lucide-react-native';

import { SAGE } from '@/lib/constants';
import { POLICY_UPDATED_AT, SUPPORT_EMAIL } from '@/lib/support';

type Section = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const SECTIONS: Section[] = [
  {
    title: '一、我們收集哪些資料',
    paragraphs: ['易拍通（以下稱「本平台」）只收集提供二手交易服務所必要的資料：'],
    bullets: [
      '帳號資料：電子郵件地址與登入密碼。密碼經加密保管，平台人員無法看到明文。',
      '個人檔案：暱稱、頭像、個人簡介、買賣身分、信任度與評價。',
      '商品資料：標題、描述、價格、數量、照片、包裝重量與尺寸、可寄送方式、可接受的付款方式，以及您自行填寫的面交縣市與地點描述。',
      '交易紀錄：訂單成立時間、單價、數量、運費、寄送方式、收件縣市、付款方式與完成或取消紀錄。',
      '互動內容：站內私訊、評價、收藏、檢舉內容與您寄給客服的訊息。',
      'EcoCoins 紀錄：簽到、提升排名等點數增減紀錄。',
      '技術資料：裝置類型、作業系統版本、App 版本與錯誤紀錄，用於排除故障。',
      '推播識別碼：您開啟推播通知時，會儲存該裝置的推播 token、裝置型號與平台，只用來傳送與您有關的通知；關閉推播或登出時立即刪除。',
    ],
  },
  {
    title: '二、我們不會收集的資料',
    paragraphs: [
      '本平台不取得您的精確定位（App 內已無地圖與定位功能），面交地點一律由您自行以文字填寫。',
      '本平台不代收金流，買賣雙方直接完成付款，因此我們不會收集或儲存您的信用卡號、銀行帳號密碼或任何支付憑證。',
    ],
  },
  {
    title: '三、資料如何被使用',
    paragraphs: ['我們僅在下列目的內使用您的資料：'],
    bullets: [
      '建立與維護帳號、驗證身分、寄送登入驗證碼。',
      '刊登商品、計算運費、成立訂單、扣減庫存、寄送交易與審核通知。',
      '上架內容審核：以禁售關鍵字規則篩檢商品文字，必要時由管理員人工複審，以符合台灣法規與應用商店規範。',
      '維護交易安全：處理檢舉、識別重複違規與異常帳號。',
      '客服往來：回覆您透過「聯絡我們」或電子郵件提出的問題。',
      '改善產品：以彙總或匿名的方式了解功能使用情形。',
    ],
  },
  {
    title: '四、誰看得到什麼',
    paragraphs: [],
    bullets: [
      '公開可見：暱稱、頭像、個人簡介、信任度、收到的評價，以及通過審核且未下架的商品內容與照片。',
      '僅交易雙方可見：私訊內容、訂單細節、收件縣市與付款方式。',
      '僅管理員可見：您的帳號電子郵件、審核與檢舉紀錄、客服來信內容。管理作業在獨立的網頁後台進行，並記錄處理人與時間。',
      '請注意：商品照片屬於公開內容，上架前請避免拍到身分證、門牌、車牌、住址或他人臉部等資訊。',
    ],
  },
  {
    title: '五、委外與第三方服務',
    paragraphs: ['為提供服務，下列類型的服務商會在必要範圍內處理資料：'],
    bullets: [
      '雲端資料庫與檔案儲存：存放帳號、商品資料與您上傳的照片。',
      '電子郵件寄送服務：寄送註冊、登入與密碼重設的驗證碼。',
      '內容審核服務：商品的標題與描述可能被送交人工智慧服務判讀是否違規（目前此語意判讀功能為關閉狀態，僅以關鍵字規則篩檢），送出的內容不含您的姓名、電子郵件或聯絡方式。',
      '網頁版使用統計：以匿名方式記錄頁面瀏覽與操作事件，用於了解流程是否順暢。',
      '推播傳送服務：由 Expo 推播服務將通知送到您的裝置，傳送內容為通知標題與摘要，不含密碼或支付資訊。',
    ],
  },
  {
    title: '六、我們不做的事',
    paragraphs: [
      '我們不販售、不出租您的個人資料，也不將您的資料提供給第三方用於行銷或廣告投放。除依法配合司法或主管機關要求，或為保護生命、身體、財產安全所必要外，不會向外部揭露。',
    ],
  },
  {
    title: '七、保存期限與刪除',
    paragraphs: [],
    bullets: [
      '您刪除商品時，該商品與相關收藏紀錄會一併移除，此動作無法復原。',
      '您可以隨時透過「聯絡我們」要求刪除帳號；我們會刪除個人檔案、商品與私訊內容。',
      '已完成的交易紀錄、檢舉與審核紀錄，為處理爭議與符合法定義務，可能在必要最小範圍內保留。',
    ],
  },
  {
    title: '八、您的權利',
    paragraphs: [
      '依個人資料保護法，您可以查詢、閱覽、請求補充或更正、請求停止蒐集處理利用，以及請求刪除您的個人資料。暱稱、頭像、簡介與身分可在「編輯個人資料」自行修改；其他請求請透過「聯絡我們」提出，我們會在確認身分後處理。',
    ],
  },
  {
    title: '九、資料安全與本機儲存',
    paragraphs: [
      '所有連線都以加密方式傳輸，資料庫以列級權限控管，確保您只能讀取自己的訂單、私訊與客服紀錄。登入狀態會保存在您的裝置上（App 為裝置儲存空間，網頁版為瀏覽器儲存空間），登出後即清除。',
    ],
  },
  {
    title: '十、未成年人',
    paragraphs: [
      '未滿十八歲者使用本平台交易，應事先取得法定代理人同意。若我們得知帳號由未取得同意的未成年人建立，將暫停該帳號。',
    ],
  },
  {
    title: '十一、政策更新',
    paragraphs: [
      '本政策如有修改，將於本頁公告並更新生效日期。涉及重大變更時，我們會另以站內通知提醒您。',
    ],
  },
];

function openMail() {
  void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('個資相關請求')}`);
}

export default function PrivacyScreen() {
  return (
    <ScrollView
      className="bg-canvas flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: '隱私權政策' }} />

      <View className="bg-background rounded-2xl border border-neutral-200 p-5">
        <View className="flex-row items-center gap-2">
          <ShieldCheck size={18} color={SAGE} strokeWidth={2} />
          <Text className="text-foreground text-base font-bold">易拍通隱私權政策</Text>
        </View>
        <Text className="text-muted mt-2 text-[12px] leading-5">
          本政策說明易拍通如何蒐集、使用與保護您的個人資料。註冊帳號或使用本平台服務，即表示您已閱讀並同意本政策。
        </Text>
        <Text className="text-sage-deep mt-3 text-[11px] font-semibold">
          生效日期：{POLICY_UPDATED_AT}
        </Text>
      </View>

      {SECTIONS.map((section) => (
        <View
          key={section.title}
          className="bg-background mt-3 rounded-2xl border border-neutral-200 p-5"
        >
          <Text className="text-foreground text-[13px] font-bold">{section.title}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} className="text-muted mt-2 text-[12px] leading-5">
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((bullet) => (
            <View key={bullet} className="mt-2 flex-row">
              <Text className="text-sage-deep mr-2 text-[12px] leading-5">•</Text>
              <Text className="text-muted flex-1 text-[12px] leading-5">{bullet}</Text>
            </View>
          ))}
        </View>
      ))}

      <View className="bg-mint mt-3 rounded-2xl p-5">
        <View className="flex-row items-center gap-2">
          <Mail size={16} color={SAGE} strokeWidth={2} />
          <Text className="text-sage-deep text-[13px] font-bold">個資相關請求與聯絡方式</Text>
        </View>
        <Text className="text-sage-deep/90 mt-2 text-[12px] leading-5">
          查詢、更正或刪除個人資料，以及任何隱私相關問題，都可以透過站內表單或電子郵件與我們聯絡。
        </Text>
        <Text selectable className="text-sage-deep mt-2 text-[12px] font-semibold">
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
        <Lock size={12} color="#9CA3AF" strokeWidth={2} />
        <Text className="text-muted text-[11px]">連線與資料儲存皆採加密傳輸</Text>
      </View>
    </ScrollView>
  );
}
