// ============================================
// 스케줄 생성 및 저장 로직
// ============================================

let scheduleData = [];

function loadPastMonthSettings(currentMonth) {
    if (!db) return;
    db.ref("monthlySettings")
        .once("value")
        .then((snapshot) => {
            const allSettings = snapshot.val();

            if (!allSettings) {
                console.log("저장된 월별 설정이 전혀 없습니다.");
                if (typeof updateSundayList === "function") updateSundayList();
                return;
            }

            const pastMonths = Object.keys(allSettings)
                .filter((month) => month < currentMonth)
                .sort()
                .reverse();

            if (pastMonths.length === 0) {
                console.log("과거 설정을 찾을 수 없습니다.");
                if (typeof updateSundayList === "function") updateSundayList();
                return;
            }

            const nearestPastMonth = pastMonths[0];
            const pastData = allSettings[nearestPastMonth];

            console.log(
                `${nearestPastMonth}월의 설정을 불러왔습니다. (${currentMonth}월에 적용)`
            );

            if (typeof updateSundaySchedule === "function") updateSundaySchedule();

            alert(
                `${currentMonth}월 설정이 없어 ${nearestPastMonth}월의 설정을 참고했습니다.\n주차별 스케줄과 휴무일은 초기화되었으니 다시 설정해주세요.`
            );

            if (typeof updateSundayList === "function") updateSundayList();
        })
        .catch((error) => {
            console.error("과거 설정 불러오기 실패:", error);
            if (typeof updateSundayList === "function") updateSundayList();
        });
}

function saveMonthSettings() {
    if (!firebaseConnected || !db) {
        alert("서버에 먼저 연결해주세요!");
        return;
    }
    const monthInput = document.getElementById("targetMonth").value;
    if (!monthInput) {
        alert("대상 월을 선택해주세요!");
        return;
    }

    const unavailable = {};
    document
        .querySelectorAll('input[type="checkbox"]:checked')
        .forEach((checkbox) => {
            const staffId = checkbox.dataset.staff;
            if (!unavailable[staffId]) {
                unavailable[staffId] = [];
            }
            unavailable[staffId].push(checkbox.value);
        });

    const locations = typeof getAllLocations === "function" ? getAllLocations() : {};

    const data = {
        unavailableDates: unavailable,
        locations: locations,
        sundayLocations: sundayLocations || {},
        updatedAt: new Date().toISOString(),
    };

    db.ref("monthlySettings/" + monthInput)
        .set(data)
        .then(() => {
            alert(`${monthInput}월 설정이 서버에 저장되었습니다!`);
        })
        .catch((error) => {
            alert("저장 실패: " + error.message);
        });
}

function loadMonthSettings() {
    if (!firebaseConnected || !db) {
        console.warn("서버 미연결. 월별 설정 로드 스킵.");
        return;
    }
    const monthInput = document.getElementById("targetMonth").value;
    if (!monthInput) return;

    console.log(`${monthInput}월 설정 불러오는 중...`);

    db.ref("monthlySettings/" + monthInput)
        .once("value")
        .then((snapshot) => {
            const data = snapshot.val();
            if (!data) {
                console.log(
                    `${monthInput}월에 저장된 설정이 없습니다. 과거 설정 검색 중...`
                );
                loadPastMonthSettings(monthInput);
                return;
            }

            if (data.sundayLocations) {
                sundayLocations = data.sundayLocations;
                if (typeof updateSundaySchedule === "function") updateSundaySchedule();
            }

            if (typeof updateSundayList === "function") updateSundayList(data.unavailableDates || {});
            console.log(`${monthInput}월 설정을 불러왔습니다!`);
        })
        .catch((error) => {
            alert("월별 설정 불러오기 실패: " + error.message);
        });
}

