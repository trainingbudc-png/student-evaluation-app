const API_URL = "https://script.google.com/macros/s/AKfycbyN4lbHJlSyE6fACZP5Dm_VqA1OJnY9TXsHsdZOBC5WJkv3_Kzna7KidIezqtEi8xRCdg/exec";

let loggedInTeacher = null;
let allStudents = [];
let rubricTopics = []; // เก็บหัวข้อ Rubrics
let studentImgMap = {}; 
let allCriteriaData = []; 

async function checkEvaluationHistory() {
    const teacherName = document.getElementById("teacherName").value;
    if (!teacherName) {
        Swal.fire('แจ้งเตือน', 'ไม่พบชื่ออาจารย์ในระบบ กรุณาเข้าสู่ระบบใหม่', 'warning');
        return;
    }

    showLoadingPopup("กำลังดึงข้อมูล...", "กำลังค้นหาประวัติการประเมินของคุณ");

    try {
        const response = await fetch(API_URL + "?action=getAdminAllData");
        const res = await response.json();
        
        const history = res.evaluationResults.filter(r => String(r["ชื่อผู้ประเมิน"]).trim() === String(teacherName).trim());
        
        if (history.length === 0) {
            Swal.fire('ประวัติการประเมิน', 'ยังไม่มีประวัติการประเมินนิสิตในระบบครับ', 'info');
            return;
        }

        let htmlContent = `
            <div style="margin-bottom: 16px;">
                <input type="text" id="swalSearchInput" placeholder="🔍 ค้นหา รหัสนิสิต, ชื่อ-นามสกุล หรือ รหัสวิชา..." 
                       style="width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 15px; font-family: 'Prompt', sans-serif; outline: none; transition: border-color 0.2s;"
                       onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'">
            </div>
            <div id="swalHistoryList" style="max-height: 420px; overflow-y: auto; text-align: left; font-size: 14px; padding-right: 4px;">
        `;
        
        history.reverse().forEach((item, index) => {
            let detailsText = "- ไม่มีรายละเอียดระบุ -";
            let rawDetails = item["รายละเอียดคะแนน (JSON String)"] || item["รายละเอียดคะแนน"] || item.scoreDetails;
            
            try { 
                if (rawDetails) {
                    let parsed = JSON.parse(rawDetails); 
                    
                    // --- ส่วนที่ปรับปรุงเพิ่มเติม (ซ่อนรายการที่ "ไม่ได้ทำ") ---
                    if (Array.isArray(parsed)) {
                        let filtered = parsed.filter(p => p.detail !== "ไม่ได้ทำ");
                        if(filtered.length > 0) {
                            detailsText = filtered.map(p => `• <b>${p.topic}</b>: ${p.detail || ''} (${p.score || 0} คะแนน)`).join('<br>');
                        } else {
                            detailsText = "<span style='color: #9ca3af;'>- ไม่มีรายการที่ถูกประเมิน -</span>";
                        }
                    } else {
                        let filteredKeys = Object.keys(parsed).filter(k => parsed[k].level !== "ไม่ได้ทำ" && parsed[k].detail !== "ไม่ได้ทำ");
                        if(filteredKeys.length > 0) {
                            detailsText = filteredKeys.map(k => `• <b>${k}</b>: ${parsed[k].level || parsed[k].detail || ''} (${parsed[k].score || 0} คะแนน)`).join('<br>');
                        } else {
                            detailsText = "<span style='color: #9ca3af;'>- ไม่มีรายการที่ถูกประเมิน -</span>";
                        }
                    }
                    // ------------------------------------------------
                }
            } catch(e) {
                detailsText = rawDetails || detailsText;
            }

            let searchKeyword = `${item["รหัสนิสิต"]} ${item["ชื่อนิสิต"]} ${item["รหัสวิชา"]} ${item["Form_Type"] || item["Topic"]}`.toLowerCase();

            htmlContent += `
            <div class="history-item" data-search="${searchKeyword}" style="padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; background: #ffffff; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: flex-start;">
                    <span style="font-weight: bold; color: #1e40af; font-size: 15px;">${index + 1}. ${item["ชื่อนิสิต"]}</span>
                    <span style="font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px;">${item["Timestamp"]}</span>
                </div>
                <div style="font-size: 13.5px; margin-bottom: 10px; color: #475569; line-height: 1.6;">
                    <span style="display: inline-block; width: 80px;"><b>รหัสนิสิต:</b></span> <span style="color: #334155;">${item["รหัสนิสิต"]}</span> <br>
                    <span style="display: inline-block; width: 80px;"><b>วิชา:</b></span> <span style="color: #334155;">${item["รหัสวิชา"]}</span> <br>
                    <span style="display: inline-block; width: 80px;"><b>หัวข้อ:</b></span> <span style="color: #059669; font-weight: bold; background: #d1fae5; padding: 0 6px; border-radius: 4px;">${item["Form_Type"] || item["Topic"]}</span> <br>
                    <span style="display: inline-block; width: 80px;"><b>คะแนนรวม:</b></span> <span style="color: #ea580c; font-weight: bold;">${item["คะแนนรวม"]} (${item["เกรด"]})</span>
                </div>
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 12.5px; border: 1px dashed #cbd5e1; line-height: 1.5;">
                    <b style="color: #334155; display: block; margin-bottom: 6px;">รายละเอียดที่ประเมินไป:</b>
                    <div style="color: #64748b;">${detailsText}</div>
                </div>
            </div>`;
        });
        htmlContent += `</div>`;

        Swal.fire({
            title: '📋 ประวัติการประเมินของคุณ',
            html: htmlContent,
            width: '750px',
            confirmButtonText: 'ปิดหน้าต่าง',
            confirmButtonColor: '#3b82f6',
            didOpen: () => {
                const searchInput = document.getElementById('swalSearchInput');
                const historyList = document.getElementById('swalHistoryList');
                const items = historyList.getElementsByClassName('history-item');

                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    for (let i = 0; i < items.length; i++) {
                        const keyword = items[i].getAttribute('data-search');
                        if (keyword.includes(searchTerm)) {
                            items[i].style.display = 'block';
                        } else {
                            items[i].style.display = 'none';
                        }
                    }
                });
            }
        });
        
    } catch(e) {
        console.error(e);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลประวัติได้ในขณะนี้', 'error');
    }
}

