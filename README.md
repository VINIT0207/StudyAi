# StudyAI

An AI-powered study assistant application with notes, flashcards, quizzes, and study planning features.

## Features

- **Notes Management**: Create, edit, and organize study notes
- **AI Summaries**: Generate summaries of your notes using AI
- **Flashcards**: Create and review flashcards with spaced repetition
- **Quizzes**: Generate quizzes from your notes
- **Study Planner**: Plan and track your study sessions
- **Export**: Export notes as PDF

## Tech Stack

- **Frontend**: React.js with Create React App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI Services**: Google Generative AI, OpenAI

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- MongoDB (local or cloud instance)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/VINIT0207/StudyAi.git
   cd StudyAi
   ```

2. Backend Setup:
   ```bash
   cd backend
   pip install -r requirements.txt
   # Set up environment variables in .env file
   # Run the server
   uvicorn server:app --reload
   ```

3. Frontend Setup:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Deployment

### Frontend (GitHub Pages)

The frontend is deployed to GitHub Pages at: https://VINIT0207.github.io/StudyAi

To deploy updates:
```bash
cd frontend
npm run build
npm run deploy
```

### Backend

The backend needs to be deployed to a platform that supports Python/FastAPI, such as:
- Render
- Railway
- Heroku
- AWS/GCP/Azure

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
o in g# Here are your Instructions
