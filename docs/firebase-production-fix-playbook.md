# Firebase Production Fix Playbook (ISP360V2)

เอกสารนี้สรุปแนวทางแก้ไข 6 ส่วนหลักสำหรับระบบปัจจุบัน โดยยึดโครงสร้างจาก `src/hooks/useLearningDashboard.jsx`, `src/hooks/useVideoAnnotationBoard.js`, และหน้าจอที่เกี่ยวข้อง.

## 1) Data Fetching & State Management (Dashboard & Member Control)

### Concept
- ใช้ `onSnapshot` เพื่อให้ข้อมูล `users` และ `enrollments` อัปเดตแบบเรียลไทม์.
- สร้าง state แบบ normalized (`Map`) เพื่อ merge ข้อมูลได้เร็ว และ render เฉพาะแถวที่เปลี่ยน.
- แยก loading state รายแหล่งข้อมูล (`users`, `enrollments`) และรวมตอนส่งออก.
- ถ้าต้องการสถานะ online ให้ผสาน `lastLoginAt` + `online` flag ที่อัปเดตจาก presence worker.

### Implementation Snippet
```jsx
import { collection, collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

// users
const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
  // update user map
});

// enrollments (เฉพาะคอร์สที่ต้องการ)
const enrollmentsQ = query(
  collectionGroup(db, "enrollments"),
  where("courseId", "==", "course-teacher"),
);
const unsubEnrollments = onSnapshot(enrollmentsQ, (snap) => {
  // merge progress/status/lastAccess
});

return () => {
  unsubUsers();
  unsubEnrollments();
};
```

### Data Model Recommendation
- `users/{uid}`
  - `online: boolean`
  - `lastLoginAt: Timestamp`
  - `lastSeenAt: Timestamp`
- `users/{uid}/enrollments/{enrollmentId}`
  - `status: "not_started" | "active" | "completed"`
  - `progressPercent: number`
  - `lastAccess: Timestamp`

---

## 2) Component Data Passing (Video Comment Tool)

### Concept
- ยึด `activeVideo` เป็น single source of truth.
- ส่ง `activeVideo.id` + `activeVideo.title` เข้า `addComment` ทุกครั้ง.
- บันทึก `videoTitle` ลง comment document เพื่อ audit และ debug.

### Implementation Snippet
```js
// inside addComment
batch.set(commentRef, {
  videoId: video.id,
  videoTitle: video.title || "วิดีโอการสอนจริง",
  teacherId: video.teacherId || "",
  body: trimmedBody,
  timestampSeconds,
  createdAt: serverTimestamp(),
});
```

```jsx
// page component
await addComment({
  video: activeVideo,
  body: draftComment,
  timestampSeconds: capturedSeconds,
});
```

---

## 3) Database Query & Rendering (Innovation Tracking Board)

### Concept
- ดึงข้อมูลนวัตกรรมจาก subcollection `enrollments` โดย filter ที่ `courseId` ของคอร์สครู.
- map fields จาก `missionResponses` เพื่อสร้าง card model เดียวสำหรับหน้า board.
- sort ตาม `updatedAt` ล่าสุด.

### Implementation Snippet
```js
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";

const q = query(
  collectionGroup(db, "enrollments"),
  where("courseId", "==", "course-teacher"),
);

const unsub = onSnapshot(q, (snapshot) => {
  const rows = snapshot.docs.map((docSnap) => {
    const d = docSnap.data();
    const m = d.missionResponses || {};
    return {
      id: docSnap.id,
      teacherId: docSnap.ref.parent.parent?.id || "",
      innovationName: m["m4-mission-1"]?.innovationName || "ยังไม่ตั้งชื่อ",
      subjectName: m["m4-mission-2"]?.subjectName || "",
      updatedAt: d.lastSavedAt || d.updatedAt || d.lastAccess || null,
    };
  });

  setInnovations(rows.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0)));
});
```

---

## 4) Real-time Update & Data Integrity (Member Control)

### Concept
- ปัญหาข้อมูลไม่ครบมักเกิดจาก:
  1) query ไม่มี index
  2) subscribe คนละ collection กับที่เขียนข้อมูลจริง
  3) pagination ใช้ `startAfter` ผิดเอกสารอ้างอิง
- แนวทาง:
  - ใช้ listener สำหรับหน้าแรก (recent users)
  - ใช้ pagination แบบ cursor สำหรับหน้าเก่า
  - dedupe ด้วย `Map(uid -> row)` ก่อน render

### Implementation Snippet
```js
import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter } from "firebase/firestore";

const PAGE_SIZE = 25;
const baseQ = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));

const unsub = onSnapshot(baseQ, (snap) => {
  setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  setLastDoc(snap.docs[snap.docs.length - 1] || null);
});

const loadMore = async () => {
  if (!lastDoc) return;
  const nextQ = query(
    collection(db, "users"),
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limit(PAGE_SIZE),
  );
  const nextSnap = await getDocs(nextQ);
  setRows((prev) => {
    const map = new Map(prev.map((x) => [x.id, x]));
    nextSnap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
    return [...map.values()];
  });
  setLastDoc(nextSnap.docs[nextSnap.docs.length - 1] || null);
};
```

---

## 5) UI/UX Refactoring (Expert & Resource Matching)

### Concept
- แบ่ง layout เป็น 3 โซน: Filters, Result list, Detail panel.
- เพิ่ม hierarchy ด้วย card, spacing, sticky panel, empty state.
- ปรับให้ responsive: mobile = 1 col, desktop = 12-col grid.

### Tailwind Structure Snippet
```jsx
<div className="mx-auto max-w-7xl px-4 py-6">
  <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Expert & Resource Matching</h1>
      <p className="text-sm text-slate-500">จับคู่ผู้เชี่ยวชาญกับทรัพยากรที่เหมาะสม</p>
    </div>
    <button className="rounded-xl bg-primary px-4 py-2 text-white shadow hover:opacity-90">สร้างคำขอใหม่</button>
  </header>

  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <aside className="lg:col-span-3 rounded-2xl border bg-white p-4 shadow-sm">filters...</aside>
    <section className="lg:col-span-5 rounded-2xl border bg-white p-4 shadow-sm">result cards...</section>
    <section className="lg:col-span-4 rounded-2xl border bg-white p-4 shadow-sm lg:sticky lg:top-4">detail...</section>
  </div>
</div>
```

---

## 6) System Stability & Performance Optimization

### Best Practices Checklist
1. Error boundaries + per-hook error state.
2. Loading skeleton แยกเป็น page-level และ section-level.
3. Cleanup listeners ทุก `useEffect`.
4. จำกัด query scope (`where`, `limit`) และทำ composite index ให้ครบ.
5. ใช้ field projection ผ่าน data model (เก็บ summary field เช่น `lastCommentPreview`) เพื่อลด read cost.
6. Debounce search/filter ฝั่ง client.
7. ใช้ optimistic UI เฉพาะงาน write ที่ rollback ง่าย.
8. monitor Firebase usage (read/write/doc size).

### Reusable Async State Pattern
```js
const [state, setState] = useState({ loading: true, error: "", data: [] });

useEffect(() => {
  const unsub = onSnapshot(
    query(collection(db, "users"), limit(50)),
    (snap) => setState({ loading: false, error: "", data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
    (err) => setState({ loading: false, error: err.message || "load failed", data: [] }),
  );
  return () => unsub();
}, []);
```

### Firestore Index Suggestions
- `users`: `createdAt desc`
- `enrollments (collectionGroup)`: `courseId asc, updatedAt desc`
- `videos/{videoId}/comments`: `timestampSeconds asc`

