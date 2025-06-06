# Doc QA App

## Setup and Running Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies using uv:
   ```bash
   # Install uv if you don't have it
   curl -LsSf https://astral.sh/uv/install.sh | sh  # MacOS
   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows
   
   # Sync dependencies
   uv sync
   ```

3. Create and activate the virtual environment:
   ```bash
   source .venv/bin/activate  # On MacOS/Linux
   .venv\Scripts\activate  # On Windows
   ```

4. Create a .env file in the backend directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. Run the backend server:
   ```bash
   uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:5173 (or another port if 5173 is in use)

## Usage

1. Open the frontend application in your browser
2. Type your message and press Enter to send
3. The backend will process your message using OpenAI's API and return a response

## Design decisions

- Use of LlamaIndex sdk to make vectorstores with ease, imo its a clean implementation.

## Problems encountered during implementation

- Handling the StreamResponse in the frontend, the UI wasn't updating with every chunk of text that the backend was sending, tried different approaches, turns out making a simple sleep(0.001) solves the problem XD

## What would I Improve:

- Probably the frontend implementation, imo its full of spaghetti code and can be improved, but for now it works
- Using components for a better User Interface, frontend is not one of my strengths but with a little bit of time I can find myself writting quality react code.
- RAG implementation, I've implemented what's called "naive rag" and can have inaccurate answers especially if the file content type or structure (for example a document with many complex tables)

