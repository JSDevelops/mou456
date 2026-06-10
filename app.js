/*
   ==========================================================================
   INTERACTIVE LOGIC & FUNCTIONALITY (app.js)
   Project: 1 ต้น 1 ความหวัง (1 Tree 1 Hope)
   Branding: 456 Café
   ==========================================================================
*/

// Google Apps Script Web App URL for Google Sheets synchronization
// วาง URL ที่ได้จากขั้นตอนการ Deploy Apps Script ที่นี่ (เช่น "https://script.google.com/macros/s/.../exec")
const GOOGLE_SCRIPT_URL = "";

// Global variables for dashboard state
let totalMembers = 125;
let totalTrees = 2850;
let totalValue = 285000;
let todayRegistrations = 15;
let nextMemberIndex = 126;

// Form values cache
let registrationData = {
    fullname: '',
    phone: '',
    lineid: '',
    email: '',
    qty: 20,
    total: 2000,
    memberId: ''
};

// Chart.js instance variable
let monthlyChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCalculator();
    initDashboardChart();
    setupPDFDownloadMock();
});

/* ==========================================================================
   MOBILE & SMOOTH NAVIGATION
   ========================================================================== */
function initNavigation() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileNav.classList.toggle('open');
            const icon = mobileMenuToggle.querySelector('i');
            if (mobileNav.classList.contains('open')) {
                icon.className = 'fa-solid fa-times';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });

        // Close menu when clicking links
        const mobileLinks = document.querySelectorAll('.mobile-nav-link');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('open');
                mobileMenuToggle.querySelector('i').className = 'fa-solid fa-bars';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileNav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                mobileNav.classList.remove('open');
                mobileMenuToggle.querySelector('i').className = 'fa-solid fa-bars';
            }
        });
    }

    // Smooth scroll for nav-links with offset
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === 'javascript:void(0)') return;
            
            e.preventDefault();
            const targetElement = document.querySelector(href);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ==========================================================================
   WIZARD STEPS MANAGEMENT
   ========================================================================== */
let currentStep = 1;

function goToStep(step) {
    if (step > currentStep) {
        // Run validations before moving to next step
        if (!validateStep(currentStep)) {
            return; // Stay on current step if invalid
        }
    }

    // Hide all steps
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(s => s.classList.remove('active-step'));

    // Show target step
    const targetStep = document.getElementById(`step-${step}`);
    if (targetStep) {
        targetStep.classList.add('active-step');
        currentStep = step;
        updateWizardProgress(step);
    }
}

function updateWizardProgress(step) {
    // Map current sub-steps to the 3 main header segments
    // Step 1-4 (Inputs): Progress segment 1
    // Step 5 (Calc): Progress segment 2
    // Step 6 (Confirm): Progress segment 3
    // Step 7-8 (Loading & Success): Completed
    
    const ind1 = document.getElementById('indicator-1');
    const ind2 = document.getElementById('indicator-2');
    const ind3 = document.getElementById('indicator-3');
    
    const line1 = document.getElementById('line-1');
    const line2 = document.getElementById('line-2');

    // Reset indicator states
    [ind1, ind2, ind3].forEach(ind => {
        ind.classList.remove('active', 'completed');
    });
    [line1, line2].forEach(l => l.classList.remove('filled'));

    if (step >= 1 && step <= 4) {
        ind1.classList.add('active');
    } else if (step === 5) {
        ind1.classList.add('completed');
        line1.classList.add('filled');
        ind2.classList.add('active');
    } else if (step === 6) {
        ind1.classList.add('completed');
        line1.classList.add('filled');
        ind2.classList.add('completed');
        line2.classList.add('filled');
        ind3.classList.add('active');
        
        // Prepare confirmation content
        populateConfirmationData();
    } else if (step >= 7) {
        ind1.classList.add('completed');
        line1.classList.add('filled');
        ind2.classList.add('completed');
        line2.classList.add('filled');
        ind3.classList.add('completed');
    }
}

