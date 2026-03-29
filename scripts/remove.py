#!/usr/bin/env python3
"""
remove.py — 使用 iopaint (LaMa 模型) 智能修复背景
iopaint 的 LaMa 实现比 simple-lama-inpainting 更精准，支持更大图片和更细致的参数控制。
输入: argv[1]=图片路径, argv[2]=masks JSON 临时文件路径
输出: PNG 二进制写入 stdout
"""
import sys, json, numpy as np, io, cv2
import torch
from PIL import Image

def main():
    img_path = sys.argv[1]
    masks_file = sys.argv[2]

    with open(masks_file, "r") as f:
        masks_json = json.load(f)

    img = Image.open(img_path).convert("RGB")
    W, H = img.size

    # 合并所有选中的掩码
    combined_mask = np.zeros((H, W), dtype=np.uint8)

    for mask_data in masks_json:
        mask_small = np.array(mask_data, dtype=np.uint8)
        mask_img = Image.fromarray(mask_small * 255, mode="L").resize((W, H), Image.BILINEAR)
        mask_full = np.array(mask_img) > 127
        combined_mask[mask_full] = 255

    # 膨胀掩码，覆盖人物边缘（含发丝/阴影）
    kernel_large = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    combined_mask = cv2.dilate(combined_mask, kernel_large, iterations=3)
    combined_mask = cv2.GaussianBlur(combined_mask, (21, 21), 0)
    _, combined_mask = cv2.threshold(combined_mask, 30, 255, cv2.THRESH_BINARY)

    mask_pil = Image.fromarray(combined_mask, mode="L")

    # 使用 iopaint LaMa 进行高质量 inpainting
    from iopaint.model_manager import ModelManager
    from iopaint.schema import InpaintRequest, HDStrategy, LDMSampler

    device = torch.device("cpu")
    model_manager = ModelManager(name="lama", device=device)

    config = InpaintRequest(
        hd_strategy=HDStrategy.CROP,          # CROP 策略：对大图分块处理，效果更好
        hd_strategy_crop_margin=196,           # 更大的裁剪边距，减少拼接痕迹
        hd_strategy_crop_trigger_size=512,     # 超过 512px 就启用 HD 策略
        hd_strategy_resize_limit=1280,
        ldm_sampler=LDMSampler.plms,
    )

    img_np = np.array(img)                           # [H, W, 3] RGB
    mask_np = np.array(mask_pil)[:, :, np.newaxis]   # [H, W, 1]

    result = model_manager(img_np, mask_np, config)   # 返回 BGR
    result_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
    result_img = Image.fromarray(result_rgb)

    # 确保输出尺寸与输入一致
    if result_img.size != (W, H):
        result_img = result_img.resize((W, H), Image.LANCZOS)

    buf = io.BytesIO()
    result_img.save(buf, format="PNG")
    sys.stdout.buffer.write(buf.getvalue())

if __name__ == "__main__":
    main()
