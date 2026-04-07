import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const EMPTY_RESPONSE = Object.freeze({});

const filled = (value) => Boolean(String(value || "").trim());

const buildPayload = (lesson, draft) => {
  if (lesson.activityType === "module3_idea_billboard") {
    return {
      type: "idea-billboard",
      projectName: draft.projectName || "",
      painPoint: draft.painPoint || "",
      solution: draft.solution || "",
      adviceRequest: draft.adviceRequest || "",
      boardEvidence: draft.boardEvidence || "",
      screenshotEvidence: draft.screenshotEvidence || "",
    };
  }

  if (lesson.activityType === "module3_mastermind_comments") {
    return {
      type: "mastermind-comments",
      commentOneRole: draft.commentOneRole || "",
      commentOneTarget: draft.commentOneTarget || "",
      commentOneText: draft.commentOneText || "",
      commentOneEvidence: draft.commentOneEvidence || "",
      commentTwoRole: draft.commentTwoRole || "",
      commentTwoTarget: draft.commentTwoTarget || "",
      commentTwoText: draft.commentTwoText || "",
      commentTwoEvidence: draft.commentTwoEvidence || "",
      vibeReflection: draft.vibeReflection || "",
    };
  }

  if (lesson.activityType === "module3_spell_pitch") {
    return {
      type: "spell-pitch",
      projectName: draft.projectName || "",
      feedbackApplied: draft.feedbackApplied || "",
      hook: draft.hook || "",
      painPoint: draft.painPoint || "",
      solution: draft.solution || "",
      impact: draft.impact || "",
      pitchLink: draft.pitchLink || "",
    };
  }

  return {
    type: "reflection-mirror",
    reflectionAnswer: draft.reflectionAnswer || "",
  };
};

