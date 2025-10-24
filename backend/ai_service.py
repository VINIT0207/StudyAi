import os
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment")
    
    async def summarize_text(self, text: str) -> str:
        """Summarize given text using Gemini AI"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id="summarize",
            system_message="You are a helpful study assistant. Provide concise, clear summaries of study materials."
        ).with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(text=f"Summarize the following text in bullet points:\n\n{text}")
        response = await chat.send_message(message)
        return response
    
    async def generate_flashcards(self, text: str, count: int = 5) -> List[dict]:
        """Generate flashcards from text"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id="flashcards",
            system_message="You are a helpful study assistant. Generate flashcard questions and answers from study material."
        ).with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(
            text=f"Generate {count} flashcards (question and answer pairs) from this text. Return as JSON array with 'question' and 'answer' fields:\n\n{text}"
        )
        response = await chat.send_message(message)
        
        # Parse the response (you may need to handle JSON parsing)
        return response
    
    async def generate_quiz(self, topic: str, difficulty: str = "medium", count: int = 5) -> str:
        """Generate quiz questions on a topic"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id="quiz",
            system_message=f"You are a quiz generator. Create {difficulty} difficulty multiple choice questions."
        ).with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(
            text=f"Generate {count} {difficulty} difficulty multiple choice questions about: {topic}. Include 4 options and mark the correct answer. Return as JSON array."
        )
        response = await chat.send_message(message)
        return response
    
    async def chat_doubt_solver(self, question: str, session_id: str, chat_history: Optional[str] = None) -> str:
        """Answer student doubts with chat context"""
        system_msg = "You are a helpful tutor. Answer student questions clearly and provide examples when needed."
        
        if chat_history:
            system_msg += f"\n\nPrevious conversation:\n{chat_history}"
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_msg
        ).with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(text=question)
        response = await chat.send_message(message)
        return response
    
    async def analyze_file(self, file_path: str, mime_type: str, query: str) -> str:
        """Analyze uploaded file (PDF, DOCX, TXT) and answer questions about it"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id="file_analysis",
            system_message="You are a document analysis assistant. Analyze documents and provide insights."
        ).with_model("gemini", "gemini-2.0-flash")
        
        file_content = FileContentWithMimeType(
            file_path=file_path,
            mime_type=mime_type
        )
        
        message = UserMessage(
            text=query,
            file_contents=[file_content]
        )
        response = await chat.send_message(message)
        return response
    
    async def suggest_study_plan(self, topics: List[str], exam_date: str, hours_per_day: int) -> str:
        """Generate personalized study plan"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id="study_plan",
            system_message="You are a study planning assistant. Create realistic, achievable study schedules."
        ).with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(
            text=f"Create a study plan for these topics: {', '.join(topics)}. Exam date: {exam_date}. Available study time: {hours_per_day} hours/day. Provide day-by-day breakdown."
        )
        response = await chat.send_message(message)
        return response
    
    async def generate_exam_questions(self, topics: List[str], question_count: int = 10) -> str:
        """Generate exam practice questions"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id="exam",
            system_message="You are an exam creator. Generate realistic exam questions with detailed solutions."
        ).with_model("gemini", "gemini-2.0-flash")
        
        message = UserMessage(
            text=f"Generate {question_count} exam-style questions covering: {', '.join(topics)}. Include solutions and explanations."
        )
        response = await chat.send_message(message)
        return response
