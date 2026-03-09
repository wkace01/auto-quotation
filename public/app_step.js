// ---- Master Data ----
// 출처: 정보통신 견적 조건표 (이미지 기준)
// monthlyAppointment: 선임위탁 월 단가, yearlyAppointment: 선임위탁 년간
// yearlyMaintenance: 유지점검 년간, yearlyInspection: 성능점검 년간

const QUOTATION_CONDITIONS = [
    // 5,000이상 ~ 10,000미만: 초급
    { area: 5000, grade: "초급", monthlyAppointment: 80000, yearlyAppointment: 960000, yearlyMaintenance: 360000, yearlyInspection: 1080000, inspectionWorkers: 4, maintenanceWorkers: 4 },
    // 10,000이상 ~ 15,000미만: 초급
    { area: 10000, grade: "초급", monthlyAppointment: 80000, yearlyAppointment: 960000, yearlyMaintenance: 405000, yearlyInspection: 1335000, inspectionWorkers: 4, maintenanceWorkers: 4 },
    // 15,000이상 ~ 30,000미만: 중급
    { area: 15000, grade: "중급", monthlyAppointment: 130000, yearlyAppointment: 1560000, yearlyMaintenance: 495000, yearlyInspection: 1245000, inspectionWorkers: 6, maintenanceWorkers: 6 },
    // 30,000이상 ~ 60,000미만: 고급
    { area: 30000, grade: "고급", monthlyAppointment: 150000, yearlyAppointment: 1800000, yearlyMaintenance: 600000, yearlyInspection: 1600000, inspectionWorkers: 8, maintenanceWorkers: 8 },
    // 60,000이상 ~ 150,000미만: 특급
    { area: 60000, grade: "특급", monthlyAppointment: 180000, yearlyAppointment: 2160000, yearlyMaintenance: 1044000, yearlyInspection: 3756000, inspectionWorkers: 10, maintenanceWorkers: 10 },
    // 150,000이상: 특급
    { area: 150000, grade: "특급", monthlyAppointment: 200000, yearlyAppointment: 2400000, yearlyMaintenance: 1035000, yearlyInspection: 3465000, inspectionWorkers: 10, maintenanceWorkers: 10 }
];

const ADJUSTMENT_COEFFICIENTS = [
    // 출처: 연면적에 따른 조정계수 표 (이미지 기준)
    { area: 5000, coef: 1.15 },  // 5,000  이상 ~ 10,000 미만
    { area: 10000, coef: 1.30 },  // 10,000 이상 ~ 15,000 미만
    { area: 15000, coef: 1.45 },  // 15,000 이상 ~ 20,000 미만
    { area: 20000, coef: 1.60 },  // 20,000 이상 ~ 25,000 미만
    { area: 25000, coef: 1.75 },  // 25,000 이상 ~ 30,000 미만
    { area: 30000, coef: 1.90 },  // 30,000 이상 ~ 35,000 미만
    { area: 35000, coef: 2.05 },  // 35,000 이상 ~ 40,000 미만
    { area: 40000, coef: 2.20 },  // 40,000 이상 ~ 45,000 미만
    { area: 45000, coef: 2.35 },  // 45,000 이상 ~ 50,000 미만
    { area: 50000, coef: 2.50 },  // 50,000 이상 ~ 55,000 미만
    { area: 55000, coef: 2.65 },  // 55,000 이상 ~ 60,000 미만
    { area: 60000, coef: 2.80 },  // 60,000 이상
];

const SALES_MANAGERS = [
    { name: "박진철", phone: "010-7130-8285" },
    { name: "임학빈", phone: "010-4259-2044" },
    { name: "공대은", phone: "010-2486-8571" },
    { name: "이태평", phone: "010-3855-3416" },
    { name: "전무승", phone: "010-5269-5357" },
    { name: "김태훈", phone: "010-5393-1308" },
    { name: "이정국", phone: "010-5474-3414" },
    { name: "이승학", phone: "010-2395-5603" },
    { name: "김학수", phone: "010-3255-2473" },
    { name: "김찬진", phone: "010-4101-5891" },
    { name: "신홍민", phone: "010-6550-7169" },
    { name: "한춘교", phone: "010-9162-2995" },
    { name: "박민수", phone: "010-4458-3472" },
    { name: "이우현", phone: "010-2494-4756" },
    { name: "고윤성", phone: "010-2871-5485" }
];

// ---- State ----
const state = {
    customerName: "",
    floorArea: 0,
    address: "",
    buildingName: "",
    purpose: "",
    useAprDay: "",
    manager: "",
    managerPhone: "",
    salesManager: "",
    salesManagerPhone: "",
    selectedEquipments: new Set(),
    condOverride: {},         // 사용자가 수정한 조건표 값 { key: value }
    _lastConditionArea: -1,  // 이전 구간 추적 (구간 변경 시 override 초기화용)
    itemToggles: {
        appointment: true,
        maintenance: true,
        inspection: true
    },
    discount: 0, // 할인율 (%)
    results: {
        grade: "",
        coef: 1,
        inspectionWorkers: 0,
        maintenanceWorkers: 0,
        costs: { inspection: 0, maintenance: 0, appointment: 0, yearly: 0, monthly: 0 }
    }
};

// ---- Grade Classification ----
const GRADE_STYLES = {
    '초급': { color: '#2563eb', label: '초급' },
    '중급': { color: '#16a34a', label: '중급' },
    '고급': { color: '#d97706', label: '고급' },
    '특급': { color: '#dc2626', label: '특급' }
};

// ---- 정보통신기술자 등급별 노임단가 (원/인·일) ----
const GRADE_WAGES = {
    '특급': 330713,
    '고급': 301470,
    '중급': 272298,
    '초급': 234973,
};
const GRADE_ORDER = ['특급', '고급', '중급', '초급'];

// ---- 인건비 산출 헬퍼 ----
// workers: 투입인원, grade: 건물등급 → 해당 등급만 인원 배정, 나머지 0
function calcLaborBreakdown(workers, grade) {
    const rows = GRADE_ORDER.map(g => ({
        grade: g,
        workers: g === grade ? workers : "",         // 해당 등급 아니면 빈칸
        wage: g === grade ? GRADE_WAGES[g] : "",     // 해당 등급 아니면 단가도 빈칸
        amount: g === grade ? workers * GRADE_WAGES[g] : 0,
    }));
    const labor = workers * (GRADE_WAGES[grade] || 0);        // 직접인건비
    const expense = Math.round(labor * 0.1);                     // 직접경비 (인건비×10%)
    const general = Math.round(labor * 1.1);                     // 제경비   (인건비×110%)
    const tech = Math.round((labor + general) * 0.2);         // 기술료   ((인건비+제경비)×20%)
    return {
        rows, labor, expense, general, tech,
        total: labor + expense + general + tech
    };
}


function calcFloorGrade(area) {
    if (!area || area < 5000) return '';   // 5,000㎡ 미만은 해당 없음
    if (area < 15000) return '초급';       // 5,000 이상 ~ 15,000 미만
    if (area < 30000) return '중급';       // 15,000 이상 ~ 30,000 미만
    if (area < 60000) return '고급';       // 30,000 이상 ~ 60,000 미만
    return '특급';                          // 60,000 이상
}

function updateGradeBadge(area) {
    const el = document.getElementById('floor-grade');
    if (!el) return;
    const grade = calcFloorGrade(area);
    if (!grade) {
        el.textContent = '연면적 입력 후 자동 분류';
        el.style.color = 'var(--text-muted)';
        el.style.fontSize = '0.95rem';
        return;
    }
    const style = GRADE_STYLES[grade];
    el.textContent = grade;
    el.style.color = style.color;
    el.style.fontSize = '1.2rem';
}

