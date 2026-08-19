# Design System — Tailwind Reference

วิเคราะห์จาก UI ที่แนบมา (dashboard / kanban / table + side panel) แล้วสกัดออกมาเป็น **design tokens** ที่ generic พอจะเอาไปใช้กับ layout ไหนก็ได้ ไม่ผูกกับโครงสร้างหน้าจอเดิม เน้น: typography, spacing, border, padding, margin, card structure

สไตล์รวม: **minimal SaaS / soft neutral** — พื้นขาว, เส้นขอบบางสีเทาอ่อน, มุมโค้งปานกลาง, ไม่มีเงาเข้ม, ตัวเลขใหญ่หนาเป็นจุดเด่น, label เล็กสีเทา

---

## 1. Color Tokens

| Token | Tailwind | ใช้กับ |
|---|---|---|
| `bg-base` | `bg-white` | พื้นหลังหลัก, card |
| `bg-subtle` | `bg-gray-50` | พื้นหลัง sidebar / page wrapper / hover row |
| `bg-muted` | `bg-gray-100` | active nav item, input disabled |
| `border-default` | `border-gray-200` | เส้นขอบ card, table, divider |
| `text-primary` | `text-gray-900` | หัวข้อ, ตัวเลขหลัก |
| `text-secondary` | `text-gray-600` | เนื้อหาทั่วไป |
| `text-muted` | `text-gray-400` / `text-gray-500` | label, placeholder, caption |
| Success | `bg-green-50 text-green-700` | badge "Sent", trend ขึ้น |
| Danger | `bg-red-50 text-red-600` | badge "Overdue" |
| Warning | `bg-orange-50 text-orange-600` | badge สถานะระหว่างทำ |
| Accent (brand) | `bg-gray-900 text-white` | logo mark, primary button |

กฎ: ใช้สี **เดียว** (gray scale) เป็นหลัก 90% ของ UI, สี (เขียว/แดง/ส้ม) ใช้เฉพาะ status/badge/trend เท่านั้น — ห้ามใช้สีไล่เฉดเป็นพื้นหลังการ์ดทั้งใบ

---

## 2. Typography Scale

| ระดับ | Tailwind class | ใช้กับ |
|---|---|---|
| Display number | `text-4xl font-bold tracking-tight` (36px) | ตัวเลขเด่นใน hero card เช่น "$62K" |
| Stat number | `text-2xl font-bold` (24px) | ตัวเลขใน stat card ด้านข้าง เช่น "13", "86%" |
| Page title | `text-lg font-semibold` (18px) | breadcrumb/หัวข้อหน้า เช่น "Cockpit", "Leads" |
| Section title | `text-xl font-semibold` (20px) | หัวตาราง/section เช่น "Open Invoices" |
| Card label | `text-sm text-gray-500` (14px) | label เหนือ/ใต้ตัวเลข เช่น "Active Clients" |
| Body / table cell | `text-sm text-gray-700` (14px) | เนื้อหาในแถวตาราง |
| Caption / meta | `text-xs text-gray-400` (12px) | วันที่, helper text |
| Form label | `text-sm font-medium text-gray-700` | label เหนือ input |

กฎ font-weight: หัวข้อ/ตัวเลข = `font-bold` หรือ `font-semibold`, เนื้อหาทั่วไป = `font-normal`, ห้าม bold พร่ำเพรื่อ

Line-height: ใช้ default ของ Tailwind (`leading-normal`/`leading-tight` สำหรับตัวเลขใหญ่) — ตัวเลข display ใช้ `leading-none` เพื่อให้กระชับ

---

## 3. Spacing System

ใช้สเกลของ Tailwind (4px base) แบบสม่ำเสมอ ไม่สุ่มเลข:

| ขนาด | Token | px |
|---|---|---|
| xs | `1` / `1.5` | 4–6px |
| sm | `2` | 8px |
| md | `3` / `4` | 12–16px |
| lg | `6` | 24px |
| xl | `8` | 32px |
| 2xl | `10` / `12` | 40–48px |

