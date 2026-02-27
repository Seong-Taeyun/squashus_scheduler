// ============================================
// 운영진 관리 (추가, 로드, 저장)
// ============================================

let staffCounter = 0;

function addStaff(role = "staff") {
    // 모임장은 추가 불가 (고정됨)
    if (role === "leader") {
        alert("모임장은 고정되어 있습니다.");
        return;
    }

    staffCounter++;
    const staffList = document.getElementById("staffList");
    const staffId = `staff_${staffCounter}`;

    const staffItem = document.createElement("div");
    staffItem.className = "staff-item";
    staffItem.id = staffId;

    // 역할 배지
    const badge = document.createElement("span");
    badge.className = "role-badge role-general";
    badge.textContent = "운영진";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "운영진 이름";
    // dataset.id 대신 이름을 바로 쓰기 때문에 더 이상 staffId 의존하지 않음
    input.dataset.role = role;

    // 입력 시 휴무일 체크박스 목록 즉시 업데이트
    if (typeof updateSundayList === "function") {
        input.addEventListener("input", updateSundayList);
    }

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "삭제";
    removeBtn.onclick = function () {
        if (confirm("이 운영진을 삭제하시겠습니까?")) {
            staffList.removeChild(staffItem);
            if (typeof updateSundayList === "function") updateSundayList();
        }
    };

    staffItem.appendChild(badge);
    staffItem.appendChild(input);
    staffItem.appendChild(removeBtn);

    staffList.appendChild(staffItem);

    if (typeof updateSundayList === "function") updateSundayList();
}

function getAllStaff() {
    const staff = {};

    // 고정된 모임장 input 처리
    const leaderInput = document.querySelector("#leader input");
    if (leaderInput) {
        const leaderName = leaderInput.value.trim();
        if (leaderName) {
            staff[leaderName] = { role: "leader" };
        }
    }

    // 일반 운영진 input 처리
    const staffInputs = document.querySelectorAll("#staffList input:not([data-role='leader'])");
    staffInputs.forEach((input) => {
        const name = input.value.trim();
        if (name) {
            staff[name] = { role: "staff" };
        }
    });

    return staff;
}

function saveStaffData() {
    if (!firebaseConnected || !db) {
        alert("서버에 먼저 연결해주세요!");
        return;
    }

    const allStaff = getAllStaff();

    if (Object.keys(allStaff).length === 0) {
        alert("저장할 운영진 정보가 없습니다!");
        return;
    }

    db.ref("clubData/staff")
        .set(allStaff)
        .then(() => {
            alert("운영진 목록이 서버에 저장되었습니다!");
        })
        .catch((error) => {
            alert("저장 실패: " + error.message);
        });
}

function loadStaffData() {
    if (!firebaseConnected || !db) {
        console.warn("서버 미연결. 운영진 로드 스킵.");
        return;
    }

    db.ref("clubData/staff")
        .once("value")
        .then((snapshot) => {
            const data = snapshot.val();
            if (!data) {
                console.log("저장된 운영진 정보가 없습니다.");
                if (typeof loadMonthSettings === "function") loadMonthSettings();
                return;
            }

            // 모임장을 제외한 운영진만 초기화
            const staffItems = document.querySelectorAll(
                "#staffList .staff-item:not(#leader)"
            );
            staffItems.forEach((item) => item.remove());
            staffCounter = 0;

            Object.entries(data).forEach(([staffName, staffInfo]) => {
                if (staffInfo.role === "leader") {
                    // 모임장 이름 설정 (고정 input에)
                    const leaderInput = document.querySelector("#leader input");
                    if (leaderInput) {
                        leaderInput.value = staffName;
                    }
                } else {
                    // 일반 운영진 추가
                    addStaff("staff");
                    const inputs = document.querySelectorAll("#staffList input[data-role='staff']");
                    const lastInput = inputs[inputs.length - 1];
                    if (lastInput) {
                        lastInput.value = staffName;
                    }
                }
            });

            console.log("운영진 정보를 성공적으로 불러왔습니다.");

            if (typeof updateSundayList === "function") updateSundayList();
            if (typeof loadMonthSettings === "function") loadMonthSettings();
        })
        .catch((error) => {
            alert("운영진 정보 불러오기 실패: " + error.message);
        });
}
