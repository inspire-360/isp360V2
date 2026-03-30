import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, ChevronLeft, CheckCircle, PlayCircle, FileText, 
  Award, ChevronDown, ChevronRight, CheckSquare, PenTool, 
  RotateCcw, ArrowRight, Lock, AlertTriangle, Loader2, ClipboardCheck, Sparkles
} from 'lucide-react';
import { teacherCourseData } from '../data/teacherCourse';
import { getPreTestQuestions, getPostTestQuestions } from '../data/standardizedTests'; 
import { getIcon } from '../utils/iconHelper';
import SWOTBoard from '../components/activities/SWOTBoard';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const INSIGHT_DIMENSIONS = [
  { key: 'learners', label: 'Learners' },
  { key: 'learning_style', label: 'Learning Style' },
  { key: 'community', label: 'Community' },
  { key: 'pain_points', label: 'Pain Points' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'passion', label: 'Passion' },
  { key: 'threats', label: 'Threats' },
  { key: 'vision', label: 'Vision' },
  { key: 'small_wins', label: 'Small Wins' }
];

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
  const [moduleOneState, setModuleOneState] = useState({
    dimensions: {},
    ratings: {},
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    strategies: [],
    strategyScores: {},
    selectedStrategy: '',
    actionPlan: { plan: '', do: '', check: '', act: '' },
    posttestScore: null
  });
  const [missionDraft, setMissionDraft] = useState('');

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

    if (currentLesson.id === 'm1-posttest') {
      setModuleOneState(prev => ({ ...prev, posttestScore: score }));
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

  const addMissionTextToSWOT = (bucket) => {
    if (!missionDraft.trim()) return;
    setModuleOneState(prev => ({
      ...prev,
      swot: { ...prev.swot, [bucket]: [...prev.swot[bucket], missionDraft.trim()] }
    }));
    setMissionDraft('');
  };

  const addStrategy = () => {
    if (!missionDraft.trim()) return;
    setModuleOneState(prev => ({ ...prev, strategies: [...prev.strategies, missionDraft.trim()] }));
    setMissionDraft('');
  };

  const completeMission = async () => {
    if (currentLesson.activityType === 'insight_9_dimensions') {
      const isCompleted9 = INSIGHT_DIMENSIONS.every((dimension) => {
        const answer = moduleOneState.dimensions[dimension.key];
        const rating = moduleOneState.ratings[dimension.key];
        return answer && String(answer).trim().length > 0 && rating >= 1 && rating <= 5;
      });
      if (!isCompleted9) {
        alert('กรุณากรอกคำตอบและให้คะแนน Pain Point ให้ครบทั้ง 9 มิติก่อนส่งภารกิจ');
        return;
      }
    }
    if (currentLesson.activityType === 'insight_tows' && moduleOneState.strategies.length < 3) {
      alert('กรุณาสร้างกลยุทธ์อย่างน้อย 3 กลยุทธ์ก่อนส่งภารกิจ');
      return;
    }
    if (currentLesson.activityType === 'insight_needs_detective' && !moduleOneState.selectedStrategy) {
      alert('กรุณาเลือก 1 กลยุทธ์หลักก่อนส่งภารกิจ');
      return;
    }
    if (currentLesson.activityType === 'insight_action_plan') {
      const { plan, do: doStep, check, act } = moduleOneState.actionPlan;
      if (!plan || !doStep || !check || !act) {
        alert('กรุณากรอก Action Plan (PDCA) ให้ครบทุกช่อง');
        return;
      }
    }
    await markLessonComplete();
  };

  const renderActivity = () => {
    const completed = progressData.completedLessons.includes(currentLesson.id);
    const isInsightMission = currentLesson.activityType?.startsWith('insight_');

    return (
      <div className="animate-fade-in-up space-y-6">
        {currentLesson.activityType === 'swot_board' && <SWOTBoard />}

        {isInsightMission && (
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50 border border-indigo-100 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="text-indigo-600 mt-1" size={20} />
              <div>
                <p className="text-xs tracking-widest font-bold text-indigo-500">AI MENTOR</p>
                <p className="text-sm text-gray-700">{currentLesson.content?.mentorTip || 'ลองมองมุมนี้ดูไหมครับ? เริ่มจากข้อมูลจริงในบริบทของคุณก่อนเสมอ'}</p>
              </div>
            </div>
            <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${Math.min(100, ((activeLessonIndex + 1) / currentModule.lessons.length) * 100)}%` }} />
            </div>
          </div>
        )}

        {currentLesson.activityType === 'insight_9_dimensions' && (
          <div className="grid md:grid-cols-2 gap-4">
            {(currentLesson.content?.dimensions || []).map((dimension) => (
              <div key={dimension.key} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="font-bold text-gray-800 mb-2">{dimension.label}</p>
                <p className="text-sm text-gray-500 mb-3">{dimension.question}</p>
                <textarea
                  value={moduleOneState.dimensions[dimension.key] || ''}
                  onChange={(e) => setModuleOneState(prev => ({ ...prev, dimensions: { ...prev.dimensions, [dimension.key]: e.target.value } }))}
                  className="w-full border rounded-lg p-2 text-sm mb-2"
                  rows={3}
                  placeholder="บันทึกคำตอบของคุณ"
                />
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={moduleOneState.ratings[dimension.key] || ''}
                  onChange={(e) => setModuleOneState(prev => ({ ...prev, ratings: { ...prev.ratings, [dimension.key]: Number(e.target.value) } }))}
                  className="w-full border rounded-lg p-2 text-sm"
                  placeholder="Pain Point Rating 1-5"
                />
              </div>
            ))}
          </div>
        )}

        {currentLesson.activityType === 'insight_swot' && (
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4">
              <p className="font-semibold mb-3">Interactive SWOT Visualizer</p>
              <div className="flex gap-2">
                <input value={missionDraft} onChange={(e) => setMissionDraft(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm" placeholder="พิมพ์ประเด็นจาก Mission 1 หรือพิมพ์เพิ่ม" />
                <button onClick={() => addMissionTextToSWOT('strengths')} className="px-3 py-2 bg-green-100 rounded-lg text-xs font-bold">+S</button>
                <button onClick={() => addMissionTextToSWOT('weaknesses')} className="px-3 py-2 bg-red-100 rounded-lg text-xs font-bold">+W</button>
                <button onClick={() => addMissionTextToSWOT('opportunities')} className="px-3 py-2 bg-blue-100 rounded-lg text-xs font-bold">+O</button>
                <button onClick={() => addMissionTextToSWOT('threats')} className="px-3 py-2 bg-amber-100 rounded-lg text-xs font-bold">+T</button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {['strengths', 'weaknesses', 'opportunities', 'threats'].map((k) => (
                <div key={k} className="bg-white border rounded-xl p-4">
                  <p className="font-bold uppercase text-sm mb-2">{k}</p>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {(moduleOneState.swot[k] || []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentLesson.activityType === 'insight_tows' && (
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="font-semibold">Strategy Fusion (TOWS Matrix): ต้องมีอย่างน้อย 3 กลยุทธ์</p>
            <div className="flex gap-2">
              <input value={missionDraft} onChange={(e) => setMissionDraft(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm" placeholder="ตัวอย่าง: SO - ใช้จุดแข็งการเล่าเรื่องของครู + ห้องสมุดชุมชน = นิทานสัญจร" />
              <button onClick={addStrategy} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">เพิ่มกลยุทธ์</button>
            </div>
            <ol className="list-decimal pl-6 text-sm text-gray-700 space-y-1">
              {moduleOneState.strategies.map((s, i) => <li key={`${s}-${i}`}>{s}</li>)}
            </ol>
          </div>
        )}

        {currentLesson.activityType === 'insight_needs_detective' && (
          <div className="bg-white border rounded-xl p-4 space-y-4">
            <p className="font-semibold">Needs Detective: ให้คะแนนกลยุทธ์และเลือก 1 กลยุทธ์หลัก</p>
            {moduleOneState.strategies.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีกลยุทธ์จาก Mission 3</p>
            ) : moduleOneState.strategies.map((strategy, index) => (
              <div key={`${strategy}-${index}`} className="border rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="radio" checked={moduleOneState.selectedStrategy === strategy} onChange={() => setModuleOneState(prev => ({ ...prev, selectedStrategy: strategy }))} />
                  {strategy}
                </label>
                <input type="number" min={1} max={5} className="mt-2 border rounded p-2 text-sm w-28" placeholder="คะแนน 1-5" value={moduleOneState.strategyScores[strategy] || ''} onChange={(e) => setModuleOneState(prev => ({ ...prev, strategyScores: { ...prev.strategyScores, [strategy]: Number(e.target.value) } }))} />
              </div>
            ))}
          </div>
        )}

        {currentLesson.activityType === 'insight_action_plan' && (
          <div className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-4">
            {['plan', 'do', 'check', 'act'].map((step) => (
              <div key={step}>
                <p className="font-semibold uppercase text-sm mb-2">{step}</p>
                <textarea rows={4} className="w-full border rounded-lg p-2 text-sm" value={moduleOneState.actionPlan[step] || ''} onChange={(e) => setModuleOneState(prev => ({ ...prev, actionPlan: { ...prev.actionPlan, [step]: e.target.value } }))} placeholder={`ระบุรายละเอียด ${step}`} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          {!completed ? (
            <button onClick={isInsightMission ? completeMission : markLessonComplete} className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
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
  };

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
            {currentLesson.content?.imageUrl && (
              <img src={currentLesson.content.imageUrl} alt={currentLesson.title} className="rounded-xl border border-gray-200 my-4" />
            )}
            {/* กรณีเป็นแบบสอบถาม (Mockup) */}
            {currentLesson.id === 'final-survey' && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center mt-4">
                    <p className="mb-4">กรุณาทำแบบประเมินความพึงพอใจเพื่อพัฒนาหลักสูตรต่อไป</p>
                    <a href={currentLesson.content?.surveyUrl || '#'} target="_blank" rel="noreferrer" className="inline-block px-6 py-2 bg-white border border-primary text-primary rounded-lg font-bold hover:bg-blue-50 transition">
                        เปิดแบบสอบถาม (Google Form)
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
    if (currentLesson.content?.isModule1ReportCard) {
      const moduleOnePosttestPassed = progressData.completedLessons.includes('m1-posttest');
      const insightId = `INS-${new Date().getFullYear()}-${String((currentUser?.uid || '0000').slice(-4)).toUpperCase()}`;

      const downloadReportCard = () => {
        const reportSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <rect width="1200" height="800" fill="#eef2ff" />
  <rect x="40" y="40" width="1120" height="720" rx="28" fill="#ffffff" stroke="#c7d2fe" stroke-width="4" />
  <text x="80" y="130" font-size="46" font-family="Arial" font-weight="700" fill="#312e81">In-Sight Report Card</text>
  <text x="80" y="180" font-size="24" font-family="Arial" fill="#4338ca">Badge: ${currentLesson.content?.badgeName || 'In-Sight Badge'}</text>
  <text x="80" y="220" font-size="20" font-family="Arial" fill="#334155">ID: ${insightId}</text>
  <text x="80" y="280" font-size="22" font-family="Arial" fill="#0f172a">Selected Strategy:</text>
  <text x="80" y="320" font-size="20" font-family="Arial" fill="#1e293b">${(moduleOneState.selectedStrategy || '-').replace(/&/g, 'and')}</text>
  <text x="80" y="380" font-size="22" font-family="Arial" fill="#0f172a">PDCA Highlights</text>
  <text x="80" y="420" font-size="18" font-family="Arial" fill="#1e293b">Plan: ${(moduleOneState.actionPlan.plan || '-').replace(/&/g, 'and')}</text>
  <text x="80" y="450" font-size="18" font-family="Arial" fill="#1e293b">Do: ${(moduleOneState.actionPlan.do || '-').replace(/&/g, 'and')}</text>
  <text x="80" y="480" font-size="18" font-family="Arial" fill="#1e293b">Check: ${(moduleOneState.actionPlan.check || '-').replace(/&/g, 'and')}</text>
  <text x="80" y="510" font-size="18" font-family="Arial" fill="#1e293b">Act: ${(moduleOneState.actionPlan.act || '-').replace(/&/g, 'and')}</text>
  <text x="80" y="590" font-size="22" font-family="Arial" fill="#0f172a">Module 1 Post-test Score: ${moduleOneState.posttestScore ?? '-'}/5</text>
  <text x="80" y="670" font-size="20" font-family="Arial" fill="#b45309">Unlocked: Module 2</text>
</svg>`;
        const blob = new Blob([reportSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `insight-report-card-${insightId}.svg`;
        link.click();
        URL.revokeObjectURL(url);
      };

      if (!moduleOnePosttestPassed) {
        return (
          <div className="animate-fade-in-up text-center py-20">
            <Lock size={64} className="mx-auto text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">ยังไม่ปลดล็อก In-Sight Badge</h2>
            <p className="text-gray-500">กรุณาผ่าน Post-test [Module 1] (อย่างน้อย 3/5 คะแนน) ก่อนครับ</p>
          </div>
        );
      }

      return (
        <div className="animate-fade-in-up text-center py-12">
          <Award size={80} className="mx-auto text-amber-500 mb-6" />
          <h2 className="text-3xl font-black text-gray-900 mb-3">รับรางวัล {currentLesson.content?.badgeName}</h2>
          <p className="text-gray-600 mb-2">Report Card ID: <span className="font-bold">{insightId}</span></p>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">ระบบสรุปคำตอบจาก Missions ทั้งหมดและคะแนน Post-test ของ Module 1 เรียบร้อยแล้ว คุณสามารถดาวน์โหลดเป็นไฟล์ภาพได้ทันที และ Module 2 ถูกปลดล็อกแล้ว</p>
          <div className="flex justify-center gap-3">
            {!progressData.completedLessons.includes(currentLesson.id) && (
              <button onClick={markLessonComplete} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700 transition flex items-center gap-2">
                <CheckCircle size={18} /> ยืนยันรับ Badge
              </button>
            )}
            <button onClick={downloadReportCard} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow hover:shadow-lg transition flex items-center gap-2">
              <FileText size={18} /> ดาวน์โหลด Report Card (SVG)
            </button>
          </div>
        </div>
      );
    }

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
            {Array.isArray(currentLesson.content?.requirements) && (
                <ul className="text-left bg-yellow-50 border border-yellow-100 rounded-xl p-4 max-w-xl mx-auto mb-8 space-y-2">
                    {currentLesson.content.requirements.map((requirement) => (
                        <li key={requirement} className="text-sm text-yellow-900 flex items-start gap-2">
                            <CheckCircle size={16} className="mt-0.5 text-yellow-600" />
                            <span>{requirement}</span>
                        </li>
                    ))}
                </ul>
            )}
            <button className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition flex items-center gap-2 mx-auto">
                <FileText size={24} /> ดาวน์โหลดเกียรติบัตร (PDF)
            </button>
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