// ---- Lookup Helpers ----
function lookupCondition(area) {
    // Find the highest bracket the area qualifies for
    let match = null;
    for (const c of QUOTATION_CONDITIONS) {
        if (area >= c.area) match = c;
    }
    return match;
}

function lookupCoef(area) {
    let match = null;
    for (const c of ADJUSTMENT_COEFFICIENTS) {
        if (area >= c.area) match = c;
    }
    return match;
}

// ---- Calculation ----
function calculate() {
    const area = state.floorArea || 0;
    const condition = lookupCondition(area);
    const coefObj = lookupCoef(area);

    if (!condition || !coefObj) {
        state.results.grade = "연면적 부족 (5,000㎡ 이상)";
        state.results.coef = 0;
        state.results.inspectionWorkers = 0;
        state.results.maintenanceWorkers = 0;
        state.results.costs = { inspection: 0, maintenance: 0, appointment: 0, yearly: 0, monthly: 0 };
        updateUI();
        return;
    }

    state.results.grade = condition.grade;
    state.results.coef = coefObj.coef;

    // Auto-update grade badge
    updateGradeBadge(area);

    // Workers - 조건표의 인력값을 그대로 가져옴 (override 반영)
    const eff = getEffectiveCond(condition);
    state.results.inspectionWorkers = eff.inspectionWorkers;
    state.results.maintenanceWorkers = eff.maintenanceWorkers;

    // Costs - override를 반영한 유효한 조건값 사용
    state.results.costs.inspection = eff.yearlyInspection;
    state.results.costs.maintenance = eff.yearlyMaintenance;
    state.results.costs.appointment = eff.yearlyAppointment;

    // Total before discount
    const subtotal = eff.yearlyInspection + eff.yearlyMaintenance + eff.yearlyAppointment;
    // Apply discount
    const discountAmount = Math.round(subtotal * (state.discount / 100));
    state.results.costs.yearly = subtotal - discountAmount;
    state.results.costs.monthly = Math.floor(state.results.costs.yearly / 12);

    // \uc870\uac74\ud45c \ud328\ub110 \uc5c5\ub370\uc774\ud2b8
    updateConditionPanel(condition);

    updateUI();
}

// ―― Condition Panel ――
const COND_RANGE_LABELS = {
    5000: '5,000 ≤ 연면적 < 10,000 ㎡',
    10000: '10,000 ≤ 연면적 < 15,000 ㎡',
    15000: '15,000 ≤ 연면적 < 30,000 ㎡',
    30000: '30,000 ≤ 연면적 < 60,000 ㎡',
    60000: '60,000 ≤ 연면적 < 150,000 ㎡',
    150000: '150,000㎡ 이상',
};

function getEffectiveCond(condition) {
    // override가 있으면 사용자 값, 없으면 기본값 사용
    // 단, itemToggles가 false이면 모든 관련 값을 0으로 반전
    const isApp = state.itemToggles.appointment;
    const isMaint = state.itemToggles.maintenance;
    const isInsp = state.itemToggles.inspection;

    return {
        monthlyAppointment: isApp ? (state.condOverride.monthlyAppointment ?? condition.monthlyAppointment) : 0,
        yearlyAppointment: isApp ? (state.condOverride.yearlyAppointment ?? condition.yearlyAppointment) : 0,
        yearlyMaintenance: isMaint ? (state.condOverride.yearlyMaintenance ?? condition.yearlyMaintenance) : 0,
        yearlyInspection: isInsp ? (state.condOverride.yearlyInspection ?? condition.yearlyInspection) : 0,
        inspectionWorkers: isInsp ? (state.condOverride.inspectionWorkers ?? condition.inspectionWorkers) : 0,
        maintenanceWorkers: isMaint ? (state.condOverride.maintenanceWorkers ?? condition.maintenanceWorkers) : 0,
    };
}

function updateConditionPanel(condition) {
    const panel = document.getElementById('card-condition');
    if (!panel) return;

    // 연면적 구간이 달라진 경우 override 리셋
    if (state._lastConditionArea !== condition.area) {
        state.condOverride = {};
        state._lastConditionArea = condition.area;
    }
    const eff = getEffectiveCond(condition);

    const fmt = (n) => Math.round(n).toLocaleString('ko-KR');

    // 패널 표시
    panel.style.display = 'block';
    document.getElementById('cond-grade').textContent = condition.grade;
    document.getElementById('cond-range-label').textContent = COND_RANGE_LABELS[condition.area] || '';

    const inputs = [
        { id: 'cond-monthly-appointment', val: fmt(eff.monthlyAppointment) },
        { id: 'cond-yearly-appointment', val: fmt(eff.yearlyAppointment) },
        { id: 'cond-yearly-maintenance', val: fmt(eff.yearlyMaintenance) },
        { id: 'cond-yearly-inspection', val: fmt(eff.yearlyInspection) },
        { id: 'cond-inspection-workers', val: eff.inspectionWorkers },
        { id: 'cond-maintenance-workers', val: eff.maintenanceWorkers }
    ];

    inputs.forEach(item => {
        const el = document.getElementById(item.id);
        // 포커스 중인 엘리먼트는 값을 덮어쓰지 않음 (커서 튐 및 jitter 방지)
        if (el && document.activeElement !== el) {
            el.value = item.val;
        }
    });
    document.getElementById('cond-discount-display').textContent = state.discount + '%';

    const subtotal = eff.yearlyAppointment + eff.yearlyMaintenance + eff.yearlyInspection;
    const discountAmount = Math.round(subtotal * (state.discount / 100));
    const yearlyTotal = subtotal - discountAmount;
    const monthlyTotal = Math.floor(yearlyTotal / 12);
    document.getElementById('cond-yearly-total').textContent = fmt(yearlyTotal) + '원';
    document.getElementById('cond-monthly-total').textContent = fmt(monthlyTotal) + '원';

    // 수정된 필드 하이라이트
    ['monthly-appointment', 'yearly-appointment', 'yearly-maintenance', 'yearly-inspection', 'inspection-workers', 'maintenance-workers'].forEach(key => {
        const el = document.getElementById('cond-' + key);
        const stateKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (state.condOverride[stateKey] !== undefined) {
            el.style.background = '#fef3c7';
            el.style.borderColor = '#f59e0b';
        } else {
            el.style.background = '';
            el.style.borderColor = '#d1d5db';
        }
    });

    // Toggle \uc544\uc774\ucf58 \ubc0f \ud589 \uc0c1\ud0dc \uc5c5\ub370\uc774\ud2b8
    document.querySelectorAll('.btn-toggle-item').forEach(btn => {
        const item = btn.dataset.item;
        const isActive = state.itemToggles[item];
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isActive ? 'fas fa-minus-circle' : 'fas fa-plus-circle';
        }
    });

    document.querySelectorAll('.cond-row[data-row-item]').forEach(row => {
        const item = row.dataset.rowItem;
        if (state.itemToggles[item]) {
            row.classList.remove('item-disabled');
        } else {
            row.classList.add('item-disabled');
        }
    });
}