function generateSchedule() {
    const allStaff = typeof getAllStaff === "function" ? getAllStaff() : {};

    const assignmentCounts = {};
    Object.keys(allStaff).forEach((staffName) => {
        assignmentCounts[staffName] = 0;
    });

    // 이제 모임장의 설정 저장 여부를 실제 이름 키에서 찾습니다.
    const leaderStaffEntry = Object.entries(allStaff).find(([name, info]) => info.role === "leader");
    if (!leaderStaffEntry) {
        alert("모임장 이름을 입력해주세요!");
        return;
    }
    const leaderName = leaderStaffEntry[0];

    // 모임장을 제외한 운영진 리스트
    const partnerStaffList = Object.entries(allStaff).filter(
        ([name, info]) => info.role !== "leader"
    );
    if (partnerStaffList.length === 0) {
        alert("운영진을 최소 1명 이상 추가해주세요!");
        return;
    }

    const monthInput = document.getElementById("targetMonth").value;
    if (!monthInput) {
        alert("대상 월을 선택해주세요!");
        return;
    }

    const unavailable = {};
    Object.keys(allStaff).forEach((staffName) => {
        unavailable[staffName] = [];
    });

    document
        .querySelectorAll('.date-checkbox input[type="checkbox"][data-type="unavailable"]:checked')
        .forEach((checkbox) => {
            const staffName = checkbox.dataset.staff;
            if (unavailable[staffName]) {
                unavailable[staffName].push(checkbox.value);
            }
        });

    const [year, month] = monthInput.split("-").map(Number);
    const sundays = getSundaysInMonth(year, month);

    const meetings = [];
    sundays.forEach((sunday) => {
        const y = sunday.getFullYear();
        const m = String(sunday.getMonth() + 1).padStart(2, "0");
        const d = String(sunday.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        const region = sundayLocations[dateStr];
        if (region && region.trim()) {
            meetings.push({
                date: dateStr,
                region: region.trim(),
                type: "모임",
                week: getWeekOfMonth(sunday),
            });
        }
    });

    meetings.sort((a, b) => {
        if (a.date !== b.date) {
            return new Date(a.date) - new Date(b.date);
        }
        return 0;
    });

    // 각 운영진이 이번 달 생성될 스케줄(meetings) 중에서 '배정 가능한 날 수'를 미리 계산합니다.
    const availableCountsInMonth = {};
    partnerStaffList.forEach(([name, info]) => {
        let count = 0;
        meetings.forEach(meeting => {
            if (!unavailable[name].includes(meeting.date)) {
                count++;
            }
        });
        availableCountsInMonth[name] = count;
    });

    const assignments = [];
    const warnings = [];

    for (let meeting of meetings) {
        const { date, region, type, week } = meeting;

        let leaderAssigned = false;
        if (region.includes("강북")) {
            const leaderAvailable = !unavailable[leaderName].includes(date);
            if (leaderAvailable) {
                leaderAssigned = true;
            }
        }

        let availablePartners = partnerStaffList.filter(
            ([name, info]) => !unavailable[name].includes(date)
        );

        if (availablePartners.length > 0) {
            availablePartners = shuffleArray(availablePartners);

            // 정렬 최우선순위: 소속 횟수가 가장 적은 사람.
            // 동점일 경우: 이번 달에 "배정 가능한 날짜(잔여 기회)"가 더 적은 사람을 최우선으로 구제합니다.
            availablePartners.sort((a, b) => {
                if (assignmentCounts[a[0]] !== assignmentCounts[b[0]]) {
                    return assignmentCounts[a[0]] - assignmentCounts[b[0]];
                }
                return availableCountsInMonth[a[0]] - availableCountsInMonth[b[0]];
            });
            const [assignedStaffName, assignedStaffInfo] = availablePartners[0];

            let displayStaffName;
            if (leaderAssigned) {
                displayStaffName = `${leaderName}, ${assignedStaffName}`;
                assignmentCounts[leaderName]++;
            } else {
                displayStaffName = assignedStaffName;
            }

            assignments.push({
                date,
                region,
                type,
                week,
                staff: displayStaffName,
            });

            assignmentCounts[assignedStaffName]++;
        } else {
            let displayStaffName = leaderAssigned
                ? `${leaderName}, 운영진 배치 불가`
                : "운영진 배치 불가";

            assignments.push({
                date,
                region,
                type,
                week,
                staff: displayStaffName,
                failReason: displayStaffName
            });

            warnings.push(
                `${date} (${region}): 배치 가능한 운영진이 없습니다!`
            );

            if (leaderAssigned) {
                assignmentCounts[leaderName]++;
            }
        }
    }

    // 경고 메시지 표시
    if (warnings.length > 0) {
        const warningMsg =
            "⚠️ 다음 날짜에 운영진 배치에 문제가 있습니다:\n\n" +
            warnings.join("\n");
        alert(warningMsg);
    }

    scheduleData = assignments;
    displayResults(assignments, year, month);
}

// XSS 방지 처리 추가
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function displayResults(assignments, year, month) {
    const resultDiv = document.getElementById("resultContent");
    const stats = calculateStats(assignments);

    const totalMeetings = assignments.length;
    const failedCount = assignments.filter((a) =>
        a.staff.includes("배치 불가")
    ).length;

    let html = `
  <div class="alert alert-success">
      ${year}년 ${month}월 스케줄이 생성되었습니다! (총 ${totalMeetings}건, 배정 실패 ${failedCount}건)
  </div>
  `;

    html += `
  <div class="stats">
      ${Object.entries(stats)
            .map(
                ([name, count]) => `
          <div class="stat-card">
              <h3>${escapeHtml(name)}</h3>
              <div class="number">${count}회</div>
          </div>
      `
            )
            .join("")}
   </div>
   
  <div id="scheduleTableContainer" style="background-color: white; padding: 20px;">
      <table class="result-table" style="border-collapse: collapse; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;">
          <thead>
              <tr>
                  <th style="background-color: #2b3164; color: white; padding: 15px; border: 1px solid #2b3164; text-align: center; border-right: 1px solid #3c4276;">날짜</th>
                  <th style="background-color: #2b3164; color: white; padding: 15px; border: 1px solid #2b3164; text-align: center; border-right: 1px solid #3c4276;">지점</th>
                  <th style="background-color: #2b3164; color: white; padding: 15px; border: 1px solid #2b3164; text-align: center;">담당자</th>
              </tr>
          </thead>
          <tbody>
`;

    assignments.forEach((assignment) => {
        const [y, m, d] = assignment.date.split("-").map(Number);
        const displayDate = `${y}. ${m}. ${d}`;

        let staffStr = assignment.staff;

        if (assignment.staff.includes("배치 불가")) {
            staffStr = assignment.failReason || "운영진 배치 불가";
        }

        html += `
      <tr>
          <td style="border: 1px solid #ebebeb; padding: 15px; font-weight: bold; text-align: center; color: #333; background-color: #fff;">${displayDate}</td>
          <td style="border: 1px solid #ebebeb; padding: 15px; text-align: center; color: #333; background-color: #fff;">${escapeHtml(assignment.region)}</td>
          <td class="editable-cell" style="border: 1px solid #ebebeb; padding: 15px; text-align: center; color: #333; background-color: #fff;" 
              onclick="editStaff(event, '${escapeHtml(assignment.date)}')">${escapeHtml(staffStr)}</td>
      </tr>
    `;
    });

    html += `</tbody></table></div>`;

    resultDiv.innerHTML = html;
    document.getElementById("result").style.display = "block";
    document
        .getElementById("result")
        .scrollIntoView({ behavior: "smooth" });
}

// 명시적으로 event 객체 전달받도록 수정 (기존의 전역 event 참조 버그 수정)
function editStaff(event, date) {
    const assignment = scheduleData.find((a) => a.date === date);

    if (!assignment || assignment.staff.includes("배치 불가")) {
        alert("담당자를 배정할 수 없는 일정입니다.");
        return;
    }

    const allStaff = typeof getAllStaff === "function" ? getAllStaff() : {};
    const cell = event.target;
    const originalContent = cell.textContent;

    cell.contentEditable = true;
    cell.style.backgroundColor = "#fff8dc";
    cell.style.outline = "2px solid var(--accent-orange)";
    cell.focus();

    const range = document.createRange();
    range.selectNodeContents(cell);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    let isSaved = false;

    const saveChanges = () => {
        if (isSaved) return;
        isSaved = true;

        cell.contentEditable = false;
        cell.style.backgroundColor = "";
        cell.style.outline = "";

        const newText = cell.textContent.trim();

        if (!newText) {
            cell.textContent = originalContent;
            return;
        }

        const names = newText
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n);

        const validNames = [];
        names.forEach((name) => {
            const staffEntry = Object.entries(allStaff).find(
                ([staffName, info]) =>
                    staffName === name ||
                    staffName.includes(name) ||
                    name.includes(staffName)
            );
            if (staffEntry) {
                validNames.push(staffEntry[0]); // name을 직접 저장
            }
        });

        if (validNames.length === 0) {
            alert(
                "올바른 운영진 이름을 입력해주세요.\n쉼표(,)로 구분하여 여러 명을 입력할 수 있습니다."
            );
            cell.textContent = originalContent;
            return;
        }

        assignment.staff = validNames.join(", ");

        const [year, month] = document
            .getElementById("targetMonth")
            .value.split("-")
            .map(Number);
        displayResults(scheduleData, year, month);
    };

    const cancelEdit = () => {
        if (isSaved) return;
        isSaved = true;

        cell.contentEditable = false;
        cell.style.backgroundColor = "";
        cell.style.outline = "";
        cell.textContent = originalContent;
    };

    const keydownHandler = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();

            cell.removeEventListener("keydown", keydownHandler);
            cell.removeEventListener("blur", blurHandler);
            saveChanges();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cell.removeEventListener("keydown", keydownHandler);
            cell.removeEventListener("blur", blurHandler);
            cancelEdit();
        }
    };

    const blurHandler = () => {
        cell.removeEventListener("keydown", keydownHandler);
        saveChanges();
    };

    cell.addEventListener("keydown", keydownHandler);
    cell.addEventListener("blur", blurHandler);
}

