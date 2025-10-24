from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from ai_service import AIService
import shutil
from pypdf import PdfReader
from docx import Document as DocxDocument
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize AI Service
ai_service = AIService()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class Note(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    subject: str
    ai_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoteCreate(BaseModel):
    title: str
    content: str
    subject: str

class Flashcard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    note_id: str
    question: str
    answer: str
    difficulty: int = 1  # 1-5 for spaced repetition
    next_review: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FlashcardCreate(BaseModel):
    note_id: str
    count: int = 5

class StudyTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    date: str
    duration: int  # in minutes
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudyTaskCreate(BaseModel):
    title: str
    description: str
    date: str
    duration: int

class QuizQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    question: str
    options: List[str]
    correct_answer: int
    difficulty: str = "medium"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizGenerate(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 5

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    message: str
    response: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    session_id: str
    message: str

class StudySession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: str
    duration: int  # in minutes
    date: str
    focus_score: int = 0  # 0-100
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudySessionCreate(BaseModel):
    subject: str
    duration: int
    date: str
    focus_score: int = 0

class UserProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_study_hours: float = 0.0
    total_notes: int = 0
    total_flashcards: int = 0
    total_quizzes: int = 0
    streak_days: int = 0
    xp: int = 0
    badges: List[str] = []
    last_study_date: Optional[str] = None

# API Endpoints

@api_router.get("/")
async def root():
    return {"message": "AI Study App API"}

# Notes endpoints
@api_router.post("/notes", response_model=Note)
async def create_note(note: NoteCreate):
    note_obj = Note(**note.model_dump())
    doc = note_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.notes.insert_one(doc)
    return note_obj

@api_router.get("/notes", response_model=List[Note])
async def get_notes():
    notes = await db.notes.find({}, {"_id": 0}).to_list(1000)
    for note in notes:
        if isinstance(note['created_at'], str):
            note['created_at'] = datetime.fromisoformat(note['created_at'])
        if isinstance(note['updated_at'], str):
            note['updated_at'] = datetime.fromisoformat(note['updated_at'])
    return notes

@api_router.get("/notes/{note_id}", response_model=Note)
async def get_note(note_id: str):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if isinstance(note['created_at'], str):
        note['created_at'] = datetime.fromisoformat(note['created_at'])
    if isinstance(note['updated_at'], str):
        note['updated_at'] = datetime.fromisoformat(note['updated_at'])
    return note

@api_router.post("/notes/{note_id}/summarize")
async def summarize_note(note_id: str):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    summary = await ai_service.summarize_text(note['content'])
    await db.notes.update_one({"id": note_id}, {"$set": {"ai_summary": summary}})
    return {"summary": summary}

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    result = await db.notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# Flashcards endpoints
@api_router.post("/flashcards/generate")
async def generate_flashcards(request: FlashcardCreate):
    note = await db.notes.find_one({"id": request.note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    flashcards_data = await ai_service.generate_flashcards(note['content'], request.count)
    return {"flashcards": flashcards_data}

@api_router.post("/flashcards", response_model=Flashcard)
async def create_flashcard(flashcard: Flashcard):
    doc = flashcard.model_dump()
    doc['next_review'] = doc['next_review'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.flashcards.insert_one(doc)
    return flashcard

@api_router.get("/flashcards", response_model=List[Flashcard])
async def get_flashcards():
    flashcards = await db.flashcards.find({}, {"_id": 0}).to_list(1000)
    for fc in flashcards:
        if isinstance(fc['next_review'], str):
            fc['next_review'] = datetime.fromisoformat(fc['next_review'])
        if isinstance(fc['created_at'], str):
            fc['created_at'] = datetime.fromisoformat(fc['created_at'])
    return flashcards

@api_router.get("/flashcards/due")
async def get_due_flashcards():
    now = datetime.now(timezone.utc).isoformat()
    flashcards = await db.flashcards.find({"next_review": {"$lte": now}}, {"_id": 0}).to_list(100)
    for fc in flashcards:
        if isinstance(fc['next_review'], str):
            fc['next_review'] = datetime.fromisoformat(fc['next_review'])
        if isinstance(fc['created_at'], str):
            fc['created_at'] = datetime.fromisoformat(fc['created_at'])
    return flashcards

@api_router.patch("/flashcards/{flashcard_id}/review")
async def review_flashcard(flashcard_id: str, correct: bool):
    flashcard = await db.flashcards.find_one({"id": flashcard_id}, {"_id": 0})
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    # Spaced repetition logic
    difficulty = flashcard.get('difficulty', 1)
    if correct:
        difficulty = min(5, difficulty + 1)
        days_to_next = difficulty * 2
    else:
        difficulty = max(1, difficulty - 1)
        days_to_next = 1
    
    next_review = (datetime.now(timezone.utc) + timedelta(days=days_to_next)).isoformat()
    await db.flashcards.update_one(
        {"id": flashcard_id},
        {"$set": {"difficulty": difficulty, "next_review": next_review}}
    )
    return {"message": "Flashcard reviewed", "next_review": next_review}

# Study Tasks/Planner endpoints
@api_router.post("/tasks", response_model=StudyTask)
async def create_task(task: StudyTaskCreate):
    task_obj = StudyTask(**task.model_dump())
    doc = task_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tasks.insert_one(doc)
    return task_obj

@api_router.get("/tasks", response_model=List[StudyTask])
async def get_tasks():
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    for task in tasks:
        if isinstance(task['created_at'], str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
    return tasks

@api_router.patch("/tasks/{task_id}/complete")
async def complete_task(task_id: str):
    result = await db.tasks.update_one({"id": task_id}, {"$set": {"completed": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task completed"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# Quiz endpoints
@api_router.post("/quiz/generate")
async def generate_quiz(request: QuizGenerate):
    quiz_data = await ai_service.generate_quiz(request.topic, request.difficulty, request.count)
    return {"quiz": quiz_data}

@api_router.post("/quiz/questions", response_model=QuizQuestion)
async def save_quiz_question(question: QuizQuestion):
    doc = question.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.quiz_questions.insert_one(doc)
    return question

@api_router.get("/quiz/questions", response_model=List[QuizQuestion])
async def get_quiz_questions():
    questions = await db.quiz_questions.find({}, {"_id": 0}).to_list(1000)
    for q in questions:
        if isinstance(q['created_at'], str):
            q['created_at'] = datetime.fromisoformat(q['created_at'])
    return questions

# Chat/Doubt Solver endpoints
@api_router.post("/chat")
async def chat_doubt_solver(request: ChatRequest):
    # Get recent chat history for context
    history = await db.chat_messages.find(
        {"session_id": request.session_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    chat_context = "\n".join([f"Q: {msg['message']}\nA: {msg['response']}" for msg in reversed(history)])
    
    response = await ai_service.chat_doubt_solver(request.message, request.session_id, chat_context)
    
    chat_msg = ChatMessage(
        session_id=request.session_id,
        message=request.message,
        response=response
    )
    doc = chat_msg.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.chat_messages.insert_one(doc)
    
    return {"response": response}

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    for msg in messages:
        if isinstance(msg['created_at'], str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    return messages

# File upload and analysis
@api_router.post("/files/analyze")
async def analyze_file(file: UploadFile = File(...), query: str = "Summarize this document"):
    # Save uploaded file temporarily
    upload_dir = ROOT_DIR / "uploads"
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / file.filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Determine mime type
    mime_type = file.content_type or "text/plain"
    if file.filename.endswith('.pdf'):
        mime_type = "application/pdf"
    elif file.filename.endswith('.docx'):
        mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif file.filename.endswith('.txt'):
        mime_type = "text/plain"
    
    try:
        analysis = await ai_service.analyze_file(str(file_path), mime_type, query)
        return {"analysis": analysis, "filename": file.filename}
    finally:
        # Clean up
        if file_path.exists():
            file_path.unlink()

# Study Sessions/Progress endpoints
@api_router.post("/sessions", response_model=StudySession)
async def create_study_session(session: StudySessionCreate):
    session_obj = StudySession(**session.model_dump())
    doc = session_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.study_sessions.insert_one(doc)
    
    # Update user progress
    progress = await db.user_progress.find_one({}, {"_id": 0})
    if not progress:
        progress = UserProgress().model_dump()
        await db.user_progress.insert_one(progress)
    
    study_hours = session.duration / 60.0
    await db.user_progress.update_one(
        {},
        {
            "$inc": {"total_study_hours": study_hours, "xp": session.duration},
            "$set": {"last_study_date": session.date}
        }
    )
    
    return session_obj

@api_router.get("/sessions", response_model=List[StudySession])
async def get_study_sessions():
    sessions = await db.study_sessions.find({}, {"_id": 0}).to_list(1000)
    for s in sessions:
        if isinstance(s['created_at'], str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return sessions

@api_router.get("/progress", response_model=UserProgress)
async def get_user_progress():
    progress = await db.user_progress.find_one({}, {"_id": 0})
    if not progress:
        progress = UserProgress().model_dump()
        await db.user_progress.insert_one(progress)
        progress = await db.user_progress.find_one({}, {"_id": 0})
    return progress

@api_router.post("/progress/update")
async def update_progress(updates: dict):
    await db.user_progress.update_one({}, {"$set": updates}, upsert=True)
    return {"message": "Progress updated"}

# Export notes as PDF
@api_router.get("/notes/{note_id}/export")
async def export_note_pdf(note_id: str):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Add title
    title = Paragraph(f"<b>{note['title']}</b>", styles['Heading1'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Add content
    for line in note['content'].split('\n'):
        para = Paragraph(line, styles['BodyText'])
        story.append(para)
        story.append(Spacer(1, 6))
    
    if note.get('ai_summary'):
        story.append(Spacer(1, 20))
        summary_title = Paragraph("<b>AI Summary:</b>", styles['Heading2'])
        story.append(summary_title)
        story.append(Spacer(1, 12))
        summary_para = Paragraph(note['ai_summary'], styles['BodyText'])
        story.append(summary_para)
    
    doc.build(story)
    buffer.seek(0)
    
    # Save to temp file and return
    export_dir = ROOT_DIR / "exports"
    export_dir.mkdir(exist_ok=True)
    export_path = export_dir / f"{note_id}.pdf"
    
    with open(export_path, "wb") as f:
        f.write(buffer.getvalue())
    
    return FileResponse(
        path=export_path,
        media_type="application/pdf",
        filename=f"{note['title']}.pdf"
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