// ---- UI Rendering ----
function updateUI() {
    const hasArea = state.floorArea > 0;
    const hasValidCondition = !!lookupCondition(state.floorArea);

    document.getElementById('card-summary').style.display = (hasArea && currentStep >= 2) ? 'block' : 'none';
    document.getElementById('card-detail').style.display = hasArea ? 'block' : 'none';
    if (!hasArea) document.getElementById('card-condition').style.display = 'none';

    // Right Panel Elements visibility are managed primarily by goToStep 
    // unless necessary to update within a step
    const bottomActions = document.getElementById('card-bottom-actions');
    if (bottomActions && window.currentStep === 3) {
        bottomActions.style.display = hasArea ? 'flex' : 'none';
    }

    if (!hasArea) return;

    document.getElementById('res-grade').textContent = state.results.grade;
    document.getElementById('res-coef').textContent = hasValidCondition ? state.results.coef.toFixed(2) : '-';
    document.getElementById('res-workers').textContent = hasValidCondition ? state.results.inspectionWorkers + " 명" : '-';
    document.getElementById('res-maint-workers').textContent = hasValidCondition ? state.results.maintenanceWorkers + " 명" : '-';
    document.getElementById('res-yearly').textContent = "₩ " + state.results.costs.yearly.toLocaleString();
    document.getElementById('res-monthly').textContent = "₩ " + state.results.costs.monthly.toLocaleString();

    renderTabs();
}

