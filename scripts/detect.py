#!/usr/bin/env python3
"""
detect.py — 用 YOLOv8-seg 检测图片中的所有人物实例
输入: 图片路径 (argv[1])
输出: JSON { persons: [ { id, bbox:[x1n,y1n,x2n,y2n], mask:[[0/1,...]] } ] }
"""
import sys, json, numpy as np
from pathlib import Path
from PIL import Image
from ultralytics import YOLO

def main():
    img_path = sys.argv[1]
    img = Image.open(img_path).convert("RGB")
    W, H = img.size

    model = YOLO("yolov8n-seg.pt")  # 首次运行自动下载 ~6MB
    results = model(img_path, classes=[0], verbose=False)  # class 0 = person

    persons = []
    result = results[0]

    if result.masks is None or len(result.masks) == 0:
        print(json.dumps({"persons": []}))
        return

    for i, (box, mask_xy) in enumerate(zip(result.boxes, result.masks.xy)):
        # bbox 归一化
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        bbox = [x1/W, y1/H, x2/W, y2/H]

        # 掩码: 多边形 -> 二值矩阵 (缩小到 1/4 分辨率节省传输)
        scale = 4
        mW, mH = W // scale, H // scale
        from PIL import ImageDraw
        mask_img = Image.new("L", (mW, mH), 0)
        draw = ImageDraw.Draw(mask_img)
        pts = [(x / scale, y / scale) for x, y in mask_xy]
        if len(pts) >= 3:
            draw.polygon(pts, fill=255)
        mask_arr = (np.array(mask_img) > 127).astype(np.uint8).tolist()

        persons.append({"id": i, "bbox": bbox, "mask": mask_arr})

    print(json.dumps({"persons": persons}))

if __name__ == "__main__":
    main()
