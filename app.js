/*
   ==========================================================================
   INTERACTIVE LOGIC & FUNCTIONALITY (app.js)
   Project: 1 ต้น 1 ความหวัง (1 Tree 1 Hope)
   Branding: 456 Café
   ==========================================================================
*/

// Google Apps Script Web App URL for Google Sheets synchronization
// วาง URL ที่ได้จากขั้นตอนการ Deploy Apps Script ที่นี่ (เช่น "https://script.google.com/macros/s/.../exec")
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxuMQ0srLuoe_64aQcUetXDZwxYPHj7zREGXHlkMA71tHyN5jBeudYT_gVIQ5kjPSm5g/exec";

// Global variables for dashboard state
let totalMembers = 0;
let totalTrees = 0;
let totalValue = 0;
let todayRegistrations = 0;
let nextMemberIndex = 1;

// Form values cache
let registrationData = {
    fullname: '',
    phone: '',
    lineid: '',
    email: '',
    seedlingType: '1-2m', // '1-2m' or '1y'
    bookingMode: 'tree', // 'tree' or 'rai'
    qty: 20,
    total: 1000,
    memberId: '',
    citizenid: '',
    address: '',
    plantingarea: ''
};

// Chart.js instance variable
let monthlyChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCalculator();
    initDashboardChart();
    setupPDFDownloadMock();
    fetchDashboardData();
    
    // Real-time synchronization: Poll the Google Sheets API every 20 seconds
    setInterval(fetchDashboardData, 20000);
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

        const citizenInput = document.getElementById('input-citizenid');
        const citizenErr = document.getElementById('err-citizenid');
        const citizenVal = citizenInput.value.replace(/[^0-9]/g, '');
        if (citizenVal.length !== 13) {
            citizenErr.style.display = 'block';
            citizenInput.classList.add('invalid-input');
            isValid = false;
        } else {
            citizenErr.style.display = 'none';
            citizenInput.classList.remove('invalid-input');
            registrationData.citizenid = citizenVal;
        }
    }
    
    if (step === 2) {
        const phoneInput = document.getElementById('input-phone');
        const phoneErr = document.getElementById('err-phone');
        const phoneVal = phoneInput.value.replace(/[^0-9]/g, '');
        if (phoneVal.length !== 10) {
            phoneErr.style.display = 'block';
            phoneInput.classList.add('invalid-input');
            isValid = false;
        } else {
            phoneErr.style.display = 'none';
            phoneInput.classList.remove('invalid-input');
            registrationData.phone = phoneVal.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }

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

    if (step === 3) {
        const addressInput = document.getElementById('input-address');
        const addressErr = document.getElementById('err-address');
        if (addressInput.value.trim() === '') {
            addressErr.style.display = 'block';
            addressInput.classList.add('invalid-input');
            isValid = false;
        } else {
            addressErr.style.display = 'none';
            addressInput.classList.remove('invalid-input');
            registrationData.address = addressInput.value.trim();
        }

        const plantingInput = document.getElementById('input-plantingarea');
        const plantingErr = document.getElementById('err-plantingarea');
        if (plantingInput.value.trim() === '') {
            plantingErr.style.display = 'block';
            plantingInput.classList.add('invalid-input');
            isValid = false;
        } else {
            plantingErr.style.display = 'none';
            plantingInput.classList.remove('invalid-input');
            registrationData.plantingarea = plantingInput.value.trim();
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
    document.getElementById('confirm-citizenid').innerText = registrationData.citizenid.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
    document.getElementById('confirm-phone').innerText = registrationData.phone;
    document.getElementById('confirm-line').innerText = registrationData.lineid;
    document.getElementById('confirm-address').innerText = registrationData.address;
    document.getElementById('confirm-plantingarea').innerText = registrationData.plantingarea;
    document.getElementById('confirm-email').innerText = registrationData.email;
    document.getElementById('confirm-age').innerText = registrationData.seedlingType === '1-2m' ? '1-2 เดือน' : '1 ปี';
    document.getElementById('confirm-mode').innerText = registrationData.bookingMode === 'rai' ? 'จองรายไร่' : 'จองรายต้น';
    
    const unitText = registrationData.bookingMode === 'rai' ? 'ไร่' : 'ต้น';
    document.getElementById('confirm-qty-label').innerText = registrationData.bookingMode === 'rai' ? 'จำนวนพื้นที่ที่จอง:' : 'จำนวนต้นที่จอง:';
    document.getElementById('confirm-qty').innerText = `${registrationData.qty} ${unitText}`;
    document.getElementById('confirm-total').innerText = `${registrationData.total.toLocaleString()} บาท`;
}

/* ==========================================================================
   CALCULATOR LOGIC & PRICING
   ========================================================================== */
function initCalculator() {
    const qtyInput = document.getElementById('input-qty');
    const qtySlider = document.getElementById('qty-slider');
    
    if (qtyInput && qtySlider) {
        updateCalculator();
    }
}

function changeSeedlingAge(age) {
    registrationData.seedlingType = age;
    
    // Update active UI classes
    document.getElementById('card-age-1-2').classList.toggle('active', age === '1-2m');
    document.getElementById('card-age-1y').classList.toggle('active', age === '1y');
    
    updateCalculator();
}

function changeBookingMode(mode) {
    registrationData.bookingMode = mode;
    
    // Update active UI classes
    document.getElementById('card-mode-rai').classList.toggle('active', mode === 'rai');
    document.getElementById('card-mode-tree').classList.toggle('active', mode === 'tree');
    
    // Update labels and inputs dynamically
    const qtyInputLabel = document.getElementById('qty-input-label');
    const calcQtyLabel = document.getElementById('calc-qty-label');
    const calcUnitLabel = document.getElementById('calc-unit-label');
    const qtySlider = document.getElementById('qty-slider');
    const sliderLabels = document.getElementById('slider-labels-container');
    
    if (mode === 'rai') {
        qtyInputLabel.innerText = "จำนวนพื้นที่จอง (ไร่)";
        calcQtyLabel.innerText = "พื้นที่จองสะสม:";
        calcUnitLabel.innerText = "ราคาต่อไร่:";
        
        // Update slider values for Rai
        qtySlider.min = 1;
        qtySlider.max = 50;
        if (parseInt(document.getElementById('input-qty').value) > 50) {
            qtySlider.value = 50;
        }
        sliderLabels.innerHTML = `
            <span>1 ไร่</span>
            <span>25 ไร่</span>
            <span>50 ไร่</span>
        `;
    } else {
        qtyInputLabel.innerText = "จำนวนต้นกาแฟ (ต้น)";
        calcQtyLabel.innerText = "จำนวนต้นกาแฟที่จอง:";
        calcUnitLabel.innerText = "ราคาต่อต้น:";
        
        // Update slider values for Trees
        qtySlider.min = 1;
        qtySlider.max = 100;
        if (parseInt(document.getElementById('input-qty').value) > 100) {
            qtySlider.value = 100;
        }
        sliderLabels.innerHTML = `
            <span>1 ต้น</span>
            <span>50 ต้น</span>
            <span>100 ต้น</span>
        `;
    }
    
    updateCalculator();
}

function adjustQty(amount) {
    const qtyInput = document.getElementById('input-qty');
    let val = parseInt(qtyInput.value) || 0;
    val += amount;
    
    if (val < 1) val = 1;
    if (val > 1000) val = 1000;
    
    qtyInput.value = val;
    
    // Sync slider based on its dynamic max value
    const qtySlider = document.getElementById('qty-slider');
    const maxVal = parseInt(qtySlider.max) || 100;
    qtySlider.value = val > maxVal ? maxVal : val;
    
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
    
    const seedlingType = registrationData.seedlingType || '1-2m';
    const bookingMode = registrationData.bookingMode || 'tree';
    
    let pricePerUnit = 50;
    if (seedlingType === '1-2m') {
        pricePerUnit = bookingMode === 'rai' ? 25 : 50;
    } else {
        pricePerUnit = bookingMode === 'rai' ? 45 : 100;
    }
    
    const total = qty * pricePerUnit;
    
    registrationData.qty = qty;
    registrationData.total = total;
    
    const unitText = bookingMode === 'rai' ? 'ไร่' : 'ต้น';
    
    document.getElementById('calc-qty').innerText = `${qty} ${unitText}`;
    document.getElementById('calc-unit-price').innerText = `${pricePerUnit} บาท`;
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
    
    statusText.innerText = "กำลังจัดทำเอกสารความตกลงร่วมมือ MOU (PDF)...";
    progressBar.style.width = "25%";
    
    buildMOUCanvasAndPDF((doc) => {
        progressBar.style.width = "50%";
        statusText.innerText = "กำลังส่งข้อมูลการจองและอัปโหลดเอกสาร...";
        
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== "") {
            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    memberId: registrationData.memberId,
                    fullname: registrationData.fullname,
                    citizenid: registrationData.citizenid,
                    phone: registrationData.phone,
                    lineid: registrationData.lineid,
                    address: registrationData.address,
                    email: registrationData.email,
                    seedlingType: registrationData.seedlingType === '1-2m' ? '1-2 เดือน' : '1 ปี',
                    bookingMode: registrationData.bookingMode === 'rai' ? 'ไร่' : 'ต้น',
                    qty: registrationData.qty,
                    total: registrationData.total,
                    plantingarea: registrationData.plantingarea,
                    pdfBase64: pdfBase64
                })
            })
            .then(() => {
                progressBar.style.width = "100%";
                statusText.innerText = "บันทึกข้อมูลและส่งอีเมลเรียบร้อย!";
                setTimeout(() => {
                    showSuccessScreen();
                }, 500);
            })
            .catch((err) => {
                console.error("Error submitting registration:", err);
                progressBar.style.width = "100%";
                statusText.innerText = "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย";
                setTimeout(() => {
                    showSuccessScreen();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                progressBar.style.width = "100%";
                statusText.innerText = "เสร็จสิ้น (โหมดจำลอง)";
                setTimeout(() => {
                    showSuccessScreen();
                }, 500);
            }, 1000);
        }
    });
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
    
    // Update live metrics on Dashboard directly from Google Sheet
    fetchDashboardData();
}

