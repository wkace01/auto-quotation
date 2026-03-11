# 우경정보통신 스마트 견적서 - 프로젝트 주의사항

> **에이전트 필독:** 이 프로젝트에서 작업 시작 전 반드시 이 파일을 읽어두세요.

---

## ⚠️ 인코딩 관련 주의사항 (최다 발생 오류)

### 문제
`public/` 폴더 내 일부 JS 파일들은 과거에 인코딩이 깨진 상태로 저장된 이력이 있습니다.  
깨진 파일을 **부분 수정(replace_file_content)**할 경우, 브라우저에서 JS 파싱 오류가 발생해 **페이지 전체 기능이 중단**됩니다.

### 진단 방법
수정 후 반드시 파싱 검증:
```powershell
node -e "require('./public/constants.js')"   # window is not defined → 정상
node -e "require('./public/common.js')"      # Unexpected number 등 → 파싱 오류
```

### 안전 작업 규칙
1. `view_file`로 파일 열었을 때 한글이 `?곌꼍`, `?뺣낫` 처럼 깨져 있으면 **부분 수정 금지** → 전면 재작성만 가능
2. 정상 인코딩 파일: `public/index.html`, `public/app_step.js`, `public/airtable_service.js`, `public/constants.js` (재작성 이후)
3. **절대 참고 금지:** `test_hosting/` 폴더의 모든 파일 (구버전 + 인코딩 깨진 상태)

---

## 📁 폴더 구조 및 역할

| 폴더/파일 | 역할 | 비고 |
|-----------|------|------|
| `public/` | **메인 환경** - `npm start` 시 서빙 | 항상 이 기준으로 작업 |
| `test_hosting/` | 구버전 테스트 환경 | 인코딩 깨진 미러, 참고 금지 |
| `test_environment/` | 비어있음 | 미사용 |
| `server.js` | Node.js/Express 백엔드 (포트 3001) | |
| `정보통신사업부 견적서 양식_ver1.xlsx` | PDF 생성용 원본 템플릿 | 절대 수정 금지 |

---

## 🚀 로컬 실행

```powershell
# 메인 환경 (public/ 서빙, 포트 3001)
node server.js

# 접속: http://localhost:3001
```

---

## 🔌 외부 API 연동

| 서비스 | 용도 | 키 위치 |
|--------|------|---------|
| 카카오 우편번호 | 1단계 주소 검색 embed | `index.html` 동적 로드 |
| 공공데이터포털 건축물대장 | 연면적/주용도 자동 조회 | `public/common.js` `BUILDING_API_KEY` |
| Airtable | 견적 DB 저장 + PDF 업로드 | 서버 환경변수 `airtable API key` |

---

## 📊 에어테이블 구성

- **Base ID:** `appFEZaTg3yZU1QwW`
- **고객 테이블:** `tbloJO82kbfPy1cgW`
- **견적 테이블:** `tbloif1mheDqaRRuR`
- **PDF 필드 ID:** `fld4Zc6J2Etls5F48`
- API 키는 서버사이드에서만 사용 (`/airtable-proxy` 경유)

---

## 🧩 핵심 파일별 역할 요약

- **`public/constants.js`**: 견적 조건표, 조정계수, 영업담당자 데이터 (window.CONSTANTS)
- **`public/common.js`**: 카카오 주소 embed, 건축물대장 API 공통 모듈 (window.wkCommon)
- **`public/app_step.js`**: 단계별 UI 로직, 견적 계산, PDF 생성 요청 (메인 로직, ~1363줄)
- **`public/airtable_service.js`**: Airtable 고객/견적 CRUD (window.airtableService)
- **`server.js`**: `/generate-pdf`, `/upload-pdf-to-airtable`, `/airtable-proxy` API
