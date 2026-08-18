// 把貨架實拍洗成乾淨的商品圖：抓出前景商品，換掉背景，其餘像素不動。
//
//   swift scripts/packshot-cleanup.swift in.png out.png \
//       [--bg RRGGBB] [--pad 0.08] [--largest] \
//       [--crop x,y,w,h] [--highlights 0..1] [--exposure EV]
//
// 用 macOS 內建的 Vision（VNGenerateForegroundInstanceMaskRequest），不裝任何
// 套件。**只換背景、不動商品本身** —— 包裝上的字樣、標章、顏色都是原照片的
// 像素，所以產出仍然算 packshot，不是重繪。
//
// 校正只還原照片裡已經存在的資訊（曝光、亮部、裁切），不新增任何內容。被反光
// 洗掉或被裁出畫面的印刷一律走重拍，不在這裡補 —— 憑空生出法規標示等同偽造。
//
// 去背失敗（找不到前景）時直接非零退出，不要默默吐一張沒處理的圖 —— 那會讓
// 呼叫端以為洗過了。

import AppKit
import CoreImage
import Foundation
import Vision

struct Args {
    var input = ""
    var output = ""
    var background = CIColor(red: 0.949, green: 0.937, blue: 0.902) // #F2EFE6
    var pad = 0.08
    var largestOnly = false
    /// 來源先裁一刀（x,y,w,h，0–1 的比例）。用來丟掉同框的其他東西，
    /// 例如憶元素那張倒放的瓶子。裁切不改變包裝內容，屬允許操作。
    var crop: [Double]? = nil
    /// CIHighlightShadowAdjust 的 highlightAmount，1 = 不動，越小壓越多亮部。
    var highlights: Double? = nil
    var exposure: Double? = nil
}

func parseArgs() -> Args {
    var a = Args()
    var rest: [String] = []
    var i = 1
    let argv = CommandLine.arguments
    while i < argv.count {
        switch argv[i] {
        case "--bg":
            i += 1
            let hex = argv[i].replacingOccurrences(of: "#", with: "")
            var v: UInt64 = 0
            Scanner(string: hex).scanHexInt64(&v)
            a.background = CIColor(red: CGFloat((v >> 16) & 0xff) / 255,
                                   green: CGFloat((v >> 8) & 0xff) / 255,
                                   blue: CGFloat(v & 0xff) / 255)
        case "--largest":
            // 貨架照常常把隔壁商品一起算成前景。只留最大的那一塊。
            a.largestOnly = true
        case "--crop":
            i += 1
            let parts = argv[i].split(separator: ",").compactMap { Double($0) }
            if parts.count == 4 { a.crop = parts }
        case "--highlights":
            i += 1
            a.highlights = Double(argv[i])
        case "--exposure":
            i += 1
            a.exposure = Double(argv[i])
        case "--pad":
            i += 1
            a.pad = Double(argv[i]) ?? 0.08
        default:
            rest.append(argv[i])
        }
        i += 1
    }
    guard rest.count >= 2 else {
        FileHandle.standardError.write("用法：packshot-cleanup.swift in out [--bg RRGGBB] [--pad 0.08]\n".data(using: .utf8)!)
        exit(2)
    }
    a.input = rest[0]
    a.output = rest[1]
    return a
}

let args = parseArgs()
let ctx = CIContext()

guard var src = CIImage(contentsOf: URL(fileURLWithPath: args.input)) else {
    FileHandle.standardError.write("讀不到來源圖：\(args.input)\n".data(using: .utf8)!)
    exit(1)
}

// ── 0. 校正：先裁、再還原亮部與曝光，都在去背之前 ────────────────
if let c = args.crop {
    let e = src.extent
    // CoreImage 原點在左下，參數用左上比例比較好指，所以 y 要翻。
    let box = CGRect(x: e.minX + CGFloat(c[0]) * e.width,
                     y: e.minY + CGFloat(1 - c[1] - c[3]) * e.height,
                     width: CGFloat(c[2]) * e.width,
                     height: CGFloat(c[3]) * e.height).intersection(e)
    src = src.cropped(to: box).transformed(
        by: CGAffineTransform(translationX: -box.minX, y: -box.minY))
}
if let h = args.highlights, let f = CIFilter(name: "CIHighlightShadowAdjust") {
    f.setValue(src, forKey: kCIInputImageKey)
    f.setValue(h, forKey: "inputHighlightAmount")
    if let o = f.outputImage { src = o.cropped(to: src.extent) }
}
if let ev = args.exposure, let f = CIFilter(name: "CIExposureAdjust") {
    f.setValue(src, forKey: kCIInputImageKey)
    f.setValue(ev, forKey: kCIInputEVKey)
    if let o = f.outputImage { src = o.cropped(to: src.extent) }
}