function validateStep(step) {
    let isValid = true;

    if (step === 1) {
        const nameInput = document.getElementById('input-fullname');
        const nameErr = document.getElementById('err-fullname');
        if (nameInput.value.trim() === '') {
            nameErr.style.display = 'block';
            nameInput.classList.add('invalid-input');
            isValid = false;
        } else {
            nameErr.style.display = 'none';
            nameInput.classList.remove('invalid-input');
            registrationData.fullname = nameInput.value.trim();
        }
    }
    
    if (step === 2) {
        const phoneInput = document.getElementById('input-phone');
        const phoneErr = document.getElementById('err-phone');
        const phoneVal = phoneInput.value.replace(/[^0-9]/g, '');
        // Validate 10-digit phone number
        if (phoneVal.length !== 10) {
            phoneErr.style.display = 'block';
            phoneInput.classList.add('invalid-input');
            isValid = false;
        } else {
            phoneErr.style.display = 'none';
            phoneInput.classList.remove('invalid-input');
            registrationData.phone = phoneVal.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
    }

    if (step === 3) {
        const lineInput = document.getElementById('input-lineid');
        const lineErr = document.getElementById('err-lineid');
        if (lineInput.value.trim() === '') {
            lineErr.style.display = 'block';
            lineInput.classList.add('invalid-input');
            isValid = false;
        } else {
            lineErr.style.display = 'none';
            lineInput.classList.remove('invalid-input');
            registrationData.lineid = lineInput.value.trim();
        }
    }

    if (step === 4) {
        const emailInput = document.getElementById('input-email');
        const emailErr = document.getElementById('err-email');
        const emailVal = emailInput.value.trim();
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailVal !== '-' && !emailRegex.test(emailVal)) {
            emailErr.style.display = 'block';
            emailInput.classList.add('invalid-input');
            isValid = false;
        } else {
            emailErr.style.display = 'none';
            emailInput.classList.remove('invalid-input');
            registrationData.email = emailVal;
        }
    }

    return isValid;
}

function populateConfirmationData() {
    document.getElementById('confirm-name').innerText = registrationData.fullname;
    document.getElementById('confirm-phone').innerText = registrationData.phone;
    document.getElementById('confirm-line').innerText = registrationData.lineid;
    document.getElementById('confirm-email').innerText = registrationData.email;
    document.getElementById('confirm-qty').innerText = `${registrationData.qty} ต้น`;
    document.getElementById('confirm-total').innerText = `${registrationData.total.toLocaleString()} บาท`;
}

/* ==========================================================================
   CALCULATOR LOGIC
   ========================================================================== */
function initCalculator() {
    const qtyInput = document.getElementById('input-qty');
    const qtySlider = document.getElementById('qty-slider');
    
    if (qtyInput && qtySlider) {
        updateCalculator();
    }
}

function adjustQty(amount) {
    const qtyInput = document.getElementById('input-qty');
    let val = parseInt(qtyInput.value) || 0;
    val += amount;
    
    if (val < 1) val = 1;
    if (val > 1000) val = 1000;
    
    qtyInput.value = val;
    
    // Sync slider (up to 100 on slider visual)
    const qtySlider = document.getElementById('qty-slider');
    qtySlider.value = val > 100 ? 100 : val;
    
    updateCalculator();
}

function syncSliderToInput(val) {
    const qtyInput = document.getElementById('input-qty');
    qtyInput.value = val;
    updateCalculator();
}

function updateCalculator() {
    const qtyInput = document.getElementById('input-qty');
    let qty = parseInt(qtyInput.value) || 1;
    
    if (qty < 1) qty = 1;
    
    const total = qty * 100;
    
    registrationData.qty = qty;
    registrationData.total = total;
    
    document.getElementById('calc-qty').innerText = `${qty} ต้น`;
    document.getElementById('calc-total').innerText = `${total.toLocaleString()} บาท`;
}

/* ==========================================================================
   SUBMIT & SAVE FLOW (STEP 7 & 8)
   ========================================================================== */
