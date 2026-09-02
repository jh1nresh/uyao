import { LocationProvider } from "@/components/LocationProvider";

/**
 * 消費端（找藥產品）共用外框。公司資訊頁有自己的版型；只有 consumer
 * 路徑套用定位 context。
 */
export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <LocationProvider>{children}</LocationProvider>
    </div>
  );
}
