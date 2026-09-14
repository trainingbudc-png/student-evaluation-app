// 🔗 ลิงก์ Web App ประจำระบบของคุณ
const API_URL = "https://script.google.com/macros/s/AKfycbyN4lbHJlSyE6fACZP5Dm_VqA1OJnY9TXsHsdZOBC5WJkv3_Kzna7KidIezqtEi8xRCdg/exec";

window.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch(`${API_URL}?action=getSubjects`);
        const data = await response.json();
        const select = document.getElementById("subjectCode");
        data.forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub.code;
            opt.innerText = `${sub.code} - ${sub.name}`;
            select.appendChild(opt);
        });
    } catch (error) { alert("ล้มเหลวในการเชื่อมต่อคลังรายวิชา"); }
});

async function checkEvaluationStatus() {
    const studentId = document.getElementById('studentId').value.trim();
    const subjectCode = document.getElementById('subjectCode').value;
    const resultBox = document.getElementById('resultBox');
    const statusTitle = document.getElementById('statusTitle');
    const scoreZone = document.getElementById('scoreZone');

    if (studentId.length !== 8) {
        alert('กรุณากรอกรหัสนิสิตให้ถูกต้องครบ 8 หลักก่อนครับ');
        return;
    }
    if (!subjectCode) {
        alert('กรุณาเลือกรายวิชาที่ต้องการตรวจสอบครับ');
        return;
    }

    resultBox.style.display = 'block';
    resultBox.classList.remove('status-evaluated', 'status-not-evaluated');
    
    resultBox.style.backgroundColor = '#f8fafc';
    resultBox.style.borderColor = '#e2e8f0';
    resultBox.style.color = '#475569';
    
    statusTitle.innerText = '⏳ กำลังค้นหาข้อมูลการประเมิน...';
    scoreZone.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}?action=checkStatus&studentId=${studentId}&subjectCode=${subjectCode}`);
        const data = await response.json();

        resultBox.style.backgroundColor = '';
        resultBox.style.borderColor = '';
        resultBox.style.color = '';

        if (data.status === "ได้รับการประเมินแล้ว") {
            resultBox.classList.add('status-evaluated');
            statusTitle.innerText = '✅ อาจารย์บันทึกผลการประเมินเรียบร้อยแล้ว';
            
            // ใส่ข้อมูลลงในตัวแปรซ่อนตามปกติเพื่อไม่ให้สคริปต์ Error
            document.getElementById('totalScoreText').innerText = data.totalScore;
            document.getElementById('gradeText').innerText = data.grade;
            
            // ล็อคให้ซ่อนกล่องคะแนนไว้เสมอตามคำขอ
            scoreZone.style.display = 'none'; 
        } else {
            resultBox.classList.add('status-not-evaluated');
            statusTitle.innerText = '⚠️ ยังไม่พบผลการประเมินในระบบ';
            scoreZone.style.display = 'none';
        }
    } catch (error) {
        resultBox.style.backgroundColor = '';
        resultBox.style.borderColor = '';
        resultBox.style.color = '';
        
        resultBox.classList.add('status-not-evaluated');
        statusTitle.innerText = '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่';
        scoreZone.style.display = 'none';
    }
}