function submitRegistration() {
    goToStep(7); // Show loading page
    
    const progressBar = document.getElementById('saving-progress');
    const statusText = document.getElementById('saving-status-text');
    
    // Generate Member ID immediately
    const year = new Date().getFullYear();
    const paddedId = String(nextMemberIndex).padStart(4, '0');
    const memberId = `456-${year}-${paddedId}`;
    registrationData.memberId = memberId;
    nextMemberIndex++;
    
    let progress = 0;
    let uploadStarted = false;
    let uploadFinished = false;
    
    const steps = [
        { limit: 25, msg: "กำลังเชื่อมต่อกับระบบฐานข้อมูล..." },
        { limit: 50, msg: "บันทึกข้อมูลเข้าตาราง Google Sheets..." },
        { limit: 75, msg: "จัดทำเอกสารความตกลงร่วมมือ MOU (PDF)..." },
        { limit: 100, msg: "ส่งอีเมลและรหัสสมาชิกให้คุณ..." }
    ];
    
    let stepIndex = 0;

    // Send data to Google Sheets via Apps Script Web App
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "") {
        uploadStarted = true;
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                memberId: registrationData.memberId,
                fullname: registrationData.fullname,
                phone: registrationData.phone,
                lineid: registrationData.lineid,
                email: registrationData.email,
                qty: registrationData.qty,
                total: registrationData.total
            })
        })
        .then(() => {
            uploadFinished = true;
            console.log("บันทึกข้อมูลไปยัง Google Sheets สำเร็จ");
        })
        .catch((err) => {
            uploadFinished = true;
            console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล:", err);
        });
    } else {
        console.warn("GOOGLE_SCRIPT_URL ไม่ได้กำหนดไว้ จะทำงานในโหมดจำลอง (Simulated mode)");
    }
    
    const interval = setInterval(() => {
        // Pause at 50% if upload has started but not finished yet
        if (uploadStarted && progress >= 50 && !uploadFinished) {
            statusText.innerText = "กำลังอัปโหลดข้อมูลไปยัง Google Sheet ของคุณ...";
            return;
        }

        progress += 5;
        progressBar.style.width = `${progress}%`;
        
        if (stepIndex < steps.length && progress >= steps[stepIndex].limit) {
            statusText.innerText = steps[stepIndex].msg;
            stepIndex++;
        }
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // Trigger Success Layout
            setTimeout(() => {
                showSuccessScreen();
            }, 300);
        }
    }, 150);
}

function showSuccessScreen() {
    goToStep(8); // Show Success view
    
    // Display Member ID
    document.getElementById('success-member-id').innerText = registrationData.memberId;
    
    // Trigger Confetti
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
        });
    }
    
    // Update live metrics on Dashboard
    updateDashboardMetrics();
    
    // Append to mock Google Sheet Table
    appendDataToSheetTable();
}

function restartWizard() {
    // Reset inputs
    document.getElementById('input-fullname').value = '';
    document.getElementById('input-phone').value = '';
    document.getElementById('input-lineid').value = '';
    document.getElementById('input-email').value = '';
    document.getElementById('input-qty').value = '20';
    document.getElementById('qty-slider').value = '20';
    
    updateCalculator();
    goToStep(1);
}

/* ==========================================================================
   DASHBOARD UPDATES & CHART
   ========================================================================== */
function updateDashboardMetrics() {
    totalMembers += 1;
    totalTrees += registrationData.qty;
    totalValue += registrationData.total;
    todayRegistrations += 1;

    // Target visual metrics update
    const targetProgress = document.getElementById('target-progress');
    const pct = (totalTrees / 4560) * 100;
    targetProgress.style.width = `${Math.min(pct, 100)}%`;
    
    document.querySelector('.progress-stats span:first-child').innerText = 
        `จองแล้ว ${totalTrees.toLocaleString()} ต้น (${pct.toFixed(1)}%)`;
    document.querySelector('.progress-stats span:last-child').innerText = 
        `คงเหลือ ${Math.max(4560 - totalTrees, 0).toLocaleString()} ต้น`;
    
    // Dashboard Cards update
    document.getElementById('dash-members').innerHTML = `${totalMembers} <small>คน</small>`;
    document.getElementById('dash-trees').innerHTML = `${totalTrees.toLocaleString()} <small>ต้น</small>`;
    document.getElementById('dash-trees-percentage').innerText = `${pct.toFixed(1)}% จากเป้าหมายโครงการ`;
    document.getElementById('dash-value').innerHTML = `${totalValue.toLocaleString()} <small>บาท</small>`;
    document.getElementById('dash-today').innerHTML = `${todayRegistrations} <small>คน</small>`;

    // Add to Top Supporters list if they booked a lot
    checkTopSupporter(registrationData.fullname, registrationData.qty);
}

