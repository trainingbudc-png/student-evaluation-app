const LIFF_ID = "2010763201-zDYpgg5r"; 
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyN4lbHJlSyE6fACZP5Dm_VqA1OJnY9TXsHsdZOBC5WJkv3_Kzna7KidIezqtEi8xRCdg/exec"; 

// ฟังก์ชันสำหรับเปิด Popup หมุนรอ
function showLoadingPopup(titleText = "กำลังโหลดข้อมูล...") {
    Swal.fire({
        title: titleText,
        text: 'กรุณารอสักครู่ ระบบกำลังประมวลผล',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

// เริ่มต้น LIFF และจัดการ Login/Logout
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const isLogout = urlParams.get('logout');

    showLoadingPopup("กำลังเชื่อมต่อระบบ LINE...");

    liff.init({ liffId: LIFF_ID }).then(() => {
        if (isLogout === 'true') {
            if (liff.isLoggedIn()) {
                liff.logout();
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            Swal.close(); 
            return;
        }

        if (liff.isLoggedIn()) {
            processLogin();
        } else {
            Swal.close(); 
        }
    }).catch(err => {
        console.error("LIFF Init Error: ", err);
        Swal.close();
    });
};

function loginWithLine() {
    if (!liff.isLoggedIn()) {
        liff.login(); 
    } else {
        processLogin();
    }
}

async function processLogin() {
    showLoadingPopup("กำลังตรวจสอบสิทธิ์ผ่าน LINE...");

    try {
        const profile = await liff.getProfile();

        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "loginLine",
                uid: profile.userId
            })
        });
        
        const rawText = await response.text();
        const result = JSON.parse(rawText);
        const userData = result.userData || result.user || result.data;

        if (userData) {
            localStorage.setItem("assessorData", JSON.stringify(userData));
            sessionStorage.setItem("assessorData", JSON.stringify(userData));
            
            Swal.fire({
                icon: 'success',
                title: 'เข้าสู่ระบบสำเร็จ',
                text: 'กำลังนำท่านสู่หน้าประเมิน...',
                timer: 1000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "teacher.html"; 
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'ไม่พบบัญชี LINE ในระบบ',
                text: 'กรุณาเข้าสู่ระบบด้วย Email / เบอร์โทร เพื่อผูกบัญชีก่อนครับ',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#1d4ed8'
            });
            toggleEmailModal(true);
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.message,
            confirmButtonColor: '#1d4ed8'
        });
    }
}

function toggleEmailModal(forceOpen = false) {
    const modal = document.getElementById("emailModal");
    if (forceOpen) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.toggle("hidden");
    }
}

async function loginWithEmail() {
    const email = document.getElementById("inputEmail").value.trim();
    const phone = document.getElementById("inputPhone").value.trim();

    if (!email || !phone) {
        Swal.fire({
            icon: 'warning',
            title: 'ข้อมูลไม่ครบถ้วน',
            text: 'กรุณากรอกอีเมลและเบอร์โทรศัพท์ให้ครบถ้วนครับ',
            confirmButtonColor: '#1d4ed8'
        });
        return;
    }

    showLoadingPopup("กำลังตรวจสอบบัญชีผู้ใช้...");

    try {
        let uid = "";
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            uid = profile.userId;
        }

        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "loginEmail",
                email: email,
                phone: phone,
                uid: uid 
            })
        });
        const result = await response.json();
        const userData = result.userData || result.user || result.data;

        if ((result.status === "success" || result.result === "success") && userData) {
            localStorage.setItem("assessorData", JSON.stringify(userData));
            sessionStorage.setItem("assessorData", JSON.stringify(userData));
            
            Swal.fire({
                icon: 'success',
                title: 'เข้าสู่ระบบสำเร็จ',
                text: 'กำลังนำท่านสู่หน้าประเมิน...',
                timer: 1000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "teacher.html";
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                text: result.message || 'อีเมลหรือเบอร์โทรศัพท์ไม่ถูกต้อง!',
                confirmButtonColor: '#1d4ed8'
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'การเชื่อมต่อขัดข้อง',
            text: error.message,
            confirmButtonColor: '#1d4ed8'
        });
    }
}