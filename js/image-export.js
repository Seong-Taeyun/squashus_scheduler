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

    // 모바일 등에서 캡처 전 스크롤을 맨 위로 올려야 잘림 방지 가능
    window.scrollTo(0, targetElement.offsetTop - 50);

    try {
        // html2canvas 옵션 설정: 레티나 디스플레이 고려(scale: 2), 배경색 흰색
        const canvas = await html2canvas(targetElement, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false
        });

        // 캔버스를 이미지 PNG 데이터 URL로 변환
        const imgData = canvas.toDataURL("image/png");

        // 파일명 생성
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
        const link = document.createElement("a");
        link.download = filename;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("이미지 캡처 실패:", error);
        alert("이미지로 내보내는 중 오류가 발생했습니다.");
    }
}
