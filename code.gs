/**
 * Google Apps Script สำหรับเชื่อมต่อฟอร์มของโครงการ "1 ต้น 1 ความหวัง" เข้ากับ Google Sheets
 * 
 * วิธีการใช้งาน:
 * 1. เปิด Google Sheets ของคุณ: https://docs.google.com/spreadsheets/d/1sRp4veRSePaxlx0GFxD2OgBJOm0PUQyylTj3MqGxV6g/edit
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "แอปสคริปต์" (Apps Script)
 * 3. คัดลอกโค้ดทั้งหมดในไฟล์นี้ไปวางแทนที่โค้ดเดิมในตัวแก้ไข
 * 4. กดบันทึก (ปุ่มแผ่นดิสก์)
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 6. เลือกประเภทของการทำให้ใช้งานได้เป็น "เว็บแอป" (Web app)
 * 7. ตั้งค่าการกำหนดค่าดังนี้:
 *    - อธิบาย: ป้อนคำอธิบายสั้นๆ (เช่น v1)
 *    - เรียกใช้ในฐานะ: เลือกเป็นบัญชีอีเมลของคุณ (Execute as: Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: เลือกเป็น "ทุกคน" (Who has access: Anyone)
 * 8. กดปุ่ม "ทำให้ใช้งานได้" (Deploy)
 * 9. คัดลอก "URL ของเว็บแอป" (Web App URL) ที่ได้
 * 10. นำ URL นั้นไปวางในไฟล์ app.js ที่ตัวแปร GOOGLE_SCRIPT_URL
 */

function doPost(e) {
  try {
    // กำหนด CORS Headers เพื่อให้เว็บแอปเรียกใช้งานข้ามโดเมนได้
    var headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    
    // ดึงข้อมูลจากคำขอ
    var requestData = JSON.parse(e.postData.contents);
    
    // เปิดสเปรดชีตเป้าหมาย
    var spreadsheetId = "1sRp4veRSePaxlx0GFxD2OgBJOm0PUQyylTj3MqGxV6g";
    var sheet = SpreadsheetApp.openById(spreadsheetId).getSheets()[0];
    
    // ตรวจสอบและสร้างหัวตาราง (Header) หากเป็นชีตเปล่า
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", 
        "Member ID", 
        "ชื่อ - นามสกุล", 
        "เบอร์โทรศัพท์", 
        "LINE ID", 
        "อีเมล", 
        "จำนวนจอง (ต้น)", 
        "ยอดรวม (บาท)"
      ]);
      // ปรับแต่งหัวตารางให้สวยงาม
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackgroundColor("#f4eedf");
    }
    
    // เตรียมข้อมูลแถวใหม่เพื่อบันทึก
    var timestamp = new Date();
    var rowData = [
      timestamp,
      requestData.memberId,
      requestData.fullname,
      requestData.phone,
      requestData.lineid,
      requestData.email,
      Number(requestData.qty),
      Number(requestData.total)
    ];
    
    // บันทึกข้อมูลลงชีตแถวถัดไป
    sheet.appendRow(rowData);
    
    // ส่งข้อความตอบกลับความสำเร็จ
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "บันทึกข้อมูลเรียบร้อยแล้ว",
      memberId: requestData.memberId
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
    
  } catch (error) {
    // ส่งข้อความแจ้งข้อผิดพลาดกลับไป
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
  }
}

// รองรับคำขอ OPTIONS สำหรับ CORS Preflight
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}
