# Additional cabinet illustrations

21 product illustrations generated with the built-in imagegen tool on 2026-09-05, using the existing `/products/{slug}.webp` product illustration and `/products/shelf-scenes-v2/greenplus-elgucare.webp` as the cabinet style reference. The original 8 shelf scenes remain in v2; `lib/product-showcase.ts` resolves all 29 illustrated products.

These are product illustrations, not independently verified packaging photographs. The catalog's source and pharmacist-confirmation disclosures remain authoritative. Images do not supply ingredient, dose, stock or suitability data.

Prompt template:

> One landscape 3:2 shelf catalog illustration for {slug}. Image 1 product identity: preserve package colors, proportions, exact main label. Remove editorial footer outside package. Image 2 SHELF STYLE ONLY: warm oak cubby, side uprights, back panel, floor/front lip, warm directional light and contact shadows. Replace all reference products with only image 1 package centered physically resting on shelf, filling 70–78% height or width without distortion. No extra products, props, additional text, invented claims or watermark.

The Bio-Stand composition received one correction to show the entire package and the shelf below it. All final assets are 1200 × 800 WebP, exported at quality 88. Coverage is checked by `lib/product-shelf-coverage.test.ts`.