กฎการใช้:
- **gap ระหว่าง label กับตัวเลขใน card** → `mt-1` ถึง `mt-2`
- **gap ระหว่าง card กับ card (grid)** → `gap-4` หรือ `gap-6`
- **gap ระหว่าง section ใหญ่ (เช่น chart card กับ table ด้านล่าง)** → `mt-8`
- **gap ภายใน nav item (icon ↔ text)** → `gap-3` (12px)
- **gap ระหว่าง nav group (เช่น "Operations" ↔ "Finances")** → `mt-6`

---

## 4. Card Component

โครงสร้าง card มาตรฐาน (ใช้ได้ทั้ง stat card, chart card, table-wrapper card):

```html
<div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
  <!-- content -->
</div>
```

| คุณสมบัติ | ค่า | หมายเหตุ |
|---|---|---|
| Border | `border border-gray-200` | บางมาก ไม่ใช้สีเข้ม |
| Radius | `rounded-xl` (12px) | การ์ดใหญ่ใช้ `rounded-xl`–`rounded-2xl`, การ์ดเล็ก/badge ใช้ `rounded-md`–`rounded-full` |
| Padding | `p-6` (24px) เป็นค่ามาตรฐาน, การ์ดเล็ก (stat card แคบ) ใช้ `p-5` (20px) | อย่าต่ำกว่า `p-4` |
| Shadow | `shadow-sm` หรือไม่มีเลย | ห้ามใช้ shadow หนัก (`shadow-lg`+) เพราะ style นี้เน้น flat |
| Gap ภายใน (label→value→meta) | `space-y-1` ถึง `space-y-2` | |

**Stat card (เลขเดี่ยว + label):**
```html
<div class="bg-white border border-gray-200 rounded-xl p-5">
  <p class="text-sm text-gray-500">Active Clients</p>
  <p class="mt-2 text-2xl font-bold text-gray-900">13</p>
</div>
```

**Hero metric card (ตัวเลขใหญ่ + trend badge + chart):**
```html
<div class="bg-white border border-gray-200 rounded-xl p-6">
  <div class="flex items-center justify-between">
    <p class="text-sm font-medium text-gray-700">Monthly Revenue</p>
    <div class="flex gap-2"><!-- dropdown filters --></div>
  </div>
  <div class="mt-3 flex items-center gap-3">
    <span class="text-4xl font-bold tracking-tight">$62K</span>
    <span class="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">↑ 23%</span>
  </div>
  <p class="mt-1 text-sm text-gray-500">$17,499.75 more than last month</p>
</div>
```

---

## 5. Badge / Pill (status tags)

```html
<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
             bg-red-50 text-red-600"><!-- Overdue --></span>

<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
             bg-green-50 text-green-700"><!-- Sent --></span>
```

มาตรฐาน: `text-xs font-medium`, padding `px-2.5 py-0.5`, ขอบ `rounded-full`, สีพื้นเป็นเฉด `-50`, สีตัวอักษรเป็นเฉด `-600/-700` ของสีเดียวกัน

---

## 6. Table

```html
<div class="overflow-hidden rounded-xl border border-gray-200">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-gray-200 text-left text-gray-500">
        <th class="px-6 py-3 font-medium">Invoice</th>
        ...
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 text-gray-900">016</td>
        ...
      </tr>
    </tbody>
  </table>
</div>
```

| ส่วน | ค่า |
|---|---|
| Cell padding | `px-6 py-4` (แถวข้อมูล), `px-6 py-3` (header) |
| Row divider | `divide-y divide-gray-100` (บางกว่า border การ์ด) |
| Header text | `text-gray-500 font-medium text-sm` ไม่ bold มาก ไม่ uppercase |
| Row hover | `hover:bg-gray-50` |

---

## 7. Sidebar / Nav

```html
<nav class="space-y-1">
  <a class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
            text-gray-700 hover:bg-gray-100
            [&.active]:bg-gray-100 [&.active]:text-gray-900">
    <svg class="h-4 w-4 text-gray-400"></svg>
    Cockpit
  </a>
</nav>

<p class="mt-6 mb-2 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
  Operations
</p>
```

