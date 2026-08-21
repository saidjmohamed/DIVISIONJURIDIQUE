'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  judicialData,
  adminCourtsData,
  commercialCourtsMap,
  wilayaToCouncil,
} from '@/data/jurisdictions-data';
import {
  getContactOverride,
  specialJudicialInstitutions,
  type JudicialContactInfo,
  type JudicialInstitutionType,
} from '@/data/judicial-contacts-data';

function slug(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FF\w-]/g, '')
    .toLowerCase();
}

function makeContact(
  id: string,
  name: string,
  type: JudicialInstitutionType,
  extra: Partial<JudicialContactInfo> = {}
): JudicialContactInfo {
  return { id, name, type, ...extra, ...getContactOverride(id) };
}

function PhoneList({ phones }: { phones?: string[] }) {
  if (!phones?.length) {
    return <span className="text-gray-400 dark:text-gray-500">غير مضاف بعد</span>;
  }
  return (
    <div className="flex flex-wrap gap-2" dir="ltr">
      {phones.map((phone) => (
        <a
          key={phone}
          href={`tel:${phone.replace(/\s/g, '')}`}
          className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300"
        >
          📞 {phone}
        </a>
      ))}
    </div>
  );
}

function InstitutionCard({ info }: { info: JudicialContactInfo }) {
  const [open, setOpen] = useState(false);
  const hasContact = Boolean(
    info.phones?.length ||
      info.mobilePhones?.length ||
      info.email?.length ||
      info.address ||
      info.lawyerDelegation ||
      info.lawyerDelegationPhones?.length
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-800/60"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-900/30">
            {info.type === 'council' ? '⚖️' : info.type === 'court' ? '🏛️' : '🏢'}
          </span>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 dark:text-gray-100">{info.name}</div>
            {info.wilaya && <div className="mt-0.5 text-xs text-gray-500">ولاية {info.wilaya}</div>}
          </div>
        </div>
        <span className="text-gray-400">{open ? '⌃' : '⌄'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 dark:border-gray-800"
          >
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                <div className="mb-2 text-xs font-bold text-gray-500">☎️ هواتف الهيئة</div>
                <PhoneList phones={info.phones} />
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                <div className="mb-2 text-xs font-bold text-gray-500">📱 الهواتف المحمولة</div>
                <PhoneList phones={info.mobilePhones} />
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                <div className="mb-2 text-xs font-bold text-gray-500">⚖️ مندوبية المحامين</div>
                <div className="font-bold">{info.lawyerDelegation || 'غير مضافة بعد'}</div>
                <div className="mt-2"><PhoneList phones={info.lawyerDelegationPhones} /></div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                <div className="mb-2 text-xs font-bold text-gray-500">✉️ البريد الإلكتروني</div>
                {info.email?.length ? info.email.map((email) => <a key={email} href={`mailto:${email}`} className="block text-sm font-semibold text-blue-600">{email}</a>) : <span className="text-gray-400">غير مضاف بعد</span>}
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60 sm:col-span-2">
                <div className="mb-2 text-xs font-bold text-gray-500">📍 العنوان</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{info.address || 'غير مضاف بعد'}</div>
              </div>
              {!hasContact && (
                <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                  ⚠️ سجل الهيئة جاهز، وتبقى معلومات الاتصال في انتظار الإضافة والتحقق.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, children, count }: { title: string; icon: string; children: React.ReactNode; count?: number }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-5 text-right">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white">{title}</h3>
            {typeof count === 'number' && <p className="text-xs text-gray-500">{count} هيئة</p>}
          </div>
        </div>
        <span className="text-xl text-gray-400">{open ? '⌃' : '⌄'}</span>
      </button>
      {open && <div className="space-y-3 border-t border-gray-100 p-4 dark:border-gray-800">{children}</div>}
    </section>
  );
}

export default function JudicialInstitutionsInfo() {
  const councils = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of judicialData) {
      if (!map.has(entry.council)) map.set(entry.council, new Set());
      map.get(entry.council)!.add(entry.court);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
  }, []);

  const administrativeCourts = useMemo(() => Object.entries(adminCourtsData).sort((a, b) => a[0].localeCompare(b[0], 'ar')), []);

  const commercialCourts = useMemo(() => {
    const unique = new Map<string, string>();
    Object.entries(commercialCourtsMap).forEach(([council, court]) => unique.set(String(court), council));
    return Array.from(unique.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
  }, []);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
        <strong>📞 دليل معلومات الهيئات القضائية</strong> — اختر المجلس أو المحكمة لعرض معلومات الاتصال ومندوبية المحامين. تم فصل بيانات الاتصال عن بيانات الاختصاص حتى يمكن تحديث الأرقام دون المساس بالتقسيم القضائي.
      </div>

      <Section title="مجالس القضاء والمحاكم التابعة لها" icon="⚖️" count={councils.length}>
        {councils.map(([council, courts]) => (
          <details key={council} className="group rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40">
            <summary className="cursor-pointer list-none p-4 font-black text-gray-900 dark:text-white">
              <span className="ml-2 text-blue-600">▼</span> مجلس قضاء {council}
              <span className="mr-2 text-xs font-semibold text-gray-400">({courts.size} محكمة)</span>
            </summary>
            <div className="space-y-3 border-t border-gray-200 p-3 dark:border-gray-700">
              <InstitutionCard info={makeContact(`council-${slug(council)}`, `مجلس قضاء ${council}`, 'council', { wilaya: Object.entries(wilayaToCouncil).find(([, value]) => value === council)?.[0] })} />
              {Array.from(courts).sort((a, b) => a.localeCompare(b, 'ar')).map((court) => (
                <InstitutionCard key={`${council}-${court}`} info={makeContact(`court-${slug(council)}-${slug(court)}`, `محكمة ${court}`, 'court', { parentCouncil: council })} />
              ))}
            </div>
          </details>
        ))}
      </Section>

      <Section title="المحاكم الإدارية" icon="🏢" count={administrativeCourts.length}>
        {administrativeCourts.map(([wilaya, data]) => (
          <InstitutionCard key={wilaya} info={makeContact(`admin-${slug(wilaya)}`, data.court, 'administrative-court', { wilaya })} />
        ))}
      </Section>

      <Section title="المحاكم الإدارية للاستئناف" icon="⚖️" count={administrativeCourts.length}>
        {administrativeCourts.map(([wilaya, data]) => (
          <InstitutionCard key={wilaya} info={makeContact(`admin-appellate-${slug(wilaya)}`, data.appellate, 'administrative-appellate-court', { wilaya })} />
        ))}
      </Section>

      <Section title="المحاكم التجارية المتخصصة" icon="💼" count={commercialCourts.length}>
        {commercialCourts.map(([court, council]) => (
          <InstitutionCard key={court} info={makeContact(`commercial-${slug(court)}`, court, 'commercial-court', { parentCouncil: council })} />
        ))}
      </Section>

      <Section title="هيئات قضائية عليا" icon="🏛️" count={specialJudicialInstitutions.length}>
        {specialJudicialInstitutions.map((info) => <InstitutionCard key={info.id} info={makeContact(info.id, info.name, info.type)} />)}
      </Section>
    </div>
  );
}
