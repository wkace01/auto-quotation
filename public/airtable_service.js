/**
 * Airtable Integration Service for Quotation Automation (Proxy-Only Version)
 * All sensitive requests go through /airtable-proxy on the server.
 */

const AIRTABLE_CONFIG = {
    BASE_ID: 'appFEZaTg3yZU1QwW',
    TABLE_CUSTOMER: 'tbloJO82kbfPy1cgW', // 고객
    TABLE_QUOTATION: 'tbloif1mheDqaRRuR', // 견적
};

// 백엔드 서버 URL 설정 (로컬 환경 vs 실제 배포 환경 자동 구분)
const BACKEND_URL = (window.location.port === '3000' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001'
    : '';

const PROXY_URL = `${BACKEND_URL}/airtable-proxy`;

window.airtableService = {
    /**
     * 1. 고객 저장/수정, 견적 기록 및 PDF 업로드 통합 실행
     */
    saveQuotation: async (state) => {
        try {
            console.log('[Airtable] Starting integrated save process...');
            
            // 1) 고객 Upsert
            const customerId = await window.airtableService.upsertCustomer(state);
            
            // 2) 견적 기록 생성
            const quotationResult = await window.airtableService.createQuotation(customerId, state);
            const quotationId = quotationResult.id;

            // 3) PDF 생성 및 업로드 (서버에 위임)
            console.log(`[Airtable] Requesting PDF upload for Record: ${quotationId}`);
            const mapping = window.generateMapping ? window.generateMapping() : null;
            
            if (mapping) {
                const uploadRes = await fetch(`${BACKEND_URL}/upload-pdf-to-airtable`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mapping,
                        airtableInfo: {
                            baseId: AIRTABLE_CONFIG.BASE_ID,
                            recordId: quotationId
                        }
                    })
                });

                if (!uploadRes.ok) {
                    const errData = await uploadRes.json();
                    console.error('[Airtable] PDF upload failed:', errData.error);
                } else {
                    console.log('[Airtable] PDF upload requested and successful');
                }
            }
            
            return { success: true, customerId, quotationId };
        } catch (error) {
            console.error('[Airtable] Overall process error:', error);
            throw error;
        }
    },

    /**
     * 2. 시/군 단위 지역 추출 (수원, 인천 등)
     */
    extractRegion: (address) => {
        if (!address) return '';
        const parts = address.split(' ');
        if (parts.length < 1) return '';
        const first = parts[0];

        const metroMap = {
            '서울특별시': '서울', '인천광역시': '인천', '부산광역시': '부산', '대구광역시': '대구',
            '대전광역시': '대전', '광주광역시': '광주', '울산광역시': '울산', '세종특별자치시': '세종',
            '세종시': '세종'
        };
        if (metroMap[first]) return metroMap[first];

        const shortMetros = ['서울', '인천', '부산', '대구', '대전', '광주', '울산', '세종'];
        for (const m of shortMetros) {
            if (first.startsWith(m)) return m;
        }

        // 경기도 수원시 -> 수원
        if (parts.length > 1) {
            return parts[1].replace(/[시군]$/, '');
        }

        return first.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, '');
    },

    /**
     * 3. 고객 정보 Upsert (Proxy 사용)
     */
    upsertCustomer: async (state) => {
        const { address, roadAddress, buildingName, floorArea, useAprDay, purpose, manager, managerPhone, managerPosition, managerMobile, managerEmail, jibunAddress, zonecode } = state;
        
        const targetAddress = roadAddress || address;
        const formula = `AND({건물명}='${buildingName.replace(/'/g, "\\'")}', {도로명 주소}='${targetAddress.replace(/'/g, "\\'")}')`;
        const searchUrl = `${PROXY_URL}/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_CUSTOMER}?filterByFormula=${encodeURIComponent(formula)}`;

        const response = await fetch(searchUrl);
        const data = await response.json();

        // 연락처 자동 분류
        let finalPhone = managerPhone || '';
        let finalMobile = managerMobile || '';

        if (finalPhone && finalPhone.startsWith('010') && !finalMobile) {
            finalMobile = finalPhone;
            finalPhone = '';
        } else if (finalMobile && !finalMobile.startsWith('010') && !finalPhone) {
            finalPhone = finalMobile;
            finalMobile = '';
        }

        const fields = {
            "건물명": buildingName,
            "도로명 주소": targetAddress,
            "지번 주소": jibunAddress || '',
            "우편번호": zonecode || '',
            "지역": window.airtableService.extractRegion(targetAddress),
            "연면적(㎡)": floorArea,
            "주용도": purpose ? [purpose] : [],
            "사용승인일": useAprDay || null,
            "담당자": manager || '',
            "담당자 직함": managerPosition || '',
            "전화번호": finalPhone,
            "휴대전화": finalMobile,
            "이메일": managerEmail || ''
        };

        if (data.records && data.records.length > 0) {
            const recordId = data.records[0].id;
            await fetch(`${PROXY_URL}/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_CUSTOMER}/${recordId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields, typecast: true })
            });
            return recordId;
        } else {
            const createRes = await fetch(`${PROXY_URL}/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_CUSTOMER}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields, typecast: true })
            });
            const createData = await createRes.json();
            if (createData.error) throw new Error(createData.error.message);
            return createData.id;
        }
    },

    /**
     * 4. 견적 기록 생성 (Proxy 사용)
     */
    createQuotation: async (customerId, state) => {
        const { results, salesManager, itemToggles, maintenanceFrequency, appointmentFrequency } = state;
        
        const serviceTypes = [];
        if (itemToggles.inspection) serviceTypes.push("성능");
        if (itemToggles.maintenance) serviceTypes.push("유지");
        if (itemToggles.appointment) serviceTypes.push("위탁선임");

        const today = new Date().toISOString().split('T')[0];

        const fields = {
            "고객 고유 ID": [customerId],
            "견적 금액": results.costs.yearly,
            "서비스 유형": serviceTypes,
            "영업 담당자": salesManager || null,
            "견적서 발송일": today
        };

        if (itemToggles.maintenance) {
            fields["유지 점검 횟수"] = maintenanceFrequency || "2회";
        }
        if (itemToggles.appointment) {
            fields["위탁 선임 횟수"] = appointmentFrequency || "12개월";
        }

        const response = await fetch(`${PROXY_URL}/${AIRTABLE_CONFIG.BASE_ID}/${AIRTABLE_CONFIG.TABLE_QUOTATION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields, typecast: true })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to create quotation record');
        }

        return await response.json();
    }
};
