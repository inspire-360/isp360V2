import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Construction = ({ message }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-4 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-lg w-full">
        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon</h2>
        <p className="text-gray-600 mb-8 text-lg">{message || "ระบบอยู่ระหว่างการปรับปรุง"}</p>
        
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition shadow-lg transform active:scale-95"
        >
            <ArrowLeft size={20} /> ย้อนกลับสู่หน้าหลัก
        </button>
      </div>
    </div>
  );
};

export default Construction;