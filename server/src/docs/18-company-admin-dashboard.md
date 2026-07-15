# Company Admin Dashboard API

Status: Completed

Base URL

```txt
/company-admin/dashboard
```

Authentication

```txt
Bearer Token / accessToken Cookie Required
```

Allowed Role

```txt
company_admin
```

---

# Purpose

Company Admin Dashboard provides a complete overview of the company's HRMS.

Everything shown belongs only to the logged-in company.

The dashboard never exposes another company's data.

---

# Security

Backend automatically resolves:

```txt
companyId
loggedInUser
role
```

Frontend must NEVER send

```txt
companyId
userId
employeeId
MongoDB ObjectId
```

---

# Endpoint

## Dashboard

```http
GET /company-admin/dashboard
```

Optional Query

```txt
birthdayWindowDays
anniversaryWindowDays
date
```

Example

```http
GET /company-admin/dashboard?birthdayWindowDays=30&anniversaryWindowDays=30
```

---

# Dashboard Sections

## Employee Overview

Returns

```txt
Total Employees
Active Employees
Probation Employees
Inactive Employees
```

Example

```json
{
    "employees": {
        "total": 145,
        "active": 132,
        "probation": 9,
        "inactive": 4
    }
}
```

---

## Attendance Today

Returns

```txt
Present
Absent
Late
Half Day
Week Off
Holiday
Employees On Leave
```

Example

```json
{
    "attendanceToday": {
        "present": 118,
        "absent": 6,
        "late": 8,
        "halfDay": 2,
        "onLeave": 11,
        "weekOff": 0,
        "holiday": 0
    }
}
```

---

## Pending Approvals

Returns

```txt
Pending Leave Requests
Pending Attendance Regularizations
```

Example

```json
{
    "approvals": {
        "pendingLeaveRequests": 6,
        "pendingAttendanceRegularizations": 4
    }
}
```

---

## Notifications

Returns

```txt
Unread Notification Count
```

Example

```json
{
    "notifications": {
        "unreadCount": 12
    }
}
```

---

## Payroll

Returns latest payroll run.

Example

```json
{
    "payroll": {
        "payrollCode": "PAY-2026-07",
        "month": 7,
        "year": 2026,
        "status": "completed",
        "totalEmployees": 145,
        "totalGrossSalary": 9450000,
        "totalDeductions": 1020000,
        "totalNetSalary": 8430000,
        "processedAt": "2026-07-01T10:00:00.000Z"
    }
}
```

---

## Upcoming Birthdays

Returns employees whose birthdays fall within the configured window.

Fields

```txt
Employee Code
Employee Name
Photo
Birthday
```

---

## Upcoming Work Anniversaries

Returns

```txt
Employee Code
Employee Name
Joining Date
Completed Years
```

---

## Upcoming Meetings

Returns

```txt
Meeting Title
Organizer
Start Date
End Date
Status
```

---

## Upcoming Events

Returns

```txt
Event Title
Event Date
Location
```

---

## Upcoming Holidays

Returns

```txt
Holiday Name
Holiday Date
Branch
```

---

## Department Analytics

Returns employee count department-wise.

Example

```json
[
    {
        "departmentCode": "HR",
        "departmentName": "Human Resources",
        "employeeCount": 14
    }
]
```

---

## Branch Analytics

Returns employee count branch-wise.

Example

```json
[
    {
        "branchCode": "NOIDA",
        "branchName": "Noida Head Office",
        "employeeCount": 95
    }
]
```

---

## Recently Added Employees

Returns

```txt
Employee Code
Employee Name
Photo
Department
Designation
Joining Date
```

---

# Complete Response

```json
{
    "statusCode": 200,
    "success": true,
    "message": "Company Admin dashboard fetched successfully",
    "data": {
        "overview": {},
        "payroll": {},
        "upcoming": {},
        "analytics": {},
        "recentActivity": {},
        "generatedAt": "2026-07-15T10:30:00.000Z"
    }
}
```

---

# Frontend Dashboard Cards

Display cards

```txt
Total Employees
Present Today
Absent Today
Late Today
Employees On Leave
Pending Leave Requests
Pending Attendance Regularization
Unread Notifications
```

Charts

```txt
Department Wise Employees
Branch Wise Employees
Attendance Status
```

Tables

```txt
Upcoming Birthdays
Upcoming Anniversaries
Upcoming Meetings
Upcoming Holidays
Upcoming Events
Recently Added Employees
```

---

# Access Rules

Company Admin CAN

```txt
View company dashboard
View company analytics
View employee statistics
View payroll summary
View attendance summary
View leave summary
View meetings
View holidays
View events
```

Company Admin CANNOT

```txt
Access another company dashboard
Access Super Admin dashboard
Access platform analytics
```

---

# Standard Success Response

```json
{
    "statusCode": 200,
    "success": true,
    "message": "Company Admin dashboard fetched successfully",
    "data": {}
}
```

---

# Standard Error Response

```json
{
    "statusCode": 403,
    "success": false,
    "message": "Company Admin Dashboard is available only to Company Admin accounts."
}
```

---

# Module Checklist

```txt
✅ Repository
✅ Service
✅ Controller
✅ Routes
✅ Documentation
```

# Next Module

```txt
Super Admin Dashboard
```