import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const MONTHS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const safeText = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const sanitizeFileName = (value) => {
  return String(value || "payslip")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toUpperCase();
};

const drawLine = (doc, y) => {
  doc
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .moveTo(40, y)
    .lineTo(555, y)
    .stroke();
};

const drawKeyValue = (doc, label, value, x, y, width = 230) => {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text(label, x, y);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#111827")
    .text(safeText(value), x + 92, y, { width: width - 92 });
};

const drawComponentTable = (doc, title, rows, x, y, width) => {
  doc
    .roundedRect(x, y, width, 24, 4)
    .fillAndStroke("#111827", "#111827");

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(title, x + 8, y + 7);

  y += 24;

  doc
    .rect(x, y, width, 22)
    .fillAndStroke("#f3f4f6", "#e5e7eb");

  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Component", x + 8, y + 6, { width: width - 105 });

  doc.text("Amount", x + width - 95, y + 6, {
    width: 85,
    align: "right",
  });

  y += 22;

  if (!rows?.length) {
    doc
      .rect(x, y, width, 24)
      .strokeColor("#e5e7eb")
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text("No records", x + 8, y + 7);

    return y + 24;
  }

  rows.forEach((item) => {
    doc
      .rect(x, y, width, 24)
      .strokeColor("#e5e7eb")
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#111827")
      .text(safeText(item.name || item.code), x + 8, y + 7, {
        width: width - 105,
      });

    doc.text(formatMoney(item.amount), x + width - 95, y + 7, {
      width: 85,
      align: "right",
    });

    y += 24;
  });

  return y;
};

export const generatePayslipPdfFile = async ({ company, payslip }) => {
  const slip =
    typeof payslip.toObject === "function" ? payslip.toObject() : payslip;

  const employee = slip.employeeId || {};
  const payrollRun = slip.payrollRunId || {};

  const yearMonth = `${slip.year}-${String(slip.month).padStart(2, "0")}`;
  const fileName = `${sanitizeFileName(slip.payslipNumber)}.pdf`;

  const dir = path.join(process.cwd(), "uploads", "payslips", yearMonth);
  const filePath = path.join(dir, fileName);

  await fsp.mkdir(dir, { recursive: true });

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Payslip ${slip.payslipNumber}`,
      Author: company?.companyName || "OPAS BIZZ CRM",
      Subject: "Employee Payslip",
    },
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#111827")
    .text(company?.companyName || "Company", 40, 40, { width: 330 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#374151")
    .text(company?.email || "", 40, 65)
    .text(company?.phone || "", 40, 78);

  const address = company?.address || {};
  const addressLine = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  if (addressLine) {
    doc.text(addressLine, 40, 91, { width: 310 });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#111827")
    .text("PAYSLIP", 390, 42, { width: 165, align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#374151")
    .text(`${MONTHS[slip.month]} ${slip.year}`, 390, 70, {
      width: 165,
      align: "right",
    });

  drawLine(doc, 125);

  drawKeyValue(doc, "Payslip No.", slip.payslipNumber, 40, 145);
  drawKeyValue(
    doc,
    "Payroll Code",
    payrollRun.payrollCode || "-",
    310,
    145
  );

  drawKeyValue(
    doc,
    "Employee",
    employee.displayName || "-",
    40,
    168
  );
  drawKeyValue(
    doc,
    "Employee Code",
    employee.employeeCode || "-",
    310,
    168
  );

  drawKeyValue(
    doc,
    "Email",
    employee.officialEmail || "-",
    40,
    191
  );
  drawKeyValue(
    doc,
    "Mobile",
    employee.mobile || "-",
    310,
    191
  );

  drawKeyValue(
    doc,
    "Bank",
    slip.bankName || "-",
    40,
    214
  );
  drawKeyValue(
    doc,
    "Account No.",
    slip.accountNumber || "-",
    310,
    214
  );

  drawKeyValue(
    doc,
    "IFSC",
    slip.ifscCode || "-",
    40,
    237
  );
  drawKeyValue(
    doc,
    "Status",
    slip.status || "-",
    310,
    237
  );

  drawLine(doc, 270);

  const earningsEndY = drawComponentTable(
    doc,
    "Earnings",
    slip.earnings || [],
    40,
    292,
    245
  );

  const deductionsEndY = drawComponentTable(
    doc,
    "Deductions",
    slip.deductions || [],
    310,
    292,
    245
  );

  let y = Math.max(earningsEndY, deductionsEndY) + 25;

  if (y > 620) {
    doc.addPage();
    y = 50;
  }

  doc
    .roundedRect(40, y, 515, 84, 6)
    .fillAndStroke("#f9fafb", "#e5e7eb");

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Salary Summary", 55, y + 14);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#374151")
    .text("Gross Salary", 55, y + 38)
    .text(formatMoney(slip.grossSalary), 190, y + 38, {
      width: 100,
      align: "right",
    })
    .text("Total Deductions", 315, y + 38)
    .text(formatMoney(slip.totalDeductions), 445, y + 38, {
      width: 90,
      align: "right",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111827")
    .text("Net Salary", 55, y + 62)
    .text(formatMoney(slip.netSalary), 415, y + 62, {
      width: 120,
      align: "right",
    });

  y += 115;

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Attendance Snapshot", 40, y);

  y += 22;

  const attendance = slip.attendance || {};

  drawKeyValue(doc, "Payable Days", attendance.payableDays || 0, 40, y);
  drawKeyValue(doc, "Present Days", attendance.presentDays || 0, 310, y);

  y += 22;

  drawKeyValue(doc, "Absent Days", attendance.absentDays || 0, 40, y);
  drawKeyValue(doc, "Leave Days", attendance.leaveDays || 0, 310, y);

  y += 22;

  drawKeyValue(doc, "Half Days", attendance.halfDays || 0, 40, y);
  drawKeyValue(doc, "Late Days", attendance.lateDays || 0, 310, y);

  y += 45;

  drawLine(doc, y);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6b7280")
    .text(
      "This is a system generated payslip and does not require a signature.",
      40,
      y + 18,
      { width: 515, align: "center" }
    );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    filePath,
    fileName,
    pdfUrl: `/hr/payroll/payslips/${slip._id}/pdf`,
  };
};