// معلومات الاتصال بالهيئات القضائية ومندوبيات المحامين
// تُحفظ معلومات الاتصال هنا بشكل مستقل عن بيانات الاختصاص الإقليمي.
// لا تُدرج أرقام غير موثقة؛ تُملأ البيانات من مصادر رسمية أو معلومات يزودنا بها المستخدم.

export type JudicialInstitutionType =
  | 'council'
  | 'court'
  | 'administrative-court'
  | 'administrative-appellate-court'
  | 'commercial-court'
  | 'supreme-court'
  | 'state-council';

export interface JudicialContactInfo {
  id: string;
  name: string;
  type: JudicialInstitutionType;
  wilaya?: string;
  parentCouncil?: string;
  phones?: string[];
  mobilePhones?: string[];
  fax?: string[];
  email?: string[];
  address?: string;
  lawyerDelegation?: string;
  lawyerDelegationPhones?: string[];
  lawyerDelegationEmail?: string[];
  notes?: string;
  source?: string;
  verifiedAt?: string;
}

// أرقام ومعلومات الاتصال تُضاف تدريجيًا بعد التحقق منها.
// وجود السجل دون أرقام يعني أن الهيئة معروفة في النظام ولكن بيانات الاتصال لم تُوثق بعد.
export const judicialContactOverrides: Record<string, Partial<JudicialContactInfo>> = {};

export const specialJudicialInstitutions: JudicialContactInfo[] = [
  {
    id: 'supreme-court',
    name: 'المحكمة العليا',
    type: 'supreme-court',
  },
  {
    id: 'state-council',
    name: 'مجلس الدولة',
    type: 'state-council',
  },
];

export function getContactOverride(id: string) {
  return judicialContactOverrides[id] || {};
}
