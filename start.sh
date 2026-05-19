#!/bin/bash
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1
node server.js
