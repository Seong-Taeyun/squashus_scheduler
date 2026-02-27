// ============================================
// 유틸리티 함수 모음
// ============================================

/**
 * 주어진 연월(year, month)의 모든 일요일 날짜 객체 배열 반환
 */
function getSundaysInMonth(year, month) {
    const sundays = [];
    const date = new Date(year, month - 1, 1);

    while (date.getDay() !== 0) {
        date.setDate(date.getDate() + 1);
    }

    while (date.getMonth() === month - 1) {
        sundays.push(new Date(date));
        date.setDate(date.getDate() + 7);
    }

    return sundays;
}

/**
 * 주어진 날짜가 해당 월의 몇 주차인지 반환
 */
function getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstSunday = new Date(firstDay);
    while (firstSunday.getDay() !== 0) {
        firstSunday.setDate(firstSunday.getDate() + 1);
    }

    const diffDays = Math.floor((date - firstSunday) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
}

/**
 * 배경색(hex)에 대비되는 텍스트 색상(검정/흰색) 반환
 */
function getContrastColor(hex) {
    if (!hex) return "#000";
    hex = hex.replace("#", "").trim();
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 180 ? "#000" : "#fff";
}

/**
 * 배열 요소를 무작위로 섞음 (Fisher-Yates 알고리즘)
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
