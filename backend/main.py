from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os
import json
import google.generativeai as genai

# --- Google Gemini API 설정 ---
# 주의: 실제 배포 시에는 환경 변수(os.environ)로 관리하는 것이 보안상 좋습니다.
GOOGLE_API_KEY = "AIzaSyC3cEAA1VXaulqXjjcVuw2AM3HKXqlaD7s"  # <- 여기에 API 키를 입력하세요
genai.configure(api_key=GOOGLE_API_KEY)

# Gemini 모델 설정 (응답 속도가 빠른 flash 모델 권장)
model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI(
    title="Studia Backend API",
    description="OCR 및 Gemini AI 문제 생성 기능이 포함된 백엔드입니다.",
    version="2.0.0"
)

# --- CORS 설정 ---
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """PDF에서 텍스트를 추출하는 하이브리드 함수 (PyMuPDF + OCR)"""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        full_text = []
        
        for page in doc:
            text = page.get_text()
            if len(text.strip()) >= 50:
                full_text.append(text)
            else:
                # 텍스트 부족 시 이미지 OCR 수행
                pix = page.get_pixmap(dpi=300)
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                try:
                    ocr_text = pytesseract.image_to_string(img, lang='kor+eng')
                    full_text.append(ocr_text)
                except:
                    pass # OCR 실패 시 무시
                    
        return "\n".join(full_text)
    except Exception as e:
        print(f"텍스트 추출 오류: {e}")
        return ""

def calculate_question_count(text_length: int) -> int:
    """텍스트 길이에 따라 문제 수 결정 (6의 배수, 최대 18문제)"""
    if text_length < 1000: return 6
    elif text_length < 3000: return 12
    else: return 18

def generate_quiz_with_gemini(text: str):
    """추출된 텍스트를 바탕으로 Gemini를 이용해 구조화된 문제(JSON) 생성"""
    
    # 1. 문제 수 및 비율 계산
    total_q = calculate_question_count(len(text))
    choice_cnt = total_q // 2
    short_cnt = total_q // 3
    essay_cnt = total_q - (choice_cnt + short_cnt)

    # 2. 프롬프트 작성 (요약 요청 추가)
    prompt = f"""
    당신은 전문적인 학습 튜터 AI입니다. 아래 제공된 텍스트 내용을 바탕으로 
    1. 전체 내용을 3~5문장으로 핵심 요약(summary)하고,
    2. 학습자의 이해도를 점검할 수 있는 시험 문제(questions)를 만들어주세요.
    
    [제약 사항]
    1. 총 {total_q}문제를 출제하세요.
       - 객관식: {choice_cnt}문제
       - 주관식(단답형): {short_cnt}문제
       - 서술형: {essay_cnt}문제
    2. 문제는 반드시 한국어로 작성하세요.
    3. 결과는 오직 **순수한 JSON 객체** 형태만 반환하세요. (마크다운 ```json 제외)
    
    [JSON 데이터 구조 예시]
    {{
      "summary": "이 문서는 ...에 대한 내용을 다루고 있습니다. 주요 개념으로는 ...가 있으며, 결론적으로 ...를 강조합니다.",
      "questions": [
        {{
          "id": 1,
          "type": "choice",
          "question": "문제 내용...",
          "options": ["보기1", "보기2", "보기3", "보기4"],
          "answer": 0,
          "explanation": "해설...",
          "pdfRef": "참조 페이지 또는 키워드"
        }},
        ...
      ]
    }}

    [분석할 텍스트]
    {text[:15000]} 
    """

    try:
        # 3. Gemini API 호출
        response = model.generate_content(prompt)
        response_text = response.text.strip()

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        # 4. JSON 파싱
        data = json.loads(response_text)
        return data # { summary: "", questions: [] } 반환

    except Exception as e:
        print(f"Gemini 문제 생성 오류: {e}")
        return {"summary": "요약 생성 실패", "questions": []}

@app.post("/upload")
async def upload_and_generate(file: UploadFile = File(...)):
    """
    통합 엔드포인트: PDF 업로드 -> 텍스트 추출 -> AI 문제 생성 -> JSON 반환
    """
    # 1. 파일 검증
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
    
    # 2. 파일 읽기 및 텍스트 추출
    contents = await file.read()
    extracted_text = extract_text_from_pdf(contents)
    
    if not extracted_text:
        return {"message": "텍스트 추출 실패", "summary": "", "questions": []}

    # 3. Gemini를 이용한 문제 생성
    try:
        ai_data = generate_quiz_with_gemini(extracted_text)
        
        return {
            "filename": file.filename,
            "message": "문제 생성 성공",
            "text_summary": ai_data.get("summary", "요약 없음"), # 진짜 AI 요약 반환
            "questions": ai_data.get("questions", [])
        }
    except Exception as e:
        return {"message": f"오류 발생: {str(e)}", "summary": "", "questions": []}