function handleRadioClick(td) {
    const rb = td.querySelector('input[type=radio]');
    if (!rb) return;
    
    if (rb.checked && rb.dataset.wasChecked === 'true') {
        rb.checked = false;
        rb.dataset.wasChecked = 'false';
    } else {
        document.querySelectorAll(`input[name="${rb.name}"]`).forEach(el => {
            el.dataset.wasChecked = 'false';
        });
        rb.checked = true;
        rb.dataset.wasChecked = 'true';
    }
}

function showLoadingPopup(titleText = "กำลังโหลดข้อมูล...", subText = "กรุณารอสักครู่ ระบบกำลังประมวลผล") {
    Swal.fire({
        title: titleText,
        text: subText,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

window.addEventListener("DOMContentLoaded", checkLoginStatus);

function logout() {
    localStorage.removeItem('assessorData');
    sessionStorage.removeItem('assessorData');
    window.location.href = 'index.html?logout=true';
}

async function checkLoginStatus() {
    const storedData = localStorage.getItem("assessorData");
    if (!storedData) { window.location.href = "index.html"; return; }

    const loginData = JSON.parse(storedData);
    loggedInTeacher = loginData;
    
    const fullName = `${loginData.prefix || ''}${loginData.firstName || ''} ${loginData.lastName || ''}`.trim();
    document.getElementById('teacherName').value = fullName;
    document.getElementById('displayDept').innerText = loginData.department || 'ไม่ระบุ';
    document.getElementById('deptBadge').classList.remove('hidden');

    showLoadingPopup("กำลังเตรียมความพร้อมระบบ...", "กำลังดึงข้อมูลรายวิชาและเกณฑ์ประเมิน");

    try {
        await Promise.all([
            loadSubjects(),
            loadCriteria(),
            loadStudentProfiles()
        ]);
    } catch (error) {
        console.error("Initial Load Error:", error);
    } finally {
        Swal.close(); 
    }
}

function parseThaiDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        let d = new Date(dateInput);
        if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
        return d;
    }

    let str = String(dateInput).trim();
    const thaiMonths = {
        "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
        "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
        "มกราคม": 0, "กุมภาพันธ์": 1, "มีนาคม": 2, "เมษายน": 3, "พฤษภาคม": 4, "มิถุนายน": 5,
        "กรกฎาคม": 6, "สิงหาคม": 7, "กันยายน": 8, "ตุลาคม": 9, "พฤศจิกายน": 10, "ธันวาคม": 11
    };

    let parts = str.split(/\s+/);
    if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let monthStr = parts[1];
        let year = parseInt(parts[2], 10);
        if (year > 2400) year -= 543;
        if (thaiMonths[monthStr] !== undefined) {
            return new Date(year, thaiMonths[monthStr], day);
        }
    }

    if (str.includes('/')) {
        let p = str.split('/');
        if (p.length === 3) {
            let day = parseInt(p[0], 10);
            let month = parseInt(p[1], 10) - 1;
            let year = parseInt(p[2], 10);
            if (year > 2400) year -= 543;
            return new Date(year, month, day);
        }
    }

    let standardDate = new Date(str);
    if (!isNaN(standardDate.getTime())) {
        if (standardDate.getFullYear() > 2400) {
            standardDate.setFullYear(standardDate.getFullYear() - 543);
        }
        return standardDate;
    }

    return null;
}

