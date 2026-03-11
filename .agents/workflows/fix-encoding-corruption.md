---
description: JS 파일 인코딩 깨짐으로 페이지가 아무것도 안 동작할 때 진단 및 수정하는 방법
---

## 증상

- `public/` 폴더의 JS 파일(특히 `constants.js`, `common.js`)을 편집한 후
- 브라우저에서 페이지를 열면 카카오 검색창, 버튼 클릭 등 **JS 기능 전체가 작동 안 함**
- 브라우저 콘솔에는 에러가 아예 없거나, 스크립트 로드 자체가 막힌 상태
- 가장 흔한 원인: 에이전트가 **인코딩이 깨진 파일**을 부분 수정했을 때 내부에 `Unexpected number`, `Invalid or unexpected token` 등의 파싱 오류가 발생

## 1단계: 파싱 오류 파일 찾기

```powershell
# 프로젝트 루트에서 실행
node -e "
const fs = require('fs');
const files = ['public/constants.js','public/common.js','public/app_step.js','public/airtable_service.js','public/data.js'];
files.forEach(f => {
  try { require('./'+f); console.log('OK:', f); }
  catch(e) { console.error('ERR:', f, '-', e.message); }
});
"
```

**`window is not defined`** → 정상 (브라우저 전용 코드)  
**`Unexpected number`, `Invalid or unexpected token` 등** → 해당 파일 파싱 오류, 재작성 필요

## 2단계: 원본 파일 상태 확인

```powershell
# 인코딩 깨진 문자 확인 (물음표나 ?, 등 깨진 글자가 있으면 문제)
Get-Content .\public\constants.js -Encoding UTF8 | Select-String -Pattern '\?'
```

## 3단계: 파싱 오류 파일 재작성

깨진 파일은 **전면 재작성**이 가장 확실합니다. `write_to_file` 도구로 `Overwrite: true`로 새로 씁니다.

### constants.js 재작성 시 포함해야 할 항목

```
window.CONSTANTS = {
    QUOTATION_CONDITIONS: [...],   // 면적별 견적 조건 (초급/중급/고급/특급)
    ADJUSTMENT_COEFFICIENTS: [...], // 조정계수 표
    SALES_MANAGERS: [...],          // 영업 담당자 및 연락처
    GRADE_STYLES: {...},            // 등급별 색상
    GRADE_WAGES: {...},             // 등급별 노임단가
    GRADE_ORDER: [...],             // 등급 순서 배열
    COND_RANGE_LABELS: {...}        // 구간 레이블 표시
};
```

> 최신 기준값은 `public/index.html`의 영업담당자 `<select>`와 README.md를 참고

## 예방 방법

1. **인코딩이 이미 깨진 파일을 편집하지 말 것**  
   → 수정 전 `view_file`로 파일 내용 확인 시 한글이 `?곌꼍` 같은 형태면 해당 파일은 재작성 대상

2. **파일 수정 후 파싱 검증 실행**  
   → 항상 `node -e "require('./public/XXX.js')"` 로 파싱 오류 없는지 확인

3. **안전하게 수정하려면 `test_hosting/` 기준이 아닌 `public/` 기준으로만 작업**  
   → `test_hosting/`의 파일들은 인코딩이 깨진 구버전이므로 해당 파일을 `public/`에 복사하거나 기반으로 편집 금지
