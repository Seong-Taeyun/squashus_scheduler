// ============================================
// 이미지 내보내기 로직 (html2canvas)
// ============================================

async function downloadScheduleImage() {
    if (!scheduleData || scheduleData.length === 0) {
        alert("내보낼 스케줄이 없습니다!");
        return;
    }

    const targetElement = document.getElementById("scheduleTableContainer");
    if (!targetElement) {
        alert("캡처할 스케줄 표를 찾을 수 없습니다.");
        return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 핵심 전략: 화면에 보이는 DOM을 그대로 찍으면 모바일 폭에 맞춰 개행이 생깁니다.
    // 때문에 고정 너비(600px)의 '클론(복사본)'을 화면 밖(-9999px)에 임시로 만들고,
    // 그 클론만 캡처한 뒤 즉시 삭제합니다.
    // 이렇게 하면 기기 폭과 무관하게 항상 동일한 이미지가 저장됩니다.
    // ─────────────────────────────────────────────────────────────────────────
    const FIXED_WIDTH = 600; // 캡처할 이미지의 고정 너비(px)

    // 1. 클론 생성
    const clone = targetElement.cloneNode(true);

    // 2. 클론에 고정 너비 및 개행 방지 스타일 적용
    clone.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: ${FIXED_WIDTH}px;
        background-color: #ffffff;
        padding: 20px;
        box-sizing: border-box;
    `;

    // 3. 테이블 셀 텍스트 개행 방지: 날짜·지점·담당자 모두 nowrap 처리
    const allCells = clone.querySelectorAll("td, th");
    allCells.forEach(cell => {
        cell.style.whiteSpace = "nowrap";
        cell.style.padding = "12px 20px";
    });

    // 4. 테이블 자체는 고정 너비 내에서 자동 조절
    const table = clone.querySelector("table");
    if (table) {
        table.style.width = "100%";
        table.style.tableLayout = "auto"; // 컬럼 너비를 내용에 맞춰 자동 배분
    }

    // 5. 화면 바깥에 임시로 DOM에 추가
    document.body.appendChild(clone);

    try {
        // 레티나 디스플레이 대응(scale: 2), 배경 흰색으로 고품질 캡처
        const canvas = await html2canvas(clone, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            width: FIXED_WIDTH,
            windowWidth: FIXED_WIDTH
        });

        // 파일명 생성 (중복 방지를 위해 시간 포함)
        const monthInput = document.getElementById("targetMonth").value;
        const [year, month] = monthInput.split("-");
        const now = new Date();
        const timeStr = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + "_" +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

        const filename = `스쿼셔스_스케줄_${year}년${month}월_${timeStr}.png`;

        // 가상 링크를 이용해 다운로드 트리거
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = filename;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("이미지 캡처 실패:", error);
        alert("이미지로 내보내는 중 오류가 발생했습니다.");
    } finally {
        // 캡처 성공/실패 여부와 무관하게 클론 반드시 제거
        document.body.removeChild(clone);
    }
}
