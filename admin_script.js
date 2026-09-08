// ไฟล์ admin_script.js - จัดการระบบและการทำงานของหน้า Admin

function checkAdminLogin() {
    const usernameInput = document.getElementById('adminUsername').value;
    const passwordInput = document.getElementById('adminPassword').value;

    // ตัวอย่างลอจิกการเช็ครหัสผ่าน
    if (usernameInput === 'admin' && passwordInput === '1234') {
        alert('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับผู้ดูแลระบบ');
        // โค้ดสำหรับเปลี่ยนหน้าไปที่ Dashboard
        // window.location.href = 'dashboard.html';
    } else {
        alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
}

// ถ้ามีฟังก์ชันอื่นๆ ของหน้า Admin ก็นำมาเขียนต่อท้ายในไฟล์นี้ได้เลย