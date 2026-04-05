export type Locale = 'zh' | 'en'

export const translations = {
  zh: {
    // Header / Steps
    appName: 'RemovebgStranger',
    step1: '上传图片',
    step2: '涂抹人物',
    step3: '下载结果',

    // UploadZone
    heroTitle: '去除照片中的指定人物',
    heroSubtitle: '用画笔涂抹要去除的人物 · AI 智能修复背景 · 背景像素完全保留',
    dropHere: '拖拽图片到这里',
    supportedFormats: '支持 JPG、PNG、WebP',
    chooseImage: '选择图片',
    badge1: '图片不上传服务器',
    badge2: '本地 AI 处理',
    badge3: '处理后立即销毁',
    badge4: '背景像素零修改',

    // ImageEditor
    paintTitle: '涂抹要去除的人物',
    paintSubtitle: '用画笔涂抹想要消除的人物区域，涂完后点击"去除涂抹区域"',
    brushSize: '画笔大小',
    clearRedraw: '清除重画',
    backUpload: '← 重新上传',
    removeArea: '✨ 去除涂抹区域',
    processing: '处理中…',

    // ResultPanel
    successTitle: '处理完成！',
    successSubtitle: '人物已去除，背景像素完全保留',
    originalLabel: '原图',
    resultLabel: '处理结果',
    tipText: 'AI 智能修复背景，人物区域由周围场景像素填充，下载即用',
    processNew: '处理新图片',
    refineAgain: '🖌️ 继续修复',
    downloadPng: '下载 PNG',

    // Footer
    footerText: '🔒 图片仅在本次会话中处理，不存储于任何服务器 · RemovebgStranger',

    // Error
    processFailed: '处理失败，请重试',
  },
  en: {
    // Header / Steps
    appName: 'RemovebgStranger',
    step1: 'Upload',
    step2: 'Paint',
    step3: 'Download',

    // UploadZone
    heroTitle: 'Remove unwanted people from photos',
    heroSubtitle: 'Paint over people to remove them · AI fills the background · Original pixels preserved',
    dropHere: 'Drop image here',
    supportedFormats: 'JPG, PNG, WebP supported',
    chooseImage: 'Choose Image',
    badge1: 'No server upload',
    badge2: 'Local AI processing',
    badge3: 'Deleted after use',
    badge4: 'Background untouched',

    // ImageEditor
    paintTitle: 'Paint over people to remove',
    paintSubtitle: 'Brush over the person you want to remove, then click "Remove Painted Area"',
    brushSize: 'Brush Size',
    clearRedraw: 'Clear & Redo',
    backUpload: '← Re-upload',
    removeArea: '✨ Remove Painted Area',
    processing: 'Processing…',

    // ResultPanel
    successTitle: 'Done!',
    successSubtitle: 'Person removed, background fully preserved',
    originalLabel: 'Original',
    resultLabel: 'Result',
    tipText: 'AI intelligently fills the background using surrounding pixels. Ready to download.',
    processNew: 'Process New Photo',
    refineAgain: '🖌️ Refine Again',
    downloadPng: 'Download PNG',

    // Footer
    footerText: '🔒 Images are processed locally and never stored on any server · RemovebgStranger',

    // Error
    processFailed: 'Processing failed, please try again',
  },
} as const

export type TranslationKey = keyof typeof translations['zh']
