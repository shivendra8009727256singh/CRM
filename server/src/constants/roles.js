export const ROLES = Object.freeze({
    ADMIN: "admin",
    HR: "hr",
    SUPPORT: "support",
    EMPLOYEE: "employee",
  });
  
  export const USER_STATUS = Object.freeze({
    ACTIVE: "active",
    INACTIVE: "inactive",
    BLOCKED: "blocked",
  });
  
  export const ROLE_PERMISSIONS = Object.freeze({
    admin: [
      "auth:me",
  
      "user:create",
      "user:read",
      "user:update",
      "user:delete",
  
      "hr:create",
      "support:create",
  
      "employee:create",
      "employee:read",
      "employee:update",
      "employee:delete",
  
      "attendance:manage",
      "leave:manage",
      "payroll:manage",
  
      "ticket:manage",
      "notification:manage",
      "report:manage",
      "setting:manage",
    ],
  
    hr: [
      "auth:me",
  
      "employee:create",
      "employee:read",
      "employee:update",
  
      "attendance:manage",
      "leave:manage",
      "payroll:read",
      "report:read",
    ],
  
    support: [
      "auth:me",
  
      "employee:read",
      "ticket:create",
      "ticket:read",
      "ticket:update",
      "notification:read",
    ],
  
    employee: [
      "auth:me",
  
      "profile:read",
      "profile:update",
  
      "attendance:self",
      "leave:self",
  
      "ticket:create",
      "ticket:self",
      "notification:read",
    ],
  });