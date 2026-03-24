#!/usr/bin/env python3
"""
remove.py — 将选中人物掩码区域置为透明
输入: argv[1]=图片路径, argv[2]=JSON掩码列表(每个元素为二值矩阵), argv[3]=原图宽, argv[4]=原图高
输出: PNG 二进制写入 stdout
"""
import sys, json, numpy as np
from PIL import Image
import io

def main():
    img_path = sys.argv[1]
    masks_json = json.loads(sys.argv[2])  # list of 2D mask arrays (1/4 scale)

    img = Image.open(img_path).convert("RGBA")
    W, H = img.size
    img_arr = np.array(img)

    for mask_data in masks_json:
        mask_small = np.array(mask_data, dtype=np.uint8)
        mH, mW = mask_small.shape
        # 上采样回原图尺寸
        mask_img = Image.fromarray(mask_small * 255, mode="L").resize((W, H), Image.NEAREST)
        mask_full = np.array(mask_img) > 127
        # 将选中区域 alpha 置 0
        img_arr[mask_full, 3] = 0

    result = Image.fromarray(img_arr, mode="RGBA")
    buf = io.BytesIO()
    result.save(buf, format="PNG")
    sys.stdout.buffer.write(buf.getvalue())

if __name__ == "__main__":
    main()
