# Super Admin Dashboard API

Status: Completed

Base URL

```txt
/super-admin/dashboard
```

Authentication

```txt
Bearer Token / accessToken Cookie Required
```

Role

```txt
super_admin
```

---

# Purpose

The Super Admin Dashboard provides a platform-wide overview of the SaaS application.

Unlike the Company Admin Dashboard, this dashboard aggregates information across **all registered companies**.

---

# Security

The backend automatically identifies the logged-in Super Admin.

Frontend must never send:

```txt
companyId
userId
employeeId
MongoDB ObjectId
```

---

# Endpoint

## Get Dashboard

```http
GET /super-admin/dashboard
```

Optional Query Parameters

```txt
date
trialEndingWindowDays
```

Example

```http
GET /super-admin/dashboard?trialEndingWindowDays=7
```

---

# Company Analytics

Returns

```txt
Total Companies
Pending Verification
Active Companies
Inactive Companies
Suspended Companies
Trial Companies
```

Example

```json
{
  "companies": {
    "total": 54,
    "pendingVerification": 2,
    "active": 46,
    "inactive": 3,
    "suspended": 1,
    "trial": 2
  }
}
```

---

# User Analytics

Returns

```txt
Total Users
Super Admins
Company Admins
HR
Support
Employees
Active Users
Inactive Users
Blocked Users
Verified Users
Unverified Users
```

---

# Employee Analytics

Returns

```txt
Total Employees
Active Employees
Inactive Employees
Probation Employees
```

---

# Attendance Analytics

Returns

```txt
Present Today
Absent Today
Late Today
Employees On Leave
```

---

# Leave Analytics

Returns

```txt
Pending Leave Requests
Approved Leave Requests
Rejected Leave Requests
```

---

# Subscription Analytics

Returns

```txt
Trial
Active
Expired
Cancelled

Free Plan
Starter Plan
Business Plan
Enterprise Plan

Trial Ending Soon
```

Example

```json
{
  "subscriptions": {
    "status": {
      "trial": 8,
      "active": 35,
      "expired": 6,
      "cancelled": 2
    },
    "plans": {
      "free": 10,
      "starter": 15,
      "business": 18,
      "enterprise": 8
    },
    "trialEndingSoon": 3,
    "trialEndingWindowDays": 7
  }
}
```

---

# Growth Analytics

Returns

```txt
Companies Created This Month
Companies Created This Year
Monthly Company Registrations
```

Example

```json
{
  "growth": {
    "selectedYear": 2026,
    "companiesCreatedThisMonth": 7,
    "companiesCreatedThisYear": 48,
    "monthlyRegistrations": [
      {
        "month": 1,
        "companies": 4
      }
    ]
  }
}
```

---

# Largest Companies

Returns

```txt
Company Name
Company Code
Employee Count
```

---

# Latest Companies

Returns

```txt
Company Name
Company Code
Created Date
Status
```

---

# Latest Users

Returns

```txt
Name
Email
Role
Company
Created Date
```

---

# Latest Payroll Runs

Returns

```txt
Company
Payroll Month
Payroll Year
Payroll Status
Gross Salary
Net Salary
```

---

# Platform Health

Returns

```txt
API Status
Database Status
Socket Status
Environment
Server Time
Version
```

Example

```json
{
  "platformHealth": {
    "apiStatus": "operational",
    "databaseStatus": "connected",
    "socketStatus": "enabled",
    "environment": "production",
    "serverTime": "2026-07-16T12:30:00.000Z",
    "version": "1.0.0"
  }
}
```

---

# Complete Response Structure

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Super Admin dashboard fetched successfully",
  "data": {
    "overview": {},
    "subscriptions": {},
    "growth": {},
    "companies": {},
    "users": {},
    "payroll": {},
    "platformHealth": {},
    "generatedAt": "2026-07-16T12:30:00.000Z"
  }
}
```

---

# Dashboard Widgets

Top Cards

```txt
Total Companies
Active Companies
Total Users
Total Employees
Present Today
Pending Leave Requests
Trial Companies
Trial Ending Soon
```

Charts

```txt
Monthly Company Registrations
Subscription Plan Distribution
Company Status
Employee Growth
Attendance Overview
```

Tables

```txt
Latest Companies
Largest Companies
Latest Users
Latest Payroll Runs
```

---

# Access Rules

Super Admin CAN

```txt
View all companies
View all users
View all employees
View company growth
View subscriptions
View payroll summary
View platform analytics
View latest companies
View latest users
```

Super Admin CANNOT

```txt
Modify company data from dashboard
Modify payroll from dashboard
Access Company Admin dashboard endpoints
```

---

# Standard Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Super Admin dashboard fetched successfully",
  "data": {}
}
```

---

# Standard Error Response

```json
{
  "statusCode": 403,
  "success": false,
  "message": "Super Admin Dashboard is available only to Super Admin accounts."
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

# Final Status

```txt
Super Admin Dashboard Backend Completed
```