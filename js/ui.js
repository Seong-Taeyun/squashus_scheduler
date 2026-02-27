// ============================================
// UI 구성 및 업데이트 로직 (달력, 체크박스 등)
// ============================================

let sundayLocations = {};

function updateSundaySchedule() {
    const sundayScheduleDiv = document.getElementById("sundaySchedule");
    sundayScheduleDiv.innerHTML = "";

    const monthInput = document.getElementById("targetMonth").value;
    if (!monthInput) {
        sundayScheduleDiv.innerHTML =
            '<p style="color: #666;">대상 월을 먼저 선택해주세요.</p>';
        return;
    }

    const [year, month] = monthInput.split("-").map(Number);
    const sundays = getSundaysInMonth(year, month);

    if (sundays.length === 0) {
        sundayScheduleDiv.innerHTML =
            '<p style="color: #666;">해당 월에 일요일이 없습니다.</p>';
        return;
    }

    sundays.forEach((sunday, index) => {
        const sundayItem = document.createElement("div");
        sundayItem.className = "sunday-schedule-item";

        const dateStr = `${sunday.getMonth() + 1}/${sunday.getDate()}`;
        const fullDateStr = `${year}-${String(sunday.getMonth() + 1).padStart(
            2,
            "0"
        )}-${String(sunday.getDate()).padStart(2, "0")}`;

        const label = document.createElement("label");
        label.textContent = `${dateStr} (${getWeekOfMonth(sunday)}주차):`;

        const locationInput = document.createElement("input");
        locationInput.type = "text";
        locationInput.className = "location-input";
        locationInput.placeholder = "운영 지점 입력 (예: 강남구)";
        locationInput.dataset.date = fullDateStr;

        if (sundayLocations && sundayLocations[fullDateStr]) {
            locationInput.value = sundayLocations[fullDateStr];
        }

        locationInput.addEventListener("input", function () {
            if (!sundayLocations) sundayLocations = {};
            sundayLocations[this.dataset.date] = this.value.trim();
        });

        sundayItem.appendChild(label);
        sundayItem.appendChild(locationInput);
        sundayScheduleDiv.appendChild(sundayItem);
    });
}

