#!/bin/bash
# Start both the FastAPI server and LiveKit agent

echo "🚀 Starting PM Interview Bot Backend..."

# Check .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copy .env.example to .env and fill in your keys."
    exit 1
fi

# Start FastAPI in background
echo "📡 Starting FastAPI server on http://localhost:8000..."
uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} &
API_PID=$!

# Wait a moment then start the agent
sleep 2
echo "🤖 Starting LiveKit Agent..."
python agent/interviewer_agent.py start &
AGENT_PID=$!

echo ""
echo "✅ Both services running!"
echo "   API:   http://localhost:8000"
echo "   Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both services."

# Wait for either process to exit
trap "kill $API_PID $AGENT_PID 2>/dev/null; exit" INT TERM
wait $API_PID $AGENT_PID