function renderTabs() {
    const fmt = n => Math.round(n).toLocaleString('ko-KR');

    // Tab 1: Summary
    const subtotal = state.results.costs.inspection + state.results.costs.maintenance + state.results.costs.appointment;
    const discountRow = state.discount > 0
        ? `<tr style="color:#ef4444"><td>할인율 (${state.discount}%)</td><td>- ₩ ${Math.round(subtotal * (state.discount / 100)).toLocaleString()}</td><td>견적 할인</td></tr>`
        : '';

    document.getElementById('tbl-q-total').innerHTML = `
        <tr><td>대상물 (고객명)</td><td>${state.customerName || '-'}</td><td></td></tr>
        <tr><td>주소</td><td>${state.address || '-'}</td><td></td></tr>
        <tr><td>연면적</td><td>${state.floorArea.toLocaleString()} ㎡</td><td>등급: <span style="font-weight:600; color:var(--toss-blue);">${state.results.grade}</span></td></tr>
        <tr><td>성능점검</td><td>₩ ${state.results.costs.inspection.toLocaleString()}</td><td>연 1회</td></tr>
        <tr><td>유지점검</td><td>₩ ${state.results.costs.maintenance.toLocaleString()}</td><td>연 2회</td></tr>
        <tr><td>위탁선임</td><td>₩ ${state.results.costs.appointment.toLocaleString()}</td><td>12개월</td></tr>
        ${discountRow}
        <tr style="font-weight:700; color:var(--toss-blue)"><td>최종 합계 (연간)</td><td>₩ ${state.results.costs.yearly.toLocaleString()}</td><td>부가세 별도</td></tr>
        <tr style="font-weight:600"><td>월 납부액</td><td>₩ ${state.results.costs.monthly.toLocaleString()}</td><td>÷12</td></tr>
    `;

    // Tab 2: Inspection
    const inspB = calcLaborBreakdown(state.results.inspectionWorkers, state.results.grade);
    document.getElementById('tbl-q-inspection').innerHTML =
        inspB.rows.filter(r => r.workers > 0).map(r => `
        <tr style="font-weight:600; color:var(--toss-text-main);">
            <td>${r.grade} 정보통신기술자</td>
            <td>${r.workers}명 × ₩ ${r.wage.toLocaleString()}</td>
            <td>₩ ${r.amount.toLocaleString()}</td>
        </tr>`).join('') + `
        <tr style="border-top:1px solid var(--toss-border); font-weight:700;">
            <td>직접인건비 소계</td><td></td><td>₩ ${inspB.labor.toLocaleString()}</td>
        </tr>
        <tr><td>직접경비</td><td>인건비 × 10%</td><td>₩ ${inspB.expense.toLocaleString()}</td></tr>
        <tr><td>제경비</td><td>인건비 × 110%</td><td>₩ ${inspB.general.toLocaleString()}</td></tr>
        <tr><td>기술료</td><td>(인건비 + 제경비) × 20%</td><td>₩ ${inspB.tech.toLocaleString()}</td></tr>
        <tr style="font-weight:700; color:var(--toss-blue)">
            <td>산출 합계</td><td></td><td>₩ ${inspB.total.toLocaleString()}</td>
        </tr>
        <tr style="color:${state.results.costs.inspection - inspB.total >= 0 ? 'var(--toss-green)' : 'var(--toss-red)'}">
            <td>조정 금액</td>
            <td>목표금액 − 산출합계</td>
            <td>${state.results.costs.inspection - inspB.total >= 0 ? '+' : ''}₩ ${(state.results.costs.inspection - inspB.total).toLocaleString()}</td>
        </tr>
        <tr style="font-weight:700; border-top:1px solid var(--toss-border); color:var(--toss-text-main);">
            <td>최종 합계 (목표금액)</td><td>견적 조건표 적용</td><td>₩ ${state.results.costs.inspection.toLocaleString()}</td>
        </tr>`;

    // Tab 3: Maintenance
    const maintB = calcLaborBreakdown(state.results.maintenanceWorkers, state.results.grade);
    document.getElementById('tbl-q-maintenance').innerHTML =
        maintB.rows.filter(r => r.workers > 0).map(r => `
        <tr style="font-weight:600; color:var(--toss-text-main);">
            <td>${r.grade} 정보통신기술자</td>
            <td>${r.workers}명 × ₩ ${r.wage.toLocaleString()}</td>
            <td>₩ ${r.amount.toLocaleString()}</td>
        </tr>`).join('') + `
        <tr style="border-top:1px solid var(--toss-border); font-weight:700;">
            <td>직접인건비 소계</td><td></td><td>₩ ${maintB.labor.toLocaleString()}</td>
        </tr>
        <tr><td>직접경비</td><td>인건비 × 10%</td><td>₩ ${maintB.expense.toLocaleString()}</td></tr>
        <tr><td>제경비</td><td>인건비 × 110%</td><td>₩ ${maintB.general.toLocaleString()}</td></tr>
        <tr><td>기술료</td><td>(인건비 + 제경비) × 20%</td><td>₩ ${maintB.tech.toLocaleString()}</td></tr>
        <tr style="font-weight:700; color:var(--toss-blue)">
            <td>산출 합계</td><td></td><td>₩ ${maintB.total.toLocaleString()}</td>
        </tr>
        <tr style="color:${state.results.costs.maintenance - maintB.total >= 0 ? 'var(--toss-green)' : 'var(--toss-red)'}">
            <td>조정 금액</td>
            <td>목표금액 − 산출합계</td>
            <td>${state.results.costs.maintenance - maintB.total >= 0 ? '+' : ''}₩ ${(state.results.costs.maintenance - maintB.total).toLocaleString()}</td>
        </tr>
        <tr style="font-weight:700; border-top:1px solid var(--toss-border); color:var(--toss-text-main);">
            <td>최종 합계 (목표금액)</td><td>견적 조건표 적용</td><td>₩ ${state.results.costs.maintenance.toLocaleString()}</td>
        </tr>`;

    // Tab 4: Appointment
    document.getElementById('tbl-q-appointment').innerHTML = `
        <tr><td>선임 등급</td><td>${state.results.grade} 1명</td><td>연면적 기준</td></tr>
        <tr><td>월 단가</td><td>₩ ${(state.results.costs.appointment / 12).toLocaleString()}</td><td>× 12개월</td></tr>
        <tr style="font-weight:700; color:var(--toss-text-main);"><td>연간 선임 합계</td><td></td><td>₩ ${state.results.costs.appointment.toLocaleString()}</td></tr>
    `;

    // 데이터 기준 토글 패널 (tab2, tab3 공통)
    ['tab2', 'tab3'].forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (!tab) return;

        // 기존 토글 제거 후 재생성
        const old = tab.querySelector('.data-ref-toggle-wrap');
        if (old) old.remove();

        const condition = lookupCondition(state.floorArea);
        const coefObj = lookupCoef(state.floorArea);
        if (!condition || !coefObj) return;

        const eff = getEffectiveCond(condition);

        const wrap = document.createElement('div');
        wrap.className = 'data-ref-toggle-wrap';
        wrap.style.cssText = 'margin-top:0.75rem;';

        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-database"></i> 데이터 기준 보기';
        btn.style.cssText = [
            'background:var(--toss-input-bg)', 'border:none', 'border-radius:100px',
            'padding:0.5rem 1rem', 'cursor:pointer', 'font-size:0.85rem', 'font-weight:600',
            'color:var(--toss-text-sub)', 'display:flex', 'align-items:center', 'gap:0.4rem',
            'transition: background 0.2s', 'width: fit-content'
        ].join(';');

        const panel = document.createElement('div');
        panel.style.cssText = [
            'display:none', 'margin-top:0.6rem', 'background:#f8fafc',
            'border:1px solid #e5e7eb', 'border-radius:8px', 'padding:0.9rem 1rem',
            'font-size:0.82rem', 'color:#374151'
        ].join(';');

        // 노임단가
        const wageRows = GRADE_ORDER.map(g =>
            `<tr ${g === condition.grade ? 'style="font-weight:700;color:var(--primary-color)"' : ''}>
                <td style="padding:2px 8px">${g} 기술자</td>
                <td style="padding:2px 8px; text-align:right">₩ ${GRADE_WAGES[g].toLocaleString()}</td>
                <td style="padding:2px 8px; color:#9ca3af">${g === condition.grade ? '← 적용 등급' : ''}</td>
            </tr>`
        ).join('');

        // 적용 조건표
        const condRows = [
            ['연면적 구간', COND_RANGE_LABELS[condition.area] || '-'],
            ['등급', condition.grade],
            ['성능점검 (연)', `₩ ${fmt(eff.yearlyInspection)}`],
            ['성능점검 인력', `${eff.inspectionWorkers}명`],
            ['유지점검 (연)', `₩ ${fmt(eff.yearlyMaintenance)}`],
            ['유지점검 인력', `${eff.maintenanceWorkers}명`],
            ['위탁선임 (월)', `₩ ${fmt(eff.monthlyAppointment)}`],
            ['위탁선임 (연)', `₩ ${fmt(eff.yearlyAppointment)}`],
        ].map(([k, v]) =>
            `<tr><td style="padding:2px 8px;color:#6b7280">${k}</td><td style="padding:2px 8px;font-weight:600">${v}</td></tr>`
        ).join('');

        // 조정계수
        const coefRows = ADJUSTMENT_COEFFICIENTS.map(c =>
            `<tr ${c.area === coefObj.area ? 'style="font-weight:700;color:var(--primary-color)"' : ''}>
                <td style="padding:2px 8px">${COND_RANGE_LABELS[c.area] || c.area.toLocaleString() + '㎡이상'}</td>
                <td style="padding:2px 8px;text-align:right">${c.coef.toFixed(2)}</td>
                <td style="padding:2px 8px;color:#9ca3af">${c.area === coefObj.area ? '← 현재 적용' : ''}</td>
            </tr>`
        ).join('');

        panel.innerHTML = (() => {
            const wageHtml = GRADE_ORDER.map(g => {
                const a = g === condition.grade;
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--toss-border);gap:0.5rem;">
                    <span style="display:flex;align-items:center;gap:0.5rem;">
                        <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;flex-shrink:0;">${a ? '<span style="background:var(--toss-blue);color:white;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:6px;">적용</span>' : ''}</span>
                        <span style="font-size:0.85rem;font-weight:${a ? '700' : '500'};color:${a ? 'var(--toss-blue)' : 'var(--toss-text-main)'};white-space:nowrap;">${g} 기술자</span>
                    </span>
                    <span style="font-size:0.85rem;font-weight:${a ? '700' : '600'};color:${a ? 'var(--toss-blue)' : 'var(--toss-text-sub)'};font-variant-numeric:tabular-nums;white-space:nowrap;">₩ ${GRADE_WAGES[g].toLocaleString()}</span>
                </div>`;
            }).join('');

            const coefHtml = ADJUSTMENT_COEFFICIENTS.map(c => {
                const a = c.area === coefObj.area;
                const label = (COND_RANGE_LABELS[c.area] || '')
                    .replace(' ≤ 연면적', '').replace(/ ㎡/g, '').replace('< ', '<');
                return `<div style="background:${a ? 'var(--toss-blue)' : 'var(--toss-input-bg)'};color:${a ? 'white' : 'var(--toss-text-main)'};border-radius:var(--radius-sm);padding:0.5rem 0.75rem;text-align:center;white-space:nowrap;border:1px solid ${a ? 'var(--toss-blue)' : 'var(--toss-border)'}; flex: 1 1 calc(25% - 0.5rem); min-width: 80px;">
                    <div style="font-size:0.7rem;opacity:${a ? .9 : .6};margin-bottom:2px;">${label || c.area.toLocaleString() + '㎡~'}</div>
                    <div style="font-size:0.95rem;font-weight:700;">${c.coef.toFixed(2)}</div>
                </div>`;
            }).join('');

            const COND_ROWS = [
                { label: '등급', fn: c => `<span style="font-weight:700;color:${GRADE_STYLES[c.grade]?.color || 'var(--toss-text-main)'}">${c.grade}</span>` },
                { label: '성능점검 (연)', fn: c => '₩ ' + fmt(c.yearlyInspection) },
                { label: '성능점검 인력', fn: c => c.inspectionWorkers + '명' },
                { label: '유지점검 (연)', fn: c => '₩ ' + fmt(c.yearlyMaintenance) },
                { label: '유지점검 인력', fn: c => c.maintenanceWorkers + '명' },
                { label: '위탁선임 (월)', fn: c => '₩ ' + fmt(c.monthlyAppointment) },
                { label: '위탁선임 (연)', fn: c => '₩ ' + fmt(c.yearlyAppointment) },
            ];

            const thCells = QUOTATION_CONDITIONS.map(c => {
                const a = c.area === condition.area;
                return `<th style="padding:0.5rem 0.75rem;font-size:0.75rem;font-weight:${a ? '700' : '600'};background:${a ? 'var(--toss-blue)' : 'var(--toss-input-bg)'};color:${a ? 'white' : 'var(--toss-text-sub)'};border-bottom:2px solid ${a ? 'var(--toss-blue)' : 'var(--toss-border)'};text-align:center;white-space:nowrap;">
                    ${(COND_RANGE_LABELS[c.area] || '').replace(' ≤ 연면적 <', '<br><').replace(/㎡/g, '㎡')}
                    ${a ? '<div style="font-size:0.65rem;opacity:.9;margin-top:4px;background:rgba(255,255,255,0.2);padding:2px 4px;border-radius:4px;">현재 적용 구간</div>' : ''}
                </th>`;
            }).join('');

            const bodyRows = COND_ROWS.map(row => {
                const tds = QUOTATION_CONDITIONS.map(c => {
                    const a = c.area === condition.area;
                    return `<td style="padding:0.5rem 0.75rem;font-size:0.85rem;text-align:center;border-bottom:1px solid var(--toss-border);background:${a ? 'var(--toss-blue-bg)' : 'transparent'};font-weight:${a ? '700' : '500'};color:${a ? 'var(--toss-blue)' : 'var(--toss-text-main)'};white-space:nowrap;">${row.fn(c)}</td>`;
                }).join('');
                return `<tr>
                    <td style="padding:0.5rem 0.75rem;font-size:0.8rem;color:var(--toss-text-sub);background:var(--toss-input-bg);border-bottom:1px solid var(--toss-border);border-right:1px solid var(--toss-border);white-space:nowrap;font-weight:600;">${row.label}</td>
                    ${tds}
                </tr>`;
            }).join('');

            return `
            <div style="display:grid;grid-template-columns:1fr;gap:1rem;margin-bottom:1rem; @media (min-width: 768px) { grid-template-columns: 1fr 2fr; }">
                <div style="background:var(--toss-card-bg);border:1px solid var(--toss-border);border-radius:var(--radius-md);padding:1rem;box-shadow:var(--shadow-sm);">
                    <div style="font-size:0.9rem;font-weight:700;color:var(--toss-text-main);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
                        <i class="fas fa-coins" style="color:var(--toss-blue);"></i> 등급별 노임단가 (원/인·일)
                    </div>
                    ${wageHtml}
                </div>
                <div style="background:var(--toss-card-bg);border:1px solid var(--toss-border);border-radius:var(--radius-md);padding:1rem;box-shadow:var(--shadow-sm);">
                    <div style="font-size:0.9rem;font-weight:700;color:var(--toss-text-main);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
                        <i class="fas fa-chart-line" style="color:var(--toss-blue);"></i> 연면적 조정계수
                    </div>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">${coefHtml}</div>
                </div>
            </div>
            <div style="background:var(--toss-card-bg);border:1px solid var(--toss-border);border-radius:var(--radius-md);padding:1rem;overflow-x:auto;box-shadow:var(--shadow-sm);">
                <div style="font-size:0.9rem;font-weight:700;color:var(--toss-text-main);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
                    <i class="fas fa-table" style="color:var(--toss-blue);"></i> 견적 조건표 (전체 구간)
                </div>
                <table style="width:100%;border-collapse:collapse;min-width:700px;">
                    <thead><tr>
                        <th style="padding:0.5rem 0.75rem;font-size:0.8rem;font-weight:700;background:var(--toss-input-bg);color:var(--toss-text-main);border-bottom:2px solid var(--toss-border);border-right:1px solid var(--toss-border);text-align:left;white-space:nowrap;">항목</th>
                        ${thCells}
                    </tr></thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>`;
        })();


        btn.addEventListener('click', () => {
            const open = panel.style.display !== 'none';
            panel.style.display = open ? 'none' : 'block';
            btn.innerHTML = open
                ? '<i class="fas fa-database"></i> 데이터 기준 보기'
                : '<i class="fas fa-chevron-up"></i> 데이터 기준 접기';
        });

        wrap.appendChild(btn);
        wrap.appendChild(panel);
        tab.appendChild(wrap);
    });
}


// ---- Building Register API (ported from 건축물대장-연면적-조회-서비스) ----
// (공통 기능인 주소 검색 및 대장 조회는 common.js의 window.wkCommon.getAddressInfo, fetchBuildingRegister 사용)

let _lastBuildingResult = null; // store for apply button

async function fetchBuildingInfo() {
    const statusEl = document.getElementById('building-fetch-status');
    const panelEl = document.getElementById('building-result-panel');
    const contentEl = document.getElementById('building-result-content');
    const btn = document.getElementById('btn-fetch-building');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 조회 중...';
    statusEl.style.display = 'block';
    statusEl.style.background = '#f0f9ff';
    statusEl.style.color = '#0369a1';
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 주소 변환 및 건축물대장 API 호출 중...';
    panelEl.style.display = 'none';

    try {
        const addrInfo = await window.wkCommon.getAddressInfo(state.address);
        const target = await window.wkCommon.fetchBuildingRegister(addrInfo);

        // 공통 반환 스키마에 맞춰 화면 매핑을 위한 형태 가공
        const sumMainArea = parseFloat(target.totArea || 0);
        const result = {
            '연면적': sumMainArea.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            '부속건축물면적': '0.00',
            '총연면적': sumMainArea.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            '주용도': target.mainPurpsCdNm || '-',
            '주용도_분포': target.mainPurpsCdNm || '-',
            '대지면적': target.platArea || '-',
            '건축면적': target.archArea || '-',
            '사용승인일': target.useAprDay || '-',
            '건축물명': target.bldNm || '-',
            '_rawMainArea': sumMainArea,
            '_rawPurpose': target.mainPurpsCdNm
        };
        _lastBuildingResult = result;

        // Render result cards
        const displayKeys = ['총연면적', '연면적', '부속건축물면적', '주용도', '대지면적', '건축면적', '사용승인일', '건축물명'];
        contentEl.innerHTML = displayKeys.map(k => `
            <div style="background:white; border:1px solid var(--border-color); border-radius:6px; padding:0.6rem 0.8rem;">
                <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">${k}</div>
                <div style="font-weight:700; font-size:0.9rem; color:var(--text-primary)">${result[k] || '-'}</div>
            </div>
        `).join('') + `
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:0.6rem 0.8rem; grid-column:1/-1;">
                <div style="font-size:0.7rem; color:#3b82f6; margin-bottom:2px;">주용도 분포 (주건축물 기준)</div>
                <div style="font-weight:600; font-size:0.85rem; color:#1d4ed8">${result['주용도_분포'] || '-'}</div>
            </div>
        `;

        panelEl.style.display = 'block';
        statusEl.style.background = '#f0fdf4';
        statusEl.style.color = '#15803d';
        statusEl.innerHTML = '<span class="status-msg-pc">✅ 건축물대장 조회 성공! "✅ 이 값으로 적용" 버튼으로 값을 입력하세요.</span>' + 
                             '<span class="status-msg-mobile">✅ 건축물대장 조회 성공!<br>"✅ 이 값으로 적용" 버튼으로<br>값을 입력하세요.</span>';
    } catch (err) {
        statusEl.style.background = '#fef2f2';
        statusEl.style.color = '#b91c1c';
        statusEl.innerHTML = `❌ 오류: ${err.message}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> 건축물대장 조회';
    }
}

// ---- Kakao Address Search (on page load) ----
function initKakaoSearch() {
    window.wkCommon.initKakaoPostcode('kakao-embed-container', (roadAddr, buildingName) => {
        document.getElementById('address').value = roadAddr;
        if (buildingName) document.getElementById('customer-name').value = buildingName;

        state.address = roadAddr;
        state.buildingName = buildingName || '';
        state.customerName = buildingName || '';

        // Proceed to Step 2 automatically
        goToStep(2);

        calculate();

        // 검색 즉시 자동 조회 트리거
        setTimeout(() => document.getElementById('btn-fetch-building').click(), 500);
    });
}


document.getElementById('customer-name').addEventListener('input', (e) => {
    state.customerName = e.target.value;
    calculate();
});

document.getElementById('floor-area').addEventListener('input', (e) => {
    state.floorArea = parseFloat(e.target.value) || 0;
    updateGradeBadge(state.floorArea);

    // 연면적을 직접 입력한 경우 카드 표시 보장
    // (Step Wizard에서 자동 관리되므로 수동 display 조절 생략)

    calculate();
});

// 조건표 기본값 복원 버튼
document.getElementById('btn-restore-cond').addEventListener('click', () => {
    state.condOverride = {};
    state._lastConditionArea = -1; // 구간 재계산 강제 트리거
    calculate();
});

// Building Register Lookup
document.getElementById('btn-fetch-building').addEventListener('click', fetchBuildingInfo);

document.getElementById('btn-apply-building').addEventListener('click', () => {
    if (!_lastBuildingResult) return;
    // Fill floor area with raw total (주건축물 연면적)
    const rawArea = _lastBuildingResult['_rawMainArea'];
    const purpose = _lastBuildingResult['_rawPurpose'];
    const bldName = _lastBuildingResult['건축물명'];

    if (rawArea) {
        document.getElementById('floor-area').value = rawArea.toFixed(2);
        state.floorArea = rawArea;
    }
    // 사용승인일 자동 입력
    const aprDay = _lastBuildingResult['사용승인일'];
    if (aprDay && aprDay !== '-') {
        // YYYYMMDD → YYYY-MM-DD 포맷팅
        const fmt = aprDay.length === 8
            ? `${aprDay.slice(0, 4)}-${aprDay.slice(4, 6)}-${aprDay.slice(6, 8)}`
            : aprDay;
        document.getElementById('use-apr-day').value = fmt;
        state.useAprDay = fmt;
    }
    // 주용도 (상위 3개)
    const topPurpose = _lastBuildingResult['주용도'];
    if (topPurpose && topPurpose !== '-') {
        document.getElementById('purpose').value = topPurpose;
        state.purpose = topPurpose;
    }
    if (bldName && bldName !== '-' && !state.customerName) {
        document.getElementById('customer-name').value = bldName;
        state.customerName = bldName;
    }
    calculate();

    // Visual feedback
    const btn = document.getElementById('btn-apply-building');
    btn.textContent = '✅ 적용 완료!';
    btn.style.background = '#059669';
    setTimeout(() => {
        btn.innerHTML = '✅ 이 값으로 적용';
        btn.style.background = '#10b981';
    }, 2000);
});


document.getElementById('purpose').addEventListener('input', (e) => {
    state.purpose = e.target.value;
});

document.getElementById('use-apr-day').addEventListener('input', (e) => {
    state.useAprDay = e.target.value;
});

document.getElementById('manager').addEventListener('input', (e) => {
    state.manager = e.target.value;
});

// ---- 전화번호 자동 포맷팅 유틸 ----
function formatPhone(value) {
    // 숫자만 추출, 최대 11자리
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const len = digits.length;

    if (digits.startsWith('02')) {
        // 서울 (02): 02-XXXX-XXXX 또는 02-XXX-XXXX
        if (len < 3) return digits;                                                    // 02
        if (len < 6) return digits.slice(0, 2) + '-' + digits.slice(2);               // 02-XXX
        if (len < 10) return digits.slice(0, 2) + '-' + digits.slice(2, 5) + '-' + digits.slice(5); // 02-XXX-XXXX
        return digits.slice(0, 2) + '-' + digits.slice(2, 6) + '-' + digits.slice(6);    // 02-XXXX-XXXX
    } else {
        // 010 / 031 등 3자리 국번
        if (len < 4) return digits;                                                    // 010
        if (len < 7) return digits.slice(0, 3) + '-' + digits.slice(3);               // 010-XXXX
        if (len < 11) return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6); // 010-XXX-XXXX
        return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);    // 010-XXXX-XXXX
    }
}