async function loadStudentProfiles() {
    try {
        const response = await fetch(`${API_URL}?action=getAdminAllData`);
        const res = await response.json();
        if (res && res.studentProfiles) {
            res.studentProfiles.forEach(p => {
                const sId = String(p["รหัสนิสิต"]).trim();
                const sImg = p["ลิงก์รูปภาพ"] || "";
                if (sId) studentImgMap[sId] = sImg;
            });
        }
    } catch (e) { console.error("โหลดรูปภาพนิสิตล้มเหลว:", e); }
}

async function loadSubjects() {
    try {
        const response = await fetch(API_URL + "?action=getSubjects&t=" + new Date().getTime());
        const data = await response.json();
        const select = document.getElementById("subjectCode");
        select.innerHTML = '<option value="">-- กรุณาเลือกวิชา --</option>';
        
        const filteredSubjects = data.filter(sub => String(sub.department).trim() === String(loggedInTeacher.department).trim());
        
        if (filteredSubjects.length === 0) {
             select.innerHTML = '<option value="">-- ไม่พบวิชาที่เปิดสอนในภาควิชาของคุณ --</option>';
             return;
        }

        filteredSubjects.forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub.code;
            opt.innerText = sub.code + " - " + sub.name;
            select.appendChild(opt);
        });
    } catch (error) { console.error("โหลดรายวิชาล้มเหลว:", error); }
}

async function loadCriteria() {
    try {
        const response = await fetch(API_URL + "?action=getFormCriteria&t=" + new Date().getTime());
        let data = await response.json();
        const container = document.getElementById("criteriaContainer");
        
        if (data.result === "error") {
            container.innerHTML = `<div class="error-box">ไม่สามารถดึงเกณฑ์การประเมินได้</div>`;
            return;
        }

        allCriteriaData = data; 
        container.innerHTML = `<div style="color: #64748b; text-align: center; padding: 24px 0;" class="text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl mt-6 bg-slate-50">👆 กรุณาเลือกหัวข้อการประเมินด้านบน เพื่อแสดงเกณฑ์การให้คะแนน</div>`;

        buildTopicDropdown();

    } catch (error) {
        document.getElementById("criteriaContainer").innerHTML = `<div class="error-box">⚠️ เกิดข้อผิดพลาดในการโหลดเกณฑ์ประเมิน</div>`;
    }
}

