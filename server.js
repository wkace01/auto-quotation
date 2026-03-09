const express = require('express');
const cors = require('cors');
const XlsxPopulate = require('xlsx-populate');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// LibreOffice 실행 경로 (운영 환경(Linux)에서는 전역 명령어 'soffice' 사용)
const SOFFICE_PATH = process.platform === 'win32'
    ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
    : 'soffice';

// Excel 템플릿 경로
const TEMPLATE_PATH = path.join(__dirname, '정보통신사업부 견적서 양식_ver1.xlsx');
// 임시 파일 저장 디렉토리
const TEMP_DIR = path.join(__dirname, 'temp_pdf');

// ── PDF에 포함할 시트 목록 (순서대로 출력됨) ─────────────────────
// 이 목록에 없는 시트는 PDF에서 제외됩니다.
const OUTPUT_SHEETS = [
    '표지',
    '1. 견적서',
    '2.1 성능점검 산출내역',
    '2.2 유지점검 산출내역',
    '2.3 선임 산출내역',
    '3. 업무처리 절차',
    '4. 성능점검 수량내역',
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 정적 파일(프론트엔드 HTML, JS, CSS) 제공
app.use(express.static(path.join(__dirname, 'public')));

// 임시 폴더 생성
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ── POST /generate-pdf ────────────────────────────────────────────
// 흐름: JSON 수신 → xlsx 템플릿에 셀 입력 → 불필요 시트 제거
//       → LibreOffice로 전체 변환 (남은 시트 = 원하는 시트만) → PDF 다운로드
app.post('/generate-pdf', async (req, res) => {
    const timestamp = Date.now();
    const tempXlsx = path.join(TEMP_DIR, `quotation_${timestamp}.xlsx`);
    const expectedPdf = tempXlsx.replace('.xlsx', '.pdf');

    try {
        const { templateName, outputSheets, data } = req.body;

        // 호환성 보장: 구버전 (data만 바로 보내는 경우) 방어 로직
        const actualData = data || req.body;
        const actualTemplate = templateName || '정보통신사업부 견적서 양식_ver1.xlsx';

        // 시트 목록이 명시되지 않으면, 프론트에서 보낸 data의 key(시트명) 배열을 출력 대상으로 간주
        const actualSheets = outputSheets || Object.keys(actualData);

        if (!actualData || typeof actualData !== 'object') {
            return res.status(400).json({ error: '유효하지 않은 JSON 데이터입니다.' });
        }

        const templatePath = path.join(__dirname, actualTemplate);
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: `지정된 템플릿 파일(${actualTemplate})을 찾을 수 없습니다.` });
        }

        // ── STEP 1: 템플릿 로드 (xlsx-populate) ──
        const workbook = await XlsxPopulate.fromFileAsync(templatePath);
        console.log(`📂 [${actualTemplate}] 로드 완료 (시트 수: ${workbook.sheets().length}개)`);

        // ── STEP 2: 출력 대상이 아닌 시트 숨김 (veryHidden) ──
        let removedCount = 0;
        workbook.sheets().forEach(sheet => {
            if (!actualSheets.includes(sheet.name())) {
                sheet.hidden('very');
                removedCount++;
            }
        });
        console.log(`🗂️  시트 처리: 출력 대상 ${actualSheets.length}개, 숨김 ${removedCount}개`);

        // ── STEP 3: JSON → 각 시트 셀에 값 입력 ──────────────────
        for (const [sheetName, cells] of Object.entries(actualData)) {
            const sheet = workbook.sheet(sheetName);
            if (!sheet) {
                console.warn(`⚠️  시트 없음: "${sheetName}"`);
                continue;
            }
            if (!Array.isArray(cells)) continue;

            let filled = 0;
            for (const { cell, value } of cells) {
                if (!cell) continue;
                try {
                    const ws_cell = sheet.cell(cell);
                    ws_cell.formula(undefined);
                    ws_cell.value(value);
                    filled++;
                } catch (e) {
                    console.warn(`⚠️  [${sheetName}] 셀 쓰기 실패 (${cell}): ${e.message}`);
                }
            }
            console.log(`  ✏️  [${sheetName}] ${filled}개 셀 입력`);
        }

        // ── STEP 4: 임시 xlsx 저장 ───────────────────────────────
        await workbook.toFileAsync(tempXlsx);
        console.log(`💾 임시 xlsx 저장 완료`);

        // ── STEP 5: LibreOffice로 PDF 변환 ───────────────────────
        const cmd = `"${SOFFICE_PATH}" --headless --convert-to pdf --outdir "${TEMP_DIR}" "${tempXlsx}"`;
        console.log(`🔄 LibreOffice 변환 중...`);
        execSync(cmd, { timeout: 90000 });

        if (!fs.existsSync(expectedPdf)) {
            throw new Error('PDF 변환 실패: 출력 파일이 생성되지 않았습니다.');
        }

        // ── STEP 6: PDF 파일명 동적 생성 ──────────────────────────────
        const customerName = (() => {
            try {
                // 1. 견적서 시트가 없을 수도 있으므로, 전달받은 데이터의 첫 배열에서 고객명 탐색
                for (const cells of Object.values(actualData)) {
                    if (Array.isArray(cells)) {
                        const found = cells.find(c => c.name === '고객명');
                        if (found && found.value) return String(found.value).replace(/[/\\?%*:|"<>]/g, '_');
                    }
                }
                return '견적서';
            } catch { return '견적서'; }
        })();
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const fileName = `${customerName}_견적서_${today}.pdf`;

        // ── STEP 7: PDF 응답 ─────────────────────────────────────
        console.log(`📤 응답 전송: ${fileName}`);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.sendFile(expectedPdf, {}, (err) => {
            cleanup(tempXlsx, expectedPdf);
            if (err && err.code !== 'ECONNABORTED') console.error('파일 전송 오류:', err);
        });

    } catch (err) {
        console.error('❌ 오류:', err.message);
        cleanup(tempXlsx, expectedPdf);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

// ── GET /health ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        outputSheets: OUTPUT_SHEETS,
        libreoffice: SOFFICE_PATH,
        template: TEMPLATE_PATH,
    });
});

function cleanup(...files) {
    for (const f of files) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { }
    }
}

app.listen(PORT, () => {
    console.log(`🚀 PDF 생성 서버 실행 중 → http://localhost:${PORT} (xlsx-populate 적용본)`);
    console.log(`   출력 시트: ${OUTPUT_SHEETS.join(', ')}`);
    console.log(`   템플릿: ${TEMPLATE_PATH}`);
});
