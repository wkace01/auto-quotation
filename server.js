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

// Excel 템플릿 경로 (현재 폴더에 있는 파일명)
const TEMPLATE_PATH = path.join(__dirname, '정보통신사업부 견적서 양식_ver1.xlsx');
// 임시 파일 저장 디렉토리
const TEMP_DIR = path.join(__dirname, 'temp_pdf');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 정적 파일(프론트엔드 HTML, JS, CSS) 제공
app.use(express.static(path.join(__dirname, 'public')));

// 임시 폴더 생성
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * ── POST /generate-pdf ──────────────────────────────────────────── (단순 생성 및 다운로드 전용)
 */
app.post('/generate-pdf', async (req, res) => {
    const timestamp = Date.now();
    const tempXlsx = path.join(TEMP_DIR, `quotation_${timestamp}.xlsx`);
    const expectedPdf = tempXlsx.replace('.xlsx', '.pdf');

    try {
        const { templateName, outputSheets, data } = req.body;
        const actualData = data || req.body;
        const actualTemplate = templateName || '정보통신사업부 견적서 양식_ver1.xlsx';
        const actualSheets = outputSheets || Object.keys(actualData);

        const workbook = await XlsxPopulate.fromFileAsync(path.join(__dirname, actualTemplate));
        workbook.sheets().forEach(sheet => {
            if (!actualSheets.includes(sheet.name())) sheet.hidden('very');
        });

        for (const [sheetName, cells] of Object.entries(actualData)) {
            const sheet = workbook.sheet(sheetName);
            if (!sheet || !Array.isArray(cells)) continue;
            for (const { cell, value } of cells) {
                if (cell) {
                    const ws_cell = sheet.cell(cell);
                    ws_cell.formula(undefined);
                    ws_cell.value(value);
                }
            }
        }

        await workbook.toFileAsync(tempXlsx);
        execSync(`"${SOFFICE_PATH}" --headless --convert-to pdf --outdir "${TEMP_DIR}" "${tempXlsx}"`, { timeout: 90000 });

        if (!fs.existsSync(expectedPdf)) throw new Error('PDF 변환 실패');

        const customerName = (() => {
            try {
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

        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.sendFile(expectedPdf, {}, (err) => { cleanup(tempXlsx, expectedPdf); });

    } catch (err) {
        console.error('❌ PDF 생성 오류:', err.message);
        cleanup(tempXlsx, expectedPdf);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

/**
 * ── POST /upload-pdf-to-airtable ────────────────────────────────────────── (PDF 생성 후 에어테이블 직접 업로드)
 */
app.post('/upload-pdf-to-airtable', async (req, res) => {
    const timestamp = Date.now();
    const tempXlsx = path.join(TEMP_DIR, `upload_${timestamp}.xlsx`);
    const expectedPdf = tempXlsx.replace('.xlsx', '.pdf');

    try {
        const { mapping, airtableInfo } = req.body;
        const { baseId, recordId } = airtableInfo;
        const token = process.env['airtable API key'] || process.env.AIRTABLE_API_KEY; // 사용자가 명시한 정확한 키 우선 사용

        if (!token) throw new Error('서버 환경 변수(airtable API key)가 설정되지 않았습니다.');

        const workbook = await XlsxPopulate.fromFileAsync(TEMPLATE_PATH);
        const actualSheets = Object.keys(mapping);
        workbook.sheets().forEach(sheet => {
            if (!actualSheets.includes(sheet.name())) sheet.hidden('very');
        });

        for (const [sheetName, cells] of Object.entries(mapping)) {
            const sheet = workbook.sheet(sheetName);
            if (!sheet || !Array.isArray(cells)) continue;
            for (const { cell, value } of cells) {
                if (cell) {
                    const ws_cell = sheet.cell(cell);
                    ws_cell.formula(undefined);
                    ws_cell.value(value);
                }
            }
        }
        await workbook.toFileAsync(tempXlsx);
        execSync(`"${SOFFICE_PATH}" --headless --convert-to pdf --outdir "${TEMP_DIR}" "${tempXlsx}"`, { timeout: 90000 });

        if (!fs.existsSync(expectedPdf)) throw new Error('PDF 생성 실패');

        const pdfBuffer = fs.readFileSync(expectedPdf);
        const base64Pdf = pdfBuffer.toString('base64');
        const fileName = (mapping["1. 견적서"]?.find(c => c.name === '고객명')?.value || '견적서') + '_견적서.pdf';

        const fieldId = "fld4Zc6J2Etls5F48"; 
        const uploadUrl = `https://content.airtable.com/v0/${baseId}/${recordId}/${fieldId}/uploadAttachment`;
        
        const airRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contentType: 'application/pdf',
                file: base64Pdf,
                filename: fileName
            })
        });

        const airData = await airRes.json();
        if (!airRes.ok) throw new Error(airData.error?.message || '업로드 실패');

        res.json({ success: true, airData });

    } catch (err) {
        console.error('❌ 업로드 오류:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        cleanup(tempXlsx, expectedPdf);
    }
});

/**
 * ── ANY /airtable-proxy ────────────────────────────────────────────────── (보안 프록시)
 */
app.all('/airtable-proxy/*', async (req, res) => {
    const queryStr = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    const targetUrl = `https://api.airtable.com/v0/${req.params[0]}${queryStr}`;
    const token = process.env['airtable API key'] || process.env.AIRTABLE_API_KEY;

    if (!token) return res.status(500).json({ error: '서버에 에어테이블 API 키가 설정되지 않았습니다.' });

    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method)) fetchOptions.body = JSON.stringify(req.body);

        const airRes = await fetch(targetUrl, fetchOptions);
        const airData = await airRes.json();
        res.status(airRes.status).json(airData);
    } catch (err) {
        console.error('❌ 프록시 오류:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * ── GET /health ─────────────────────────────────────────────────── (상태 체크)
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        envCheck: !!(process.env['airtable API key'] || process.env.AIRTABLE_API_KEY),
        time: new Date().toLocaleString()
    });
});

function cleanup(...files) {
    for (const f of files) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { }
    }
}

app.listen(PORT, () => {
    console.log(`🚀 서버 실행 중 → http://localhost:${PORT}`);
});