function checkTopSupporter(name, qty) {
    // In real app, we recalculate rankings. Let's do a simple animation check
    const list = document.getElementById('supporters-list-container');
    const items = list.querySelectorAll('.supporter-item');
    
    let supporters = [];
    
    items.forEach(item => {
        const sName = item.querySelector('strong').innerText;
        const sQty = parseInt(item.querySelector('.support-qty').innerText) || 0;
        const subtext = item.querySelector('.supporter-info span').innerText;
        supporters.push({ name: sName, qty: sQty, subtext: subtext });
    });
    
    // Add new user if not exists, or update
    const idx = supporters.findIndex(s => s.name === name);
    if (idx !== -1) {
        supporters[idx].qty += qty;
    } else {
        supporters.push({ name: name, qty: qty, subtext: "สมาชิกจองออนไลน์รายย่อย" });
    }
    
    // Sort
    supporters.sort((a, b) => b.qty - a.qty);
    
    // Clear and redraw top 5
    list.innerHTML = '';
    for (let i = 0; i < Math.min(supporters.length, 5); i++) {
        const s = supporters[i];
        let rankClass = "rank";
        if (i === 0) rankClass = "rank first";
        else if (i === 1) rankClass = "rank second";
        else if (i === 2) rankClass = "rank third";
        
        const li = document.createElement('li');
        li.className = 'supporter-item';
        li.innerHTML = `
            <span class="${rankClass}">${i + 1}</span>
            <div class="supporter-info">
                <strong>${s.name}</strong>
                <span>${s.subtext}</span>
            </div>
            <span class="support-qty">${s.qty} ต้น</span>
        `;
        list.appendChild(li);
    }
}

function appendDataToSheetTable() {
    const tableBody = document.getElementById('sheet-table-body');
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const row = document.createElement('tr');
    row.style.backgroundColor = '#f4fbf7'; // highlighted background for new entries
    
    // Mask phone number for dashboard visual
    const maskedPhone = registrationData.phone.replace(/(\d{3})-(\d{3})-(\d{4})/, '$1-XXX-$3');
    
    row.innerHTML = `
        <td>${dateStr}</td>
        <td><strong>${registrationData.memberId}</strong></td>
        <td>${registrationData.fullname}</td>
        <td>${maskedPhone}</td>
        <td>${registrationData.lineid}</td>
        <td>${registrationData.email}</td>
        <td>${registrationData.qty}</td>
        <td>${registrationData.total.toLocaleString()}</td>
        <td><span class="badge badge-pdf"><i class="fa-solid fa-file-pdf"></i> PDF</span></td>
    `;
    
    tableBody.insertBefore(row, tableBody.firstChild);
    
    // Fade out highlight after a few seconds
    setTimeout(() => {
        row.style.transition = 'background-color 2s ease';
        row.style.backgroundColor = 'transparent';
    }, 4000);
}

function initDashboardChart() {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;
    
    const data = {
        labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.'],
        datasets: [{
            label: 'ผู้เข้าร่วม (คน)',
            data: [5, 12, 25, 48, 70, 95, totalMembers], // Updates with new member
            fill: true,
            backgroundColor: 'rgba(197, 168, 128, 0.15)',
            borderColor: '#c5a880',
            borderWidth: 3,
            tension: 0.35,
            pointBackgroundColor: '#3d271d',
            pointBorderColor: '#faf7f2',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8
        }]
    };
    
    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(61, 39, 29, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: 'Prompt'
                        },
                        color: '#7d6e65'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Prompt'
                        },
                        color: '#7d6e65'
                    }
                }
            }
        }
    };
    
    monthlyChart = new Chart(ctx, config);
}

