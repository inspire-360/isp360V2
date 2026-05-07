import React, { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { TextAnswerTextarea } from '../forms/TextAnswerField';
import { isTextAnswerValid } from '../../utils/textValidation';

export default function SWOTBoard() {
  const [swotData, setSwotData] = useState({
    s: '', w: '', o: '', t: ''
  });
  const [saveAttempted, setSaveAttempted] = useState(false);

  const ready = Object.values(swotData).every((value) => isTextAnswerValid(value));

  const handleChange = (e) => {
    setSwotData({ ...swotData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setSaveAttempted(true);
    if (!ready) return;

    // ในอนาคตเชื่อมต่อ Firebase เพื่อบันทึกข้อมูล Mission ของ User คนนั้น
    alert("บันทึกข้อมูล SWOT Analysis เรียบร้อยแล้ว! (Demo)");
  };

  return (
    <div className="animate-fade-in-up">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">SWOT Analysis Board</h2>
        <p className="text-gray-500 mb-6">วิเคราะห์สภาพแวดล้อมภายใน (จุดแข็ง/จุดอ่อน) และภายนอก (โอกาส/อุปสรรค)</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Strengths */}
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
            <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center text-green-800">S</span>
              Strengths (จุดแข็ง)
            </h3>
            <TextAnswerTextarea
              name="s" 
              value={swotData.s}
              onChange={handleChange}
              showError={saveAttempted}
              className="w-full h-32 p-3 rounded-xl border border-green-200 focus:ring-2 focus:ring-green-300 focus:border-transparent outline-none resize-none text-sm"
              placeholder="ระบุจุดแข็งของตนเอง หรือโรงเรียน..."
            />
          </div>

          {/* Weaknesses */}
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center text-red-800">W</span>
              Weaknesses (จุดอ่อน)
            </h3>
            <TextAnswerTextarea
              name="w" 
              value={swotData.w}
              onChange={handleChange}
              showError={saveAttempted}
              className="w-full h-32 p-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-300 focus:border-transparent outline-none resize-none text-sm"
              placeholder="ระบุสิ่งที่ควรปรับปรุง..."
            />
          </div>

          {/* Opportunities */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center text-blue-800">O</span>
              Opportunities (โอกาส)
            </h3>
            <TextAnswerTextarea
              name="o" 
              value={swotData.o}
              onChange={handleChange}
              showError={saveAttempted}
              className="w-full h-32 p-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-transparent outline-none resize-none text-sm"
              placeholder="ปัจจัยภายนอกที่ส่งเสริม..."
            />
          </div>

          {/* Threats */}
          <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
            <h3 className="font-bold text-yellow-700 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center text-yellow-800">T</span>
              Threats (อุปสรรค)
            </h3>
            <TextAnswerTextarea
              name="t" 
              value={swotData.t}
              onChange={handleChange}
              showError={saveAttempted}
              className="w-full h-32 p-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-300 focus:border-transparent outline-none resize-none text-sm"
              placeholder="ข้อจำกัดหรือความเสี่ยง..."
            />
          </div>

        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={() => setSwotData({s:'', w:'', o:'', t:''})} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition flex items-center gap-2">
            <RefreshCw size={18} /> ล้างข้อมูล
          </button>
          <button
            onClick={handleSave}
            disabled={!ready}
            className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            <Save size={18} /> บันทึกภารกิจ
          </button>
        </div>

      </div>
    </div>
  );
}
