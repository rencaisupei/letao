import {
  BUMP_COST,
  BUMP_DURATION_LABEL,
  DAILY_CLAIM_AMOUNT,
  DAILY_STREAK_BONUS,
  DAILY_STREAK_CAP,
  LOGISTICS_OPTIONS,
  MAX_LISTING_QUANTITY,
  PAYMENT_METHODS,
  dailyRewardFor,
} from '@/lib/constants';
import { SUPPORT_EMAIL } from '@/lib/support';

export type FaqTopic = 'buying' | 'selling' | 'shipping' | 'payment' | 'dispute' | 'account';

export const FAQ_TOPICS: { code: FaqTopic; label: string }[] = [
  { code: 'buying', label: '買家下單' },
  { code: 'selling', label: '賣家上架' },
  { code: 'shipping', label: '運送與運費' },
  { code: 'payment', label: '付款方式' },
  { code: 'dispute', label: '糾紛與安全' },
  { code: 'account', label: '帳號與 EcoCoins' },
];

export type FaqEntry = {
  id: string;
  topic: FaqTopic;
  question: string;
  /** One paragraph per array item. */
  answer: string[];
  /** Extra words the search box should match, for terms the text does not spell out. */
  keywords?: string[];
};

const SHIPPING_LIST = LOGISTICS_OPTIONS.join('、');
const PAYMENT_LIST = PAYMENT_METHODS.map((item) => `${item.label}（${item.hint}）`);

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'buy-how',
    topic: 'buying',
    question: '要怎麼買一件商品？',
    answer: [
      '在探索首頁或搜尋結果點進商品，往下選擇購買件數、寄送方式、收件縣市與付款方式，再送出出價即可。',
      '訂單成立後賣家會收到通知，你可以在「個人主頁 → 我的交易」追蹤進度，並用私訊和賣家確認出貨或面交細節。',
    ],
    keywords: ['下單', '購買', '出價', '訂單'],
  },
  {
    id: 'buy-lowball',
    topic: 'buying',
    question: '為什麼我的出價被退回，說金額太低？',
    answer: [
      '樂淘有防砍價門檻：全新未拆的商品至少要出到售價的 90%，其他成色至少 80%。',
      '門檻只看商品單價，不含運費。出價畫面會直接顯示這件商品可接受的最低金額，照著填就會通過。',
    ],
    keywords: ['砍價', '殺價', '議價', '最低價'],
  },
  {
    id: 'buy-total',
    topic: 'buying',
    question: '總金額是怎麼算出來的？',
    answer: [
      '總計 = 商品單價 × 件數 + 一次運費。同一筆訂單買多件只收一次運費，面交則不收運費。',
      '訂單成立時的金額由伺服器計算並寫進訂單，之後不會再變動，交易詳情頁看到的就是實際要付的金額。',
    ],
    keywords: ['總計', '運費', '計算'],
  },
  {
    id: 'buy-cancel',
    topic: 'buying',
    question: '訂單成立後可以取消嗎？',
    answer: [
      '在「待完成交付」狀態下，買賣任一方都可以在交易詳情頁按「取消交易」，被佔用的庫存會立刻釋放回商品。',
      '已標記完成的交易無法自行取消。如果是誤按或需要更正紀錄，請用「聯絡我們」附上訂單時間與商品名稱。',
    ],
    keywords: ['取消', '退訂'],
  },
  {
    id: 'buy-complete',
    topic: 'buying',
    question: '什麼時候該按「標記完成交易」？',
    answer: [
      '收到商品、確認內容無誤之後再按。標記完成後商品會計為已售出，買家也才能到賣家主頁留下評價。',
      '還沒拿到東西前請不要先標記完成，那會讓交易紀錄與實際狀況不符，後續處理比較麻煩。',
    ],
    keywords: ['完成', '評價', '收貨'],
  },
  {
    id: 'buy-sold',
    topic: 'buying',
    question: '商品顯示「已預訂」或「已售出」是什麼意思？',
    answer: [
      '代表庫存已被其他進行中或已完成的訂單佔住。已預訂表示還有交易在進行，取消後可能會再開放。',
      '賣家補上庫存後，商品會自動回到「上架中」，你也可以先收藏起來等通知。',
    ],
    keywords: ['預訂', '售出', '缺貨', '庫存'],
  },

  {
    id: 'sell-how',
    topic: 'selling',
    question: '要怎麼上架商品？',
    answer: [
      '在「釋出好物」分頁依序填寫：商品相片、名稱、售價、數量（最多 ' +
        `${MAX_LISTING_QUANTITY}` +
        ' 件）、類別、商品狀況、所在地與出貨縣市、包裝資訊、運送與付款方式，最後寫商品描述。',
      '送出後商品會先進入審核，通過就會出現在探索首頁。審核結果都會發站內通知給你。',
    ],
    keywords: ['刊登', '賣東西', '上架流程'],
  },
  {
    id: 'sell-review',
    topic: 'selling',
    question: '上架後多久才會出現？審核在看什麼？',
    answer: [
      '送出時會先跑禁售關鍵字檢查：命中禁售清單會直接退回並告知原因；命中灰區品項（例如保健食品、刀具、票券、鋰電池）會標記為待人工複審，由管理員確認；其餘商品會立刻上架。',
      '被退回不會扣除任何 EcoCoins，修正描述後可以重新送出。',
    ],
    keywords: ['審核', '待審', '複審', '退回'],
  },
  {
    id: 'sell-banned',
    topic: 'selling',
    question: '哪些東西不能在樂淘賣？',
    answer: [
      '依台灣法規與應用商店規範，下列品項一律禁止：管制藥品與處方藥、菸酒與電子煙、槍械刀械與彈藥、動物活體與保育類製品、仿冒品與盜版、他人個資或帳號、色情與情色服務，以及任何需要特許執照才能販售的商品。',
      '灰區品項（保健食品、二手醫療器材、演唱會票券、行動電源與鋰電池等）不一定禁止，但會由管理員人工複審，請在描述中寫清楚來源與狀況。',
    ],
    keywords: ['禁售', '違禁品', '不能賣', '規範'],
  },
  {
    id: 'sell-stock',
    topic: 'selling',
    question: '賣掉一部分後要怎麼補庫存？',
    answer: [
      '不用重新上架。到「個人主頁」找到那件商品，用商品卡上的庫存調整功能改總數即可，補貨後商品會自動從已售出或已預訂回到上架中。',
      '總數不能低於已成交或已預訂的件數。如果只是暫時不想賣，請改用「暫時下架」。',
    ],
    keywords: ['庫存', '補貨', '數量', '下架'],
  },
  {
    id: 'sell-parcel',
    topic: 'selling',
    question: '包裝資訊一定要填嗎？',
    answer: [
      '不是必填，但填了重量與長寬高，運費才能依實際包裝與買家的收件縣市自動試算。',
      '沒填時系統會以標準小包（1 公斤、30×25×20 公分）估算，實際寄送若超過，差額要自行吸收或事後與買家協調。',
    ],
    keywords: ['重量', '材積', '尺寸', '包裝'],
  },
  {
    id: 'sell-edit',
    topic: 'selling',
    question: '上架後還能修改內容嗎？',
    answer: [
      '可以修改標題、售價、數量、照片、商品描述、運送方式與付款方式，也可以隨時暫時下架。',
      '只有審核判定（通過／退回與退回原因）無法由賣家修改，那是由管理員處理的，避免有人自行放行違規商品。',
    ],
    keywords: ['修改', '編輯', '改價'],
  },

  {
    id: 'ship-methods',
    topic: 'shipping',
    question: '有哪些寄送與交付方式？',
    answer: [
      `目前支援：${SHIPPING_LIST}。`,
      '賣家上架時可以同時勾選多種，買家出價時挑一種。實際能選到哪幾種，取決於那位賣家勾了什麼。',
    ],
    keywords: ['物流', '超商', '宅配', '寄送'],
  },
  {
    id: 'ship-fee-who',
    topic: 'shipping',
    question: '運費是誰決定的？',
    answer: [
      '由賣家決定，而且每一種寄送方式可以各自設定。設定方式有兩種：自動試算（依包裝資訊與買家收件縣市在下單時計算）或自訂固定金額。',
      '商品卡上寫「NT$ x 起」表示那是本島最便宜那一種的基準價，實際金額要選好寄送方式與收件縣市才會確定。',
    ],
    keywords: ['運費', '免運', '試算'],
  },
  {
    id: 'ship-fee-diff',
    topic: 'shipping',
    question: '為什麼結帳看到的運費和商品頁不一樣？',
    answer: [
      '自動試算的運費會隨你的收件縣市變動，離島與花蓮台東通常會加價，包裝較大或較重也會跳到更高的級距。',
      '最終金額一律由伺服器在訂單成立時計算後寫入訂單，賣家與買家都不能事後改動。',
    ],
    keywords: ['離島', '加價', '花東'],
  },
  {
    id: 'ship-cvs',
    topic: 'shipping',
    question: '超商店到店有大小限制嗎？',
    answer: [
      '有。超商店到店限單邊 45 公分以內、長寬高相加 105 公分以內、重量 5 公斤以內，離島另外加價。',
      '超過限制時系統會顯示該方式無法配送，請改用宅配。',
    ],
    keywords: ['7-ELEVEN', '全家', '萊爾富', '蝦皮', '店到店', '限制'],
  },
  {
    id: 'ship-home',
    topic: 'shipping',
    question: '宅配（黑貓宅急便）怎麼計費？',
    answer: [
      '依材積與重量分級距計算，取兩者較貴的一級；離島與花蓮台東會加價；超過 150 公分或 20 公斤不受理。',
      '大型或易碎商品建議在描述中先說明包裝方式，避免買家收到後產生爭議。',
    ],
    keywords: ['黑貓', '宅急便', '大型'],
  },
  {
    id: 'ship-lalamove',
    topic: 'shipping',
    question: 'Lalamove 和面交要注意什麼？',
    answer: [
      'Lalamove 屬於同城即時配送，只有同區域可以送、不含離島，收件時間與地址要先在私訊約好。',
      '面交免運費，請約人潮多、有監視器的公共場所，並先在私訊確認時間；只有面交才能選擇「面交付現」。',
    ],
    keywords: ['Lalamove', '面交', '當面交易', '同城'],
  },
  {
    id: 'ship-tracking',
    topic: 'shipping',
    question: '平台會幫我開托運單或提供追蹤號碼嗎？',
    answer: [
      '不會。樂淘不代開物流單，出貨與取號請賣家自行到超商或物流商辦理。',
      '寄出後請在私訊把單號或寄件時間告知買家，追蹤請用該物流商的官方查詢頁面。',
    ],
    keywords: ['單號', '追蹤', '托運單', '出貨'],
  },

  {
    id: 'pay-methods',
    topic: 'payment',
    question: '可以用哪些付款方式？',
    answer: [
      `買家可選的方式有：${PAYMENT_LIST.join('；')}。`,
      '每件商品實際能選哪幾種，由賣家上架時勾選決定。',
    ],
    keywords: ['付款', '匯款', '轉帳', '貨到付款', 'LinePay', '街口'],
  },
  {
    id: 'pay-escrow',
    topic: 'payment',
    question: '平台會代收款項嗎？',
    answer: [
      '不會。樂淘不代收金流，款項由買賣雙方直接往來，平台不經手也不儲存任何卡號、銀行帳號密碼或支付憑證。',
      '因此平台無法強制退款或凍結款項，付款前請先確認賣家資訊與商品狀況。',
    ],
    keywords: ['代收', '第三方支付', '履約保證', '金流'],
  },
  {
    id: 'pay-unavailable',
    topic: 'payment',
    question: '為什麼有些付款方式我選不到？',
    answer: [
      '付款方式會跟著寄送方式：貨到付款只適用需要寄送的方式，面交付現只適用面交，匯款與行動支付兩者都可以。',
      '此外必須是賣家有勾選的方式才會出現。若都不合用，可以先私訊詢問賣家是否願意新增。',
    ],
    keywords: ['選不到', '灰色', '不能選'],
  },
  {
    id: 'pay-order',
    topic: 'payment',
    question: '應該先付款還是先出貨？',
    answer: [
      '匯款與行動支付通常是買家先付、賣家確認入帳後出貨；如果雙方還不熟悉，建議選貨到付款或面交，風險最低。',
      '不論哪一種，都請保留轉帳明細或收款截圖，發生爭議時是重要憑證。',
    ],
    keywords: ['順序', '先付', '風險'],
  },
  {
    id: 'pay-ecocoins',
    topic: 'payment',
    question: 'EcoCoins 可以折抵商品金額嗎？',
    answer: [
      '不行。EcoCoins 只能用來提升自己商品的曝光排名，不能折抵商品價金或運費，也不能提領或轉讓。',
    ],
    keywords: ['折抵', '點數', 'EcoCoins'],
  },

  {
    id: 'dispute-noresponse',
    topic: 'dispute',
    question: '對方不出貨、不付款或已讀不回怎麼辦？',
    answer: [
      '先在私訊留下明確訊息並約定期限。若對方仍未回應，可以在交易詳情頁取消交易，庫存與商品狀態會自動恢復。',
      '如果已經付款卻沒收到商品，請用「聯絡我們」選擇「交易與運送」，附上訂單時間、商品名稱、付款憑證與私訊截圖，客服會依紀錄協助聯繫並記錄對方的違規。',
    ],
    keywords: ['不出貨', '不付款', '失聯', '糾紛'],
  },
  {
    id: 'dispute-not-as-described',
    topic: 'dispute',
    question: '商品和描述不符，可以退貨退款嗎？',
    answer: [
      '請先保留外包裝與商品照片，並在私訊直接與賣家協商退換方式。因為平台不代收金流，退款需要由賣家直接退還給買家。',
      '若賣家拒不處理，或涉及仿冒、盜版、詐騙，請同時使用商品頁的「檢舉」與「聯絡我們」。管理員可以退回或強制下架該商品、限制違規帳號，並保留處理紀錄。',
    ],
    keywords: ['退貨', '退款', '不符', '瑕疵'],
  },
  {
    id: 'dispute-report',
    topic: 'dispute',
    question: '要怎麼檢舉商品或使用者？',
    answer: [
      '在商品詳情頁選擇檢舉，挑一個原因（疑似違禁或管制商品、仿冒品或盜版、詐騙或假交易、商品資訊不實等）並補充說明。',
      '檢舉內容只有管理員看得到，賣家不會知道是誰檢舉的。成立時商品會被退回或下架，賣家會收到通知。',
    ],
    keywords: ['檢舉', '舉報', '違規'],
  },
  {
    id: 'dispute-scope',
    topic: 'dispute',
    question: '客服在糾紛中可以幫到什麼程度？',
    answer: [
      '客服能做的：調閱訂單與審核紀錄、確認雙方說法、退回或強制下架違規商品、限制重複違規的帳號、協助雙方重新聯繫。',
      '客服不能做的：強制退款、代為保管或撥付款項、提供對方的個人資料。這些受限於平台不經手金流與個資保護規定。',
    ],
    keywords: ['客服', '仲裁', '調解'],
  },
  {
    id: 'dispute-reply-time',
    topic: 'dispute',
    question: '客服多久會回覆？',
    answer: [
      '服務時間為週一至週五 10:00–18:00（台灣時間），依來信順序處理。每 24 小時最多可送出 10 封來信，避免重複投遞反而延後處理。',
      '進度會顯示在「聯絡我們」下方的「我的來信紀錄」：已送出、處理中、已回覆；客服回覆時也會發一則站內通知。',
    ],
    keywords: ['回覆時間', '多久', '進度'],
  },
  {
    id: 'dispute-safety',
    topic: 'dispute',
    question: '有哪些交易安全提醒？',
    answer: [
      '請把溝通紀錄留在站內私訊。被要求改用其他通訊軟體、先付訂金、代刷代匯、或提供銀行密碼與驗證碼，幾乎都是詐騙。',
      '面交約公共場所並告知親友行程；高價商品建議當場檢查功能與序號後再付款。收到可疑訊息請直接檢舉。',
    ],
    keywords: ['詐騙', '安全', '私下交易', '驗證碼'],
  },

  {
    id: 'account-signin',
    topic: 'account',
    question: '要怎麼註冊或登入？',
    answer: [
      '主要方式是 Email + 密碼。若不想記密碼，也可以改用 Email 驗證碼登入；忘記密碼可用「忘記密碼」取得重設驗證碼後直接設定新密碼。',
      '驗證碼會寄到你的信箱，只有最新一封有效，寄出後 60 秒才能重新寄送。',
    ],
    keywords: ['註冊', '登入', '密碼', '驗證碼'],
  },
  {
    id: 'account-otp',
    topic: 'account',
    question: '收不到驗證碼信件怎麼辦？',
    answer: [
      '先檢查垃圾信匣與促銷信匣，並確認信箱拼字正確；若剛剛才寄過，請等冷卻時間結束再按重新寄送。',
      `仍然收不到的話，直接寄信到 ${SUPPORT_EMAIL} 並告知你要註冊的信箱，我們會協助確認。`,
    ],
    keywords: ['收不到', '信件', '垃圾信'],
  },
  {
    id: 'account-push',
    topic: 'account',
    question: '要怎麼開啟推播通知？收得到哪些提醒？',
    answer: [
      '打開右上角鈴鐺進入通知中心，最上面有「推播通知」開關。第一次開啟時系統會問你要不要允許樂淘傳送通知，允許後就完成註冊。',
      '所有站內通知都會推播：新私訊、有人出價或成立訂單、交易完成或取消、商品審核結果、檢舉處理結果、收到新評價、每日 EcoCoins 入帳，以及客服回覆你的來信。',
      '若你之前按了「不允許」，開關會顯示被系統封鎖，要先到裝置的「設定 → 通知」允許樂淘再回來開啟。關閉推播不影響通知中心，訊息一樣會留在裡面。',
      '在網頁版與 Expo Go 測試環境只能在 App 開著時提醒；安裝正式版或開發版之後才有背景推播。',
    ],
    keywords: ['推播', '通知', '提醒', 'push', '鈴鐺'],
  },
  {
    id: 'account-ecocoins',
    topic: 'account',
    question: 'EcoCoins 怎麼獲得、怎麼使用？',
    answer: [
      `每日簽到可領 ${DAILY_CLAIM_AMOUNT} 枚起，連續簽到每天多 ${DAILY_STREAK_BONUS} 枚，到第 ${DAILY_STREAK_CAP} 天達到上限 ${dailyRewardFor(DAILY_STREAK_CAP)} 枚。中斷後從頭計算。`,
      `用途是「提升商品排名」：一次扣 ${BUMP_COST} 枚，該商品會被推到探索首頁最前排並維持 ${BUMP_DURATION_LABEL}。只有通過審核的商品可以提升。`,
      '餘額由伺服器端控管，App 無法直接修改，也不能提領或轉讓。',
    ],
    keywords: ['簽到', '點數', '提升排名', '置頂'],
  },
  {
    id: 'account-trust',
    topic: 'account',
    question: '信任度是怎麼算的？',
    answer: [
      '新帳號從 80% 開始，之後依買家在完成交易後給的評價調整，顯示在你的賣家主頁與商品卡上。',
      '只有完成過交易的買家才能評價，所以無法刷分。準時出貨、描述誠實是提高信任度最快的方式。',
    ],
    keywords: ['信任度', '評價', '星等'],
  },
  {
    id: 'account-delete',
    topic: 'account',
    question: '要怎麼刪除帳號或個人資料？',
    answer: [
      '請用「聯絡我們」選擇「帳號與登入」提出，確認身分後我們會刪除你的個人檔案、商品與私訊內容。',
      '已完成的交易紀錄、檢舉與審核紀錄，為處理爭議與符合法定義務，可能在必要最小範圍內保留。詳細說明請看隱私權政策。',
    ],
    keywords: ['刪除帳號', '個資', '隱私'],
  },
];

export function faqTopicLabel(topic: FaqTopic): string {
  return FAQ_TOPICS.find((entry) => entry.code === topic)?.label ?? '常見問題';
}

/** Filters by topic, then by a case-insensitive match on question, answer and keywords. */
export function searchFaq(query: string, topic: FaqTopic | null): FaqEntry[] {
  const scoped = topic ? FAQ_ENTRIES.filter((entry) => entry.topic === topic) : FAQ_ENTRIES;
  const needle = query.trim().toLowerCase();
  if (needle === '') return scoped;

  return scoped.filter((entry) => {
    const haystack = [
      entry.question,
      ...entry.answer,
      ...(entry.keywords ?? []),
      faqTopicLabel(entry.topic),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/** How many questions each topic holds, for the filter chips. */
export function faqTopicCount(topic: FaqTopic): number {
  return FAQ_ENTRIES.filter((entry) => entry.topic === topic).length;
}
