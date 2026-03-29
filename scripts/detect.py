#!/usr/bin/env python3
"""
detect.py — 用 YOLOv8-seg 检测图片中的所有人物实例
输入: 图片路径 (argv[1])
输出: JSON { persons: [ { id, bbox:[x1n,y1n,x2n,y2n], mask:[[0/1,...]] } ] }
"""
import sys, json, numpy as np, os
from PIL import Image, ImageDraw
from ultralytics import YOLO

def main():
    img_path = sys.argv[1]
    img = Image.open(img_path).convert("RGB")
    W, H = img.size

    # 强制关闭 YOLO 的所有终端输出，避免 ANSI 码污染 stdout
    os.environ["YOLO_VERBOSE"] = "False"
    model = YOLO("yolov8n-seg.pt")

    # verbose=False + redirect stderr，确保 stdout 只有 JSON
    import io
    old_stderr = sys.stderr
    sys.stderr = io.StringIO()
    try:
        results = model(img_path, classes=[0], verbose=False, stream=False)
    finally:
        sys.stderr = old_stderr

    persons = []
    result = results[0]

    if result.masks is None or len(result.masks) == 0:
        sys.stdout.write(json.dumps({"persons": []}) + "\n")
        return

    for i, (box, mask_xy) in enumerate(zip(result.boxes, result.masks.xy)):
        # bbox 归一化
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        bbox = [x1/W, y1/H, x2/W, y2/H]

        # 掩码多边形 -> 二值矩阵，缩小到 1/4 分辨率（提升精度，之前是 1/8）
        scale = 4
        mW, mH = max(1, W // scale), max(1, H // scale)
        mask_img = Image.new("L", (mW, mH), 0)
        draw = ImageDraw.Draw(mask_img)
        pts = [(x / scale, y / scale) for x, y in mask_xy]
        if len(pts) >= 3:
            draw.polygon(pts, fill=255)
        mask_arr = (np.array(mask_img) > 127).astype(np.uint8).tolist()

        persons.append({"id": i, "bbox": bbox, "mask": mask_arr})

    # 只写一次，确保 stdout 干净
    sys.stdout.write(json.dumps({"persons": persons}) + "\n")

if __name__ == "__main__":
    main()