const managerPhoneEl = document.getElementById('manager-phone');
if (managerPhoneEl) {
    managerPhoneEl.addEventListener('input', function () {
        const pos = this.selectionStart;             // 입력 전 커서 위치
        const before = this.value;
        const formatted = formatPhone(this.value);

        // 포맷팅 결과가 다를 때만 덮어쓰기 (그렇지 않으면 특정 환경에서 입력이 막히거나 씹히는 현상 발생)
        if (before !== formatted) {
            this.value = formatted;
            // 커서 위치 보정: 추가된 하이픈 수 만큼 앞으로 밀기
            const added = formatted.length - before.length;
            const newPos = Math.max(0, pos + added);
            this.setSelectionRange(newPos, newPos);
        }
        state.managerPhone = formatted;
    });
} else {
    console.error('[디버그] #manager-phone 요소를 찾을 수 없습니다.');
}

// 영업 담당자 변경 시 연락처 자동 입력
document.getElementById('sales-manager').addEventListener('change', (e) => {
    const selectedName = e.target.value;
    const manager = SALES_MANAGERS.find(m => m.name === selectedName);

    state.salesManager = selectedName;
    state.salesManagerPhone = manager ? manager.phone : "";

    // UI 업데이트
    const phoneInput = document.getElementById('sales-manager-phone');
    if (phoneInput) {
        phoneInput.value = state.salesManagerPhone;
    }
});

