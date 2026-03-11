// ============================================================================
// [怨듯넻 紐⑤뱢] common.js
// ?곌꼍?뺣낫?듭떊 媛??ъ뾽遺?먯꽌 怨듯넻?쇰줈 ?ъ슜?섎뒗 ?좏떥由ы떚 ?ㅽ겕由쏀듃
// - 移댁뭅???고렪踰덊샇 API ?곕룞 (UI ?쒖뼱 ?ы븿)
// - 怨듦났?곗씠?고룷??嫄댁텞臾쇰???API ?몄텧 (二쇱냼 湲곕컲 ?쒖젣遺 議고쉶)
// ============================================================================

const JUSO_API_KEY = "U01TX0FVVEgyMDI1MTAxMDExNDkyNjExNjMxMTY=";
const BUILDING_API_KEY = "a80d7fbe3842d32f845889a352543d38fde0cf1625508e615c3fbf5705d36578";

/**
 * 1. 嫄대Ъ???꾨줈紐?吏踰?二쇱냼 ?띿뒪?몃줈 ?됱젙?쒖?肄붾뱶(踰뺤젙?숈퐫???쒓뎔援ъ퐫???? 蹂?? */
async function getAddressInfo(keyword) {
    const url = `https://www.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${JUSO_API_KEY}&currentPage=1&countPerPage=5&keyword=${encodeURIComponent(keyword)}&resultType=json`;
    const res = await fetch(url);
    const data = await res.json();
    const common = data.results?.common;
    if (common?.errorCode !== '0') throw new Error(common?.errorMessage || '二쇱냼 API ?ㅻ쪟');
    const juso = data.results?.juso?.[0];
    if (!juso) throw new Error('寃?됰맂 二쇱냼媛 ?놁뒿?덈떎.');
    const admCd = juso.admCd || '';
    return {
        sigunguCd: admCd.substring(0, 5),
        bjdongCd: admCd.substring(5),
        bun: juso.lnbrMnnm || '',
        ji: juso.lnbrSlno || '0',
        roadAddr: juso.roadAddr,
        jibunAddr: juso.jibunAddr
    };
}

/**
 * 2. 嫄댁텞臾쇰????쒖젣遺 API瑜??몄텧?섏뿬 嫄대Ъ 硫댁쟻 諛??곸꽭 ?ㅽ럺 ?뚯븙
 */
async function fetchBuildingRegister(info) {
    const { sigunguCd, bjdongCd, bun, ji } = info;
    const paddedBun = bun.padStart(4, '0');
    const paddedJi = ji.padStart(4, '0');
    // HTTPS ?명솚 諛?XML ?묐떟??諛섑솚?섎뒗 ?덉쟾??Hub EndPoint ?ъ슜
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${BUILDING_API_KEY}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&bun=${paddedBun}&ji=${paddedJi}&numOfRows=100&pageNo=1`;

    const res = await fetch(url);
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const totalCount = parseInt(xmlDoc.getElementsByTagName('totalCount')[0]?.textContent || '0');
    if (totalCount === 0) throw new Error('?대떦 吏踰덉뿉 嫄댁텞臾쇰????뺣낫媛 ?놁뒿?덈떎.');

    const items = xmlDoc.getElementsByTagName('item');
    const arr = Array.from(items);

    // 二쇨굔異뺣Ъ(mainAtchGbCd === '0') 李얘린
    let target = arr.find(item => {
        const gbCd = item.getElementsByTagName('mainAtchGbCd')[0]?.textContent;
        return gbCd === '0';
    });
    if (!target) target = items[0];

    const getVal = (tag) => target.getElementsByTagName(tag)[0]?.textContent?.trim() || '';

    // 湲곗〈 app.js?먯꽌 ?ъ슜?섎뜕 怨듭슜 ?ㅽ궎留?Object) ?뺥깭濡?諛섑솚
    return {
        totArea: getVal('totArea'),
        mainPurpsCdNm: getVal('mainPurpsCdNm'),
        platArea: getVal('platArea'),
        archArea: getVal('archArea'),
        useAprDay: getVal('useAprDay'),
        bldNm: getVal('bldNm'),
        mainAtchGbCdNm: getVal('mainAtchGbCdNm')
    };
}

/**
 * 3. 移댁뭅???고렪踰덊샇 ?쒕퉬???꾨쿋??諛??대깽???몃뱾留?珥덇린??(index.html ?곕룞)
 */
function initKakaoPostcode(embedContainerId, onCompleteCallback) {
    const el = document.getElementById(embedContainerId);
    if (!el) {
        console.warn(`[Kakao] 컨테이너 요소(#${embedContainerId})를 찾을 수 없습니다.`);
        return;
    }

    if (!window.daum || !window.daum.Postcode) {
        console.warn("[Kakao] Postcode SDK 미준비 상태");
        return;
    }

    // 기존 내용 초기화
    el.innerHTML = '';

    function doEmbed() {
        // 컨테이너가 DOM에 렌더링되어 실제 크기가 잡혀있는지 확인
        if (el.offsetWidth === 0 || el.offsetHeight === 0) {
            // 크기가 아직 0이면 다음 애니메이션 프레임에서 재시도
            requestAnimationFrame(doEmbed);
            return;
        }

        new daum.Postcode({
            oncomplete: function (data) {
                let addr = data.roadAddress || data.jibunAddress;
                let extraAddr = '';

                if (data.bname !== '' && /[동로가]$/g.test(data.bname)) extraAddr += data.bname;
                if (data.buildingName !== '' && data.apartment === 'Y') {
                    extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
                }
                if (extraAddr !== '') addr += ` (${extraAddr})`;

                // 콜백 호출 (addr, buildingName, 원본 data 전달)
                if (typeof onCompleteCallback === 'function') {
                    onCompleteCallback(addr, data.buildingName, data);
                }
            },
            width: '100%',
            height: '100%'
        }).embed(el);
    }

    // requestAnimationFrame으로 레이아웃 완료 후 embed 실행
    requestAnimationFrame(doEmbed);
}

// Global Export
window.wkCommon = {
    getAddressInfo,
    fetchBuildingRegister,
    initKakaoPostcode
};
