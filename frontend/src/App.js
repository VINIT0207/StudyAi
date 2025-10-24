import React, { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { 
  BookOpen, Brain, Calendar, TrendingUp, MessageSquare, 
  FileText, Timer, Award, Plus, X, Download, Upload, 
  Play, Pause, Check, ChevronRight, Sparkles, Target,
  Clock, Trophy, Flame, Star
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notes, setNotes] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  
  // Form states
  const [noteForm, setNoteForm] = useState({ title: '', content: '', subject: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', date: '', duration: 30 });
  const [chatMessage, setChatMessage] = useState('');
  const [currentSessionId] = useState(`session-${Date.now()}`);
  
  // Quiz state
  const [quizTopic, setQuizTopic] = useState('');
  const [quizDifficulty, setQuizDifficulty] = useState('medium');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  
  // Focus mode (Pomodoro)
  const [focusTime, setFocusTime] = useState(25 * 60); // 25 minutes
  const [focusActive, setFocusActive] = useState(false);
  const [focusSubject, setFocusSubject] = useState('');
  
  // Flashcard review
  const [reviewMode, setReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  useEffect(() => {
    let interval;
    if (focusActive && focusTime > 0) {
      interval = setInterval(() => {
        setFocusTime(prev => {
          if (prev <= 1) {
            setFocusActive(false);
            completeFocusSession();
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusActive, focusTime]);
  
  const fetchData = async () => {
    try {
      const [notesRes, flashcardsRes, tasksRes, sessionsRes, progressRes] = await Promise.all([
        axios.get(`${API}/notes`),
        axios.get(`${API}/flashcards`),
        axios.get(`${API}/tasks`),
        axios.get(`${API}/sessions`),
        axios.get(`${API}/progress`)
      ]);
      
      setNotes(notesRes.data);
      setFlashcards(flashcardsRes.data);
      setTasks(tasksRes.data);
      setStudySessions(sessionsRes.data);
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  const createNote = async () => {
    if (!noteForm.title || !noteForm.content) return;
    
    try {
      setLoading(true);
      await axios.post(`${API}/notes`, noteForm);
      setNoteForm({ title: '', content: '', subject: '' });
      setShowNoteModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const summarizeNote = async (noteId) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API}/notes/${noteId}/summarize`);
      alert('Summary generated! Check your note for the AI summary.');
      fetchData();
    } catch (error) {
      console.error('Error summarizing:', error);
      alert('Error generating summary');
    } finally {
      setLoading(false);
    }
  };
  
  const generateFlashcardsFromNote = async (noteId) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API}/flashcards/generate`, { note_id: noteId, count: 5 });
      alert('Flashcards generated! Check the response.');
      fetchData();
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Error generating flashcards');
    } finally {
      setLoading(false);
    }
  };
  
  const exportNotePDF = async (noteId, title) => {
    try {
      const res = await axios.get(`${API}/notes/${noteId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF');
    }
  };
  
  const createTask = async () => {
    if (!taskForm.title) return;
    
    try {
      setLoading(true);
      await axios.post(`${API}/tasks`, taskForm);
      setTaskForm({ title: '', description: '', date: '', duration: 30 });
      setShowTaskModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const completeTask = async (taskId) => {
    try {
      await axios.patch(`${API}/tasks/${taskId}/complete`);
      fetchData();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };
  
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    try {
      setLoading(true);
      const res = await axios.post(`${API}/chat`, {
        session_id: currentSessionId,
        message: chatMessage
      });
      
      setChatHistory(prev => [...prev, {
        message: chatMessage,
        response: res.data.response
      }]);
      setChatMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setLoading(false);
    }
  };
  
  const completeFocusSession = async () => {
    if (!focusSubject) return;
    
    try {
      await axios.post(`${API}/sessions`, {
        subject: focusSubject,
        duration: 25,
        date: new Date().toISOString().split('T')[0],
        focus_score: 85
      });
      fetchData();
      alert('Focus session completed! +25 XP');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };
  
  const uploadAndAnalyzeFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await axios.post(`${API}/files/analyze?query=Summarize and extract key points from this document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('File Analysis:\n' + res.data.analysis);
    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('Error analyzing file. Make sure it is PDF, DOCX, or TXT.');
    } finally {
      setLoading(false);
    }
  };
  
  const startFlashcardReview = () => {
    if (flashcards.length === 0) {
      alert('No flashcards available. Create some first!');
      return;
    }
    setReviewMode(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };
  
  const reviewFlashcard = async (correct) => {
    const card = flashcards[currentCardIndex];
    try {
      await axios.patch(`${API}/flashcards/${card.id}/review?correct=${correct}`);
      
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        setReviewMode(false);
        alert('Review complete!');
        fetchData();
      }
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const Dashboard = () => (
    <div className="space-y-6" data-testid="dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Brain className="text-purple-400" size={36} />
          Study Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 rounded-lg flex items-center gap-2" data-testid="user-xp-display">
            <Trophy className="text-yellow-300" size={20} />
            <span className="text-white font-bold">{progress?.xp || 0} XP</span>
          </div>
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-3 rounded-lg flex items-center gap-2" data-testid="user-streak-display">
            <Flame className="text-yellow-300" size={20} />
            <span className="text-white font-bold">{progress?.streak_days || 0} Day Streak</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-purple-500 transition-all" data-testid="stat-card-study-hours">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Study Hours</h3>
            <Clock className="text-purple-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{progress?.total_study_hours?.toFixed(1) || 0}h</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition-all" data-testid="stat-card-notes">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Notes</h3>
            <FileText className="text-blue-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{notes.length}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-all" data-testid="stat-card-flashcards">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Flashcards</h3>
            <BookOpen className="text-green-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{flashcards.length}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-yellow-500 transition-all" data-testid="stat-card-tasks">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm">Pending Tasks</h3>
            <Target className="text-yellow-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{tasks.filter(t => !t.completed).length}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Recent Study Activity</h3>
          {studySessions.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={studySessions.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Bar dataKey="duration" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No study sessions yet. Start studying!</p>
          )}
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setShowNoteModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-all"
              data-testid="quick-action-new-note"
            >
              <Plus size={18} />
              New Note
            </button>
            <button 
              onClick={() => setShowTaskModal(true)}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-all"
              data-testid="quick-action-add-task"
            >
              <Plus size={18} />
              Add Task
            </button>
            <button 
              onClick={startFlashcardReview}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-all"
              data-testid="quick-action-review-flashcards"
            >
              <Brain size={18} />
              Review Cards
            </button>
            <button 
              onClick={() => setShowFocusMode(true)}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-all"
              data-testid="quick-action-focus-mode"
            >
              <Timer size={18} />
              Focus Mode
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Award className="text-yellow-400" />
          Achievements & Badges
        </h3>
        <div className="flex gap-4 flex-wrap">
          {progress?.badges && progress.badges.length > 0 ? (
            progress.badges.map((badge, i) => (
              <div key={i} className="bg-gray-700 px-4 py-2 rounded-full text-sm text-gray-300 flex items-center gap-2">
                <Star className="text-yellow-400" size={16} />
                {badge}
              </div>
            ))
          ) : (
            <p className="text-gray-400">No badges yet. Keep studying to earn achievements!</p>
          )}
        </div>
      </div>
    </div>
  );
  
  const NotesView = () => (
    <div className="space-y-6" data-testid="notes-view">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <FileText className="text-blue-400" size={36} />
          My Notes
        </h1>
        <div className="flex gap-3">
          <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-all">
            <Upload size={18} />
            Upload File
            <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={uploadAndAnalyzeFile} />
          </label>
          <button 
            onClick={() => setShowNoteModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            data-testid="create-note-button"
          >
            <Plus size={18} />
            New Note
          </button>
        </div>
      </div>
      
      {notes.length === 0 ? (
        <div className="bg-gray-800 p-12 rounded-xl border border-gray-700 text-center">
          <FileText className="mx-auto text-gray-600 mb-4" size={64} />
          <p className="text-gray-400 text-lg">No notes yet. Create your first note!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <div key={note.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 hover:border-purple-500 transition-all" data-testid={`note-card-${note.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{note.title}</h3>
                  <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded">{note.subject}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4 line-clamp-3">{note.content}</p>
              {note.ai_summary && (
                <div className="bg-purple-900/20 p-3 rounded-lg mb-3 border border-purple-700/30">
                  <p className="text-xs text-purple-300 mb-1 flex items-center gap-1">
                    <Sparkles size={12} />
                    AI Summary
                  </p>
                  <p className="text-xs text-gray-300 line-clamp-2">{note.ai_summary}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => summarizeNote(note.id)}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-all"
                  data-testid={`summarize-note-${note.id}`}
                >
                  <Sparkles size={12} className="inline mr-1" />
                  Summarize
                </button>
                <button 
                  onClick={() => generateFlashcardsFromNote(note.id)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-all"
                  data-testid={`generate-flashcards-${note.id}`}
                >
                  <Brain size={12} className="inline mr-1" />
                  Flashcards
                </button>
                <button 
                  onClick={() => exportNotePDF(note.id, note.title)}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-all"
                  data-testid={`export-pdf-${note.id}`}
                >
                  <Download size={12} className="inline mr-1" />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const FlashcardsView = () => (
    <div className="space-y-6" data-testid="flashcards-view">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <BookOpen className="text-green-400" size={36} />
          Flashcards
        </h1>
        <button 
          onClick={startFlashcardReview}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
          data-testid="start-review-button"
        >
          <Play size={18} />
          Start Review
        </button>
      </div>
      
      {flashcards.length === 0 ? (
        <div className="bg-gray-800 p-12 rounded-xl border border-gray-700 text-center">
          <BookOpen className="mx-auto text-gray-600 mb-4" size={64} />
          <p className="text-gray-400 text-lg">No flashcards yet. Generate from your notes!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map(card => (
            <div key={card.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 hover:border-green-500 transition-all">
              <div className="mb-3">
                <p className="text-xs text-green-400 mb-2">Question</p>
                <p className="text-white font-medium">{card.question}</p>
              </div>
              <div className="mb-3">
                <p className="text-xs text-blue-400 mb-2">Answer</p>
                <p className="text-gray-300">{card.answer}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Difficulty: {card.difficulty}/5</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const PlannerView = () => (
    <div className="space-y-6" data-testid="planner-view">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-yellow-400" size={36} />
          Study Planner
        </h1>
        <button 
          onClick={() => setShowTaskModal(true)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
          data-testid="add-task-button"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Today's Tasks</h3>
          <div className="space-y-3">
            {tasks.filter(t => !t.completed).length === 0 ? (
              <p className="text-gray-400 text-center py-8">No pending tasks. Great job!</p>
            ) : (
              tasks.filter(t => !t.completed).map(task => (
                <div key={task.id} className="bg-gray-700 p-4 rounded-lg flex items-start gap-3" data-testid={`task-item-${task.id}`}>
                  <button 
                    onClick={() => completeTask(task.id)}
                    className="mt-1 w-5 h-5 rounded border-2 border-gray-500 hover:border-green-500 hover:bg-green-500 transition-all flex items-center justify-center"
                    data-testid={`complete-task-${task.id}`}
                  >
                    <Check size={14} className="text-white opacity-0 hover:opacity-100" />
                  </button>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{task.title}</h4>
                    <p className="text-sm text-gray-400">{task.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{task.date}</span>
                      <span>{task.duration} min</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Completed Tasks</h3>
          <div className="space-y-3">
            {tasks.filter(t => t.completed).length === 0 ? (
              <p className="text-gray-400 text-center py-8">No completed tasks yet.</p>
            ) : (
              tasks.filter(t => t.completed).map(task => (
                <div key={task.id} className="bg-gray-700/50 p-4 rounded-lg opacity-60">
                  <div className="flex items-center gap-2">
                    <Check size={18} className="text-green-400" />
                    <h4 className="text-gray-300 font-medium line-through">{task.title}</h4>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
  
  const ProgressView = () => (
    <div className="space-y-6" data-testid="progress-view">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <TrendingUp className="text-pink-400" size={36} />
        Progress Tracker
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-xl text-white">
          <h3 className="text-sm opacity-80 mb-2">Total XP</h3>
          <p className="text-4xl font-bold">{progress?.xp || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-teal-600 p-6 rounded-xl text-white">
          <h3 className="text-sm opacity-80 mb-2">Study Hours</h3>
          <p className="text-4xl font-bold">{progress?.total_study_hours?.toFixed(1) || 0}h</p>
        </div>
        <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-xl text-white">
          <h3 className="text-sm opacity-80 mb-2">Streak</h3>
          <p className="text-4xl font-bold">{progress?.streak_days || 0} days</p>
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Study History</h3>
        {studySessions.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={studySessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
              <Line type="monotone" dataKey="duration" stroke="#8B5CF6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-8">No study data yet. Start a focus session!</p>
        )}
      </div>
    </div>
  );
  
  const ChatView = () => (
    <div className="space-y-6" data-testid="chat-view">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <MessageSquare className="text-blue-400" size={36} />
        Doubt Solver
      </h1>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="mx-auto text-gray-600 mb-4" size={64} />
                <p className="text-gray-400 text-lg">Ask me anything about your studies!</p>
              </div>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-end">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg max-w-[70%]">
                    {msg.message}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg max-w-[70%]">
                    {msg.response}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Ask your question..."
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              data-testid="chat-input"
            />
            <button 
              onClick={sendChatMessage}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all disabled:opacity-50"
              data-testid="send-chat-button"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Brain className="text-purple-400" size={32} />
              <span className="text-xl font-bold text-white">StudyAI</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="nav-dashboard"
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'notes' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="nav-notes"
              >
                Notes
              </button>
              <button 
                onClick={() => setActiveTab('flashcards')}
                className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'flashcards' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="nav-flashcards"
              >
                Flashcards
              </button>
              <button 
                onClick={() => setActiveTab('planner')}
                className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'planner' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="nav-planner"
              >
                Planner
              </button>
              <button 
                onClick={() => setActiveTab('progress')}
                className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'progress' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="nav-progress"
              >
                Progress
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="nav-chat"
              >
                Chat
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'notes' && <NotesView />}
        {activeTab === 'flashcards' && <FlashcardsView />}
        {activeTab === 'planner' && <PlannerView />}
        {activeTab === 'progress' && <ProgressView />}
        {activeTab === 'chat' && <ChatView />}
      </main>
      
      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="note-modal">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Create Note</h2>
              <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Note Title"
                value={noteForm.title}
                onChange={(e) => setNoteForm({...noteForm, title: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                data-testid="note-title-input"
              />
              <input
                type="text"
                placeholder="Subject"
                value={noteForm.subject}
                onChange={(e) => setNoteForm({...noteForm, subject: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                data-testid="note-subject-input"
              />
              <textarea
                placeholder="Note Content"
                value={noteForm.content}
                onChange={(e) => setNoteForm({...noteForm, content: e.target.value})}
                rows={8}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                data-testid="note-content-input"
              />
              <button 
                onClick={createNote}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-all disabled:opacity-50"
                data-testid="save-note-button"
              >
                {loading ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="task-modal">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Add Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Task Title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                data-testid="task-title-input"
              />
              <textarea
                placeholder="Description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                rows={3}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                data-testid="task-description-input"
              />
              <input
                type="date"
                value={taskForm.date}
                onChange={(e) => setTaskForm({...taskForm, date: e.target.value})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                data-testid="task-date-input"
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={taskForm.duration}
                onChange={(e) => setTaskForm({...taskForm, duration: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                data-testid="task-duration-input"
              />
              <button 
                onClick={createTask}
                disabled={loading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg transition-all disabled:opacity-50"
                data-testid="save-task-button"
              >
                {loading ? 'Saving...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Focus Mode Modal */}
      {showFocusMode && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" data-testid="focus-mode-modal">
          <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md mx-4 border border-gray-700 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Focus Mode</h2>
            
            {!focusActive ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="What are you studying?"
                  value={focusSubject}
                  onChange={(e) => setFocusSubject(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  data-testid="focus-subject-input"
                />
                <button 
                  onClick={() => setFocusActive(true)}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                  data-testid="start-focus-button"
                >
                  <Play size={20} />
                  Start Focus Session (25 min)
                </button>
                <button 
                  onClick={() => setShowFocusMode(false)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
                  data-testid="cancel-focus-button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <div className="text-6xl font-bold text-white mb-4">{formatTime(focusTime)}</div>
                <div className="w-full bg-gray-700 rounded-full h-4 mb-6">
                  <div 
                    className="bg-gradient-to-r from-pink-600 to-purple-600 h-4 rounded-full transition-all duration-1000"
                    style={{ width: `${((25 * 60 - focusTime) / (25 * 60)) * 100}%` }}
                  />
                </div>
                <p className="text-gray-400 mb-6">Studying: {focusSubject}</p>
                <button 
                  onClick={() => {
                    setFocusActive(false);
                    setShowFocusMode(false);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-all"
                  data-testid="stop-focus-button"
                >
                  <Pause size={18} className="inline mr-2" />
                  Stop Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Flashcard Review Modal */}
      {reviewMode && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" data-testid="flashcard-review-modal">
          <div className="bg-gray-800 rounded-xl p-8 w-full max-w-2xl mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Flashcard Review</h2>
              <button onClick={() => setReviewMode(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4 text-gray-400 text-sm">
              Card {currentCardIndex + 1} of {flashcards.length}
            </div>
            
            {flashcards[currentCardIndex] && (
              <div className="mb-6">
                <div className="bg-gray-700 p-6 rounded-xl mb-4 min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-green-400 mb-2">Question</p>
                    <p className="text-xl text-white font-medium">{flashcards[currentCardIndex].question}</p>
                    
                    {showAnswer && (
                      <div className="mt-6 pt-6 border-t border-gray-600">
                        <p className="text-sm text-blue-400 mb-2">Answer</p>
                        <p className="text-lg text-gray-200">{flashcards[currentCardIndex].answer}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {!showAnswer ? (
                  <button 
                    onClick={() => setShowAnswer(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-all"
                    data-testid="show-answer-button"
                  >
                    Show Answer
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => reviewFlashcard(false)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-all"
                      data-testid="review-wrong-button"
                    >
                      ✗ Wrong
                    </button>
                    <button 
                      onClick={() => reviewFlashcard(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-all"
                      data-testid="review-correct-button"
                    >
                      ✓ Correct
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            <span className="text-white">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
