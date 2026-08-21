'use client';
import React,{useState}from'react';
export default function JudicialInstitutionsAdminPanel({admin,onClose}:{admin:boolean;onClose:()=>void}){if(!admin)return null;return <div className="rounded-2xl border bg-blue-50 p-4"><b>⚙️ إدارة الهيئات القضائية</b><p className="mt-2 text-sm">يمكن للمدير تعديل معلومات الهيئة وإدارة أرقام المندوبية من البطاقات.</p><button onClick={onClose} className="mt-2 rounded-xl border px-3 py-2 text-xs">إغلاق</button></div>}