function updateSundayList(unavailableDates = {}) {
    const monthInput = document.getElementById("targetMonth").value;
    if (!monthInput) return;

    const [year, month] = monthInput.split("-").map(Number);
    const sundays = getSundaysInMonth(year, month);

    const container = document.getElementById("unavailableDates");
    container.innerHTML = "";

    const allStaff = getAllStaff();

    if (Object.keys(allStaff).length === 0) {
        container.innerHTML =
            '<p style="color: #666;">운영진 정보를 먼저 입력해주세요.</p>';
        return;
    }

    const gridContainer = document.createElement("div");
    gridContainer.className = "three-column";

    // allStaff는 이제 { "홍길동": { role: "leader" }, "김철수": { role: "staff" } } 형태입니다.
    Object.entries(allStaff).forEach(([staffName, staffInfo]) => {
        const staffDiv = document.createElement("div");
        staffDiv.style.padding = "10px";
        staffDiv.style.background = "var(--bg-secondary)";
        staffDiv.style.borderRadius = "10px";

        const title = document.createElement("h3");
        title.textContent = staffName;
        title.style.marginBottom = "10px";
        title.style.color = "var(--accent-orange)";
        title.style.fontSize = "1em";
        staffDiv.appendChild(title);

        const checkboxContainer = document.createElement("div");
        checkboxContainer.className = "unavailable-dates";

        // '전부 가능' 체크박스 추가
        const allAvailableLabel = document.createElement("label");
        allAvailableLabel.className = "date-checkbox";

        const allAvailableCheckbox = document.createElement("input");
        allAvailableCheckbox.type = "checkbox";
        allAvailableCheckbox.dataset.staff = staffName;
        allAvailableCheckbox.dataset.type = "all-available";

        const allAvailableText = document.createElement("span");
        allAvailableText.textContent = "전부 가능";
        allAvailableText.style.fontWeight = "bold";

        allAvailableLabel.appendChild(allAvailableCheckbox);
        allAvailableLabel.appendChild(allAvailableText);
        checkboxContainer.appendChild(allAvailableLabel);

        const dateCheckboxes = [];

        sundays.forEach((sunday) => {
            const label = document.createElement("label");
            label.className = "date-checkbox";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";

            const localDateStr = `${sunday.getFullYear()}-${String(
                sunday.getMonth() + 1
            ).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;
            const isoDateStr = sunday.toISOString().split("T")[0];

            checkbox.value = localDateStr;
            checkbox.dataset.staff = staffName;
            checkbox.dataset.date = localDateStr;
            checkbox.dataset.type = "unavailable";

            if (
                unavailableDates[staffName] &&
                (unavailableDates[staffName].includes(localDateStr) ||
                    unavailableDates[staffName].includes(isoDateStr))
            ) {
                checkbox.checked = true;
            }

            dateCheckboxes.push(checkbox);

            // 특정 날짜 불가능 체크박스 이벤트: 누르면 '전부 가능' 해제
            checkbox.addEventListener("change", function () {
                if (this.checked) {
                    allAvailableCheckbox.checked = false;
                } else {
                    // 모든 개별 체크박스가 해제되었는지 확인 후 '전부 가능' 자동 체크
                    const anyChecked = dateCheckboxes.some(cb => cb.checked);
                    if (!anyChecked) {
                        allAvailableCheckbox.checked = true;
                    }
                }
                checkConflicts();
            });

            const dateText = document.createElement("span");
            dateText.textContent = `${sunday.getMonth() + 1}/${sunday.getDate()}`;

            label.appendChild(checkbox);
            label.appendChild(dateText);
            checkboxContainer.appendChild(label);
        });

        // '전부 가능' 초기 상태 설정 (하나라도 불가능한 날짜가 체크되어 있으면 false)
        const isAnyDateChecked = dateCheckboxes.some(cb => cb.checked);
        allAvailableCheckbox.checked = !isAnyDateChecked;

        // '전부 가능' 체크박스 이벤트: 누르면 개별 불가능 날짜 모두 해제
        allAvailableCheckbox.addEventListener("change", function () {
            if (this.checked) {
                dateCheckboxes.forEach(cb => cb.checked = false);
            } else {
                // 사용자가 스스로 '전부 가능'을 해제하는 것도 허용 (물론 다시 날짜를 체크할 수도 있음)
            }
            checkConflicts();
        });

        staffDiv.appendChild(checkboxContainer);
        gridContainer.appendChild(staffDiv);
    });

    container.appendChild(gridContainer);

    // 초기 충돌 체크
    checkConflicts();
}

// 배치 충돌 사전 경고
function checkConflicts() {
    const monthInput = document.getElementById("targetMonth").value;
    if (!monthInput) return;

    const [year, month] = monthInput.split("-").map(Number);
    const sundays = getSundaysInMonth(year, month);
    const allStaff = getAllStaff();

    // 각 날짜별로 불가능한 운영진 수 카운트
    const unavailableCount = {};
    sundays.forEach((sunday) => {
        const dateStr = `${sunday.getFullYear()}-${String(
            sunday.getMonth() + 1
        ).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;
        unavailableCount[dateStr] = 0;
    });

    // 체크된 항목 카운트 (모임장 제외, '전부 가능' 체크박스 제외)
    document
        .querySelectorAll('.date-checkbox input[type="checkbox"][data-type="unavailable"]:checked')
        .forEach((checkbox) => {
            const staffName = checkbox.dataset.staff;

            // 모임장은 카운트에서 제외
            if (allStaff[staffName] && allStaff[staffName].role === "leader") return;

            const date = checkbox.dataset.date;
            if (unavailableCount[date] !== undefined) {
                unavailableCount[date]++;
            }
        });

    // 모든 운영진이 불가능한 날짜만 표시 (모임장 제외)
    // 리더를 뺀 실제 일반 운영진 수
    const totalStaff = Object.values(allStaff).filter(info => info.role !== "leader").length;

    document.querySelectorAll('.date-checkbox input[type="checkbox"][data-type="unavailable"]').forEach((checkbox) => {
        const label = checkbox.parentElement;
        const date = checkbox.dataset.date;

        label.classList.remove("conflict-warning");

        // 한 명도 배치 불가능한 경우 (모든 일반 운영진이 불가능)
        if (unavailableCount[date] === totalStaff && totalStaff > 0) {
            label.classList.add("conflict-warning");
            label.title = "⚠️ 이 날은 배치 가능한 운영진이 한 명도 없습니다!";
        } else {
            label.title = "";
        }
    });
}

function resetForm() {
    if (
        confirm(
            "현재 월의 설정(지점, 주차별 스케줄, 불가능한 날짜)을 초기화하시겠습니까?\n(운영진 목록은 유지됩니다)"
        )
    ) {
        document
            .querySelectorAll('input[type="checkbox"]')
            .forEach((checkbox) => (checkbox.checked = false));
        document.getElementById("result").style.display = "none";

        // scheduleData는 schedule.js에서 관리됨
        if (typeof scheduleData !== 'undefined') {
            scheduleData = [];
        }
        sundayLocations = {};

        updateSundaySchedule();
        updateSundayList();
    }
}