function restartWizard() {
    // Reset inputs
    document.getElementById('input-fullname').value = '';
    document.getElementById('input-phone').value = '';
    document.getElementById('input-lineid').value = '';
    document.getElementById('input-email').value = '';
    document.getElementById('input-qty').value = '20';
    document.getElementById('qty-slider').value = '20';
    
    // Reset pricing options to default: 1-2m and tree
    registrationData.seedlingType = '1-2m';
    registrationData.bookingMode = 'tree';
    
    // Reset radio buttons in UI
    document.querySelector('input[name="seedling-age"][value="1-2m"]').checked = true;
    document.querySelector('input[name="booking-mode"][value="tree"]').checked = true;
    
    // Toggle active class on cards
    changeSeedlingAge('1-2m');
    changeBookingMode('tree');
    
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
    
    // Mask phone number and citizen ID for dashboard visual
    const maskedPhone = registrationData.phone.replace(/(\d{3})-(\d{3})-(\d{4})/, '$1-XXX-$3');
    const maskedCitizen = registrationData.citizenid.replace(/(\d{3})\d{7}(\d{3})/, '$1XXXXXXX$2');
    const maskedAddress = registrationData.address.length > 20 ? registrationData.address.substring(0, 18) + "..." : registrationData.address;
    const maskedPlanting = registrationData.plantingarea.length > 20 ? registrationData.plantingarea.substring(0, 18) + "..." : registrationData.plantingarea;
    
    const seedlingText = registrationData.seedlingType === '1-2m' ? '1-2 เดือน' : '1 ปี';
    const modeText = registrationData.bookingMode === 'rai' ? 'ไร่' : 'ต้น';
    
    row.innerHTML = `
        <td>${dateStr}</td>
        <td><strong>${registrationData.memberId}</strong></td>
        <td>${registrationData.fullname}</td>
        <td>${maskedCitizen}</td>
        <td>${maskedPhone}</td>
        <td>${registrationData.lineid}</td>
        <td>${maskedAddress}</td>
        <td>${registrationData.email}</td>
        <td>${seedlingText}</td>
        <td>${modeText}</td>
        <td>${registrationData.qty}</td>
        <td>${registrationData.total.toLocaleString()}</td>
        <td>${maskedPlanting}</td>
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
            data: [0, 0, 0, 0, 0, 0, totalMembers], // Updates with new member
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

    buildMOUCanvasAndPDF((doc) => {
        doc.save(`MOU_${registrationData.memberId}.pdf`);
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> ดาวน์โหลดใบสำคัญ MOU (PDF)`;
    });
}

