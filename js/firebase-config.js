// ============================================
// Firebase 연결 및 설정 관리
// ============================================

let firebaseConfigData = null;
let db = null;
let firebaseConnected = false;
let connectionTimeout = null;

/**
 * Base64 인코딩 (보안 목적이 아닌 단순 문자열 변환임)
 * 🚨 주의: 이 방식은 암호화가 아니므로 브라우저 로컬스토리지에서 쉽게 디코딩 가능합니다.
 * 실제 서비스 레벨에서는 Firebase Console에서 'Database Rules(Security Rules)'를 
 * 올바르게 설정하여 인가되지 않은 접근을 차단하는 것이 올바른 보안 대책입니다.
 */
function encodeConfig(config) {
    return btoa(JSON.stringify(config));
}

function decodeConfig(encoded) {
    try {
        return JSON.parse(atob(encoded));
    } catch (e) {
        return null;
    }
}

function showFirebaseConfigInput() {
    document.getElementById("firebaseConfigInput").style.display = "block";
    document.getElementById("firebaseStatusContainer").style.display = "none";
}

function cancelFirebaseConfig() {
    document.getElementById("firebaseConfigInput").style.display = "none";
    document.getElementById("firebaseStatusContainer").style.display = "block";

    // 입력 필드 초기화
    document.getElementById("configTextarea").value = "";
    document.getElementById("configApiKey").value = "";
    document.getElementById("configAuthDomain").value = "";
    document.getElementById("configProjectId").value = "";
    document.getElementById("configStorageBucket").value = "";
    document.getElementById("configMessagingSenderId").value = "";
    document.getElementById("configAppId").value = "";
    document.getElementById("configDatabaseURL").value = "";
}

function toggleManualInput() {
    const manualFields = document.getElementById("manualInputFields");
    if (manualFields.style.display === "none") {
        manualFields.style.display = "block";
    } else {
        manualFields.style.display = "none";
    }
}

function parseFirebaseConfig(text) {
    try {
        const config = {};
        const fields = [
            "apiKey",
            "authDomain",
            "databaseURL",
            "projectId",
            "storageBucket",
            "messagingSenderId",
            "appId",
            "measurementId",
        ];

        fields.forEach((field) => {
            const regex = new RegExp(field + "\\s*:\\s*[\"']([^\"']+)[\"']", "i");
            const match = text.match(regex);
            if (match) {
                config[field] = match[1];
            }
        });

        if (!config.apiKey || !config.projectId) {
            throw new Error("필수 필드가 없습니다");
        }

        return config;
    } catch (e) {
        console.error("파싱 오류:", e);
        return null;
    }
}

function saveFirebaseConfig() {
    const textarea = document.getElementById("configTextarea");
    let config = null;

    if (textarea.value.trim()) {
        config = parseFirebaseConfig(textarea.value);
        if (!config) {
            alert(
                '서버 설정 형식이 올바르지 않습니다!\n\n관리자로부터 받은 설정 정보를 복사해서 붙여넣기 해주세요.\n\n예시:\nconst firebaseConfig = {\n  apiKey: "...",\n  ...\n};'
            );
            return;
        }
    } else {
        config = {
            apiKey: document.getElementById("configApiKey").value.trim(),
            authDomain: document.getElementById("configAuthDomain").value.trim(),
            projectId: document.getElementById("configProjectId").value.trim(),
            storageBucket: document.getElementById("configStorageBucket").value.trim(),
            messagingSenderId: document.getElementById("configMessagingSenderId").value.trim(),
            appId: document.getElementById("configAppId").value.trim(),
            databaseURL: document.getElementById("configDatabaseURL").value.trim(),
        };
    }

    if (!config.apiKey || !config.projectId || !config.databaseURL) {
        alert("API Key, Project ID, Database URL은 필수 항목입니다!");
        return;
    }

    // 로컬 스토리지에 인코딩하여 저장
    const encodedConfig = encodeConfig(config);
    localStorage.setItem("firebaseConfig", encodedConfig);

    firebaseConfigData = config;
    connectFirebase();
    cancelFirebaseConfig();
}

function loadFirebaseConfigFromLocal() {
    const encoded = localStorage.getItem("firebaseConfig");
    if (encoded) {
        const config = decodeConfig(encoded);
        if (config) {
            firebaseConfigData = config;
            connectFirebase();
            return true;
        }
    }

    const statusDiv = document.getElementById("firebaseStatus");
    statusDiv.className = "firebase-status firebase-disconnected";
    statusDiv.innerHTML = "서버 미설정<br><small>설정 버튼을 눌러 서버 정보를 입력하세요</small>";
    document.getElementById("configBtn").style.display = "inline-block";
    return false;
}

function deleteFirebaseConfig() {
    if (!confirm("서버 설정을 삭제하시겠습니까?\n삭제 후에는 다시 연결해야 합니다.")) {
        return;
    }

    localStorage.removeItem("firebaseConfig");
    firebaseConfigData = null;
    firebaseConnected = false;
    db = null;

    if (connectionTimeout) {
        clearTimeout(connectionTimeout);
    }

    const statusDiv = document.getElementById("firebaseStatus");
    statusDiv.className = "firebase-status firebase-disconnected";
    statusDiv.innerHTML = "서버 연결 해제됨<br><small>설정 버튼을 눌러 다시 연결하세요</small>";

    document.getElementById("configBtn").style.display = "inline-block";
    document.getElementById("deleteConfigBtn").style.display = "none";

    alert("서버 설정이 삭제되었습니다.");
}

function connectFirebase() {
    if (!firebaseConfigData) {
        console.warn("서버 설정이 없습니다.");
        return;
    }

    // 타임아웃 설정
    connectionTimeout = setTimeout(() => {
        if (!firebaseConnected) {
            const statusDiv = document.getElementById("firebaseStatus");
            statusDiv.className = "firebase-status firebase-disconnected";
            statusDiv.innerHTML = "서버 연결 시간 초과<br><small>설정을 확인하고 다시 시도해주세요</small>";
            alert("서버 연결 시간이 초과되었습니다. 설정을 확인해주세요.");
        }
    }, 10000);

    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfigData);
        }
        db = firebase.database();
        firebaseConnected = true;

        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
        }

        const statusDiv = document.getElementById("firebaseStatus");
        statusDiv.className = "firebase-status firebase-connected";
        statusDiv.textContent = "서버 연결 완료";

        document.getElementById("configBtn").style.display = "none";
        document.getElementById("deleteConfigBtn").style.display = "inline-block";

        console.log("서버에 성공적으로 연결되었습니다!");

        // 연결 성공 후 초기 데이터 로드 (외부에서 정의된 함수들)
        if (typeof loadSavedSchedulesList === "function") loadSavedSchedulesList();
        if (typeof loadStaffData === "function") loadStaffData();
    } catch (error) {
        console.error("서버 연결 오류:", error);

        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
        }

        const statusDiv = document.getElementById("firebaseStatus");
        statusDiv.className = "firebase-status firebase-disconnected";
        statusDiv.innerHTML = `서버 연결 실패<br><small>${error.message}</small>`;

        document.getElementById("configBtn").style.display = "inline-block";
        document.getElementById("deleteConfigBtn").style.display = "none";
    }
}
