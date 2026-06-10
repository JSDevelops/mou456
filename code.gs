/**
 * Google Apps Script สำหรับเชื่อมต่อฟอร์มของโครงการ "1 ต้น 1 ความหวัง" เข้ากับ Google Sheets
 * และทำการแปลงเอกสาร MOU (PDF) อัปโหลดไปยัง Google Drive พร้อมจัดส่งเข้าสู่อีเมลของผู้สมัครโดยอัตโนมัติ
 * 
 * วิธีการใช้งาน:
 * 1. เปิด Google Sheets ของคุณ: https://docs.google.com/spreadsheets/d/1sRp4veRSePaxlx0GFxD2OgBJOm0PUQyylTj3MqGxV6g/edit
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) > "แอปสคริปต์" (Apps Script)
 * 3. คัดลอกโค้ดทั้งหมดในไฟล์นี้ไปวางแทนที่โค้ดเดิมในตัวแก้ไข
 * 4. กดบันทึก (ปุ่มแผ่นดิสก์)
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 6. เลือกประเภทของการทำให้ใช้งานได้เป็น "เว็บแอป" (Web app)
 * 7. ตั้งค่าการกำหนดค่าดังนี้:
 *    - อธิบาย: ป้อนคำอธิบายสั้นๆ (เช่น v2 - MOU Email integration)
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
    
    // รายชื่อหัวตารางแบบใหม่ (14 คอลัมน์)
    var expectedHeaders = [
      "Timestamp", 
      "Member ID", 
      "ชื่อ - นามสกุล", 
      "เลขประจำตัวประชาชน/นิติบุคคล", 
      "เบอร์โทรศัพท์", 
      "LINE ID", 
      "ที่อยู่ติดต่อ", 
      "อีเมล", 
      "ประเภทต้นกล้า", 
      "หน่วยการจอง", 
      "จำนวนจอง", 
      "ยอดรวม (บาท)", 
      "พื้นที่แปลงปลูก",
      "Link PDF MOU"
    ];
    
    // ตรวจสอบและสร้างหัวตาราง (Header)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(expectedHeaders);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold").setBackgroundColor("#f4eedf");
    } else {
      // ตรวจสอบและอัปเดตหัวตารางเป็นแบบใหม่ถ้ายังเป็นแบบเก่า (8 คอลัมน์) อยู่
      var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn() || expectedHeaders.length);
      var headerValues = headerRange.getValues()[0];
      if (headerValues.indexOf("ประเภทต้นกล้า") === -1) {
        // อัปเดตหัวตารางในแถวแรกใหม่ทั้งหมดเพื่อความเข้ากันได้ย้อนหลัง
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold").setBackgroundColor("#f4eedf");
      }
    }
    
    // บันทึกไฟล์ PDF ไปยัง Google Drive และสร้างแชร์ลิงก์สาธารณะ
    var pdfUrl = "";
    var driveFolderCreated = false;
    
    if (requestData.pdfBase64) {
      try {
        var folderName = "456_MOU_PDFs";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder;
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(folderName);
        }
        
        var pdfBlob = Utilities.newBlob(Utilities.base64Decode(requestData.pdfBase64), "application/pdf", "MOU_" + requestData.memberId + ".pdf");
        var file = folder.createFile(pdfBlob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        pdfUrl = file.getUrl();
        driveFolderCreated = true;
      } catch (driveErr) {
        Logger.log("Drive Folder/File Error: " + driveErr.toString());
      }
    }
    
    // ส่งอีเมลและแนบเอกสารสำคัญ MOU (PDF)
    var emailSent = false;
    var userEmail = requestData.email;
    if (userEmail && userEmail !== "-" && userEmail.indexOf("@") !== -1 && requestData.pdfBase64) {
      try {
        var pdfBlob = Utilities.newBlob(Utilities.base64Decode(requestData.pdfBase64), "application/pdf", "MOU_" + requestData.memberId + ".pdf");
        var subject = "เอกสารบันทึกข้อตกลงร่วมมือ (MOU) - โครงการ 1 ต้น 1 ความหวัง";
        
        var htmlEmailBody = 
          "<div style='font-family: \"Prompt\", sans-serif, Tahoma; max-width: 600px; margin: 0 auto; border: 1px solid #c5a880; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);'>" +
            "<div style='background-color: #3d271d; padding: 30px; text-align: center; color: #ffffff;'>" +
              "<h2 style='margin: 0; font-size: 24px; color: #c5a880;'>วิสาหกิจชุมชนแปรรูปกาแฟ 456</h2>" +
              "<p style='margin: 10px 0 0 0; font-size: 14px;'>โครงการพิเศษ \"1 ต้น 1 ความหวัง\" กาแฟกาฬสินธุ์บ้านเฮา</p>" +
            "</div>" +
            "<div style='padding: 30px; background-color: #faf7f2; color: #2c211a; line-height: 1.6;'>" +
              "<h3 style='margin-top: 0; color: #3d271d;'>เรียน คุณ " + requestData.fullname + ",</h3>" +
              "<p>ขอขอบพระคุณอย่างยิ่งที่ท่านได้ร่วมจองกาแฟและสนับสนุนสร้างพื้นที่สีเขียวร่วมกับวิสาหกิจชุมชนแปรรูปกาแฟ 456</p>" +
              
              "<div style='background-color: #ffffff; border-left: 4px solid #c5a880; padding: 15px; margin: 20px 0; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);'>" +
                "<strong style='color: #3d271d;'>สรุปข้อมูลการลงทะเบียนจอง:</strong><br/>" +
                "• <strong>รหัสสมาชิกประจำตัว:</strong> " + requestData.memberId + "<br/>" +
                "• <strong>รายละเอียดการจอง:</strong> กล้ากาแฟอายุ " + requestData.seedlingType + " จำนวน " + requestData.qty + " " + (requestData.bookingMode === 'rai' ? 'ไร่' : 'ต้น') + "<br/>" +
                "• <strong>ยอดสนับสนุนโครงการ:</strong> " + Number(requestData.total).toLocaleString() + " บาท<br/>" +
                "• <strong>สถานที่ตั้งแปลงปลูก:</strong> " + requestData.plantingarea + "<br/>" +
              "</div>" +
              
              "<p>เราได้แนบ <strong>เอกสารบันทึกข้อตกลงความร่วมมือ (MOU)</strong> ที่ลงนามรับรองสมบูรณ์เรียบร้อยแล้วในรูปแบบ PDF มาพร้อมกับอีเมลฉบับนี้</p>" +
              "<p style='margin-bottom: 0;'>หากท่านต้องการติดต่อสอบถามความคืบหน้าของกล้ากาแฟ หรือข่าวสารสิทธิประโยชน์สมาชิก สามารถติดต่อเราผ่าน LINE Official ได้ตลอดเวลา</p>" +
            "</div>" +
            "<div style='background-color: #3d271d; padding: 20px; text-align: center; color: #7d6e65; font-size: 12px; border-top: 1px solid rgba(197, 168, 128, 0.2);'>" +
              "<p style='margin: 0; color: #c5a880;'>วิสาหกิจชุมชนแปรรูปกาแฟ 456</p>" +
              "<p style='margin: 5px 0 0 0;'>เลขที่ 36 หมู่ 4 ต.กุดสิม อ.เขาวง จ.กาฬสินธุ์ 46110</p>" +
              "<p style='margin: 5px 0 0 0;'>โทร: 098-565-2966</p>" +
            "</div>" +
          "</div>";
          
        MailApp.sendEmail({
          to: userEmail,
          subject: subject,
          htmlBody: htmlEmailBody,
          attachments: [pdfBlob]
        });
        emailSent = true;
      } catch (emailErr) {
        Logger.log("Email Delivery Error: " + emailErr.toString());
      }
    }
    
    // เตรียมข้อมูลแถวใหม่เพื่อบันทึก
    var timestamp = new Date();
    var rowData = [
      timestamp,
      requestData.memberId,
      requestData.fullname,
      requestData.citizenid,
      requestData.phone,
      requestData.lineid,
      requestData.address,
      requestData.email,
      requestData.seedlingType,
      requestData.bookingMode,
      Number(requestData.qty),
      Number(requestData.total),
      requestData.plantingarea,
      pdfUrl
    ];
    
    // บันทึกข้อมูลลงชีตแถวถัดไป
    sheet.appendRow(rowData);
    
    // ส่งข้อความตอบกลับความสำเร็จ
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "บันทึกข้อมูลและส่งอีเมลเรียบร้อยแล้ว",
      memberId: requestData.memberId,
      pdfUrl: pdfUrl,
      emailSent: emailSent
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
