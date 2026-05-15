import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trophy, 
  ThumbsUp, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  LogOut,
  Sparkles,
  Loader2
} from 'lucide-react';
import { auth, db, signIn, signOut, handleFirestoreError } from './lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { Task, OperationType } from './types';
import { generateChallengeName } from './services/geminiService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingName, setGeneratingName] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Form stats
  const [formData, setFormData] = useState({
    problem: '',
    goal: '',
    solution: '',
    requirements: '',
    challengeName: ''
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setAuthError(null);
      } else {
        // Sign in anonymously if not logged in
        try {
          await signInAnonymously(auth);
        } catch (error: any) {
          console.error("Anonymous sign-in error:", error);
          if (error.code === 'auth/admin-restricted-operation') {
            setAuthError("Firebase 콘솔에서 '익명 로그인'을 활성화해주세요.");
          }
        }
      }
    });

    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(taskList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => {
      unsubAuth();
      unsubTasks();
    };
  }, []);

  // Debounce for automatic name generation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.problem && formData.goal && formData.solution && !formData.challengeName && !generatingName) {
        handleGenerateName();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData.problem, formData.goal, formData.solution]);

  const handleGenerateName = async () => {
    if (!formData.problem || !formData.goal || !formData.solution) return;
    setGeneratingName(true);
    const name = await generateChallengeName(formData.problem, formData.goal, formData.solution);
    setFormData(prev => ({ ...prev, challengeName: name }));
    setGeneratingName(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id!);
    setFormData({
      problem: task.problem,
      goal: task.goal,
      solution: task.solution,
      requirements: task.requirements,
      challengeName: task.challengeName
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setFormData({ problem: '', goal: '', solution: '', requirements: '', challengeName: '' });
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("로그인이 중단되었습니다.");
      } else {
        console.error("Sign in error:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.challengeName) {
      await handleGenerateName();
    }

    setSubmitting(true);
    try {
      if (editingTaskId) {
        // Update existing task
        const taskRef = doc(db, 'tasks', editingTaskId);
        await updateDoc(taskRef, {
          ...formData,
          createdAt: serverTimestamp() // Refresh timestamp for rule validation if needed or keep existing?
          // Rules check data.createdAt == request.time explicitly for ALL updates in isValidTask.
          // This ensures validation passes.
        });
        setEditingTaskId(null);
      } else {
        // Create new task
        await addDoc(collection(db, 'tasks'), {
          ...formData,
          likes: 0,
          authorId: user.uid,
          authorName: user.isAnonymous ? '익명 사용자' : (user.displayName || '익명'),
          createdAt: serverTimestamp()
        });
      }
      setFormData({ problem: '', goal: '', solution: '', requirements: '', challengeName: '' });
    } catch (error) {
      handleFirestoreError(error, editingTaskId ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (taskId: string) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        likes: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const topTasks = [...tasks].sort((a, b) => b.likes - a.likes).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-3 md:p-6 lg:overflow-hidden lg:max-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight text-indigo-900">
            DX TASK<span className="text-indigo-500 underline decoration-indigo-200 decoration-4 underline-offset-4">HUB</span>
          </h1>
        </div>
        
          <div className="flex items-center gap-6">
            {authError && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg text-[10px] font-bold text-amber-600 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                {authError}
              </div>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                {user?.isAnonymous ? "Guest Session" : "Global Challenges"}
              </p>
              <p className="text-lg font-bold text-slate-800 tabular-nums">
                {user?.isAnonymous ? "Active" : tasks.length}
              </p>
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            
            {user && !user.isAnonymous ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase text-slate-400">Authenticated</p>
                <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
              </div>
              <button 
                onClick={signOut}
                className="bg-indigo-50 text-indigo-600 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 text-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5 flex-1 overflow-hidden min-h-0">
        {/* Left Column: Form */}
        <section className="col-span-12 lg:col-span-5 bg-white p-6 rounded-[2rem] border-2 border-slate-200 flex flex-col gap-4 overflow-hidden shadow-sm lg:min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
              <h2 className="text-lg font-bold font-display uppercase tracking-tight">
                {editingTaskId ? "과제 수정하기" : "과제 제안서 작성"}
              </h2>
            </div>
            {editingTaskId && (
              <button 
                onClick={handleCancelEdit}
                className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest"
              >
                취소
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. 현상 포착 및 문제 정의 (AS-IS)</label>
                <textarea 
                  required
                  placeholder="업무 중 어떤 개선이 필요한가요?"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:border-indigo-500 outline-none h-28 resize-none transition-all placeholder:text-slate-300"
                  value={formData.problem}
                  onChange={(e) => setFormData(prev => ({ ...prev, problem: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. 목표 설정 (TO-BE)</label>
                <textarea 
                  required
                  placeholder="이상적인 상태는 어떤가요?"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:border-indigo-500 outline-none h-28 resize-none transition-all placeholder:text-slate-300"
                  value={formData.goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. DX 해결책 탐색</label>
                <textarea 
                  required
                  placeholder="DX로 어떻게 해결할까요?"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:border-indigo-500 outline-none h-28 resize-none transition-all placeholder:text-slate-300"
                  value={formData.solution}
                  onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. 필요 자원 (데이터, 도구 등)</label>
                <input 
                  required
                  type="text"
                  placeholder="AI 툴, 데이터셋, 학습 등"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  value={formData.requirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <AnimatePresence>
                {(formData.problem && formData.goal && formData.solution) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">AI 추천 과제명</p>
                        <p className="text-xs font-bold text-indigo-900 truncate">
                          {generatingName ? "도출 중..." : (formData.challengeName || "생성 버튼을 눌러주세요")}
                        </p>
                      </div>
                      {!formData.challengeName && !generatingName && (
                        <button 
                          type="button"
                          onClick={handleGenerateName}
                          className="px-2 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] whitespace-nowrap hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          Generate
                        </button>
                      )}
                      {generatingName && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit"
                disabled={submitting || !user}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 ${
                  submitting || !user 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'
                }`}
              >
                {submitting ? <Loader2 className="animate-spin mx-auto" /> : (editingTaskId ? "수정 완료" : "과제 등록하기")}
              </button>
            </div>
          </form>
        </section>

        {/* Middle Column: Feed */}
        <section className="col-span-12 lg:col-span-4 bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-indigo-100/50 flex flex-col gap-5 overflow-hidden lg:min-h-0">
          <div className="flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-indigo-400 rounded-full"></div>
              <h2 className="text-lg font-bold font-display text-indigo-900">최근 등록된 DX 과제</h2>
            </div>
            <span className="text-[10px] font-bold bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">Feed</span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide pb-10">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-indigo-200">
                <p className="text-indigo-400 text-sm font-bold uppercase italic">No tasks found</p>
              </div>
            ) : (
              tasks.map((task) => (
                <motion.div 
                  layout
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-5 rounded-3xl border-2 border-indigo-100 shadow-sm hover:translate-y-[-4px] transition-all hover:shadow-xl hover:shadow-indigo-500/10 group cursor-default"
                >
                  <p className="text-[9px] font-bold text-indigo-300 mb-2 uppercase tracking-[0.2em]">
                    {task.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {task.createdAt.toDate().toLocaleDateString()}
                  </p>
                  <h3 className="font-extrabold text-slate-900 mb-4 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                    {task.challengeName}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">AS-IS</p>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">{task.problem}</p>
                    </div>
                    <div className="bg-indigo-50/30 p-3 rounded-2xl border border-indigo-100/50">
                      <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">TO-BE</p>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">{task.goal}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                         작성자: {task.authorName}
                      </span>
                      {user?.uid === task.authorId && (
                        <button 
                          onClick={() => handleEditTask(task)}
                          className="text-[10px] font-bold text-indigo-500 hover:underline"
                        >
                          수정
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => handleLike(task.id!)}
                      className="flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-full border border-pink-100 text-pink-500 font-black text-xs hover:bg-pink-500 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      <span className="text-lg leading-none mt-0.5">❤</span> {task.likes}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Rankings */}
        <section className="col-span-12 lg:col-span-3 bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col shadow-2xl relative overflow-hidden lg:min-h-0">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
             <Trophy className="w-32 h-32 rotate-12" />
          </div>
          
          <h2 className="text-lg font-black font-display mb-8 flex items-center gap-2 relative">
            <span className="text-yellow-400 text-xl">★</span> TOP 3 RANKING
          </h2>
          
          <div className="space-y-8 flex-1 relative scrollbar-hide overflow-y-auto">
            {topTasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic uppercase font-bold tracking-widest text-center py-10">Ranking Pending...</p>
            ) : (
              topTasks.map((task, idx) => (
                <div key={task.id} className="flex gap-5 group">
                  <div className={`text-4xl font-black italic tabular-nums transition-opacity duration-500 ${
                    idx === 0 ? 'text-indigo-400 opacity-100' : 
                    idx === 1 ? 'text-indigo-400 opacity-70' : 
                    'text-indigo-400 opacity-40'
                  }`}>
                    0{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-sm leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
                      {task.challengeName}
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-1 rounded-md font-bold truncate max-w-[80px]">
                        {task.authorName}
                      </span>
                      <span className="text-pink-400 font-black text-xs flex items-center gap-1">
                        <span className="text-sm">❤</span> {task.likes}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-8 p-5 bg-slate-800/80 rounded-3xl border border-slate-700/50 backdrop-blur-sm relative overflow-hidden">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <p className="text-[10px] text-indigo-400 text-center uppercase tracking-[0.3em] font-black">Live Updates</p>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">
              Real-time collaboration across the organization through Digital Transformation.
            </p>
          </div>
        </section>
      </div>
    </div>
  );

}
