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
        position: absolute;
        top: -9999px;
        left: -9999px;
        padding: 0;
        margin: 0;
        background-color: #ffffff;
        display: inline-block;
        line-height: 0;
        font-size: 0;          /* 인라인 블록 상단 여백 원천 제거 */
        overflow: hidden;      /* 혹시 남는 여백도 잘라냄 */
    `;

    // 4. 클론 셀에 개행 방지 + 스타일 적용
    clone.style.cssText = `
        border-collapse: collapse;
        white-space: nowrap;
        table-layout: auto;
        margin: 0;             /* 테이블 기본 마진 제거 */
        vertical-align: top;   /* 상단 정렬로 위쪽 빈 공간 제거 */
        font-size: 15px;       /* 래퍼에서 0으로 리셋했으므로 다시 설정 */
        line-height: 1.4;
    `;
    const allCells = clone.querySelectorAll("td, th");
    allCells.forEach(cell => {
        cell.style.whiteSpace = "nowrap";
        cell.style.padding = "12px 24px";
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
        // 5. 실제 렌더링 크기를 scrollWidth/scrollHeight로 측정
        //    offsetHeight는 뷰포트 밖에서 잘릴 수 있으므로 scrollHeight 사용
        const tableWidth  = clone.scrollWidth;
        const tableHeight = clone.scrollHeight;

        const canvas = await html2canvas(wrapper, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            width: tableWidth,
            windowWidth: tableWidth + 1
            // height는 지정하지 않음 → html2canvas가 전체 높이 자동 감지
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
