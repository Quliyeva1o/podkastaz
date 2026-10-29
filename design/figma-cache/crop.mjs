// One-off: cuts the 8 service illustrations out of the Figma sprite and trims the logo PNGs.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const src = "design/assets/figma/549b1b1ff05288d992dfa48c27b6b17b20d8393b.png";
const crops = {
  "studio-icaresi": [0.2076822966337204, 0.0403645858168602, 0.2724609375, 0.1708984375],
  "video-podcast": [0.2076822966337204, 0.27103519439697266, 0.2724609375, 0.1708984375],
  "audio-podcast": [0.2076822966337204, 0.5178427696228027, 0.2724609375, 0.1708984375],
  "montaj": [0.2076822966337204, 0.7583444714546204, 0.2724609375, 0.1708984375],
  "shorts-reels": [0.22296631336212158, 0.02933691255748272, 0.2925122380256653, 0.5410685539245605],
  "podcast-start": [0.2076822966337204, 0.28440508246421814, 0.2724609375, 0.5627792477607727],
  "canli-yayim": [0.2076822966337204, 0.5191407799720764, 0.2724609375, 0.5715702772140503],
  "seyyar-studio": [0.2189578413963318, 0.7487433552742004, 0.2872534692287445, 0.548853874206543],
};
await mkdir("design/assets/services", { recursive: true });
const { width: W, height: H } = await sharp(src).metadata();
for (const [name, [sx, tx, sy, ty]] of Object.entries(crops)) {
  const box = { left: Math.round(tx * W), top: Math.round(ty * H), width: Math.round(sx * W), height: Math.round(sy * H) };
  box.width = Math.min(box.width, W - box.left); box.height = Math.min(box.height, H - box.top);
  await sharp(src).extract(box).png().toFile(`design/assets/services/${name}.png`);
}
await mkdir("design/assets/logo", { recursive: true });
for (const [ref, name] of [["e61add19af3b7f87a51413c77c6b1bc49be486c7", "logo-dark"], ["2f8c019c3a83b65c326b023a6c5f8216ee552701", "logo-white"], ["0077c879dd2a31b6fdf41bc579073ce8e0aa771d", "logo-header"]]) {
  const info = await sharp(`design/assets/figma/${ref}.png`).trim().png().toFile(`design/assets/logo/${name}.png`);
  console.log(name, info.width, info.height);
}
