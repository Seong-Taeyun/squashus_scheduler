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

    // ───────────────────────────────────────────────────────────────────────
    // 캡처 전략:
    //   - 컨테이너 div의 패딩 때문에 빈 여백이 생깁니다.
    //   - 컨테이너가 아닌 내부의 <table> 요소만 직접 복제하여 캡처합니다.
    //   - 고정 너비(windowWidth)를 지정하여 뷰포트 폭에 무관하게 항상 같은 이미지를 생성합니다.
    // ───────────────────────────────────────────────────────────────────────

    // 1. 컨테이너 안의 <table>만 추출
    const originalTable = targetElement.querySelector("table");
    if (!originalTable) {
        alert("표를 찾을 수 없습니다.");
        return;
    }

    // 2. 테이블 클론 생성 (원본 표를 전혀 건드리지 않음)
    const clone = originalTable.cloneNode(true);

    // 3. 클론을 감싸는 얇은 래퍼 div 생성 (패딩/마진 0, 화면 밖 배치)
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        padding: 0;
        margin: 0;
        background-color: #ffffff;
        display: inline-block;   /* 테이블 크기에 딱 맞게 수축 */
        line-height: 0;           /* 인라인 블록 하단 여백 제거 */
    `;

    // 4. 클론 셀에 개행 방지 + 스타일 적용
    clone.style.cssText = `
        border-collapse: collapse;
        white-space: nowrap;
        table-layout: auto;
    `;
    const allCells = clone.querySelectorAll("td, th");
    allCells.forEach(cell => {
        cell.style.whiteSpace = "nowrap";
        cell.style.padding = "12px 24px";
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
        // 5. 테이블 실제 렌더링 크기를 측정하여 캡처 크기로 사용
        const tableWidth  = clone.offsetWidth;
        const tableHeight = clone.offsetHeight;

        const canvas = await html2canvas(wrapper, {
            scale: 2,                      // 레티나 고해상도
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            width: tableWidth,             // 표 너비에 딱 맞게
            height: tableHeight,           // 표 높이에 딱 맞게
            windowWidth: tableWidth + 1    // 스크롤바 여지 방지
        });

        // 6. 파일명 생성 (중복 방지용 시간 포함)
        const monthInput = document.getElementById("targetMonth").value;
        const [year, month] = monthInput.split("-");
        const now = new Date();
        const timeStr = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0") + "_" +
            String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0") +
            String(now.getSeconds()).padStart(2, "0");

        const filename = `스쿼셔스_스케줄_${year}년${month}월_${timeStr}.png`;

        // 7. 다운로드 트리거
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
        // 8. 성공·실패 무관하게 임시 DOM 반드시 정리
        document.body.removeChild(wrapper);
    }
}
