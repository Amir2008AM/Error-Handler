#!/usr/bin/env python3
"""
Multi-language OCR Pipeline
Primary:  PaddleOCR (80+ languages, best accuracy)
Fallback: Tesseract
"""
import sys, json, os
from pathlib import Path

# Language mapping: our codes → PaddleOCR codes
LANG_MAP = {
    'ara': 'arabic',
    'eng': 'en',
    'fra': 'fr',
    'deu': 'german',
    'spa': 'es',
    'ita': 'it',
    'por': 'pt',
    'rus': 'ru',
    'chi': 'ch',
    'chi_sim': 'ch',
    'chi_tra': 'chinese_cht',
    'jpn': 'japan',
    'kor': 'korean',
    'tur': 'tr',
    'hin': 'hi',
    'ara+eng': 'arabic',
}

TESSERACT_MAP = {
    'arabic': 'ara',
    'en':     'eng',
    'fr':     'fra',
    'german': 'deu',
    'es':     'spa',
    'it':     'ita',
    'pt':     'por',
    'ru':     'rus',
    'ch':     'chi_sim',
    'japan':  'jpn',
    'korean': 'kor',
    'tr':     'tur',
    'hi':     'hin',
}

def detect_language(image_path: str) -> str:
    """Auto-detect language from image using langdetect."""
    try:
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(image_path), lang='eng+ara+fra+deu')
        if len(text.strip()) < 10:
            return 'en'
        from langdetect import detect
        detected = detect(text)
        lang_to_paddle = {
            'ar': 'arabic', 'en': 'en', 'fr': 'fr',
            'de': 'german', 'es': 'es', 'it': 'it',
            'pt': 'pt', 'ru': 'ru', 'zh-cn': 'ch',
            'zh-tw': 'ch', 'ja': 'japan', 'ko': 'korean',
            'tr': 'tr', 'hi': 'hi',
        }
        return lang_to_paddle.get(detected, 'en')
    except Exception:
        return 'en'

def preprocess_image(image_path: str) -> str:
    """Preprocess image for better OCR accuracy."""
    try:
        import cv2
        import numpy as np
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        # Scale up small images
        h, w = img.shape[:2]
        if w < 1500:
            scale = 1500 / w
            img = cv2.resize(img, None, fx=scale, fy=scale,
                             interpolation=cv2.INTER_CUBIC)
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        # Sharpen
        kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        # Save preprocessed
        out_path = image_path + '_preprocessed.jpg'
        cv2.imwrite(out_path, sharpened)
        return out_path
    except Exception:
        return image_path

def run_paddleocr(image_path: str, lang: str = 'en') -> dict:
    """Run PaddleOCR on image."""
    from paddleocr import PaddleOCR
    paddle_lang = LANG_MAP.get(lang, lang)
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang=paddle_lang,
        use_gpu=False,
        show_log=False,
        enable_mkldnn=False,
    )
    result = ocr.ocr(image_path, cls=True)
    if not result or not result[0]:
        return {'success': False, 'error': 'No text detected'}
    lines = []
    total_conf = 0.0
    count = 0
    for line in result[0]:
        if line and len(line) >= 2:
            text = line[1][0]
            conf = float(line[1][1])
            if conf > 0.3 and text.strip():
                lines.append(text)
                total_conf += conf
                count += 1
    if not lines:
        return {'success': False, 'error': 'Low confidence — no usable text'}
    avg_conf = total_conf / count if count > 0 else 0
    text = '\n'.join(lines)
    return {
        'success': True,
        'text': text,
        'confidence': round(avg_conf, 2),
        'wordCount': len(text.split()),
        'engine': f'paddleocr-{paddle_lang}',
        'language': paddle_lang,
    }

def run_tesseract_fallback(image_path: str, lang: str = 'en') -> dict:
    """Tesseract fallback."""
    import pytesseract
    from PIL import Image
    tess_lang = TESSERACT_MAP.get(lang, 'eng')
    config = '--oem 1 --psm 3'
    text = pytesseract.image_to_string(
        Image.open(image_path),
        lang=tess_lang,
        config=config,
    )
    text = text.strip()
    if not text:
        raise RuntimeError('Tesseract returned empty text')
    return {
        'success': True,
        'text': text,
        'confidence': 0.6,
        'wordCount': len(text.split()),
        'engine': f'tesseract-{tess_lang}',
        'language': lang,
    }

def clean_text(text: str) -> str:
    """Clean OCR output."""
    import re
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        arabic = len(re.findall(r'[\u0600-\u06FF]', line))
        latin  = len(re.findall(r'[a-zA-Z]', line))
        digits = len(re.findall(r'\d', line))
        total  = len(line.replace(' ', ''))
        if total == 0:
            continue
        meaningful = arabic + latin + digits
        if meaningful / total < 0.3 and total > 3:
            continue
        cleaned.append(line)
    result = '\n'.join(cleaned)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: paddle_ocr.py image_path [lang] [--auto-detect]'
        }))
        sys.exit(1)

    image_path = sys.argv[1]
    lang_arg   = sys.argv[2] if len(sys.argv) > 2 else 'auto'
    auto_detect = '--auto-detect' in sys.argv or lang_arg == 'auto'

    preprocessed = preprocess_image(image_path)

    # Auto-detect language if requested
    if auto_detect:
        paddle_lang = detect_language(preprocessed)
    else:
        paddle_lang = LANG_MAP.get(lang_arg, lang_arg)

    # Try PaddleOCR first
    try:
        result = run_paddleocr(preprocessed, paddle_lang)
        if result['success'] and result.get('confidence', 0) >= 0.55:
            result['text'] = clean_text(result['text'])
            print(json.dumps(result))
            return
    except Exception as e1:
        pass

    # Fallback to Tesseract
    try:
        result = run_tesseract_fallback(preprocessed, paddle_lang)
        result['text'] = clean_text(result['text'])
        print(json.dumps(result))
    except Exception as e2:
        print(json.dumps({
            'success': False,
            'error': f'All OCR engines failed: {str(e2)[:200]}'
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
