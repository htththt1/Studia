import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, FileText, BrainCircuit, BarChart2, Sparkles, Zap, 
  BookOpen, BookOpenCheck, User, CheckCircle, Brain, 
  ArrowRight, ArrowLeft, CheckSquare, Trophy, X, Bot
} from 'lucide-react';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function App() {
  // --- State Management ---
  const [currentScreen, setCurrentScreen] = useState('landing'); 
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // [New] 실제 문제 데이터를 저장할 State
  const [quizData, setQuizData] = useState([]);
  const [pdfSummary, setPdfSummary] = useState(""); 

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); 
  
  // 결과 및 점수 관련
  const [finalScore, setFinalScore] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [resultTab, setResultTab] = useState('analysis'); 
  const [selectedExplanationId, setSelectedExplanationId] = useState(0); 

  const fileInputRef = useRef(null);

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileProcess(e.dataTransfer.files[0]);
  };

  // --- File Processing (Landing -> Dashboard) ---
  const handleFileProcess = (uploadedFile) => {
    if (uploadedFile.type !== 'application/pdf') return alert('PDF 파일만 업로드 가능합니다.');
    
    setFile(uploadedFile);
    setCurrentScreen('dashboard');
  };

  // --- [핵심] API 호출 및 문제 생성 (Dashboard -> Quiz) ---
  const handleGenerate = async () => {
    if (!file) return;

    setCurrentScreen('loading');

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 백엔드 API 호출
      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ 생성된 문제 데이터:", data);

      if (data.questions && data.questions.length > 0) {
        setQuizData(data.questions);
        setPdfSummary(data.text_summary);
        
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setCurrentScreen('quiz');
      } else {
        throw new Error("문제가 생성되지 않았습니다.");
      }

    } catch (error) {
      console.error("❌ 문제 생성 실패:", error);
      alert("문제를 생성하는 중 오류가 발생했습니다.\n백엔드 서버 상태를 확인해주세요.");
      setCurrentScreen('dashboard');
    }
  };

  // --- Quiz Interaction Logic ---
  const handleAnswerChange = (value) => {
    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: value }));
  };

  // --- Scoring Logic (채점) ---
  const handleSubmit = () => {
    let rawScore = 0;
    
    quizData.forEach((q, index) => {
      const uAns = userAnswers[index];
      if (q.type === 'choice') {
        if (parseInt(uAns) === q.answer) rawScore += 1;
      } else if (q.type === 'short') {
        if (uAns && q.answer && uAns.replace(/\s/g, '') === q.answer.replace(/\s/g, '')) rawScore += 1;
      } else if (q.type === 'essay') {
        if (uAns && uAns.length >= 10) rawScore += 1;
      }
    });

    const calculatedScore = Math.round((rawScore / quizData.length) * 100);
    setFinalScore(calculatedScore);
    setShowScoreModal(true);
  };

  const handleCloseModal = () => {
    setShowScoreModal(false);
    setCurrentScreen('result');
  };

  // --- Chart Configuration ---
  const chartData = {
    labels: ['이해도', '응용력', '핵심개념', '분석력', '논리력'],
    datasets: [
      {
        label: '나의 학습 분석',
        data: [finalScore, Math.max(0, finalScore - 10), Math.min(100, finalScore + 5), 80, 70], 
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, display: false }
      }
    },
    plugins: { legend: { display: false } }
  };

  return (
    <div className="bg-gray-50 text-gray-800 h-screen overflow-hidden flex flex-col font-sans">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="bg-blue-600 text-white p-1.5 rounded-lg"><BookOpenCheck className="w-6 h-6" /></div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Studia</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Beta</span>
            <span>v1.0</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300"><User className="w-5 h-5 text-gray-500" /></div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto relative w-full max-w-7xl mx-auto p-6">
        
        {/* 1. Landing Screen */}
        {currentScreen === 'landing' && (
          <section className="flex flex-col items-center justify-center h-full fade-in animate-in zoom-in duration-300">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">나만의 AI 학습 튜터, <span className="text-blue-600">Studia</span></h1>
              <p className="text-lg text-gray-600">전공 서적, 강의 노트를 업로드하고<br />AI가 만들어주는 맞춤형 문제로 완벽하게 대비하세요.</p>
            </div>
            <div
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50'}`}
            >
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><UploadCloud className="w-10 h-10 text-blue-600" /></div>
              <h3 className="text-xl font-semibold mb-2">PDF 파일 드래그 앤 드롭</h3>
              <p className="text-gray-500 mb-6">또는 클릭하여 파일 선택 (최대 50MB)</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium pointer-events-none">파일 선택하기</button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}/>
            </div>
          </section>
        )}

        {/* 2. Dashboard Screen */}
        {currentScreen === 'dashboard' && file && (
          <section className="h-full fade-in animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded text-red-600"><FileText className="w-5 h-5" /></div>
                    <div><h3 className="font-bold text-gray-900 text-sm truncate max-w-[150px]">{file.name}</h3><p className="text-xs text-gray-500">{formatBytes(file.size)}</p></div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="p-5 flex-1 overflow-y-auto">
                  <h4 className="font-bold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> AI 분석 대기 중</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    파일이 준비되었습니다. 오른쪽의 <strong>'맞춤형 문제 생성하기'</strong> 버튼을 눌러 AI 분석을 시작하세요.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                    💡 <strong>Studia AI</strong>가 문서의 핵심 내용을 요약하고, 이해도를 점검할 수 있는 문제를 자동으로 생성합니다.
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white flex flex-col justify-center items-start relative overflow-hidden h-64">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">학습 준비 완료!</h2>
                    <p className="text-blue-100 mb-6">AI가 <strong>{file.name}</strong> 문서를 분석할 준비를 마쳤습니다.</p>
                    <button onClick={handleGenerate} className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-md active:scale-95 transform duration-150"><Zap className="w-5 h-5" /> 맞춤형 문제 생성하기</button>
                  </div>
                  <BookOpen className="absolute right-10 bottom-[-20px] w-48 h-48 text-white opacity-10 rotate-12" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. Loading Screen (API Waiting) */}
        {currentScreen === 'loading' && (
          <section className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-95 z-20 fade-in">
            <div className="w-full max-w-md text-center p-8">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                <Brain className="absolute inset-0 m-auto w-10 h-10 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI가 문서를 분석 중입니다...</h2>
              <p className="text-gray-500 mb-6">텍스트 추출, 요약, 그리고 맞춤형 문제를 생성하고 있습니다.<br/>(문서 양에 따라 최대 30초 정도 소요될 수 있습니다)</p>
            </div>
          </section>
        )}

        {/* 4. Quiz Screen (Real Data) */}
        {currentScreen === 'quiz' && quizData.length > 0 && (
          <section className="h-full flex flex-col bg-gray-50 fade-in">
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
              <div><span className="text-xs font-bold text-blue-600">AI Generated Quiz</span><h2 className="text-lg font-bold text-gray-900">맞춤형 학습 점검</h2></div>
              <div className="font-mono font-bold text-blue-600">{currentQuestionIndex + 1} / {quizData.length}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
              <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col justify-between min-h-[500px]">
                <div>
                  <div className="mb-6">
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      quizData[currentQuestionIndex].type === 'choice' ? 'bg-blue-100 text-blue-800' : 
                      quizData[currentQuestionIndex].type === 'short' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {quizData[currentQuestionIndex].type === 'choice' ? '객관식' : 
                       quizData[currentQuestionIndex].type === 'short' ? '주관식' : '서술형'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-8">Q{quizData[currentQuestionIndex].id}. {quizData[currentQuestionIndex].question}</h3>
                  <div className="space-y-4">
                    {/* 객관식 렌더링 */}
                    {quizData[currentQuestionIndex].type === 'choice' && quizData[currentQuestionIndex].options ? (
                      quizData[currentQuestionIndex].options.map((opt, idx) => (
                        <label key={idx} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${parseInt(userAnswers[currentQuestionIndex]) === idx ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="ans" className="hidden" checked={parseInt(userAnswers[currentQuestionIndex]) === idx} onChange={() => handleAnswerChange(idx)} />
                          <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${parseInt(userAnswers[currentQuestionIndex]) === idx ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}`}>
                            {parseInt(userAnswers[currentQuestionIndex]) === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className={parseInt(userAnswers[currentQuestionIndex]) === idx ? 'text-blue-900 font-medium' : 'text-gray-700'}>{opt}</span>
                        </label>
                      ))
                    ) : (
                      /* 주관식/서술형 렌더링 */
                      <textarea 
                        className="w-full p-4 border border-gray-300 rounded-xl h-32 outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                        placeholder={quizData[currentQuestionIndex].type === 'short' ? "정답 단어를 입력하세요." : "서술형 답안을 작성하세요."}
                        value={userAnswers[currentQuestionIndex] || ''} 
                        onChange={(e) => handleAnswerChange(e.target.value)} 
                      />
                    )}
                  </div>
                </div>
                <div className="mt-10 flex justify-between pt-6 border-t border-gray-100">
                  <button onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0} className="text-gray-500 hover:text-gray-800 flex items-center gap-2 disabled:opacity-50"><ArrowLeft className="w-4 h-4" /> 이전</button>
                  {currentQuestionIndex === quizData.length - 1 ? (
                    <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2">제출하기 <CheckSquare className="w-4 h-4" /></button>
                  ) : (
                    <button onClick={() => setCurrentQuestionIndex(p => Math.min(quizData.length - 1, p + 1))} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2">다음 문제 <ArrowRight className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. Result Screen (Real Data) */}
        {currentScreen === 'result' && (
          <section className="h-full flex flex-col bg-gray-50 fade-in">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full"><Trophy className="w-6 h-6 text-blue-600" /></div>
                <div><div className="text-sm text-gray-500">최종 점수</div><div className="text-2xl font-bold text-gray-900"><span className="text-blue-600">{finalScore}</span> / 100</div></div>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {['analysis', 'scorecard', 'retry'].map(tab => (
                  <button key={tab} onClick={() => setResultTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${resultTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab === 'analysis' ? '종합분석' : tab === 'scorecard' ? '채점표/해설' : '오답노트'}
                  </button>
                ))}
              </div>
              <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"><X className="w-4 h-4" /> 닫기</button>
            </div>
            <div className="flex-1 overflow-hidden relative p-6">
              {resultTab === 'analysis' && (
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500" /> AI 핵심 요약 리포트</h3>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-gray-700 leading-relaxed mb-4">
                      <h4 className="font-bold text-blue-900 mb-2">📄 문서 요약</h4>
                      {pdfSummary || "요약 내용이 없습니다."}
                    </div>
                    
                    <h4 className="font-bold text-gray-900 mb-2 mt-6 flex items-center gap-2"><Bot className="w-4 h-4 text-purple-500" /> 학습 피드백</h4>
                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg text-gray-700 leading-relaxed">
                      {finalScore >= 80 
                        ? "전반적으로 문서의 핵심 개념을 잘 이해하고 있습니다. AI 요약문과 비교하여 놓친 부분이 없는지 한 번 더 확인해보세요." 
                        : "핵심 내용에 대한 이해가 다소 부족해 보입니다. 위 AI 요약문을 다시 정독하고 오답 노트를 통해 개념을 다잡아보세요."}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-center items-center">
                    <div className="w-full max-w-md"><Radar data={chartData} options={chartOptions} /></div>
                  </div>
                </div>
              )}
              
              {/* Scorecard Tab (Dynamic Data) */}
              {resultTab === 'scorecard' && quizData[selectedExplanationId] && (
                <div className="flex flex-col md:flex-row h-full gap-6">
                  <div className="w-full md:w-3/5 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800">문제 해설</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{quizData[selectedExplanationId].pdfRef || "참조 위치 없음"}</span>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Q{quizData[selectedExplanationId].id}. {quizData[selectedExplanationId].question}</h2>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                        <h4 className="font-bold text-blue-900 mb-2">정답 및 해설</h4>
                        <p className="text-blue-800 text-sm mb-2">
                          <strong>정답: </strong> 
                          {quizData[selectedExplanationId].type === 'choice' 
                            ? quizData[selectedExplanationId].options[quizData[selectedExplanationId].answer] 
                            : quizData[selectedExplanationId].answer}
                        </p>
                        <p className="text-blue-700 text-sm">{quizData[selectedExplanationId].explanation}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-2/5 bg-white border border-gray-200 rounded-xl shadow-sm overflow-y-auto p-4 space-y-2">
                    {quizData.map((q, idx) => {
                      const uAns = userAnswers[idx];
                      let isCorrect = false;
                      if (q.type === 'choice') isCorrect = parseInt(uAns) === q.answer;
                      else if (q.type === 'short') isCorrect = uAns && q.answer && uAns.replace(/\s/g, '') === q.answer.replace(/\s/g, '');
                      else if (q.type === 'essay') isCorrect = uAns && uAns.length >= 10;

                      return (
                        <div key={q.id} onClick={() => setSelectedExplanationId(idx)} className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between hover:shadow-md transition-all ${selectedExplanationId === idx ? 'ring-2 ring-blue-500' : ''} ${isCorrect ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>{idx + 1}</span><span className="text-sm font-medium text-gray-700 truncate w-32">Q. {q.question}</span></div>
                          <span className={`text-xs font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>{isCorrect ? '정답' : '오답'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Retry Tab */}
              {resultTab === 'retry' && (
                <div className="max-w-3xl mx-auto h-full overflow-y-auto">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <h3 className="font-bold text-gray-800 mb-2">오답 다시 풀기</h3>
                    <p className="text-sm text-gray-500">틀린 문제만 모아 다시 도전해보세요.</p>
                  </div>
                  <div className="space-y-6">
                    {quizData.map((q, idx) => {
                       const uAns = userAnswers[idx];
                       let isCorrect = false;
                       if (q.type === 'choice') isCorrect = parseInt(uAns) === q.answer;
                       else if (q.type === 'short') isCorrect = uAns && q.answer && uAns.replace(/\s/g, '') === q.answer.replace(/\s/g, '');
                       else if (q.type === 'essay') isCorrect = uAns && uAns.length >= 10;

                       if (isCorrect) return null;
                       return (
                        <div key={q.id} className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
                          <div className="flex items-center gap-2 mb-4"><span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">오답</span><span className="text-gray-500 text-xs">참조: {q.pdfRef}</span></div>
                          <h4 className="font-bold text-gray-900 mb-4">Q{idx + 1}. {q.question}</h4>
                          {q.type === 'choice' ? (
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="p-3 border rounded-lg text-sm text-gray-600">{opt}</div>
                              ))}
                            </div>
                          ) : (
                            <input type="text" className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50" placeholder="다시 풀어보기..." />
                          )}
                        </div>
                       );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {showScoreModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center transform scale-100 transition-transform">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl ${finalScore >= 80 ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                {finalScore >= 100 ? '🏆' : finalScore >= 90 ? '🎉' : finalScore >= 80 ? '👍' : finalScore >= 70 ? '💪' : '📚'}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {finalScore >= 100 ? "완벽합니다! 축하합니다!" 
                 : finalScore >= 90 ? "축하합니다!" 
                 : finalScore >= 80 ? "잘했어요!" 
                 : finalScore >= 70 ? "고생했어요." 
                 : "학습이 더 필요해 보입니다."}
              </h3>
              
              <p className="text-gray-600 mb-6 whitespace-pre-line">
                {finalScore >= 100 ? "완벽한 이해도입니다! 정말 대단해요."
                 : finalScore >= 90 ? "조금만 더 노력하면 100점도 가능해요!" 
                 : finalScore >= 80 ? "아쉬운 부분을 조금만 더 채워봅시다." 
                 : finalScore >= 70 ? "부족한 부분을 확인하고 다시 도전해봐요." 
                 : "오답 노트를 통해 복습해보세요."}
              </p>

              <div className="text-5xl font-bold text-blue-600 mb-8">{finalScore}<span className="text-xl text-gray-400 ml-1">점</span></div>
              <button onClick={handleCloseModal} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg">
                결과 상세 확인하기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}