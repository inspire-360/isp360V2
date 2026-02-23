import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, ChevronLeft, CheckCircle, PlayCircle, FileText, 
  Award, ChevronDown, ChevronRight, CheckSquare, PenTool, 
  RotateCcw, ArrowRight, Lock, AlertTriangle, Loader2, ClipboardCheck
} from 'lucide-react';
import { teacherCourseData } from '../data/teacherCourse';
import { getPreTestQuestions, getPostTestQuestions } from '../data/standardizedTests'; 
import { getIcon } from '../utils/iconHelper';
import SWOTBoard from '../components/activities/SWOTBoard';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function CourseRoom() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // --- 1. Hooks ---
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [loading, setLoading] = useState(true);

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  
  const [progressData, setProgressData] = useState({
    completedLessons: [],
    currentModuleIndex: 0,
    postTestAttempts: 0,
    score: 0
  });

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const courseId = "course-teacher";
  const currentCourse = teacherCourseData || { modules: [] };
  const currentModule = currentCourse.modules?.[activeModuleIndex];
  const currentLesson = currentModule?.lessons?.[activeLessonIndex];

  // --- 2. Effects ---
  useEffect(() => {
    const loadProgress = async () => {
      if (!currentUser) return;
      try {
        const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);
        const docSnap = await getDoc(enrollRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProgressData({
            completedLessons: data.completedLessons || [],
            currentModuleIndex: data.currentModuleIndex || 0,
            postTestAttempts: data.postTestAttempts || 0,
            score: data.score || 0
          });
          
          const lastModuleIdx = data.currentModuleIndex || 0;
          if (teacherCourseData.modules && lastModuleIdx < teacherCourseData.modules.length) {
              setExpandedModules({ [lastModuleIdx]: true });
              setActiveModuleIndex(lastModuleIdx);
          }
        } else {
          await setDoc(enrollRef, {
            enrolledAt: new Date(),
            completedLessons: [],
            currentModuleIndex: 0, 
            postTestAttempts: 0,
            status: 'active'
          });
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, [currentUser]);

  useEffect(() => {
    if (currentLesson && currentLesson.type === 'quiz') {
      let questions = [];
      if (currentLesson.content?.isPretest) {
        questions = getPreTestQuestions(); 
      } else if (currentLesson.content?.isPosttest) {
        questions = getPostTestQuestions(currentLesson.content.questionsCount || 10);
      } else {
        questions = currentLesson.content?.questions || [];
      }
      setQuizQuestions(questions);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(0);
    }
  }, [currentLesson]);

  // --- 3. Logic ---
  const handleLessonChange = (modIndex, lessIndex) => {
    if (modIndex > progressData.currentModuleIndex) {
      alert("🔒 กรุณาเรียนบทเรียนก่อนหน้าให้ครบถ้วนก่อนครับ");
      return;
    }
    setActiveModuleIndex(modIndex);
    setActiveLessonIndex(lessIndex);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const toggleModule = (index) => {
    setExpandedModules(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const markLessonComplete = async () => {
    if (!currentLesson || progressData.completedLessons.includes(currentLesson.id)) return;

    try {
      const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);
      
      await updateDoc(enrollRef, {
        completedLessons: arrayUnion(currentLesson.id),
        lastAccess: new Date()
      });

      const newCompleted = [...progressData.completedLessons, currentLesson.id];
      const allLessonsInModule = currentModule.lessons.map(l => l.id);
      const isModuleDone = allLessonsInModule.every(id => newCompleted.includes(id));

      if (isModuleDone) {
        const nextModuleIdx = activeModuleIndex + 1;
        if (nextModuleIdx < currentCourse.modules.length) {
           if (nextModuleIdx > progressData.currentModuleIndex) {
             await updateDoc(enrollRef, { currentModuleIndex: nextModuleIdx });
             setProgressData(prev => ({ ...prev, completedLessons: newCompleted, currentModuleIndex: nextModuleIdx }));
             alert(`🎉 ยินดีด้วย! ปลดล็อก ${currentCourse.modules[nextModuleIdx].title} แล้ว`);
           } else {
             setProgressData(prev => ({ ...prev, completedLessons: newCompleted }));
           }
        } else {
             setProgressData(prev => ({ ...prev, completedLessons: newCompleted }));
        }
      } else {
        setProgressData(prev => ({ ...prev, completedLessons: newCompleted }));
      }

    } catch (error) {
      console.error("Error marking complete:", error);
    }
  };

  const handleQuizSelect = (questionId, optionIndex) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const submitQuiz = async () => {
    let score = 0;
    quizQuestions.forEach((q) => {
        if (quizAnswers[q.id] === q.correctAnswer) score += 1;
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    const isPassed = score >= (currentLesson.content?.passScore || 0);
    const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);

    if (currentLesson.content?.isPretest) {
        await markLessonComplete(); 
        return;
    }

    if (currentLesson.content?.isPosttest) {
        const newAttempts = progressData.postTestAttempts + 1;
        await updateDoc(enrollRef, {
            postTestAttempts: newAttempts,
            score: score, 
            lastAccess: new Date()
        });
        setProgressData(prev => ({ ...prev, postTestAttempts: newAttempts, score: score }));

        if (isPassed) {
            await markLessonComplete();
            alert("🎉 ยินดีด้วย! คุณสอบผ่าน Post-test แล้ว");
        } else {
            if (newAttempts >= 5) {
                alert("❌ คุณสอบไม่ผ่านครบ 5 ครั้ง ระบบจะทำการรีเซ็ตการเรียนรู้ใหม่ตั้งแต่ต้น");
                await resetCourseProgress();
            }
        }
    } else {
        if (isPassed) await markLessonComplete();
    }
  };

  const resetCourseProgress = async () => {
    setLoading(true);
    try {
        const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);
        await updateDoc(enrollRef, {
            currentModuleIndex: 1, 
            completedLessons: ["pretest-exam"], 
            postTestAttempts: 0,
            score: 0
        });
        window.location.reload();
    } catch (error) {
        console.error("Reset failed:", error);
        setLoading(false);
    }
  };

  const retryQuiz = () => {
    if (currentLesson.content?.isPosttest) {
        setQuizQuestions(getPostTestQuestions(10));
    }
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  // --- 4. Render Helpers ---
  const renderVideo = () => (
    <div className="animate-fade-in-up">
      <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl mb-8 relative group">
        {currentLesson.content?.videoUrl ? (
          <iframe 
            src={currentLesson.content.videoUrl} 
            title="Video Player"
            className="w-full h-full border-0"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-gray-900">
            <PlayCircle size={64} className="mb-4 opacity-50" />
            <p className="text-lg">Video Placeholder</p>
          </div>
        )}
      </div>
      <div className="prose max-w-none">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{currentLesson.title}</h3>
        <p className="text-gray-600 leading-relaxed text-lg">{currentLesson.content?.description}</p>
      </div>
      <div className="mt-8 flex justify-end">
         {!progressData.completedLessons.includes(currentLesson.id) ? (
            <button onClick={markLessonComplete} className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                <CheckCircle size={20} /> ทำเครื่องหมายว่าเรียนจบ
            </button>
         ) : (
            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg">
                <CheckCircle size={20} /> เรียนจบแล้ว
            </div>
         )}
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="animate-fade-in-up">
        {currentLesson.activityType === 'swot_board' && <SWOTBoard />}
        <div className="mt-8 flex justify-end">
             {!progressData.completedLessons.includes(currentLesson.id) ? (
                <button onClick={markLessonComplete} className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                    <PenTool size={20} /> ส่งภารกิจเรียบร้อย
                </button>
             ) : (
                <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg">
                    <CheckCircle size={20} /> ส่งงานแล้ว
                </div>
             )}
        </div>
    </div>
  );

  // ✅ เพิ่มฟังก์ชันสำหรับแสดงบทความ / แบบสอบถาม (แยกจาก Video)
  const renderArticle = () => (
    <div className="animate-fade-in-up">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <FileText size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h2>
                <p className="text-gray-500">เอกสารการเรียนรู้ / กิจกรรม</p>
            </div>
        </div>
        
        <div className="prose max-w-none text-gray-600 text-lg leading-relaxed mb-8">
            <p>{currentLesson.content?.text}</p>

            {Array.isArray(currentLesson.content?.resources) && currentLesson.content.resources.length > 0 && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="font-semibold text-blue-900 mb-2">เอกสารประกอบบทเรียน</p>
                    <ul className="list-disc pl-5 space-y-1 text-base text-blue-800">
                        {currentLesson.content.resources.map((resource, idx) => (
                            <li key={`${currentLesson.id}-resource-${idx}`}>{resource}</li>
                        ))}
                    </ul>
                </div>
            )}

            {currentLesson.id === 'final-survey' && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center mt-4">
                    <p className="mb-4">กรุณาทำแบบประเมินความพึงพอใจเพื่อพัฒนาหลักสูตรต่อไป</p>
                    <a
                        href={currentLesson.content?.surveyUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-2 bg-white border border-primary text-primary rounded-lg font-bold hover:bg-blue-50 transition"
                    >
                        {currentLesson.content?.surveyLabel || 'เปิดแบบสอบถาม (Google Form)'}
                    </a>
                </div>
            )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-50">
            {!progressData.completedLessons.includes(currentLesson.id) ? (
                <button onClick={markLessonComplete} className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                    <CheckCircle size={20} /> ทำรายการเสร็จสมบูรณ์
                </button>
            ) : (
                <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg">
                    <CheckCircle size={20} /> ดำเนินการเรียบร้อยแล้ว
                </div>
            )}
        </div>
      </div>
    </div>
  );

  const renderQuizUI = () => {
    const isPosttest = currentLesson.content?.isPosttest;
    const maxAttempts = currentLesson.content?.maxAttempts || 5;
    const isPassed = quizScore >= (currentLesson.content?.passScore || 0);
    const isCompleted = progressData.completedLessons.includes(currentLesson.id);

    if (quizSubmitted || isCompleted) {
      return (
        <div className="max-w-2xl mx-auto text-center py-10 animate-fade-in-up">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl ${isPassed || isCompleted ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {isPassed || isCompleted ? <Award size={48} /> : <RotateCcw size={48} />}
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">
            {isCompleted ? "ผ่านการทดสอบแล้ว" : `คะแนน: ${quizScore} / ${quizQuestions.length}`}
          </h2>
          {isPosttest && !isPassed && !isCompleted && (
             <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg inline-block mb-4 border border-red-200 font-bold">
                สอบครั้งที่ {progressData.postTestAttempts} / {maxAttempts}
             </div>
          )}
          <p className="text-gray-500 mb-8 text-lg">
            {(isPassed || isCompleted) ? "คุณผ่านเกณฑ์การทดสอบเรียบร้อยแล้ว" : "คุณยังไม่ผ่านเกณฑ์ กรุณาทบทวนเนื้อหาและลองใหม่อีกครั้ง"}
          </p>
          <div className="flex justify-center gap-4">
            {(!isPassed && !isCompleted) && (progressData.postTestAttempts < maxAttempts || !isPosttest) && (
              <button onClick={retryQuiz} className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition flex items-center gap-2">
                <RotateCcw size={20} /> ทำข้อสอบใหม่
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-2 rounded-lg text-primary"><CheckSquare size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{currentLesson.title}</h3>
              <p className="text-gray-600 text-sm mt-1">
                ตอบคำถาม {quizQuestions.length} ข้อ 
                {currentLesson.content?.passScore > 0 && ` (เกณฑ์ผ่าน ${currentLesson.content.passScore} คะแนน)`}
              </p>
            </div>
          </div>
          {isPosttest && (
             <div className="mt-4 flex items-center gap-2 text-sm text-orange-700 bg-orange-100/50 px-4 py-3 rounded-xl border border-orange-200">
                <AlertTriangle size={18} /> 
                <strong>คำเตือน:</strong> หากสอบไม่ผ่านครบ {maxAttempts} ครั้ง ระบบจะรีเซ็ตการเรียนรู้ใหม่ตั้งแต่ Module 1
             </div>
          )}
        </div>
        <div className="space-y-6">
          {quizQuestions.map((q, index) => (
            <div key={q.id || index} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 text-lg mb-4">{index + 1}. {q.question}</h4>
              <div className="space-y-3">
                {q.options.map((option, optIndex) => (
                  <label key={optIndex} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${quizAnswers[q.id] === optIndex ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input type="radio" name={`question-${q.id || index}`} className="w-5 h-5 text-primary" checked={quizAnswers[q.id] === optIndex} onChange={() => handleQuizSelect(q.id, optIndex)} />
                    <span className="ml-3 text-gray-700 font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-end">
          <button onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < quizQuestions.length} className="px-8 py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
            ส่งคำตอบ <CheckCircle size={20} />
          </button>
        </div>
      </div>
    );
  };

  // ✅ 4. ปรับปรุง Render Certificate (เพิ่มเงื่อนไข)
  const renderCertificate = () => {
    // เงื่อนไข: ต้องผ่าน Post-test (posttest-exam) และทำ Survey (final-survey) แล้ว
    const isPostTestPassed = progressData.completedLessons.includes("posttest-exam");
    const isSurveyDone = progressData.completedLessons.includes("final-survey");

    if (!isPostTestPassed) {
        return (
            <div className="animate-fade-in-up text-center py-20">
                <Lock size={64} className="mx-auto text-gray-300 mb-6" />
                <h2 className="text-2xl font-bold text-gray-700 mb-2">ยังไม่ผ่านเกณฑ์</h2>
                <p className="text-gray-500">กรุณาทำแบบทดสอบ Post-test ให้ผ่านเกณฑ์ก่อนครับ</p>
            </div>
        );
    }

    if (!isSurveyDone) {
        return (
            <div className="animate-fade-in-up text-center py-20">
                <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <FileText size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">เหลืออีกเพียงขั้นตอนเดียว!</h2>
                <p className="text-gray-500 mb-8">กรุณาทำแบบประเมินความพึงพอใจให้เสร็จสมบูรณ์ เพื่อปลดล็อกเกียรติบัตร</p>
                <button 
                    // หา index ของ final-survey แล้วเปลี่ยนหน้าไปหา
                    onClick={() => {
                        const finalModIdx = teacherCourseData.modules.length - 1; // โมดูลสุดท้าย
                        const surveyLessonIdx = teacherCourseData.modules[finalModIdx].lessons.findIndex(l => l.id === 'final-survey');
                        if (surveyLessonIdx !== -1) handleLessonChange(finalModIdx, surveyLessonIdx);
                    }}
                    className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                >
                    ไปที่แบบประเมิน <ArrowRight size={20} />
                </button>
            </div>
        );
    }

    // ถ้าครบทุกเงื่อนไข -> แสดงปุ่มโหลด
    return (
        <div className="animate-fade-in-up text-center py-12">
            <Award size={80} className="mx-auto text-yellow-500 mb-6" />
            <h2 className="text-3xl font-black text-gray-900 mb-4">ยินดีด้วย! คุณผ่านหลักสูตรแล้ว</h2>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">
                คุณได้ผ่านการทดสอบและกิจกรรมครบถ้วนตามหลักสูตร InSPIRE for Teacher
            </p>
            <a
                href={currentLesson.content?.certificateUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition flex items-center gap-2 mx-auto w-fit"
            >
                <FileText size={24} /> {currentLesson.content?.certificateLabel || 'ดาวน์โหลดเกียรติบัตร (PDF)'}
            </a>
        </div>
    );
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (!currentModule || !currentLesson) return <div className="p-8 text-center">Data Error: Module Not Found</div>;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-30 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-5 border-b border-gray-100 bg-white flex items-center justify-between">
          <h2 className="font-bold text-gray-800 truncate pr-2 text-lg">InSPIRE 360°</h2>
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition"><ChevronLeft size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {currentCourse.modules.map((module, mIndex) => {
            const isLocked = mIndex > progressData.currentModuleIndex;
            
            let moduleLabel = "";
            if (module.id.includes('pretest')) moduleLabel = "Pre-test";
            else if (module.id.includes('posttest')) moduleLabel = "Post-test";
            else if (module.id.includes('final')) moduleLabel = "Certificate";
            else moduleLabel = `Module ${mIndex}`; 

            return (
                <div key={module.id} className={`rounded-xl overflow-hidden border border-transparent ${isLocked ? 'opacity-60 grayscale' : ''}`}>
                <button onClick={() => !isLocked && toggleModule(mIndex)} disabled={isLocked} className={`w-full px-4 py-3 flex items-center justify-between transition-colors rounded-lg ${expandedModules[mIndex] ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                    <div className="text-left flex items-center gap-2">
                        {isLocked && <Lock size={14} className="text-gray-400" />}
                        <div>
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-0.5">{moduleLabel}</p>
                            <h3 className="text-sm font-bold text-gray-700 truncate w-48">{module.title.split(':')[1] || module.title}</h3>
                        </div>
                    </div>
                    {!isLocked && (expandedModules[mIndex] ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />)}
                </button>
                {!isLocked && expandedModules[mIndex] && (
                    <div className="mt-1 ml-2 pl-2 border-l-2 border-gray-100 space-y-1 mb-2">
                    {module.lessons.map((lesson, lIndex) => {
                        const isActive = mIndex === activeModuleIndex && lIndex === activeLessonIndex;
                        const isCompleted = progressData.completedLessons.includes(lesson.id);
                        return (
                        <button key={lesson.id} onClick={() => handleLessonChange(mIndex, lIndex)} className={`w-full px-3 py-2.5 flex items-center gap-3 text-left rounded-lg transition-all ${isActive ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-gray-600 hover:bg-gray-50'}`}>
                            {isCompleted ? <CheckCircle size={16} className={isActive ? 'text-white' : 'text-green-500'} /> : isActive ? <PlayCircle size={16} className="flex-shrink-0" /> : getIcon(lesson.iconName, "w-4 h-4 opacity-70")}
                            <span className="text-sm font-medium truncate">{lesson.title}</span>
                        </button>
                        );
                    })}
                    </div>
                )}
                </div>
            );
          })}
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 md:hidden"><Menu size={24} /></button>
            <h1 className="text-lg font-bold text-gray-800 truncate hidden md:block">{currentLesson.title}</h1>
          </div>
          {progressData.completedLessons.includes(currentLesson.id) ? (
             <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle size={14} /> Completed</span>
          ) : (<span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">In Progress</span>)}
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
            <div className="max-w-5xl mx-auto">
                {currentLesson.type === 'video' && renderVideo()}
                {currentLesson.type === 'quiz' && renderQuizUI()}
                {currentLesson.type === 'activity' && renderActivity()}
                {currentLesson.type === 'article' && renderArticle()} 
                {currentLesson.type === 'certificate' && renderCertificate()}
            </div>
        </div>
      </main>
    </div>
  );
}
