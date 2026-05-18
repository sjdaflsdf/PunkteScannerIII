#!/bin/bash
kill -9 $(lsof -ti:3000) 2>/dev/null || true
node server.js