function buildTopicDropdown() {
    const select = document.getElementById("evalTopic");
    
    const uniqueTopics = [...new Set(allCriteriaData.map(item => item.formType || item["หัวข้อประเมิน"] || item["Form_Type"]))].filter(Boolean);

    const groups = {
        "กลุ่ม Topic": [],
        "กลุ่ม Bedside": [],
        "กลุ่มอื่นๆ (ประเมินทั่วไป)": []
    };

    uniqueTopics.forEach(topic => {
        const t = String(topic).trim();
        if (t.toLowerCase().startsWith("topic:")) {
            groups["กลุ่ม Topic"].push(t);
        } else if (t.toLowerCase().startsWith("bedside:")) {
            groups["กลุ่ม Bedside"].push(t);
        } else {
            groups["กลุ่มอื่นๆ (ประเมินทั่วไป)"].push(t);
        }
    });

    for (const [groupLabel, topics] of Object.entries(groups)) {
        if (topics.length > 0) {
            const optgroup = document.createElement("optgroup");
            optgroup.label = groupLabel;
            topics.forEach(t => {
                const option = document.createElement("option");
                option.value = t;
                option.innerText = t;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
    }
}

function filterCriteria() {
    const selectedTopic = document.getElementById("evalTopic").value;
    const container = document.getElementById("criteriaContainer");
    
    if (!selectedTopic) {
        container.innerHTML = `<div style="color: #64748b; text-align: center; padding: 24px 0;" class="text-sm font-medium border-2 border-dashed border-slate-200 rounded-xl mt-6 bg-slate-50">👆 กรุณาเลือกหัวข้อการประเมินด้านบน เพื่อแสดงเกณฑ์การให้คะแนน</div>`;
        return;
    }

    let filteredData = allCriteriaData.filter(item => {
        return String(item.formType) === selectedTopic || String(item["หัวข้อประเมิน"]) === selectedTopic || String(item["Form_Type"]) === selectedTopic;
    });

    if (filteredData.length === 0) {
        container.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 24px 0;" class="text-sm font-medium border-2 border-dashed border-red-200 rounded-xl mt-6 bg-red-50">❌ ไม่พบเกณฑ์ประเมินสำหรับ <b>${selectedTopic}</b> (โปรดตรวจสอบข้อมูลใน Google Sheets)</div>`;
        return;
    }

    container.innerHTML = "";
    rubricTopics = []; // ล้างค่ารายการ Rubric เดิม
    
    filteredData.sort((a, b) => {
        let topicA = String(a.topic || "").trim();
        let topicB = String(b.topic || "").trim();
        
        if (topicA.includes("หัวข้อการประเมิน") && !topicB.includes("หัวข้อการประเมิน")) return -1;
        if (topicB.includes("หัวข้อการประเมิน") && !topicA.includes("หัวข้อการประเมิน")) return 1;

        let getVersionParts = (str) => {
            let match = str.match(/^(\d+(?:\.\d+)*)/);
            return match ? match[1].split('.').map(Number) : null;
        };

        let partsA = getVersionParts(topicA);
        let partsB = getVersionParts(topicB);

        if (partsA && partsB) {
            let len = Math.max(partsA.length, partsB.length);
            for (let i = 0; i < len; i++) {
                let numA = partsA[i] !== undefined ? partsA[i] : -1; 
                let numB = partsB[i] !== undefined ? partsB[i] : -1;
                if (numA !== numB) {
                    return numA - numB;
                }
            }
        }
        
        let topicCompare = topicA.localeCompare(topicB, 'th', { numeric: true });
        
        if (topicCompare !== 0) {
            return topicCompare;
        }
        
        let scoreA = parseFloat(a.score);
        let scoreB = parseFloat(b.score);
        
        let finalScoreA = isNaN(scoreA) ? -9999 : scoreA;
        let finalScoreB = isNaN(scoreB) ? -9999 : scoreB;
        
        return finalScoreB - finalScoreA;
    });

    let currentTopic = "";
    let tableHTML = "";
    let isChecklistMode = false;

    filteredData.forEach(item => {
        const hasScore = item.score !== undefined && String(item.score).trim() !== "" && String(item.score).trim().toUpperCase() !== "N/A";
        const checklistText = item.detail || item.level; 
        const isChecklistItem = !hasScore && checklistText;
        const isRubric = hasScore;

        if (item.topic !== currentTopic) {
            if (currentTopic !== "") {
                if (isChecklistMode) {
                    tableHTML += `</div></div>`;
                    container.innerHTML += tableHTML;
                } else if (tableHTML !== "") {
                    tableHTML += `</tbody></table>`;
                    container.innerHTML += tableHTML;
                }
            }

            currentTopic = item.topic;
            tableHTML = "";
            
            let isSubTopic = /^\d+\.\d+/.test(currentTopic.trim());
            let titleClass = isSubTopic ? "sub-competency-title" : "competency-title";
            
            container.innerHTML += `<div class="${titleClass}">${currentTopic}</div>`;

            if (isChecklistItem) {
                isChecklistMode = true;
                tableHTML = `<div class="p-5 border border-slate-200 rounded-xl bg-white mb-6 shadow-sm"><div class="flex flex-wrap gap-4">`;
            } else if (isRubric) {
                isChecklistMode = false;
                rubricTopics.push(currentTopic);
                tableHTML = `
                    <table class="rubric-table">
                        <thead>
                            <tr>
                                <th style="width: 25%; text-align: left;">ระดับความสามารถ</th>
                                <th style="width: 60%; text-align: left;">รายละเอียด (Rubrics)</th>
                                <th style="width: 15%; text-align: center;">เลือก</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
            }
        }

        if (isChecklistItem) {
            tableHTML += `
                <label class="flex items-center gap-3 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:bg-indigo-50 transition-colors w-full sm:w-auto">
                    <input type="checkbox" class="eval-checklist-item w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" data-topic="${checklistText}">
                    <span class="font-medium text-slate-700">${checklistText}</span>
                </label>
            `;
        } else if (isRubric) {
            const rIndex = rubricTopics.length - 1;
            tableHTML += `
                <tr>
                    <td style="font-weight: 600;">
                        ${item.level || "-"} 
                        <span class="block text-xs text-blue-600 font-medium mt-0.5">(${item.score} คะแนน)</span>
                    </td>
                    <td style="font-size: 13px; line-height: 1.5;">${item.detail || "-"}</td>
                    <td class="radio-cell" style="cursor: pointer;" onclick="handleRadioClick(this)">
                        <input type="radio" name="rubric_q_${rIndex}" value="${item.score}" data-level="${item.level || item.detail}" class="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none" required>
                    </td>
                </tr>
            `;
        }
    });

    if (currentTopic !== "") {
        if (isChecklistMode) {
            tableHTML += `</div></div>`;
            container.innerHTML += tableHTML;
        } else if (tableHTML !== "") {
            tableHTML += `</tbody></table>`;
            container.innerHTML += tableHTML;
        }
    }
}

async function loadStudents() {
    const subCode = document.getElementById("subjectCode").value;
    const teacherName = document.getElementById("teacherName").value.trim(); 
    const container = document.getElementById("studentListContainer");
    
    if (!subCode) {
        container.innerHTML = `<div style="color: #64748b; text-align: center; width: 100%; grid-column: 1 / -1; padding: 24px 0;" class="text-sm font-light">-- กรุณาเลือกวิชาก่อนเพื่อแสดงรายชื่อนิสิต --</div>`;
        return;
    }

    showLoadingPopup("กำลังดึงรายชื่อนิสิต...", "ระบบกำลังดึงข้อมูลรายชื่อนิสิตแพทย์ในวิชานี้");

    try {
        const response = await fetch(API_URL + "?action=getStudentsList&t=" + new Date().getTime());
        allStudents = await response.json();
        const filtered = allStudents.filter(s => String(s.subjectCode).trim() === String(subCode).trim());
        
        container.innerHTML = "";
        if (filtered.length === 0) {
            container.innerHTML = `<div style="color: #ef4444; text-align: center; width: 100%; grid-column: 1 / -1; padding: 24px 0; font-weight: bold;" class="text-sm">❌ ไม่พบนิสิตลงทะเบียนในวิชานี้</div>`;
        } else {
            let now = new Date();
            
            filtered.forEach(s => {
                const div = document.createElement("div");
                
                // 🌟 1. ดึงข้อมูลวันที่ประเมิน (แก้ไขชื่อให้ตรงกับตัวแปรจากฝั่ง Backend แล้ว) 🌟
                let rawEvalDate = s.evaluationDate || s["วันที่ได้รับประเมินแล้ว"] || s.timestamp || "";
                let evalDateObj = parseThaiDate(rawEvalDate);
                
                // 2. ตรวจสอบว่าวันที่ประเมินล่าสุดคือ "วันนี้" หรือไม่
                let isEvaluatedToday = false;
                if (evalDateObj) {
                    isEvaluatedToday = (
                        evalDateObj.getFullYear() === now.getFullYear() &&
                        evalDateObj.getMonth() === now.getMonth() &&
                        evalDateObj.getDate() === now.getDate()
                    );
                }

                // 3. ล็อกปุ่มประเมิน ถ้านิสิตถูกประเมินไปแล้วใน "วันนี้"
                const isLockedForToday = isEvaluatedToday;
                
                const sIdTrim = String(s.studentId).trim();
                const imgUrl = studentImgMap[sIdTrim] || "";

                let startObj = parseThaiDate(s.startDate);
                let endObj = parseThaiDate(s.endDate);
                
                let isTimeExpired = false;
                let isBeforeStart = false;
                
                if (startObj && now < startObj) {
                    isBeforeStart = true;
                }
                
                if (endObj) {
                    let expireDate = new Date(endObj.getTime());
                    expireDate.setDate(expireDate.getDate() + 14);
                    expireDate.setHours(23, 59, 59, 999);
                    
                    if (now > expireDate) {
                        isTimeExpired = true;
                    }
                }

                if (isLockedForToday) {
                    div.className = "student-item disabled";
                    div.innerHTML = `
                        <div class="relative">
                            ${imgUrl 
                                ? `<img src="${imgUrl}" class="student-img h-20 w-20 object-cover rounded-2xl border-2 border-slate-200 shadow-sm opacity-40 grayscale" onerror="this.onerror=null; this.src='https://placehold.co/150x150?text=No+Image'">`
                                : `<div class="student-img-placeholder h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"></path></svg>
                                   </div>`}
                            <span class="absolute -bottom-1 -right-1 bg-emerald-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs shadow-md border-2 border-white">✓</span>
                        </div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:10px;">${s.studentId}</div>
                        <div style="font-weight:bold; margin-top:2px; color:#cbd5e1; text-decoration: line-through;">${s.studentName}</div>
                        <div style="font-size:11px; color:#10b981; margin-top:4px; font-weight:bold;">✅ ประเมินแล้ววันนี้</div>
                    `;
                    div.onclick = () => {
                        Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', text: 'นิสิตคนนี้ได้รับการประเมินไปแล้วในวันนี้ หากต้องการประเมินซ้ำกรุณารอวันถัดไปครับ' });
                    };
                } else if (isTimeExpired) {
                    div.className = "student-item disabled";
                    div.innerHTML = `
                        <div class="relative">
                            ${imgUrl 
                                ? `<img src="${imgUrl}" class="student-img h-20 w-20 object-cover rounded-2xl border-2 border-slate-200 shadow-sm opacity-40 grayscale" onerror="this.onerror=null; this.src='https://placehold.co/150x150?text=No+Image'">`
                                : `<div class="student-img-placeholder h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"></path></svg>
                                   </div>`}
                            <span class="absolute -bottom-1 -right-1 bg-rose-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs shadow-md border-2 border-white">!</span>
                        </div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:10px;">${s.studentId}</div>
                        <div style="font-weight:bold; margin-top:2px; color:#cbd5e1; text-decoration: line-through;">${s.studentName}</div>
                        <div style="font-size:11px; color:#ef4444; margin-top:4px; font-weight:bold;">❌ เกินเวลาประเมิน</div>
                    `;
                    div.onclick = () => {
                        Swal.fire({ icon: 'error', title: 'หมดเขตประเมิน', text: 'นิสิตคนนี้เกินกำหนดเวลาการประเมินแล้ว (เกิน 14 วันจากวันสิ้นสุด)' });
                    };
                } else if (isBeforeStart) {
                    div.className = "student-item disabled";
                    div.innerHTML = `
                        <div class="relative">
                            ${imgUrl 
                                ? `<img src="${imgUrl}" class="student-img h-20 w-20 object-cover rounded-2xl border-2 border-slate-200 shadow-sm opacity-40 grayscale" onerror="this.onerror=null; this.src='https://placehold.co/150x150?text=No+Image'">`
                                : `<div class="student-img-placeholder h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"></path></svg>
                                   </div>`}
                            <span class="absolute -bottom-1 -right-1 bg-amber-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs shadow-md border-2 border-white">⏳</span>
                        </div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:10px;">${s.studentId}</div>
                        <div style="font-weight:bold; margin-top:2px; color:#cbd5e1;">${s.studentName}</div>
                        <div style="font-size:11px; color:#f59e0b; margin-top:4px; font-weight:bold;">⏳ ยังไม่ถึงเวลา</div>
                    `;
                    div.onclick = () => {
                        Swal.fire({ icon: 'warning', title: 'ยังไม่ถึงเวลาประเมิน', text: 'นิสิตคนนี้ยังไม่ถึงกำหนดวันเริ่มปฏิบัติงาน' });
                    };
                } else {
                    div.className = "student-item";
                    div.setAttribute('data-student-id', s.studentId);
                    div.setAttribute('data-student-name', s.studentName);
                    div.innerHTML = `
                        ${imgUrl 
                            ? `<img src="${imgUrl}" class="student-img h-20 w-20 object-cover rounded-2xl border-2 border-slate-200 shadow-sm transition-all duration-200" onerror="this.onerror=null; this.src='https://placehold.co/150x150?text=No+Image'">`
                            : `<div class="student-img-placeholder h-20 w-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 transition-all duration-200">
                                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"></path></svg>
                               </div>`}
                        <div class="student-id-text" style="font-size:11px; color:#64748b; opacity:0.8; margin-top:10px;">${s.studentId}</div>
                        <div class="student-name-text" style="font-weight:bold; margin-top:2px; color:#334155;">${s.studentName}</div>
                    `;
                    div.onclick = () => {
                        div.classList.toggle('active');
                    };
                }
                container.appendChild(div);
            });
        }
    } catch (e) { 
        container.innerHTML = `<div style="color: #ef4444; text-align: center; width: 100%; grid-column: 1 / -1; padding: 24px 0;" class="text-sm font-medium">⚠️ เกิดข้อผิดพลาดในการโหลดรายชื่อ</div>`;
    } finally {
        Swal.close(); 
    }
}

document.getElementById("evalForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const activeStudents = document.querySelectorAll('.student-item.active');
    
    if (activeStudents.length === 0) {
        Swal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกนิสิต!', text: 'กรุณาคลิกเลือกรายชื่อนิสิตอย่างน้อย 1 คนครับ' });
        return;
    }

    const selectedStudents = Array.from(activeStudents).map(div => ({
        id: div.getAttribute('data-student-id'),
        name: div.getAttribute('data-student-name')
    }));
    
    let formData = new FormData(e.target);
    
    const formType = document.getElementById("evalTopic").value;
    const studentRole = formData.get("studentRole") || "ไม่ระบุ / N/A";
    
    let results = [];
    let missingFields = false;

    // 1. อ่านค่า Checkbox ภาษาอังกฤษทั้งหมด (Checklist)
    const checkInputs = document.querySelectorAll('.eval-checklist-item');
    checkInputs.forEach(chk => {
        const isChecked = chk.checked;
        results.push({
            topic: chk.dataset.topic,
            score: isChecked ? "Pass" : "Fail",
            detail: isChecked ? "ทำได้" : "ไม่ได้ทำ"
        });
    });

    // 2. อ่านค่า Rubrics (Radio)
    rubricTopics.forEach((topic, index) => {
        const selectedRadio = document.querySelector(`input[name="rubric_q_${index}"]:checked`);
        if (selectedRadio) {
            results.push({
                topic: topic,
                score: selectedRadio.value,
                detail: selectedRadio.dataset.level
            });
        } else {
            missingFields = true;
        }
    });

    if (missingFields) {
        Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาประเมินให้ครบทุกหัวข้อที่เป็นแบบตัวเลือก (Rubric) ครับ' });
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'ยืนยันการส่งผลประเมิน?',
        html: `คุณกำลังจะส่งผลการประเมินให้กับนิสิตจำนวน <b>${selectedStudents.length}</b> คน<br>หัวข้อ: <b>${formType}</b>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ใช่, บันทึกเลย!',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) return;

    showLoadingPopup("กำลังบันทึกข้อมูล...", `กำลังส่งข้อมูลนิสิต ${selectedStudents.length} คนเข้าระบบ`);

    const requestData = {
        action: "saveEvaluation",
        teacherName: document.getElementById("teacherName").value,
        subjectCode: document.getElementById("subjectCode").value,
        formType: formType,
        studentRole: studentRole, 
        comment: document.getElementById("comment").value,
        students: selectedStudents,
        evaluations: results
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(requestData)
        });

        const res = await response.json();
        
        // 🌟 แจ้งเตือนแบบครอบคลุมทั้งผ่าน และผ่านแบบมีคนซ้ำ
        if (res.result === "success") {
            Swal.fire({ 
                icon: 'success', 
                title: 'บันทึกสำเร็จ!', 
                text: res.message, // ใช้ข้อความที่ส่งมาจากหลังบ้านแทน
                confirmButtonColor: '#10b981'
            }).then(() => {
                document.getElementById("evalForm").reset();
                
                if (loggedInTeacher) {
                    const fullName = `${loggedInTeacher.prefix || ''}${loggedInTeacher.firstName || ''} ${loggedInTeacher.lastName || ''}`.trim();
                    document.getElementById('teacherName').value = fullName;
                }

                activeStudents.forEach(el => el.classList.remove('active'));
                filterCriteria();
                loadStudents(); 
            });
        } else {
            // แจ้งเตือนกรณีประเมินซ้ำแบบ 100% (โดนปัดตกหมด)
            Swal.fire({ icon: 'error', title: 'ข้อมูลซ้ำซ้อน!', text: res.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด!', text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง' });
    }
});