// ---- Condition Table Inputs ----
const COND_INPUT_MAP = {
    'cond-monthly-appointment': 'monthlyAppointment',
    'cond-yearly-appointment': 'yearlyAppointment',
    'cond-yearly-maintenance': 'yearlyMaintenance',
    'cond-yearly-inspection': 'yearlyInspection',
    'cond-inspection-workers': 'inspectionWorkers',
    'cond-maintenance-workers': 'maintenanceWorkers',
};
const COST_FIELDS = new Set(['cond-monthly-appointment', 'cond-yearly-appointment', 'cond-yearly-maintenance', 'cond-yearly-inspection']);

Object.entries(COND_INPUT_MAP).forEach(([elId, stateKey]) => {
    const el = document.getElementById(elId);
    if (!el) return;

    // input: strip commas → parse → save override → recalc
    el.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/,/g, '');
        const val = parseFloat(raw);
        if (!isNaN(val)) {
            state.condOverride[stateKey] = val;

            // 월 단가 수정 시 연간 합계 자동 계산 (또는 반대)
            if (elId === 'cond-monthly-appointment') {
                state.condOverride.yearlyAppointment = val * 12;
            } else if (elId === 'cond-yearly-appointment') {
                state.condOverride.monthlyAppointment = val / 12;
            }
        } else {
            delete state.condOverride[stateKey];
            if (elId === 'cond-monthly-appointment') delete state.condOverride.yearlyAppointment;
            if (elId === 'cond-yearly-appointment') delete state.condOverride.monthlyAppointment;
        }
        calculate();
    });

    // focus: show raw number (no commas) for easier editing
    if (COST_FIELDS.has(elId)) {
        el.addEventListener('focus', (e) => {
            const raw = e.target.value.replace(/,/g, '');
            e.target.value = raw;
        });
        // blur: reformat with commas
        el.addEventListener('blur', (e) => {
            const raw = parseFloat(e.target.value.replace(/,/g, ''));
            if (!isNaN(raw)) {
                e.target.value = Math.round(raw).toLocaleString('ko-KR');
            }
        });
    }
});


// Reset: show address search again (Step 1)
document.getElementById('btn-reset-addr').addEventListener('click', () => {
    // State reset
    state.address = "";
    state.customerName = "";
    state.buildingName = "";
    state.floorArea = 0;
    state.purpose = "";
    state.useAprDay = "";
    state.managerPhone = "";
    state.salesManager = "";
    state.condOverride = {};
    state.itemToggles = { appointment: true, maintenance: true, inspection: true };
    state._lastConditionArea = -1;
    _lastBuildingResult = null;

    // Form fields reset
    document.getElementById('customer-name').value = "";
    document.getElementById('floor-area').value = "";
    document.getElementById('floor-grade').value = "";
    document.getElementById('use-apr-day').value = "";
    document.getElementById('purpose').value = "";
    document.getElementById('manager').value = "";
    document.getElementById('manager-phone').value = "";
    document.getElementById('sales-manager').value = "";

    // Building register UI reset
    document.getElementById('building-result-panel').style.display = 'none';
    document.getElementById('building-fetch-status').style.display = 'none';
    document.getElementById('building-result-content').innerHTML = '';

    // Re-init Kakao embed (clear and re-embed)
    const container = document.getElementById('kakao-embed-container');
    if (container) {
        container.innerHTML = '';
        initKakaoSearch();
    }
    
    goToStep(1);
});

