# Surface and Mode

Primary surface: brand-marketing（品牌識別 + 產品內狀態插圖）
Secondary overlay: product-ui（空狀態、庫存徽章旁）
Mode: direction（換掉綠十字這個 metaphor）

Target specialist: 自己以 SVG 實作（無 imagegen 工具；風格因此限定為
扁平幾何，這是限制也是與現有設計系統相容的選擇）
Deliverable: 吉祥物 + 四種狀態 + icon/OG 應用
Dimensions: 16 / 32 / 64 / 180px；OG 1200×630
Must remain unchanged:
- 單一綠 #0B7A3E + 墨色 #1A2420，不新增第二個彩色
- 直角（tailwind borderRadius:none）
- 不引入紅／黃警示色（stock.ts 明文）
- 徽章字符 ● ○ ？ 的語意不可改寫