function buildMOUCanvasAndPDF(callback) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; // high-res portrait A4 aspect ratio (1200 x 1700)
    canvas.height = 1700;
    const ctx = canvas.getContext('2d');
    
    // Load images dynamically
    const imagesToLoad = [
        { name: 'logo', src: './logo 456 cafe_1.png' },
        { name: 'qrcode', src: './dbarcodes_line.png' }
    ];
    
    let loadedCount = 0;
    const loadedImages = {};
    
    imagesToLoad.forEach(imgData => {
        const img = new Image();
        img.src = imgData.src;
        img.onload = () => {
            loadedImages[imgData.name] = img;
            loadedCount++;
            if (loadedCount === imagesToLoad.length) {
                drawCanvasContent(ctx, canvas, loadedImages, callback);
            }
        };
        img.onerror = () => {
            loadedImages[imgData.name] = null; // fallback will handle it
            loadedCount++;
            if (loadedCount === imagesToLoad.length) {
                drawCanvasContent(ctx, canvas, loadedImages, callback);
            }
        };
    });
}

function drawCanvasContent(ctx, canvas, loadedImages, callback) {
    const w = canvas.width;
    const h = canvas.height;

    // Fill background with warm parchment/cream tone
    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, w, h);

    // Draw borders
    ctx.strokeStyle = '#c5a880'; // Gold border
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = '#3d271d'; // Fine brown line
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    // Draw Corner Decorations
    drawCornerDecors(ctx, w, h);

    // ----------------------------------------------------
    // HEADER AREA
    // ----------------------------------------------------
    
    // Left: Logo
    if (loadedImages.logo) {
        ctx.drawImage(loadedImages.logo, 60, 60, 140, 140);
    } else {
        // Fallback drawing simple circular logo on canvas
        ctx.beginPath();
        ctx.arc(130, 130, 60, 0, 2 * Math.PI);
        ctx.fillStyle = '#3d271d';
        ctx.fill();
        ctx.strokeStyle = '#c5a880';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Prompt, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('456', 130, 138);
    }

    // Right: QR Code Group
    ctx.strokeStyle = 'rgba(61, 39, 29, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(980, 60, 140, 140);
    if (loadedImages.qrcode) {
        ctx.drawImage(loadedImages.qrcode, 990, 70, 120, 120);
    }
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3d271d';
    ctx.font = 'bold 12px Prompt, sans-serif';
    ctx.fillText('สแกนสมัครสมาชิก', 1050, 48);
    ctx.fillStyle = '#2c5e43';
    ctx.font = 'bold 12px Prompt, sans-serif';
    ctx.fillText('LINE Official', 1050, 215);
    ctx.fillStyle = '#7d6e65';
    ctx.font = '10px Prompt, sans-serif';
    ctx.fillText('ติดตามข่าวสารโครงการ', 1050, 230);
    ctx.fillText('และสิทธิประโยชน์', 1050, 243);

    // Center: Title Text
    ctx.textAlign = 'center';
    
    // Badge: "บันทึกข้อตกลงความร่วมมือ (MOU)"
    ctx.fillStyle = '#3d271d';
    ctx.font = 'bold 28px Prompt, sans-serif';
    ctx.fillText('บันทึกข้อตกลงความร่วมมือ (MOU)', 600, 95);

    // Badge: "โครงการ"
    ctx.fillStyle = '#c5a880';
    drawRoundedRect(ctx, 520, 112, 160, 32, 6, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Prompt, sans-serif';
    ctx.fillText('โครงการ', 600, 134);

    // Title: "1 ต้น 1 ความหวัง"
    ctx.fillStyle = '#3d271d';
    ctx.font = 'bold 54px Prompt, sans-serif';
    ctx.fillText('1 ต้น 1 ความหวัง', 600, 205);

    // Subtitle: "กาแฟท้องถิ่น กาฬสินธุ์บ้านเฮา"
    ctx.fillStyle = '#c5a880';
    ctx.font = '500 24px Prompt, sans-serif';
    ctx.fillText('กาแฟท้องถิ่น กาฬสินธุ์บ้านเฮา', 600, 245);

    ctx.fillStyle = '#7d6e65';
    ctx.font = '14px Prompt, sans-serif';
    ctx.fillText('ดำเนินการโดย', 600, 275);

    // Badge: วิสาหกิจชุมชน...
    ctx.fillStyle = '#3d271d';
    drawRoundedRect(ctx, 250, 290, 700, 38, 8, true, false);
    ctx.fillStyle = '#faf7f2';
    ctx.font = 'bold 16px Prompt, sans-serif';
    ctx.fillText('วิสาหกิจชุมชนแปรรูปกาแฟ 456 อำเภอกุฉินารายณ์ จังหวัดกาฬสินธุ์', 600, 314);

    // Registry Number & Date
    ctx.fillStyle = '#3d271d';
    ctx.font = 'bold 16px Prompt, sans-serif';
    ctx.fillText('ทะเบียนเลขที่ 4-46-05-04/1-0052', 600, 355);

    const now = new Date();
    const dateText = `วันที่ ${now.getDate()}   เดือน ${getThaiMonthName(now.getMonth())}   พ.ศ. ${now.getFullYear() + 543}`;
    ctx.fillStyle = '#7d6e65';
    ctx.font = '16px Prompt, sans-serif';
    ctx.fillText(dateText, 600, 395);

    // Horizontal Separator
    ctx.strokeStyle = 'rgba(61, 39, 29, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 420);
    ctx.lineTo(1140, 420);
    ctx.stroke();

    // ----------------------------------------------------
    // INFORMATION DETAILS (TWO COLUMNS)
    // ----------------------------------------------------
    
    // Vertical Separator
    ctx.strokeStyle = 'rgba(197, 168, 128, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(600, 445);
    ctx.lineTo(600, 765);
    ctx.stroke();

    // LEFT COLUMN: ข้อมูลผู้จอง
    ctx.fillStyle = '#3d271d';
    drawRoundedRect(ctx, 60, 445, 180, 34, 17, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Prompt, sans-serif';
    ctx.fillText('👤 ข้อมูลผู้จอง', 150, 467);

    const leftColX = 60;
    const leftColW = 500;
    
    drawTextLineWithDots(ctx, 'ชื่อ-สกุล / หน่วยงาน', registrationData.fullname, leftColX, 520, leftColW);
    
    const formattedCitizen = registrationData.citizenid.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
    drawTextLineWithDots(ctx, 'เลขบัตรประชาชน / ทะเบียนนิติบุคคล', formattedCitizen, leftColX, 570, leftColW);
    
    // Draw Address (supporting wrapping if long)
    const rawAddress = registrationData.address;
    if (ctx.measureText(rawAddress).width > 350) {
        // Find a good place to split (e.g. before "อ." or "ต." or "จ.")
        let splitIdx = -1;
        const splitKeywords = [" อ.", " จ.", " ต.", " อำเภอ", " จังหวัด", " ตำบล", "อ.", "จ.", "ต.", "อำเภอ", "จังหวัด", "ตำบล"];
        for (let kw of splitKeywords) {
            const idx = rawAddress.indexOf(kw);
            if (idx > 15 && idx < 35) {
                splitIdx = idx;
                break;
            }
        }
        if (splitIdx === -1) {
            splitIdx = Math.floor(rawAddress.length / 2);
        }
        const line1 = rawAddress.substring(0, splitIdx).trim();
        const line2 = rawAddress.substring(splitIdx).trim();
        
        drawTextLineWithDots(ctx, 'ที่อยู่', line1, leftColX, 620, leftColW);
        
        // Draw line 2 without dots, perfectly aligned with line 1 value
        ctx.save();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#2c211a';
        ctx.font = 'bold 16px Prompt, sans-serif';
        const labelWidth = ctx.measureText('ที่อยู่').width;
        ctx.fillText(line2, leftColX + labelWidth + 10, 660);
        ctx.restore();
    } else {
        drawTextLineWithDots(ctx, 'ที่อยู่', rawAddress, leftColX, 620, leftColW);
    }
    
    drawTextLineWithDots(ctx, 'โทรศัพท์', registrationData.phone, leftColX, 705, 230);
    drawTextLineWithDots(ctx, 'LINE ID', registrationData.lineid, leftColX + 260, 705, 240);
    
    drawTextLineWithDots(ctx, 'E-mail (ถ้ามี)', registrationData.email, leftColX, 755, leftColW);

    // RIGHT COLUMN: รายละเอียดการจอง
    ctx.fillStyle = '#3d271d';
    drawRoundedRect(ctx, 640, 445, 200, 34, 17, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Prompt, sans-serif';
    ctx.fillText('🌱 รายละเอียดการจอง', 740, 467);

    const rightColX = 640;
    const rightColW = 500;
    
    const seedlingText = registrationData.seedlingType === '1-2m' ? '1-2 เดือน' : '1 ปี';
    const bookingModeText = registrationData.bookingMode === 'rai' ? 'ไร่' : 'ต้น';
    const pricePerUnitVal = registrationData.seedlingType === '1-2m' ? (registrationData.bookingMode === 'rai' ? 25 : 50) : (registrationData.bookingMode === 'rai' ? 45 : 100);

    drawTextLineWithDots(ctx, `จำนวนที่จอง (อายุกล้า ${seedlingText})`, `${registrationData.qty} ${bookingModeText}`, rightColX, 520, rightColW);
    drawTextLineWithDots(ctx, `ราคาค่าจองต่อหน่วย`, `${pricePerUnitVal} บาท / ${bookingModeText}`, rightColX, 570, rightColW);
    drawTextLineWithDots(ctx, `รวมเป็นเงินทั้งสิ้น`, `${registrationData.total.toLocaleString()} บาท`, rightColX, 620, rightColW);
    
    // Thai text conversion
    const thaiText = thaiBahtText(registrationData.total);
    drawTextLineWithDots(ctx, `ตัวเขียนจำนวนเงิน`, `( ${thaiText} )`, rightColX, 670, rightColW, '#c5a880', '#7d6e65', '#2c5e43');

    // Planting location
    ctx.fillStyle = '#c5a880';
    drawRoundedRect(ctx, rightColX, 715, 110, 26, 4, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Prompt, sans-serif';
    ctx.fillText('พื้นที่ปลูก', rightColX + 55, 732);
    
    drawTextLineWithDots(ctx, `สถานที่ตั้งแปลง`, registrationData.plantingarea, rightColX, 765, rightColW);

    // Horizontal Separator
    ctx.strokeStyle = 'rgba(61, 39, 29, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 795);
    ctx.lineTo(1140, 795);
    ctx.stroke();

    // ----------------------------------------------------
    // AGREEMENT SECTION (ข้อตกลง)
    // ----------------------------------------------------
    
    ctx.fillStyle = '#3d271d';
    drawRoundedRect(ctx, 510, 810, 180, 36, 6, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Prompt, sans-serif';
    ctx.fillText('ข้อตกลง', 600, 834);

    // Left half agreement items 1-3
    ctx.fillStyle = '#3d271d';
    
    // Item 1
    drawNumberBadge(ctx, 1, 60, 880);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Prompt, sans-serif';
    ctx.fillText('วิสาหกิจชุมชนแปรรูปกาแฟ 456 จะดำเนินการปลูก ดูแล', 100, 890);
    ctx.font = '13px Prompt, sans-serif';
    ctx.fillText('และบำรุงรักษาต้นกาแฟตามหลักวิชาการเกษตรอย่างเหมาะสม', 100, 910);
 
    // Item 2
    drawNumberBadge(ctx, 2, 60, 935);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Prompt, sans-serif';
    ctx.fillText('ผู้จองรับทราบว่าการเจริญเติบโตและผลผลิตอาจเปลี่ยนแปลง', 100, 945);
    ctx.font = '13px Prompt, sans-serif';
    ctx.fillText('ได้ตามสภาพอากาศ โรคพืช หรือเหตุสุดวิสัยซึ่งอยู่นอกเหนือการควบคุม', 100, 965);
 
    // Item 3
    drawNumberBadge(ctx, 3, 60, 990);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Prompt, sans-serif';
    ctx.fillText('ผู้จองมีสิทธิรับข้อมูลการเติบโตของต้นกาแฟเป็นระยะ', 100, 1000);
    ctx.font = '13px Prompt, sans-serif';
    ctx.fillText('และได้รับผลประโยชน์ตามเงื่อนไขของโครงการ ดังนี้:', 100, 1020);
 
    // Draw 4 icon labels
    drawIconFeature(ctx, '📋', 'ใบรับรอง', 70, 1050);
    drawIconFeature(ctx, '🏷️', 'ป้ายชื่อ', 190, 1050);
    drawIconFeature(ctx, '📊', 'รายงานผล', 310, 1050);
    drawIconFeature(ctx, '☕', 'กาแฟคั่วพิเศษ', 430, 1050);
 
    // Right half agreement items 4-5
    // Item 4
    drawNumberBadge(ctx, 4, 640, 880);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Prompt, sans-serif';
    ctx.fillText('ระยะเวลาโครงการ: 4 ปี นับจากวันเริ่มดำเนินการปลูก', 680, 895);
 
    // Item 5
    drawNumberBadge(ctx, 5, 640, 925);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Prompt, sans-serif';
    ctx.fillText('บันทึกข้อตกลงฉบับนี้จัดทำขึ้นด้วยความสมัครใจ', 680, 935);
    ctx.font = '13px Prompt, sans-serif';
    ctx.fillText('เพื่อร่วมสร้างผืนป่ากาแฟ สร้างอาชีพ และพัฒนาเศรษฐกิจฐานราก', 680, 955);
 
    // Benefits box
    ctx.fillStyle = '#faf0e0';
    ctx.strokeStyle = '#c5a880';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 640, 980, 500, 140, 8, true, true);
     
    ctx.fillStyle = '#3d271d';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Prompt, sans-serif';
    ctx.fillText('🎁 ผลประโยชน์สำหรับผู้จอง (เมื่อผลผลิตพร้อมเก็บเกี่ยว)', 660, 1008);
     
    ctx.font = '12px Prompt, sans-serif';
    ctx.fillText('✓  ได้รับผลผลิตกาแฟคั่วคุณภาพ 1 กิโลกรัม / การจองทุก 10 ต้น ต่อปี', 660, 1035);
    ctx.fillText('✓  ได้รับส่วนลดพิเศษสำหรับผลิตภัณฑ์ 456 Coffee ตลอดชีพ', 660, 1060);
    ctx.fillText('✓  สิทธิ์เข้าร่วมกิจกรรมทริปวิสาหกิจชุมชนกาแฟฟรีประจำปี', 660, 1085);
    ctx.fillText('✓  รับสิทธิพิเศษอื่น ๆ ตามที่โครงการกำหนดเพื่อสังคมชุมชน', 660, 1110);

    // Horizontal Separator
    ctx.strokeStyle = 'rgba(61, 39, 29, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 1145);
    ctx.lineTo(1140, 1145);
    ctx.stroke();

    // ----------------------------------------------------
    // SIGNATURES AREA (คำรับรอง)
    // ----------------------------------------------------
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3d271d';
    ctx.font = 'bold 18px Prompt, sans-serif';
    ctx.fillText('🛡️ คำรับรอง', 600, 1178);

    ctx.font = 'italic 15px Prompt, sans-serif';
    ctx.fillStyle = '#2c211a';
    ctx.fillText('ข้าพเจ้ายินยอมเข้าร่วมโครงการ “1 ต้น 1 ความหวัง กาแฟท้องถิ่น กาฬสินธุ์บ้านเฮา” และยอมรับข้อตกลงตามที่ระบุไว้ทุกประการ', 600, 1210);

    // Left Column Signature
    ctx.fillStyle = '#3d271d';
    drawRoundedRect(ctx, 190, 1235, 140, 28, 14, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Prompt, sans-serif';
    ctx.fillText('✍️ ผู้จอง', 260, 1253);

    ctx.fillStyle = '#7d6e65';
    ctx.font = '14px Prompt, sans-serif';
    ctx.fillText('ลงชื่อ .........................................................................', 260, 1315);
    ctx.fillStyle = '#2c211a';
    ctx.fillText(`( ${registrationData.fullname} )`, 260, 1345);
    ctx.fillStyle = '#7d6e65';
    ctx.font = '12px Prompt, sans-serif';
    ctx.fillText(`วันที่ ${now.getDate()} / ${now.getMonth() + 1} / ${now.getFullYear() + 543}`, 260, 1395);

    // Center image: Branch of Coffee Cherries (mock drawn path)
    drawCoffeeBranch(ctx, 600, 1300);

    // Right Column Signature
    ctx.fillStyle = '#3d271d';
    drawRoundedRect(ctx, 810, 1235, 200, 28, 14, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Prompt, sans-serif';
    ctx.fillText('✍️ ผู้แทนวิสาหกิจชุมชน', 910, 1253);

    ctx.fillStyle = '#7d6e65';
    ctx.font = '14px Prompt, sans-serif';
    ctx.fillText('ลงชื่อ .........................................................................', 910, 1315);
    ctx.fillStyle = '#2c211a';
    ctx.fillText('( นายนพดล สิงห์ภักดี )', 910, 1345);
    ctx.fillStyle = '#7d6e65';
    ctx.font = '12px Prompt, sans-serif';
    ctx.fillText('ตำแหน่ง: ประธานวิสาหกิจชุมชนแปรรูปกาแฟ 456', 910, 1370);
    ctx.fillText(`วันที่ ${now.getDate()} / ${now.getMonth() + 1} / ${now.getFullYear() + 543}`, 910, 1395);

    // Red Stamp Seal over President signature area
    ctx.beginPath();
    ctx.arc(960, 1330, 40, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(220, 53, 69, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = 'bold 8px Prompt, sans-serif';
    ctx.fillStyle = 'rgba(220, 53, 69, 0.4)';
    ctx.fillText('วิสาหกิจชุมชน 456', 960, 1325);
    ctx.fillText('กาแฟกาฬสินธุ์', 960, 1338);

    // ----------------------------------------------------
    // FOOTER AREA
    // ----------------------------------------------------
    ctx.fillStyle = '#3d271d';
    ctx.fillRect(32, 1600, w - 64, 68);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#faf7f2';
    ctx.font = '11px Prompt, sans-serif';
    ctx.fillText('📍 สถานที่ติดต่อ: 456 Coffee วิสาหกิจชุมชนแปรรูปกาแฟ 456 อำเภอกุฉินารายณ์ จังหวัดกาฬสินธุ์', 60, 1625);
    ctx.fillText('📞 เบอร์โทรศัพท์: 098-565-2966   |   📧 อีเมลกลาง: 456cafe.kalasin@gmail.com', 60, 1645);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#c5a880';
    ctx.font = 'bold 14px Prompt, sans-serif';
    ctx.fillText('“ปลูกวันนี้ เพื่ออนาคตที่ยั่งยืน”', 1120, 1638);

    // Trigger jsPDF conversion and callback
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    if (callback) {
        callback(doc);
    }
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
    ctx.restore();
}

function drawNumberBadge(ctx, num, x, y) {
    ctx.save();
    ctx.fillStyle = '#c5a880';
    ctx.beginPath();
    ctx.arc(x + 14, y + 14, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Prompt, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(num, x + 14, y + 18);
    ctx.restore();
}

function drawIconFeature(ctx, emoji, label, x, y) {
    ctx.save();
    ctx.fillStyle = '#fdfbf7';
    ctx.strokeStyle = 'rgba(61, 39, 29, 0.08)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, 100, 64, 8, true, true);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3d271d';
    ctx.font = '20px Prompt, sans-serif';
    ctx.fillText(emoji, x + 50, y + 30);
    
    ctx.font = 'bold 10px Prompt, sans-serif';
    ctx.fillStyle = '#7d6e65';
    ctx.fillText(label, x + 50, y + 50);
    ctx.restore();
}

function drawCoffeeBranch(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#5c4033'; // branch color
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.quadraticCurveTo(x - 20, y, x, y + 40);
    ctx.stroke();
    
    ctx.fillStyle = '#2c5e43';
    ctx.beginPath();
    ctx.ellipse(x - 15, y - 20, 15, 8, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 10, 15, 8, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#d9534f';
    ctx.beginPath();
    ctx.arc(x - 4, y, 6, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 8, 6, 0, Math.PI * 2);
    ctx.arc(x, y + 8, 6, 0, Math.PI * 2);
    ctx.arc(x + 6, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawTextLineWithDots(ctx, label, val, x, y, w, dotColor='#c5a880', labelColor='#7d6e65', valColor='#2c211a') {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '16px Prompt, sans-serif';
    
    // 1. Draw Label
    ctx.fillStyle = labelColor;
    ctx.fillText(label, x, y);
    const labelWidth = ctx.measureText(label).width;
    
    // 2. Draw dots in the space between label and the right edge
    ctx.fillStyle = dotColor;
    ctx.textAlign = 'right';
    let dotsStr = "";
    const dotsCount = Math.floor((w - labelWidth - 10) / 4);
    for(let i=0; i<dotsCount; i++) dotsStr += ".";
    ctx.fillText(dotsStr, x + w, y - 2);
    
    // 3. Draw Value on top of the dots (left aligned after label)
    ctx.textAlign = 'left';
    ctx.fillStyle = valColor;
    ctx.font = 'bold 16px Prompt, sans-serif';
    ctx.fillText(val || "", x + labelWidth + 10, y - 2);
    ctx.restore();
}

function thaiBahtText(num) {
    if (num === 0) return "ศูนย์บาทถ้วน";
    const THAI_NUMBER = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const THAI_UNIT = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
    
    let text = "";
    const numStr = String(num);
    const len = numStr.length;
    
    for (let i = 0; i < len; i++) {
        const digit = parseInt(numStr.charAt(i));
        const pos = len - i - 1;
        
        if (digit !== 0) {
            if (pos === 1 && digit === 2) {
                text += "ยี่";
            } else if (pos === 1 && digit === 1) {
                text += "";
            } else if (pos === 0 && digit === 1 && len > 1 && numStr.charAt(i - 1) !== '0') {
                text += "เอ็ด";
            } else {
                text += THAI_NUMBER[digit];
            }
            text += THAI_UNIT[pos];
        }
    }
    return text + "บาทถ้วน";
}

function getThaiMonthName(idx) {
    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months[idx];
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

/* ==========================================================================
   TAB SWITCHER FOR BENEFITS SECTION
   ========================================================================== */
function switchBenefitTab(tabName) {
    // 1. Update tab button classes
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    const activeBtn = Array.from(tabBtns).find(btn => btn.getAttribute('onclick').includes(tabName));
    if (activeBtn) activeBtn.classList.add('active');
    
    // 2. Update text content
    const contents = document.querySelectorAll('.benefit-tab-content');
    contents.forEach(c => {
        c.classList.remove('active-tab-content');
    });
    const targetContent = document.getElementById(`tab-content-${tabName}`);
    if (targetContent) targetContent.classList.add('active-tab-content');
    
    // 3. Update active visual images
    const imgWrappers = document.querySelectorAll('.infographic-wrapper');
    imgWrappers.forEach(w => {
        w.classList.remove('active-img');
    });
    const targetImg = document.getElementById(`img-${tabName}`);
    if (targetImg) targetImg.classList.add('active-img');
}

/* ==========================================================================
   DYNAMIC GOOGLE SHEET SYNCHRONIZATION
   ========================================================================== */
function fetchDashboardData() {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === "") return;
    
    fetch(GOOGLE_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                totalMembers = data.totalMembers;
                totalTrees = data.totalTrees;
                totalValue = data.totalValue;
                todayRegistrations = data.todayRegistrations;
                nextMemberIndex = totalMembers + 1;
                
                // Update Dashboard DOM metrics
                updateDashboardDOM();
                
                // Populate log table
                populateLogTable(data.registrations);
                
                // Recalculate top supporters
                rebuildTopSupporters(data.registrations);
                
                // Recalculate and update chart
                rebuildChart(data.registrations);
            }
        })
        .catch(err => {
            console.error("Error fetching dashboard data:", err);
        });
}

function updateDashboardDOM() {
    const pct = (totalTrees / 4560) * 100;
    
    const targetProgress = document.getElementById('target-progress');
    if (targetProgress) targetProgress.style.width = `${Math.min(pct, 100)}%`;
    
    const statsSpan = document.querySelector('.progress-stats span:first-child');
    if (statsSpan) statsSpan.innerText = `จองแล้ว ${totalTrees.toLocaleString()} ต้น (${pct.toFixed(1)}%)`;
    
    const remainingSpan = document.querySelector('.progress-stats span:last-child');
    if (remainingSpan) remainingSpan.innerText = `คงเหลือ ${Math.max(4560 - totalTrees, 0).toLocaleString()} ต้น`;
    
    // Dashboard Cards
    const dashMembers = document.getElementById('dash-members');
    if (dashMembers) dashMembers.innerHTML = `${totalMembers} <small>คน</small>`;
    
    const dashTrees = document.getElementById('dash-trees');
    if (dashTrees) dashTrees.innerHTML = `${totalTrees.toLocaleString()} <small>ต้น</small>`;
    
    const dashTreesPct = document.getElementById('dash-trees-percentage');
    if (dashTreesPct) dashTreesPct.innerText = `${pct.toFixed(1)}% จากเป้าหมายโครงการ`;
    
    const dashValue = document.getElementById('dash-value');
    if (dashValue) dashValue.innerHTML = `${totalValue.toLocaleString()} <small>บาท</small>`;
    
    const dashToday = document.getElementById('dash-today');
    if (dashToday) dashToday.innerHTML = `${todayRegistrations} <small>คน</small>`;
}

function populateLogTable(registrations) {
    const tableBody = document.getElementById('sheet-table-body');
    if (!tableBody) return;
    
    // Sort registrations descending by date (newest first)
    const sorted = [...registrations].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    let htmlContent = '';
    sorted.forEach(reg => {
        const date = new Date(reg.timestamp);
        const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        const phone = reg.phone || '';
        let maskedPhone = phone;
        if (phone) {
            if (phone.includes('-')) {
                maskedPhone = phone.replace(/(\d{3})-(\d{3})-(\d{4})/, '$1-XXX-$3');
            } else if (phone.length >= 10) {
                maskedPhone = phone.substring(0, 3) + "-XXX-" + phone.substring(6);
            }
        }
        
        const citizenid = reg.citizenid || '';
        let maskedCitizen = citizenid;
        if (citizenid) {
            if (citizenid.length >= 13) {
                maskedCitizen = citizenid.substring(0, 3) + "XXXXXXX" + citizenid.substring(10);
            }
        }
        
        const address = reg.address || '';
        const maskedAddress = address.length > 20 ? address.substring(0, 18) + "..." : address;
        
        const plantingarea = reg.plantingarea || '';
        const maskedPlanting = plantingarea.length > 20 ? plantingarea.substring(0, 18) + "..." : plantingarea;
        
        const memberId = reg.memberId || '';
        const fullname = reg.fullname || '';
        const lineid = reg.lineid || '';
        const email = reg.email || '';
        const seedlingType = reg.seedlingType || '';
        const bookingMode = reg.bookingMode || '';
        const qty = reg.qty || 0;
        const total = reg.total || 0;
        const pdfUrl = reg.pdfUrl || '#';
        
        htmlContent += `
            <tr>
                <td>${dateStr}</td>
                <td><strong>${memberId}</strong></td>
                <td>${fullname}</td>
                <td>${maskedCitizen}</td>
                <td>${maskedPhone}</td>
                <td>${lineid}</td>
                <td>${maskedAddress}</td>
                <td>${email}</td>
                <td>${seedlingType}</td>
                <td>${bookingMode}</td>
                <td>${qty}</td>
                <td>${total.toLocaleString()}</td>
                <td>${maskedPlanting}</td>
                <td><a href="${pdfUrl}" target="_blank" class="badge badge-pdf"><i class="fa-solid fa-file-pdf"></i> PDF</a></td>
            </tr>
        `;
    });
    tableBody.innerHTML = htmlContent;
}

function rebuildTopSupporters(registrations) {
    const list = document.getElementById('supporters-list-container');
    if (!list) return;
    
    // Aggregate by user name
    const agg = {};
    registrations.forEach(reg => {
        if (!agg[reg.fullname]) {
            agg[reg.fullname] = { qty: 0, mode: reg.bookingMode };
        }
        agg[reg.fullname].qty += reg.qty;
    });
    
    const supporters = Object.keys(agg).map(name => {
        return {
            name: name,
            qty: agg[name].qty,
            subtext: agg[name].mode === 'rai' ? "ผู้สนับสนุนจองรายไร่" : "สมาชิกจองออนไลน์รายย่อย"
        };
    });
    
    // Sort descending
    supporters.sort((a, b) => b.qty - a.qty);
    
    let htmlContent = '';
    // Render top 5
    for (let i = 0; i < Math.min(supporters.length, 5); i++) {
        const s = supporters[i];
        let rankClass = "rank";
        if (i === 0) rankClass = "rank first";
        else if (i === 1) rankClass = "rank second";
        else if (i === 2) rankClass = "rank third";
        
        htmlContent += `
            <li class="supporter-item">
                <span class="${rankClass}">${i + 1}</span>
                <div class="supporter-info">
                    <strong>${s.name}</strong>
                    <span>${s.subtext}</span>
                </div>
                <span class="support-qty">${s.qty} ต้น</span>
            </li>
        `;
    }
    list.innerHTML = htmlContent;
}

function rebuildChart(registrations) {
    if (!monthlyChart) return;
    
    // Initialize months counts (January to July)
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    registrations.forEach(reg => {
        if (reg.timestamp) {
            const date = new Date(reg.timestamp);
            const month = date.getMonth(); // 0-11
            if (month >= 0 && month <= 6) { // Jan-Jul
                counts[month]++;
            }
        }
    });
    
    monthlyChart.data.datasets[0].data = counts;
    monthlyChart.update();
}
