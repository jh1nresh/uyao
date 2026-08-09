import { DemoBanner } from "@/components/DemoBanner";
import { LocationProvider } from "@/components/LocationProvider";

/**
 * 消費端（找藥產品）共用外框。試營運橫幅與定位 context 只屬於這裡 ——
 * 公司 landing（/）有自己的誠實狀態行，不套消費端的資料狀態橫幅。
 */
export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner />
      <LocationProvider>{children}</LocationProvider>
    </>
  );
}
