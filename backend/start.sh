#!/bin/bash

echo "🚀 Starting PM Interview Bot Backend..."

# Start FastAPI in background
echo "📡 Starting FastAPI server..."
uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} &
API_PID=$!

# Give API time to start
sleep 5

# Start LiveKit Agent
echo "🤖 Starting LiveKit Agent..."
python agent/interviewer_agent.py dev &
AGENT_PID=$!

echo ""
echo "✅ Both services running!"
echo ""

# Cleanup on shutdown
trap "kill $API_PID $AGENT_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait $API_PID $AGENT_PID