| คุณสมบัติ | ค่า |
|---|---|
| Item padding | `px-3 py-2` |
| Item radius | `rounded-lg` |
| Icon size | `h-4 w-4` ถึง `h-5 w-5`, สี `text-gray-400` (ไม่ active) |
| Active state | `bg-gray-100 text-gray-900` (ไม่มี border, ใช้พื้นหลังเทาอ่อนล้วน) |
| Section heading | `text-xs uppercase tracking-wide text-gray-400 font-medium`, margin `mt-6 mb-2` |

---

## 8. Form / Side Panel

```html
<div class="space-y-5">
  <div>
    <label class="text-sm font-medium text-gray-700">Project</label>
    <input class="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5
                  text-sm text-gray-900 placeholder-gray-400
                  focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400" />
  </div>
</div>
```

| ส่วน | ค่า |
|---|---|
| Label → input gap | `mt-1.5` (6px) |
| Field → field gap | `space-y-5` (20px) |
| Input padding | `px-3 py-2.5` |
| Input border/radius | `border border-gray-200 rounded-lg` |
| Focus state | `focus:ring-1 focus:ring-gray-400 focus:border-gray-400` (ไม่ใช้สีฉูดฉาด) |
| Segmented control (เช่น Source: Outbound/Inbound/...) | ปุ่มแถวเดียว `rounded-lg`, ตัวที่เลือก `bg-gray-100 font-medium text-gray-900`, ที่เหลือ `text-gray-500` |
| Panel padding (ภาพรวม) | `p-8` (32px) — กว้างกว่า card ปกติเพราะเป็นพื้นที่โฟกัสเดี่ยว |
| Panel width | `max-w-md` ถึง `max-w-lg` เมื่อเป็น slide-over |

---

## 9. Layout Grid (generic — ไม่ผูกจำนวนคอลัมน์ตายตัว)

```html
<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
  <div class="lg:col-span-8"><!-- main card --></div>
  <div class="lg:col-span-4 space-y-4"><!-- stacked stat cards --></div>
</div>
```

- Container padding รอบ page: `p-6` ถึง `p-8`
- Grid gap มาตรฐาน: `gap-6`
- ใช้ระบบ 12 คอลัมน์ (`col-span-*`) แทนการกำหนดสัดส่วนตายตัว เพื่อ reuse กับ layout อื่นได้ (2 คอลัมน์, 3 คอลัมน์, full-width table ฯลฯ)

---

## 10. Tailwind Config Snippet

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      borderRadius: {
        card: '0.75rem',   // 12px — rounded-xl
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04)', // เทียบเท่า shadow-sm
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '1', fontWeight: '700' }], // 36px
        'stat':    ['1.5rem',  { lineHeight: '1.2', fontWeight: '700' }], // 24px
      },
    },
  },
}
```

---

## สรุปกฎหลัก (cheat sheet)

1. Card: `bg-white border border-gray-200 rounded-xl p-6` (เล็กลงได้เหลือ `p-5`)
2. ตัวเลขเด่น: `text-2xl` ถึง `text-4xl font-bold`, label คู่กันเสมอ `text-sm text-gray-500`
3. Badge: `rounded-full text-xs font-medium px-2.5 py-0.5` สีพื้น `-50` + สีตัวอักษร `-600/700`
4. Spacing ระหว่าง element ในการ์ด: ใช้ `mt-1`/`mt-2`, ระหว่างการ์ด: `gap-4`/`gap-6`, ระหว่าง section: `mt-8`
5. Border ทุกที่ใช้ `gray-200` (เข้ม) หรือ `gray-100` (อ่อน สำหรับ row divider) ไม่ใช้สีเข้มกว่านี้
6. ไม่มี shadow หนัก ไม่มี gradient พื้นหลังการ์ด
7. สีไว้ใช้กับ status/trend เท่านั้น ส่วนที่เหลือคือ grayscale ล้วน
