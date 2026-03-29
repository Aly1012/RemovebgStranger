#!/usr/bin/env python3
"""
remove.py — 使用 iopaint (LaMa 模型) 智能修复背景
输入: argv[1]=图片路径, argv[2]=mask 图片路径（黑底白色=需消除区域）
输出: PNG 二进制写入 stdout
"""
import sys, numpy as np, io, cv2
import torch
from PIL import Image

def main():
    img_path = sys.argv[1]
    mask_path = sys.argv[2]

    img = Image.open(img_path).convert("RGB")
    orig_W, orig_H = img.size

    # 读取 mask（黑底白色区域=要消除）
    mask_pil = Image.open(mask_path).convert("L")

    # 将 mask 缩放到与图片一致
    if mask_pil.size != (orig_W, orig_H):
        mask_pil = mask_pil.resize((orig_W, orig_H), Image.BILINEAR)

    # 转 numpy 做膨胀处理（让边缘更干净）
    mask_np = np.array(mask_pil)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))
    mask_np = cv2.dilate(mask_np, kernel, iterations=2)

    # 超过 1200px 先缩小处理，完成后放大回原尺寸（大幅减少 CPU 处理时间）
    MAX_DIM = 1200
    W, H = orig_W, orig_H
    if max(W, H) > MAX_DIM:
        scale = MAX_DIM / max(W, H)
        new_W, new_H = int(W * scale), int(H * scale)
        img = img.resize((new_W, new_H), Image.LANCZOS)
        mask_np_small = cv2.resize(mask_np, (new_W, new_H), interpolation=cv2.INTER_LINEAR)
        W, H = new_W, new_H
    else:
        mask_np_small = mask_np

    # 二值化 mask
    _, mask_bin = cv2.threshold(mask_np_small, 127, 255, cv2.THRESH_BINARY)

    # 使用 iopaint LaMa 进行高质量 inpainting
    from iopaint.model_manager import ModelManager
    from iopaint.schema import InpaintRequest, HDStrategy, LDMSampler

    device = torch.device("cpu")
    model_manager = ModelManager(name="lama", device=device)

    config = InpaintRequest(
        hd_strategy=HDStrategy.CROP,
        hd_strategy_crop_margin=196,
        hd_strategy_crop_trigger_size=512,
        hd_strategy_resize_limit=1280,
        ldm_sampler=LDMSampler.plms,
        sd_keep_unmasked_area=False,  # 关闭，自己手动合并背景，避免维度 bug
    )

    img_np = np.array(img)   # [H, W, 3] RGB
    # iopaint 期望 mask 是 2D [H, W]，值 0=保留 255=修复
    result_bgr = model_manager(img_np, mask_bin, config)  # 返回 BGR

    # 将 inpaint 结果转回 RGB
    result_rgb = cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB)

    # 手动合并：未涂抹区域用原图，涂抹区域用 inpaint 结果
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    mask_f = mask_bin.astype(np.float32) / 255.0          # [H, W] 0.0~1.0
    mask_3 = mask_f[:, :, np.newaxis]                     # [H, W, 1]
    result_rgb_merged = (result_rgb * mask_3 + img_np * (1 - mask_3)).astype(np.uint8)

    result_img = Image.fromarray(result_rgb_merged)

    # 放大回原始尺寸
    if result_img.size != (orig_W, orig_H):
        result_img = result_img.resize((orig_W, orig_H), Image.LANCZOS)

    buf = io.BytesIO()
    result_img.save(buf, format="PNG")
    sys.stdout.buffer.write(buf.getvalue())

if __name__ == "__main__":
    main()