const hasContent = (payload) => JSON.stringify(payload).replace(/[\s":,{}[\]]/g, "").length > 0;

const SectionIntro = ({ intro, helper }) => (
  <div className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
    <p className="text-sm font-semibold text-secondary">AI Mentor ชวนคิด</p>
    <p className="mt-3 text-sm leading-7 text-slate-700">{intro}</p>
    {helper ? <p className="mt-3 text-sm leading-7 text-slate-600">{helper}</p> : null}
  </div>
);

const Field = ({ label, helper, children }) => (
  <div>
    <p className="text-sm font-semibold text-ink">{label}</p>
    {helper ? <p className="mt-1 text-sm leading-7 text-slate-500">{helper}</p> : null}
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type}
    value={value || ""}
    onChange={onChange}
    placeholder={placeholder}
    className="mt-3 w-full rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white"
  />
);

const TextArea = ({ value, onChange, placeholder, rows = 5 }) => (
  <textarea
    value={value || ""}
    onChange={onChange}
    rows={rows}
    placeholder={placeholder}
    className="mt-3 w-full rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white"
  />
);

export default function ModuleThreeMission({
  lesson,
  savedResponse,
  allResponses = EMPTY_RESPONSE,
  isCompleted,
  onSave,
  onDraftSave,
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState("");
  const [autosaveState, setAutosaveState] = useState("");
  const hydratedLessonRef = useRef("");
  const lastPayloadRef = useRef("");

  const moduleTwoRoadmap = allResponses["m2-mission-3"] ?? EMPTY_RESPONSE;
  const moduleTwoPitch = allResponses["m2-mission-4"] ?? EMPTY_RESPONSE;
  const moduleTwoSmart = allResponses["m2-mission-5"] ?? EMPTY_RESPONSE;

  useEffect(() => {
    if (hydratedLessonRef.current === lesson.id) return;

    let nextDraft;

    if (lesson.activityType === "module3_idea_billboard") {
      nextDraft = {
        projectName: savedResponse?.projectName || moduleTwoPitch?.projectName || "",
        painPoint: savedResponse?.painPoint || "",
        solution: savedResponse?.solution || moduleTwoRoadmap?.northStar || "",
        adviceRequest: savedResponse?.adviceRequest || "",
        boardEvidence: savedResponse?.boardEvidence || "",
        screenshotEvidence: savedResponse?.screenshotEvidence || "",
      };
    } else if (lesson.activityType === "module3_mastermind_comments") {
      nextDraft = {
        commentOneRole: savedResponse?.commentOneRole || "",
        commentOneTarget: savedResponse?.commentOneTarget || "",
        commentOneText: savedResponse?.commentOneText || "",
        commentOneEvidence: savedResponse?.commentOneEvidence || "",
        commentTwoRole: savedResponse?.commentTwoRole || "",
        commentTwoTarget: savedResponse?.commentTwoTarget || "",
        commentTwoText: savedResponse?.commentTwoText || "",
        commentTwoEvidence: savedResponse?.commentTwoEvidence || "",
        vibeReflection: savedResponse?.vibeReflection || "",
      };
    } else if (lesson.activityType === "module3_spell_pitch") {
      nextDraft = {
        projectName: savedResponse?.projectName || moduleTwoPitch?.projectName || "",
        feedbackApplied: savedResponse?.feedbackApplied || "",
        hook: savedResponse?.hook || "",
        painPoint: savedResponse?.painPoint || "",
        solution: savedResponse?.solution || moduleTwoSmart?.commitment || "",
        impact: savedResponse?.impact || "",
        pitchLink: savedResponse?.pitchLink || "",
      };
    } else {
      nextDraft = {
        reflectionAnswer: savedResponse?.reflectionAnswer || "",
      };
    }

    hydratedLessonRef.current = lesson.id;
    lastPayloadRef.current = JSON.stringify(buildPayload(lesson, nextDraft));
    setReward("");
    setAutosaveState("");
    setDraft(nextDraft);
  }, [lesson, moduleTwoPitch, moduleTwoRoadmap, moduleTwoSmart, savedResponse]);

  const payload = useMemo(() => buildPayload(lesson, draft), [draft, lesson]);

  useEffect(() => {
    if (!onDraftSave) return undefined;
    if (!hasContent(payload)) return undefined;

    const serialized = JSON.stringify(payload);
    if (serialized === lastPayloadRef.current) return undefined;

    setAutosaveState("กำลังบันทึกคำตอบอัตโนมัติ...");
    const timeoutId = window.setTimeout(async () => {
      try {
        await onDraftSave(payload);
        lastPayloadRef.current = serialized;
        setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
        window.setTimeout(() => setAutosaveState(""), 1800);
      } catch (error) {
        console.error("Failed to autosave Module 3 draft:", error);
        setAutosaveState("ยังบันทึกอัตโนมัติไม่สำเร็จ");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [onDraftSave, payload]);

  const persist = async () => {
    setSaving(true);
    try {
      await onSave(payload);
      lastPayloadRef.current = JSON.stringify(payload);
      setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
      setReward(lesson.content.aiMentor?.reward || "บันทึกภารกิจเรียบร้อย");
      window.setTimeout(() => setReward(""), 2200);
    } finally {
      setSaving(false);
    }
  };

  const renderTop = (helper) => (
    <>
      {reward ? (
        <div className="mb-4 rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary">
          {reward}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-2 text-primary">
          {autosaveState || "ระบบกำลังดูแลการบันทึกคำตอบให้อัตโนมัติ"}
        </span>
        {isCompleted ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            ภารกิจนี้ผ่านแล้ว
          </span>
        ) : null}
      </div>
      <SectionIntro intro={lesson.content.aiMentor.intro} helper={helper} />
    </>
  );

  const renderSubmit = (ready) => (
    <div className="mt-6 flex justify-end">
      {isCompleted ? (
        <div className="flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
          <CheckCircle2 size={16} />
          ทำภารกิจนี้เสร็จแล้ว
        </div>
      ) : (
        <button
          type="button"
          disabled={!ready || saving}
          onClick={persist}
          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          บันทึกภารกิจ
        </button>
      )}
    </div>
  );

  if (lesson.activityType === "module3_idea_billboard") {
    const ready =
      [draft.projectName, draft.painPoint, draft.solution, draft.adviceRequest, draft.screenshotEvidence].every(filled);

    return (
      <div>
        {renderTop(
          "ย่อแผน 30 วันของคุณให้เป็นโพสต์สั้น ชัด และน่าอ่านบน Padlet ด้านล่าง จากนั้นส่งลิงก์ภาพแคปหน้าจอเพียงอย่างเดียวเพื่อยืนยันการร่วมวง PLC",
        )}
        {moduleTwoSmart?.commitment ? (
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm leading-7 text-slate-700">
            SMART Objective จาก Module 2: {moduleTwoSmart.commitment}
          </div>
        ) : null}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="ชื่อโปรเจกต์">
            <Input
              value={draft.projectName}
              onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
              placeholder="ชื่อแผนหรือโปรเจกต์ 30 วันที่จะนำไปโพสต์"
            />
          </Field>
          <Field label="Pain Point" helper="สรุปปัญหาที่อยากแก้สั้น ๆ 1-2 บรรทัด">
            <TextArea
              value={draft.painPoint}
              onChange={(event) => setDraft((previous) => ({ ...previous, painPoint: event.target.value }))}
              placeholder="อธิบายปัญหาหลักที่อยากแก้ในห้องเรียน"
              rows={4}
            />
          </Field>
          <Field label="ไอเดียที่จะทำ" helper="สรุปแผน 30 วันที่คุณตั้งใจจะทำ">
            <TextArea
              value={draft.solution}
              onChange={(event) => setDraft((previous) => ({ ...previous, solution: event.target.value }))}
              placeholder="เล่าว่าจะทำอะไรบ้าง และคาดหวังความเปลี่ยนแปลงแบบไหน"
              rows={5}
            />
          </Field>
          <Field label="อยากให้เพื่อนครูช่วยแนะนำเรื่องอะไร">
            <TextArea
              value={draft.adviceRequest}
              onChange={(event) => setDraft((previous) => ({ ...previous, adviceRequest: event.target.value }))}
              placeholder="เช่น อยากได้ไอเดียกระตุ้นผู้เรียน หรือแนวทางรับมือความกังวลบางอย่าง"
              rows={4}
            />
          </Field>
        </div>
        <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-100 bg-white">
          <iframe
            src={lesson.content.padletEmbedUrl}
            title="Padlet Idea Billboard"
            className="h-[620px] w-full border-0"
            loading="lazy"
            allow="camera;microphone;geolocation;display-capture;clipboard-write"
          />
        </div>
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="ลิงก์ภาพแคปหน้าจอการโพสต์">
            <Input
              value={draft.screenshotEvidence}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, screenshotEvidence: event.target.value }))
              }
              placeholder="แนบลิงก์ภาพแคปหน้าจอจาก Google Drive หรือพื้นที่เก็บไฟล์อื่น"
            />
          </Field>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module3_mastermind_comments") {
    const ready = [draft.commentOneRole, draft.commentOneEvidence, draft.commentTwoRole, draft.commentTwoEvidence].every(filled);

    const renderRolePicker = (value, onPick) => (
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {lesson.content.roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onPick(role.id)}
            className={`rounded-[20px] border p-4 text-left transition ${
              value === role.id
                ? "border-primary/25 bg-primary/5"
                : "border-slate-100 bg-slate-50/80 hover:border-secondary/20"
            }`}
          >
            <p className="font-semibold text-ink">{role.label}</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">{role.starter}</p>
          </button>
        ))}
      </div>
    );

    return (
        <div>
          {renderTop(
            "เลือกบทบาทในการคอมเมนต์ 2 ครั้ง แล้วส่งลิงก์ภาพแคปหน้าจอของแต่ละคอมเมนต์ก็เพียงพอ ไม่ต้องกรอกข้อความซ้ำในระบบอีก",
          )}
          <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-100 bg-white">
            <iframe
              src={lesson.content.padletEmbedUrl}
            title="Padlet PLC Council"
            className="h-[620px] w-full border-0"
            loading="lazy"
            allow="camera;microphone;geolocation;display-capture;clipboard-write"
          />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {["One", "Two"].map((slot) => {
            const key = slot === "One" ? "commentOne" : "commentTwo";

            return (
              <article key={slot} className="rounded-[28px] border border-slate-100 bg-white p-5">
                <h3 className="text-xl font-semibold text-ink">คอมเมนต์ครั้งที่ {slot === "One" ? "1" : "2"}</h3>
                {renderRolePicker(draft[`${key}Role`], (roleId) =>
                  setDraft((previous) => ({ ...previous, [`${key}Role`]: roleId })),
                )}
                <Field label="ลิงก์ภาพแคปหน้าจอคอมเมนต์">
                  <Input
                    value={draft[`${key}Evidence`]}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, [`${key}Evidence`]: event.target.value }))
                    }
                    placeholder="แนบลิงก์ภาพแคปหน้าจอคอมเมนต์ใน Padlet"
                  />
                </Field>
              </article>
            );
          })}
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module3_spell_pitch") {
    const ready = [
      draft.projectName,
      draft.feedbackApplied,
      draft.hook,
      draft.painPoint,
      draft.solution,
      draft.impact,
      draft.pitchLink,
    ].every(filled);

    return (
      <div>
        {renderTop(
          "เลือกประเด็นตั้งต้นจาก Roadmap หรือไอเดียที่ตกผลึกจากวง PLC แล้วเรียบเรียงเป็นสคริปต์ภาษาไทยที่ขายไอเดียได้ภายใน 1 นาที",
        )}
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {moduleTwoRoadmap?.northStar ? (
            <article className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-primary">ประเด็นจาก Roadmap</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{moduleTwoRoadmap.northStar}</p>
            </article>
          ) : null}
          {allResponses["m3-mission-2"]?.commentOneRole || allResponses["m3-mission-2"]?.commentTwoRole ? (
            <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
              <p className="text-sm font-semibold text-secondary">ไอเดียจากบอร์ด PLC</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                ใช้ข้อคิดเห็นที่ได้จากบทบาทต่าง ๆ ใน Mission 2 มาปรับให้สคริปต์ของคุณคมขึ้นและตอบคำถามเพื่อนได้ชัดขึ้น
              </p>
            </article>
          ) : null}
        </div>
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="ชื่อโปรเจกต์หรือประเด็นที่กำลังจะ Pitch">
            <Input
              value={draft.projectName}
              onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
              placeholder="ระบุหัวข้อที่กำลังจะเล่าในคลิป 60 วินาที"
            />
          </Field>
          <Field
            label="Feedback ที่หยิบมาใช้"
            helper="สรุปว่าข้อคิดเห็นจากเพื่อนครูช่วยให้แผนของคุณชัดขึ้นหรือเปลี่ยนไปอย่างไร"
          >
            <TextArea
              value={draft.feedbackApplied}
              onChange={(event) => setDraft((previous) => ({ ...previous, feedbackApplied: event.target.value }))}
              placeholder="เช่น ได้ไอเดียเพิ่มกิจกรรมสำหรับเด็กกลุ่มอ่อน หรือปรับวิธีสื่อสารกับผู้เรียน"
              rows={4}
            />
          </Field>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[28px] border border-slate-100 bg-white p-5">
            <Field
              label="Hook (10 วินาที)"
              helper="ประโยคเปิดที่ทำให้ผู้ฟังหยุดฟังทันที เช่น คำถามชวนคิด ตัวเลขน่าตกใจ หรือภาพจำจากห้องเรียน"
            >
              <TextArea
                value={draft.hook}
                onChange={(event) => setDraft((previous) => ({ ...previous, hook: event.target.value }))}
                placeholder="เช่น รู้ไหมว่าเด็กในห้องของเราหลายคนยังไม่กล้าพูดในชั้นเรียนเลย..."
                rows={4}
              />
            </Field>
            <Field
              label="Pain Point (15 วินาที)"
              helper="บอกปัญหาหลักที่พบให้ชัดว่าทำไมเรื่องนี้สำคัญและควรรีบแก้"
            >
              <TextArea
                value={draft.painPoint}
                onChange={(event) => setDraft((previous) => ({ ...previous, painPoint: event.target.value }))}
                placeholder="สรุปปัญหาเดิมที่เจอในห้องเรียนอย่างกระชับ"
                rows={4}
              />
            </Field>
          </article>
          <article className="rounded-[28px] border border-slate-100 bg-white p-5">
            <Field
              label="Solution (20 วินาที)"
              helper="เล่าแนวทางหรือกิจกรรมที่คุณจะทำจริง โดยเชื่อมกับแผน 30 วันหรือข้อคิดเห็นจากเพื่อนครู"
            >
              <TextArea
                value={draft.solution}
                onChange={(event) => setDraft((previous) => ({ ...previous, solution: event.target.value }))}
                placeholder="อธิบายวิธีแก้ปัญหาที่คุณเลือกใช้หลังได้ feedback"
                rows={4}
              />
            </Field>
            <Field
              label="Impact (15 วินาที)"
              helper="ปิดท้ายด้วยผลลัพธ์ที่อยากเห็นกับผู้เรียน ชุมชน หรือบริบทพื้นที่อย่างเป็นรูปธรรม"
            >
              <TextArea
                value={draft.impact}
                onChange={(event) => setDraft((previous) => ({ ...previous, impact: event.target.value }))}
                placeholder="บอกว่าจะเกิดประโยชน์อะไรกับเด็ก โรงเรียน ชุมชน หรือพื้นที่"
                rows={4}
              />
            </Field>
          </article>
        </div>
        <div className="mt-5 rounded-[26px] border border-slate-100 bg-white p-5">
          <Field label="ลิงก์ไฟล์เสียงหรือวิดีโอ">
            <Input
              value={draft.pitchLink}
              onChange={(event) => setDraft((previous) => ({ ...previous, pitchLink: event.target.value }))}
              placeholder="แนบลิงก์ Google Drive, YouTube แบบไม่เป็นสาธารณะ หรือแพลตฟอร์มอื่น"
            />
          </Field>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  const ready = filled(draft.reflectionAnswer);

  return (
    <div>
      {renderTop(
        "หยุดมองย้อนกลับอีกนิดครับ วง PLC ครั้งนี้เติมพลังหรือมุมมองใหม่อะไรให้โปรเจกต์ของคุณ แล้วสิ่งนั้นช่วยให้แผนมีโอกาสเกิดขึ้นจริงมากขึ้นอย่างไร",
      )}
      <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
        <Field label="Reflection Mirror" helper={lesson.content.question}>
          <TextArea
            value={draft.reflectionAnswer}
            onChange={(event) => setDraft((previous) => ({ ...previous, reflectionAnswer: event.target.value }))}
            placeholder="เล่าว่าคุณได้พลังวิเศษหรือมุมมองใหม่อะไรจากเครือข่ายครู และมันช่วยให้โปรเจกต์สมบูรณ์ขึ้นอย่างไร"
            rows={7}
          />
        </Field>
      </div>
      {renderSubmit(ready)}
    </div>
  );
}
