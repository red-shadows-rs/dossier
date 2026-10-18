import type { Locale } from "@/lib/constants";

export const AUDIT_ACTION_MAP: Record<string, { ar: string; en: string }> = {
  // Auth
  "auth.login": { ar: "تسجيل دخول", en: "Login" },
  "auth.login_failed": { ar: "فشل تسجيل الدخول", en: "Failed login" },
  "auth.logout": { ar: "تسجيل خروج", en: "Logout" },
  "auth.password_changed": { ar: "تغيير كلمة المرور", en: "Password changed" },

  // User
  "user.created": { ar: "إضافة مستخدم", en: "User created" },
  "user.updated": { ar: "تحديث مستخدم", en: "User updated" },
  "user.status_changed": { ar: "تغيير حالة مستخدم", en: "User status changed" },
  "user.password_reset": { ar: "إعادة تعيين كلمة المرور", en: "Password reset" },

  // Client
  "client.created": { ar: "إضافة عميل", en: "Client created" },
  "client.updated": { ar: "تحديث عميل", en: "Client updated" },
  "client.archived": { ar: "أرشفة عميل", en: "Client archived" },
  "client.deleted": { ar: "حذف عميل", en: "Client deleted" },

  // Project
  "project.created": { ar: "إنشاء مشروع", en: "Project created" },
  "project.updated": { ar: "تحديث مشروع", en: "Project updated" },
  "project.status_changed": { ar: "تغيير حالة المشروع", en: "Project status changed" },
  "project.archived": { ar: "أرشفة مشروع", en: "Project archived" },

  // Template
  "template.created": { ar: "إنشاء نموذج", en: "Template created" },
  "template.updated": { ar: "تحديث نموذج", en: "Template updated" },
  "template.duplicated": { ar: "نسخ نموذج", en: "Template duplicated" },
  "template.archived": { ar: "أرشفة نموذج", en: "Template archived" },

  // Contract
  "contract.created": { ar: "إنشاء عقد", en: "Contract created" },
  "contract.updated": { ar: "تحديث عقد", en: "Contract updated" },
  "contract.sent": { ar: "إرسال العقد", en: "Contract sent" },
  "contract.viewed": { ar: "معاينة العقد", en: "Contract viewed" },
  "contract.otp_sent": { ar: "إرسال رمز التحقق", en: "OTP code sent" },
  "contract.otp_verified": { ar: "تأكيد رمز التحقق", en: "OTP verified" },
  "contract.signed": { ar: "توقيع العقد", en: "Contract signed" },
  "contract.signed_provider": { ar: "توقيع الطرف الأول", en: "Provider signed" },
  "contract.signed_client": { ar: "توقيع العميل", en: "Client signed" },
  "contract.declined": { ar: "رفض العقد", en: "Contract declined" },
  "contract.expired": { ar: "انتهاء صلاحية العقد", en: "Contract expired" },
  "contract.recalled": { ar: "استرجاع العقد للتعديل", en: "Contract recalled" },
  "contract.cancelled": { ar: "إلغاء العقد", en: "Contract cancelled" },
  "contract.completed": { ar: "اكتمال العقد", en: "Contract completed" },
  "contract.terminated": { ar: "إنهاء العقد", en: "Contract terminated" },
  "contract.link_regenerated": { ar: "تجديد رابط التوقيع", en: "Signing link regenerated" },
  "contract.email_resent": { ar: "إعادة إرسال بريد العقد", en: "Contract email resent" },
  "contract.finalized": { ar: "اعتماد العقد نهائياً", en: "Contract finalized" },
  "contract.sealed": { ar: "ختم الوثيقة وتثبيتها", en: "Contract sealed" },
  "contract.pdf_failed": { ar: "فشل توليد PDF", en: "Contract PDF failed" },

  // Invoice
  "invoice.created": { ar: "مسودة فاتورة", en: "Invoice draft created" },
  "invoice.updated": { ar: "تحديث فاتورة", en: "Invoice updated" },
  "invoice.issued": { ar: "إصدار فاتورة", en: "Invoice issued" },
  "invoice.sent": { ar: "إرسال فاتورة", en: "Invoice sent" },
  "invoice.voided": { ar: "إبطال فاتورة", en: "Invoice voided" },
  "invoice.cancelled": { ar: "إلغاء فاتورة", en: "Invoice cancelled" },
  "invoice.paid": { ar: "سداد الفاتورة", en: "Invoice paid" },
  "invoice.partially_paid": { ar: "سداد جزئي", en: "Partially paid" },
  "invoice.payment_recorded": { ar: "تسجيل دفعة سداد", en: "Payment recorded" },
  "invoice.payment_voided": { ar: "إلغاء دفعة سداد", en: "Payment voided" },
  "invoice.reminder_sent": { ar: "إرسال تذكير بالسداد", en: "Payment reminder sent" },

  // Payment
  "payment.created": { ar: "تسجيل دفعة", en: "Payment created" },
  "payment.voided": { ar: "إلغاء دفعة", en: "Payment voided" },

  // Settings & Files
  "settings.updated": { ar: "تحديث الإعدادات", en: "Settings updated" },
  "file.uploaded": { ar: "رفع ملف", en: "File uploaded" },
  "file.deleted": { ar: "حذف ملف", en: "File deleted" },
  "email.failed": { ar: "فشل إرسال البريد", en: "Email sending failed" },

  // Backup
  "backup.completed": { ar: "اكتمال النسخ الاحتياطي", en: "Backup completed" },
  "backup.failed": { ar: "فشل النسخ الاحتياطي", en: "Backup failed" },
  "backup.deleted": { ar: "حذف نسخة احتياطية", en: "Backup deleted" },
};

export const AUDIT_ENTITY_MAP: Record<string, { ar: string; en: string }> = {
  contract: { ar: "عقد", en: "Contract" },
  invoice: { ar: "فاتورة", en: "Invoice" },
  client: { ar: "عميل", en: "Client" },
  project: { ar: "مشروع", en: "Project" },
  user: { ar: "مستخدم", en: "User" },
  template: { ar: "نموذج", en: "Template" },
  backup: { ar: "نسخة احتياطية", en: "Backup" },
  settings: { ar: "إعدادات", en: "Settings" },
  file: { ar: "ملف", en: "File" },
  payment: { ar: "دفعة", en: "Payment" },
  email: { ar: "بريد", en: "Email" },
};

export const AUDIT_ACTOR_MAP: Record<string, { ar: string; en: string }> = {
  user: { ar: "مستخدم", en: "User" },
  signer: { ar: "موقّع", en: "Signer" },
  system: { ar: "النظام", en: "System" },
};

export function formatAuditAction(action: string, locale: Locale): string {
  const match = AUDIT_ACTION_MAP[action];
  if (match) return locale === "ar" ? match.ar : match.en;
  const parts = action.split(".");
  if (parts.length === 2) {
    const [domain, verb] = parts;
    const domainText = AUDIT_ENTITY_MAP[domain]?.[locale === "ar" ? "ar" : "en"] ?? domain;
    return `${domainText}: ${verb}`;
  }
  return action;
}

export function formatAuditEntity(entityType: string, locale: Locale): string {
  const match = AUDIT_ENTITY_MAP[entityType];
  return match ? (locale === "ar" ? match.ar : match.en) : entityType;
}

export function formatAuditActor(actorType: string, locale: Locale): string {
  const match = AUDIT_ACTOR_MAP[actorType];
  return match ? (locale === "ar" ? match.ar : match.en) : actorType;
}