// Tab Switching (only buttons in #tab-bar)
document.getElementById('tab-bar').querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('tab-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// LibreOffice PDF 서버 URL (상대 경로로 변경하여 통합 호스팅 환경에 대응)
// [개발 환경 주의] 로컬 환경(concurrently 등)에서는 프론트 3000번, 백엔드 3001번 등 포트가 분리될 수 있으므로
// 현재 호스트가 3000 번 포트일 경우 명시적으로 3001 번 백엔드를 바라보도록 분기 처리합니다.
const PDF_SERVER_URL = (window.location.port === '3000' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/generate-pdf'
    : '/generate-pdf';

// ---- Mapping Logic for Export ----
function generateMapping() {
    const today = new Date().toISOString().slice(0, 10);
    const costs = state.results.costs;
    const subtotal = costs.inspection + costs.maintenance + costs.appointment;

    // 노임단가 × 투입인원 기반 인건비 산출
    const inspB = calcLaborBreakdown(state.results.inspectionWorkers, state.results.grade);
    const maintB = calcLaborBreakdown(state.results.maintenanceWorkers, state.results.grade);

    // 선임 산출내역은 견적 조건표 상 투입인원 필드가 별도로 없으나,
    // "등급별 선임 인원수에 따른 1명"으로 할당을 원하므로, 
    // 선임 상태(itemToggles.appointment)가 켜져있으면 1명으로 계산합니다.
    const appWorkers = state.itemToggles.appointment ? 1 : 0;
    const appB = calcLaborBreakdown(appWorkers, state.results.grade);

    return {
        "표지": [
            { name: "고객명", cell: "F10", value: state.customerName }
        ],
        "1. 견적서": [
            { name: "견적일", cell: "E8", value: today },
            { name: "고객명", cell: "E9", value: state.customerName },
            { name: "주소", cell: "J15", value: state.address },
            { name: "사용승인일", cell: "J16", value: state.useAprDay },
            { name: "주용도", cell: "J17", value: state.purpose },
            { name: "연면적", cell: "W17", value: state.floorArea },
            { name: "담당자명", cell: "J18", value: state.manager },
            { name: "담당자 연락처", cell: "W18", value: state.managerPhone },
            { name: "영업 담당자", cell: "Q12", value: state.salesManager },
            { name: "영업 담당자 연락처", cell: "X12", value: state.salesManagerPhone },
            { name: "성능점검비", cell: "T23", value: costs.inspection },
            { name: "유지점검비", cell: "T24", value: costs.maintenance },
            { name: "위탁선임비", cell: "T25", value: costs.appointment },
            { name: "합계(할인전)", cell: "T26", value: subtotal },
            { name: "최종 연간 금액", cell: "T27", value: costs.yearly },
            { name: "월 납부액", cell: "T28", value: costs.monthly },
            { name: "건물등급", cell: "Y25", value: state.results.grade }
        ],
        "2.1 성능점검 산출내역": [
            { name: "성능 특급 점검인원 수", cell: "E6", value: inspB.rows[0].workers },
            { name: "성능 고급 점검인원 수", cell: "E7", value: inspB.rows[1].workers },
            { name: "성능 중급 점검인원 수", cell: "E8", value: inspB.rows[2].workers },
            { name: "성능 초급 점검인원 수", cell: "E9", value: inspB.rows[3].workers },
            { name: "성능 특급 점검 노임 단가", cell: "G6", value: inspB.rows[0].wage },
            { name: "성능 고급 점검 노임 단가", cell: "G7", value: inspB.rows[1].wage },
            { name: "성능 중급 점검 노임 단가", cell: "G8", value: inspB.rows[2].wage },
            { name: "성능 초급 점검 노임 단가", cell: "G9", value: inspB.rows[3].wage },
            { name: "인건비", cell: "H10", value: inspB.labor },
            { name: "직접경비", cell: "H11", value: inspB.expense },
            { name: "제경비", cell: "H12", value: inspB.general },
            { name: "기술료", cell: "H13", value: inspB.tech },
            { name: "성능 산출합계", cell: "H14", value: inspB.total },
            { name: "성능 조정금액", cell: "H15", value: costs.inspection - inspB.total },
            { name: "성능 최종합계", cell: "H17", value: costs.inspection },
            { name: "투입인력", cell: "O6", value: state.results.inspectionWorkers }
        ],
        "2.2 유지점검 산출내역": [
            { name: "유지 특급 점검인원 수", cell: "E6", value: maintB.rows[0].workers },
            { name: "유지 고급 점검인원 수", cell: "E7", value: maintB.rows[1].workers },
            { name: "유지 중급 점검인원 수", cell: "E8", value: maintB.rows[2].workers },
            { name: "유지 초급 점검인원 수", cell: "E9", value: maintB.rows[3].workers },
            { name: "유지 특급 점검 노임 단가", cell: "G6", value: maintB.rows[0].wage },
            { name: "유지 고급 점검 노임 단가", cell: "G7", value: maintB.rows[1].wage },
            { name: "유지 중급 점검 노임 단가", cell: "G8", value: maintB.rows[2].wage },
            { name: "유지 초급 점검 노임 단가", cell: "G9", value: maintB.rows[3].wage },
            { name: "인건비", cell: "H10", value: maintB.labor },
            { name: "직접경비", cell: "H11", value: maintB.expense },
            { name: "제경비", cell: "H12", value: maintB.general },
            { name: "기술료", cell: "H13", value: maintB.tech },
            { name: "유지 산출합계", cell: "H14", value: maintB.total },
            { name: "유지 조정금액", cell: "H15", value: costs.maintenance - maintB.total },
            { name: "유지 최종합계", cell: "H17", value: costs.maintenance },
            { name: "투입인력", cell: "O6", value: state.results.maintenanceWorkers }
        ],
        "2.3 선임 산출내역": [
            { name: "선임 특급 점검인원 수", cell: "E6", value: appB.rows[0].workers },
            { name: "선임 고급 점검인원 수", cell: "E7", value: appB.rows[1].workers },
            { name: "선임 중급 점검인원 수", cell: "E8", value: appB.rows[2].workers },
            { name: "선임 초급 점검인원 수", cell: "E9", value: appB.rows[3].workers },
            { name: "선임 특급 점검 노임 단가", cell: "G6", value: appB.rows[0].wage },
            { name: "선임 고급 점검 노임 단가", cell: "G7", value: appB.rows[1].wage },
            { name: "선임 중급 점검 노임 단가", cell: "G8", value: appB.rows[2].wage },
            { name: "선임 초급 점검 노임 단가", cell: "G9", value: appB.rows[3].wage },
            { name: "인건비", cell: "H10", value: appB.labor },
            { name: "직접경비", cell: "H11", value: appB.expense },
            { name: "제경비", cell: "H12", value: appB.general },
            { name: "기술료", cell: "H13", value: appB.tech },
            { name: "산출합계", cell: "H14", value: appB.total },
            { name: "조정금액", cell: "H15", value: costs.appointment - appB.total },
            { name: "최종합계", cell: "H17", value: costs.appointment },
            { name: "투입인력", cell: "O6", value: 0 }
        ],
        "4. 성능점검 수량내역": [
            { name: "조정계수", cell: "F4", value: state.results.coef }
        ]
    };
}

// ---- 상태 표시 헬퍼 ----
function showStatusBar(msg, type) {
    const bar = document.getElementById('sheet-status-bar');
    if (!bar) return;
    const colors = {
        info: { bg: '#eff6ff', color: '#1d4ed8' },
        success: { bg: '#f0fdf4', color: '#15803d' },
        error: { bg: '#fef2f2', color: '#b91c1c' },
        warning: { bg: '#fffbeb', color: '#b45309' }
    };
    const c = colors[type] || colors.info;
    bar.style.background = c.bg;
    bar.style.color = c.color;
    bar.innerHTML = msg;
    bar.style.display = 'block';
}

// ---- PDF 버튼 활성/비활성 헬퍼 ----
function setPdfBtnEnabled(enabled) {
    const pdfBtn = document.getElementById('btn-save-pdf');
    if (!pdfBtn) return;
    pdfBtn.disabled = !enabled;
    pdfBtn.style.opacity = enabled ? '1' : '0.4';
    pdfBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

// PDF 저장 버튼 - LibreOffice 서버 호출
document.getElementById('btn-save-pdf').addEventListener('click', async () => {
    const mapping = generateMapping();
    const btn = document.getElementById('btn-save-pdf');

    // 연면적 유효성 검사
    if (!state.floorArea || state.floorArea < 5000) {
        showStatusBar('⚠️ 연면적을 먼저 입력해주세요. (5,000㎡ 이상)', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF 생성 중...';
    showStatusBar('<i class="fas fa-spinner fa-spin"></i> Excel 데이터 입력 및 LibreOffice PDF 변환 중... (약 10초 소요)', 'info');

    try {
        const res = await fetch(PDF_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mapping)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errData.error || `서버 오류 (${res.status})`);
        }

        // PDF blob 수신 후 다운로드
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        // Content-Disposition 헤더에서 파일명 추출
        const disposition = res.headers.get('Content-Disposition') || '';
        const nameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/);
        const fileName = nameMatch ? decodeURIComponent(nameMatch[1]) : `${state.customerName || '견적서'}_견적서.pdf`;

        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        btn.innerHTML = '<i class="fas fa-check-circle"></i> PDF 다운로드 완료';
        showStatusBar(`✅ <b>${fileName}</b> 다운로드 완료!`, 'success');

        // 3초 후 버튼 복구
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-file-pdf"></i> 견적서 PDF 생성 및 다운로드';
            btn.disabled = false;
        }, 3000);

    } catch (err) {
        console.error('PDF 생성 오류:', err);
        let msg = err.message;
        if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
            msg = 'PDF 서버에 연결할 수 없습니다. <br>터미널에서 <code>node server.js</code> 명령으로 서버를 실행해주세요.';
        }
        showStatusBar(`❌ 오류: ${msg}`, 'error');
        btn.innerHTML = '<i class="fas fa-file-pdf"></i> 견적서 PDF 생성 및 다우로드';
        btn.disabled = false;
    }
});