function calculateStats(assignments) {
    const stats = {};

    assignments.forEach((item) => {
        if (item.staff.includes("배치 불가")) return;

        const names = item.staff.split(",").map((n) => n.trim());
        names.forEach((name) => {
            stats[name] = (stats[name] || 0) + 1;
        });
    });

    return stats;
}

function saveScheduleToFirebase() {
    if (!firebaseConnected || !db) {
        alert("서버에 먼저 연결해주세요!");
        return;
    }

    if (!scheduleData || scheduleData.length === 0) {
        alert("저장할 스케줄이 없습니다!");
        return;
    }

    const monthInput = document.getElementById("targetMonth").value;
    const [year, month] = monthInput.split("-");

    const performSave = () => {
        const scheduleId = `${year}_${month}_${Date.now()}`;

        const scheduleToSave = {
            id: scheduleId,
            year: parseInt(year),
            month: parseInt(month),
            data: scheduleData,
            createdAt: new Date().toISOString(),
        };

        db.ref("schedules/" + scheduleId)
            .set(scheduleToSave)
            .then(() => {
                alert("스케줄이 서버에 새 버전으로 저장되었습니다!");
                loadSavedSchedulesList();
            })
            .catch((error) => {
                alert("저장 실패: " + error.message);
            });
    };

    const query = db
        .ref("schedules")
        .orderByChild("id")
        .startAt(`${year}_${month}`)
        .endAt(`${year}_${month}\uf8ff`);

    query
        .once("value")
        .then((snapshot) => {
            if (snapshot.exists()) {
                if (
                    confirm(
                        `"${year}년 ${month}월" 스케줄이 이미 저장되어 있습니다.\n새로운 버전으로 추가 저장하시겠습니까?`
                    )
                ) {
                    performSave();
                } else {
                    alert("저장이 취소되었습니다.");
                }
            } else {
                performSave();
            }
        })
        .catch((error) => {
            alert("스케줄 확인 중 오류 발생: " + error.message);
        });
}

