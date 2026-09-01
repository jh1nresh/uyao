import { DemoBanner } from "@/components/DemoBanner";
import { LocationProvider } from "@/components/LocationProvider";

/**
 * 消費端（找藥產品）共用外框。試營運橫幅與定位 context 只屬於這裡 ——
 * 公司資訊頁有自己的版型；只有 consumer 路徑套用資料狀態橫幅與定位 context。
 */
export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <DemoBanner />
      <LocationProvider>{children}</LocationProvider>
    </div>
  );
}
