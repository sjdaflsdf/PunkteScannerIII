# ─── Scanner-Backend (Node) + Python/OpenCV für die ArUco-Entzerrung ──────────
# Dieses Dockerfile gehört zum Node-Scanner (server.js, ruft aruco_warp.py auf).
# Auf render: Runtime "Docker" wählen → dieses Dockerfile wird gebaut.
# Am Scanner-CODE ändert sich nichts — hier wird nur die Laufzeitumgebung definiert,
# damit Node UND Python+OpenCV zusammen vorhanden sind (wie lokal).
FROM node:22-bookworm-slim

# Python3 + OpenCV (headless = ohne GUI-Libs, reicht für den Scanner) + numpy.
# Version >=4.7, weil aruco_warp.py die neue ArUco-API (ArucoDetector,
# getPredefinedDictionary, generateImageMarker) nutzt.
# build-essential ist nur ein Sicherheitsnetz, falls eine native npm-Dep
# (better-sqlite3) doch mal kompiliert werden muss.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip libglib2.0-0 build-essential \
 && pip3 install --no-cache-dir --break-system-packages \
        "opencv-python-headless>=4.7,<5" "numpy>=1.24" \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Erst die Manifeste kopieren → npm-Layer wird gecacht, solange sie unverändert sind.
COPY package*.json ./
RUN npm ci --omit=dev

# Restlicher Scanner-Code (server.js, logik.js, aruco_warp.py, mnist-12.onnx, …)
COPY . .

ENV NODE_ENV=production
# render setzt $PORT selbst; server.js liest process.env.PORT.
EXPOSE 3000
CMD ["node", "server.js"]
