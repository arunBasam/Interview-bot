#!/bin/bash
# Start both the FastAPI server and LiveKit agent

echo "🚀 Starting PM Interview Bot Backend..."

# Start FastAPI in background
echo "📡 Starting FastAPI server..."
uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} &
API_PID=$!

# Wait a moment then start the agent
sleep 5
echo "🤖 Starting LiveKit Agent..."
python agent/interviewer_agent.py dev &
AGENT_PID=$!

echo ""
echo "✅ Both services running!"
echo ""

# Wait for either process to exit
trap "kill $API_PID $AGENT_PID 2>/dev/null; exit" INT TERM
wait $API_PID $AGENT_PID