// Update chart datasets on new registration
function updateChartData() {
    if (monthlyChart) {
        monthlyChart.data.datasets[0].data[6] = totalMembers;
        monthlyChart.update();
    }
}

/* ==========================================================================
   MOU PDF GENERATION VIA CANVAS (THAI FONTS BULLETPROOF METHOD)
   ========================================================================== */
function setupPDFDownloadMock() {
    const btn = document.getElementById('btn-download-pdf');
    if (btn) {
        btn.addEventListener('click', () => {
            generateMOUPDF();
        });
    }
}

function generateMOUPDF() {
    const btn = document.getElementById('btn-download-pdf');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างเอกสาร...`;

    // Create a canvas element to design the certificate
    const canvas = document.createElement('canvas');
    canvas.width = 1120; // 4:3 high res layout
    canvas.height = 792;
    const ctx = canvas.getContext('2d');

    // Fill background with warm parchment/cream tone
    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw solid inner borders
    ctx.strokeStyle = '#c5a880'; // Gold border
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.strokeStyle = '#3d271d'; // Fine brown line
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

    // Corner decorative details
    drawCornerDecors(ctx, canvas.width, canvas.height);

    // Helper functions for drawing text in Thai
    ctx.textAlign = 'center';
    
    // Draw Logo placeholder
    const logoImg = new Image();
    logoImg.src = './logo 456 cafe_1.png';
    logoImg.onload = function() {
        ctx.drawImage(logoImg, canvas.width / 2 - 40, 60, 80, 80);
        writeCertificateText();
    };
    
    logoImg.onerror = function() {
        // Fallback drawing simple circular logo on canvas
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 100, 40, 0, 2 * Math.PI);
        ctx.fillStyle = '#3d271d';
        ctx.fill();
        ctx.strokeStyle = '#c5a880';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Prompt, sans-serif';
        ctx.fillText('456', canvas.width / 2, 107);
        writeCertificateText();
    };

    function writeCertificateText() {
        // Main Headers
        ctx.fillStyle = '#3d271d';
        ctx.font = 'bold 28px Prompt, sans-serif';
        ctx.fillText('หนังสือบันทึกข้อตกลงร่วมมือ (MOU)', canvas.width / 2, 185);

        ctx.fillStyle = '#2c5e43';
        ctx.font = '600 20px Prompt, sans-serif';
        ctx.fillText('โครงการ “1 ต้น 1 ความหวัง” โดยวิสาหกิจชุมชนแปรรูปกาแฟ 456', canvas.width / 2, 225);

        ctx.fillStyle = '#7d6e65';
        ctx.font = '14px Prompt, sans-serif';
        ctx.fillText('----------------------------------------------------------------------------------------------------', canvas.width / 2, 255);

        // Body Text
        ctx.fillStyle = '#2c211a';
        ctx.font = '18px Prompt, sans-serif';
        ctx.fillText('หนังสือสำคัญฉบับนี้จัดทำขึ้นเพื่อรับรองการเข้าร่วมเป็นส่วนหนึ่งในการสนับสนุนและจองต้นกาแฟ', canvas.width / 2, 290);
        
        ctx.font = 'bold 24px Prompt, sans-serif';
        ctx.fillStyle = '#3d271d';
        ctx.fillText(registrationData.fullname, canvas.width / 2, 340); // Member Name

        ctx.fillStyle = '#2c211a';
        ctx.font = '18px Prompt, sans-serif';
        ctx.fillText(`รหัสสมาชิกประจำตัว: ${registrationData.memberId}`, canvas.width / 2, 385);
        ctx.fillText(`ได้ร่วมสนับสนุนต้นกาแฟจำนวน ${registrationData.qty} ต้น  เป็นมูลค่ารวม ${registrationData.total.toLocaleString()} บาท`, canvas.width / 2, 425);
        ctx.fillText('เพื่อร่วมสร้างผืนป่ากาแฟ สร้างอาชีพ และสร้างรายได้ที่ยั่งยืนให้แก่เกษตรกรท้องถิ่น จังหวัดกาฬสินธุ์', canvas.width / 2, 465);

        // Signatures Area
        ctx.fillStyle = '#7d6e65';
        ctx.font = '13px Prompt, sans-serif';
        ctx.fillText('ให้ไว้ ณ วันที่สมัครเข้าร่วมโครงการวิสาหกิจชุมชน', canvas.width / 2, 510);
        
        const now = new Date();
        const fullDateStr = `วันที่ ${now.getDate()} เดือน ${getThaiMonthName(now.getMonth())} พ.ศ. ${now.getFullYear() + 543}`;
        ctx.fillStyle = '#2c211a';
        ctx.font = 'bold 15px Prompt, sans-serif';
        ctx.fillText(fullDateStr, canvas.width / 2, 535);

        // Signatures lines
        ctx.strokeStyle = 'rgba(61, 39, 29, 0.4)';
        ctx.lineWidth = 1;
        
        // Left signature (President of Enterprise)
        ctx.beginPath();
        ctx.moveTo(180, 650);
        ctx.lineTo(420, 650);
        ctx.stroke();
        
        ctx.fillStyle = '#7d6e65';
        ctx.font = '14px Prompt, sans-serif';
        ctx.fillText('( นายพัฒนวิทย์ อุดมศิลป์ )', 300, 675);
        ctx.font = '12px Prompt, sans-serif';
        ctx.fillText('ประธานวิสาหกิจชุมชนแปรรูปกาแฟ 456', 300, 695);

        // Right signature (Member)
        ctx.beginPath();
        ctx.moveTo(700, 650);
        ctx.lineTo(940, 650);
        ctx.stroke();
        
        ctx.fillStyle = '#7d6e65';
        ctx.font = '14px Prompt, sans-serif';
        ctx.fillText(`( ${registrationData.fullname} )`, 820, 675);
        ctx.font = '12px Prompt, sans-serif';
        ctx.fillText('ผู้เข้าร่วมโครงการสมาชิกปลูกกาแฟ', 820, 695);

        // Draw dynamic signature mock on Member line
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(820, 630, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'italic 16px Courier, sans-serif';
        ctx.fillStyle = '#0000ff';
        ctx.fillText(registrationData.fullname.split(' ')[0], 820, 635);

        // Draw President signature mock
        ctx.strokeStyle = '#053f1d';
        ctx.beginPath();
        ctx.arc(300, 630, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'italic 16px Courier, sans-serif';
        ctx.fillStyle = '#053f1d';
        ctx.fillText('Pattana', 300, 635);

        // Stamp seal mock in the center background
        ctx.beginPath();
        ctx.arc(560, 630, 45, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(220, 53, 69, 0.45)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = 'bold 9px Prompt, sans-serif';
        ctx.fillStyle = 'rgba(220, 53, 69, 0.45)';
        ctx.fillText('วิสาหกิจชุมชน 456', 560, 625);
        ctx.fillText('กาแฟกาฬสินธุ์', 560, 640);

        // Convert canvas to image and add to PDF
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const { jsPDF } = window.jspdf;
        
        // landscape orientation, pt unit, A4 size
        const doc = new jsPDF('l', 'pt', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        
        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        doc.save(`MOU_${registrationData.memberId}.pdf`);

        // Re-enable button
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> ดาวน์โหลดใบสำคัญ MOU (PDF)`;
    }
}

function drawCornerDecors(ctx, w, h) {
    const size = 30;
    const offset = 32;

    ctx.fillStyle = '#c5a880';
    
    // Top-Left Corner
    ctx.fillRect(offset, offset, size, 4);
    ctx.fillRect(offset, offset, 4, size);
    
    // Top-Right Corner
    ctx.fillRect(w - offset - size, offset, size, 4);
    ctx.fillRect(w - offset, offset, 4, size);
    
    // Bottom-Left Corner
    ctx.fillRect(offset, h - offset, size, 4);
    ctx.fillRect(offset, h - offset - size, 4, size);
    
    // Bottom-Right Corner
    ctx.fillRect(w - offset - size, h - offset, size, 4);
    ctx.fillRect(w - offset, h - offset - size, 4, size);
}

function getThaiMonthName(idx) {
    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months[idx];
}