function loadSavedSchedulesList() {
    if (!firebaseConnected || !db) return;

    db.ref("schedules")
        .once("value")
        .then((snapshot) => {
            const schedules = snapshot.val();
            if (!schedules) {
                document.getElementById("savedSchedulesSection").style.display =
                    "none";
                return;
            }

            const schedulesList = document.getElementById("savedSchedulesList");
            schedulesList.innerHTML = "";

            Object.entries(schedules).forEach(([id, schedule]) => {
                const scheduleItem = document.createElement("div");
                scheduleItem.className = "schedule-item";

                const info = document.createElement("div");
                info.className = "schedule-info";

                const title = document.createElement("h4");
                title.textContent = `${schedule.year}년 ${schedule.month}월 스케줄`;

                const date = document.createElement("p");
                const createdDate = new Date(schedule.createdAt);
                date.textContent = `저장일: ${createdDate.toLocaleDateString(
                    "ko-KR"
                )} ${createdDate.toLocaleTimeString("ko-KR")}`;

                info.appendChild(title);
                info.appendChild(date);

                const actions = document.createElement("div");
                actions.className = "schedule-actions";

                const loadBtn = document.createElement("button");
                loadBtn.className = "btn btn-primary btn-small";
                loadBtn.textContent = "불러오기";
                loadBtn.onclick = () => loadScheduleFromFirebase(id);

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "btn btn-danger btn-small";
                deleteBtn.textContent = "삭제";
                deleteBtn.onclick = () => deleteScheduleFromFirebase(id);

                actions.appendChild(loadBtn);
                actions.appendChild(deleteBtn);

                scheduleItem.appendChild(info);
                scheduleItem.appendChild(actions);

                schedulesList.appendChild(scheduleItem);
            });

            document.getElementById("savedSchedulesSection").style.display =
                "block";
        })
        .catch((error) => {
            console.error("스케줄 목록 불러오기 실패:", error);
        });
}

function loadScheduleFromFirebase(scheduleId) {
    if (!db) return;
    db.ref("schedules/" + scheduleId)
        .once("value")
        .then((snapshot) => {
            const schedule = snapshot.val();
            if (!schedule) {
                alert("스케줄을 찾을 수 없습니다!");
                return;
            }

            document.getElementById("targetMonth").value = `${schedule.year
                }-${String(schedule.month).padStart(2, "0")}`;

            scheduleData = schedule.data;
            displayResults(scheduleData, schedule.year, schedule.month);
        })
        .catch((error) => {
            alert("불러오기 실패: " + error.message);
        });
}

function deleteScheduleFromFirebase(scheduleId) {
    if (!db) return;
    if (!confirm("이 스케줄을 삭제하시겠습니까?")) return;

    db.ref("schedules/" + scheduleId)
        .remove()
        .then(() => {
            alert("스케줄이 삭제되었습니다!");
            loadSavedSchedulesList();
        })
        .catch((error) => {
            alert("삭제 실패: " + error.message);
        });
}