// ── 1. 前景遮罩 ────────────────────────────────────────────────
let handler = VNImageRequestHandler(ciImage: src, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
do {
    try handler.perform([request])
} catch {
    FileHandle.standardError.write("Vision 失敗：\(error)\n".data(using: .utf8)!)
    exit(1)
}
guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
    FileHandle.standardError.write("找不到前景商品，這張要手動處理\n".data(using: .utf8)!)
    exit(1)
}

var instances = observation.allInstances
if args.largestOnly, instances.count > 1 {
    var best = instances.first!
    var bestArea = -1
    for instance in instances {
        guard let buf = try? observation.generateScaledMaskForImage(
            forInstances: [instance], from: handler) else { continue }
        let img = CIImage(cvPixelBuffer: buf)
        guard let cg = ctx.createCGImage(img, from: img.extent),
              let data = cg.dataProvider?.data,
              let ptr = CFDataGetBytePtr(data) else { continue }
        let bpr = cg.bytesPerRow, bpp = cg.bitsPerPixel / 8
        var area = 0
        for y in stride(from: 0, to: cg.height, by: 4) {
            for x in stride(from: 0, to: cg.width, by: 4) where ptr[y * bpr + x * bpp] > 40 {
                area += 1
            }
        }
        if area > bestArea { bestArea = area; best = instance }
    }
    instances = [best]
}

let maskBuffer = try observation.generateScaledMaskForImage(
    forInstances: instances, from: handler)
var mask = CIImage(cvPixelBuffer: maskBuffer)
// 遮罩尺寸偶爾與來源差一兩個像素，對齊避免邊緣露出背景。
if mask.extent.size != src.extent.size {
    mask = mask.transformed(by: CGAffineTransform(
        scaleX: src.extent.width / mask.extent.width,
        y: src.extent.height / mask.extent.height))
}

// ── 2. 合成到單色背景 ──────────────────────────────────────────
let bg = CIImage(color: args.background).cropped(to: src.extent)
guard let blend = CIFilter(name: "CIBlendWithMask") else { exit(1) }
blend.setValue(src, forKey: kCIInputImageKey)
blend.setValue(bg, forKey: kCIInputBackgroundImageKey)
blend.setValue(mask, forKey: kCIInputMaskImageKey)
guard var out = blend.outputImage else { exit(1) }

// ── 3. 裁到商品範圍再留白邊 ────────────────────────────────────
// 商品在貨架照裡通常偏一邊，直接輸出原尺寸會有一大片空背景。
let maskCG = ctx.createCGImage(mask, from: mask.extent)
if let cg = maskCG, let data = cg.dataProvider?.data, let ptr = CFDataGetBytePtr(data) {
    let w = cg.width, h = cg.height
    let bpr = cg.bytesPerRow, bpp = cg.bitsPerPixel / 8
    var minX = w, minY = h, maxX = 0, maxY = 0
    for y in stride(from: 0, to: h, by: 2) {
        for x in stride(from: 0, to: w, by: 2) {
            if ptr[y * bpr + x * bpp] > 40 {
                minX = min(minX, x); maxX = max(maxX, x)
                minY = min(minY, y); maxY = max(maxY, y)
            }
        }
    }
    if minX < maxX && minY < maxY {
        let sx = src.extent.width / CGFloat(w), sy = src.extent.height / CGFloat(h)
        // Vision 的遮罩原點在左上，CoreImage 在左下 —— y 要翻過來。
        var box = CGRect(x: CGFloat(minX) * sx,
                         y: src.extent.height - CGFloat(maxY) * sy,
                         width: CGFloat(maxX - minX) * sx,
                         height: CGFloat(maxY - minY) * sy)
        let pad = max(box.width, box.height) * CGFloat(args.pad)
        box = box.insetBy(dx: -pad, dy: -pad).intersection(src.extent)
        out = out.cropped(to: box)
    }
}

// ── 4. 輸出 ───────────────────────────────────────────────────
let rep = NSBitmapImageRep(ciImage: out)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: args.output))
print("\(args.output)  \(Int(out.extent.width))×\(Int(out.extent.height))")
