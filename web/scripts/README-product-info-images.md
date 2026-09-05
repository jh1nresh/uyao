# 商品資訊圖片

這個工具匯出產品特色與成分規格的 WebP 資料圖。商品頁目前使用相同 manifest 的結構化內容，以分頁搭配木架主圖呈現，不再堆疊完整資料長圖。
`lib/product-info-content.ts` 以目錄資料組成圖片文字與無障礙逐字稿；
`product-info-image.html` 決定視覺版型。

在 `web/` 執行：

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/build-product-info-images.mjs
npm test -- lib/product-info-content.test.ts
```

使用已安裝的 Playwright；Chrome 預設為 macOS Google Chrome，可用 `CHROME_PATH` 指定。
`PRODUCT_INFO_TMP` 可指定已存在的暫存根目錄。腳本結束會關閉自己的 Chrome 並移除暫存資料。
輸出為 `public/products/info-v2/*.webp` 與 `lib/product-info-images.generated.json`，兩者一起提交。
中文和含量直接排字再匯出，沒有 OCR 或影像模型改寫。更改目錄文字後需重新匯出；測試會比對目錄內容與圖片檔雜湊。

檢查中文、長品名、括號含量、中英文版本和手機放大閱讀。缺少來源的成分不會出圖，未知規格不會推定；沒有特色資料時只產生成分規格圖。