// 2. JSON 매핑 확인 버튼 로직
document.getElementById('btn-view-json').addEventListener('click', () => {
    const mapping = generateMapping();
    document.getElementById('json-result').textContent = JSON.stringify(mapping, null, 2);
    document.getElementById('modal-json').style.display = 'flex';
});

document.getElementById('btn-modal-close').addEventListener('click', () => {
    document.getElementById('modal-json').style.display = 'none';
});

// ---- Initialize ----
// 카카오 Postcode 스크립트 로드 완료 후 initKakaoSearch()를 실행합니다.
// index.html의 동적 로드 방식과 연동: 이미 로드됐으면 즉시, 아니면 콜백으로.
function _startKakaoSearch() {
    if (typeof daum !== 'undefined' && typeof daum.Postcode !== 'undefined') {
        initKakaoSearch();
    } else {
        // daum이 아직 준비되지 않은 경우 100ms 후 재시도
        console.warn('[카카오맵] daum.Postcode 미준비 - 재시도 중...');
        setTimeout(_startKakaoSearch, 100);
    }
}

if (window._kakaoPostcodeLoaded) {
    // 스크립트가 이미 로드 완료된 경우 (즉시 실행)
    _startKakaoSearch();
} else {
    // 아직 로드 중인 경우: index.html의 onload 콜백 등록
    window._onKakaoPostcodeReady = _startKakaoSearch;
}

// ---- Adjuster Buttons (+/-) ----
document.querySelectorAll('.btn-adj').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.dataset.target;
        const adj = parseFloat(btn.dataset.adj);
        const stateKey = COND_INPUT_MAP[targetId];
        if (!stateKey) return;

        // 현재 값 가져오기 (lookupCondition의 기본값 또는 현재 override된 값)
        const area = state.floorArea || 0;
        if (area < 5000) return;
        const condition = lookupCondition(area);
        const currentVal = state.condOverride[stateKey] ?? condition[stateKey];

        // 새로운 값 계산 (0 미만 방지)
        const newVal = Math.max(0, currentVal + adj);
        state.condOverride[stateKey] = newVal;

        // 연동 로직 (월/연간 단가)
        if (targetId === 'cond-monthly-appointment') {
            state.condOverride.yearlyAppointment = newVal * 12;
        } else if (targetId === 'cond-yearly-appointment') {
            state.condOverride.monthlyAppointment = newVal / 12;
        }

        calculate();
    });
});

// ---- Item Toggles (Include/Exclude) ----
document.querySelectorAll('.btn-toggle-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.dataset.item;
        const currentActiveItems = Object.keys(state.itemToggles).filter(k => state.itemToggles[k]);

        // \ucd5c\uc18c 1\uac1c \uc720\uc9c0 \uc870\uac74
        if (state.itemToggles[item] && currentActiveItems.length <= 1) {
            alert("\ucd5c\uc18c 1\uac1c \uc774\uc0c1\uc758 \ud56d\ubaa9(\uc120\uc784/\uc720\uc9c0/\uc131\ub2a5)\uc774 \ud3ec\ud568\ub418\uc5b4\uc57c \ud569\ub2c8\ub2e4.");
            return;
        }

        state.itemToggles[item] = !state.itemToggles[item];
        calculate();
    });
});

// ---- Discount Adjuster Buttons ----
document.querySelectorAll('.btn-adj-discount').forEach(btn => {
    btn.addEventListener('click', () => {
        const adj = parseFloat(btn.dataset.adj);
        // 할인율 범위 제한 (0% ~ 100%)
        state.discount = Math.min(100, Math.max(0, state.discount + adj));
        calculate();
    });
});

// ---- Step Navigation Wizard ----
let currentStep = 1;

window.goToStep = function(step) {
    // Basic Validation before leaving current step
    if (step === 2 && currentStep === 1) {
        if (!state.address) {
            alert("주소를 먼저 검색하고 선택해주세요.");
            return;
        }
    }
    if (step === 3 && currentStep === 2) {
        if (!state.floorArea || state.floorArea < 5000) {
            alert("연면적이 부족하거나 입력되지 않았습니다. (최소 5,000㎡)");
            return;
        }
    }

    currentStep = step;

    // Update Header Navigation Indicators
    document.querySelectorAll('.step-indicator').forEach((el, index) => {
        const i = index + 1;
        el.classList.remove('active', 'completed');
        if (i < currentStep) {
            el.classList.add('completed');
        } else if (i === currentStep) {
            el.classList.add('active');
        }
    });

    // Toggle Content Panes
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });
    const activePane = document.getElementById(`step${step}-content`);
    if (activePane) {
        activePane.classList.add('active');
    }
    
    // Explicit visibility toggles (Right Panel Elements)
    document.getElementById('card-summary').style.display = (step >= 2) ? 'block' : 'none';
    document.getElementById('card-bottom-actions').style.display = (step === 3) ? 'flex' : 'none';
    
    // Kakao Map iFrame fix: re-init when going back to step 1
    if (step === 1) {
        const kakaoContainer = document.getElementById('kakao-embed-container');
        if (kakaoContainer) {
            kakaoContainer.innerHTML = ''; // clear broken iframe
            if (typeof initKakaoSearch === 'function') initKakaoSearch();
        }
    }

    const container = document.querySelector('.container');
    if (container) {
        if (step === 1) container.classList.add('step1-mode');
        else container.classList.remove('step1-mode');
    }
    
    // Auto trigger recalculate for safety
    calculate();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Start explicitly at Step 1
goToStep(1);
