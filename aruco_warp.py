#!/usr/bin/env python3
"""
ArUco-basierte Seiten-Entzerrung (ersetzt die alte Jimp-Geometrie in server.js).

Auf das Template werden vier ArUco-Marker (Dictionary 4x4_50, IDs 0..3) in die
vier Seitenecken gedruckt. Dieses Skript findet sie im Foto/Scan und entzerrt die
Seite per Homographie auf ein festes A4-Raster (1440x2037 px), sodass jeder mm an
einer bekannten Pixelposition liegt.

Aufrufe:
  python3 aruco_warp.py gen          -> JSON {id: dataURL(PNG)} der 4 Marker (fuer das Template)
  python3 aruco_warp.py warp IN OUT  -> entzerrt Bild IN nach OUT (PNG), druckt JSON-Status
"""
import sys, json, base64

import cv2
import numpy as np

# ── Ziel-Raster: festes A4 (210x297mm) ───────────────────────────────
TW, TH = 1440, 2037           # 1440 = 210mm -> 6.857 px/mm; 2037 = 297mm
PXMM = TW / 210.0
PW_MM, PH_MM = 210.0, 297.0

# ── Marker-Geometrie auf dem Blatt (muss EXAKT zum Template-CSS passen) ─────
MARK_MM  = 10.0               # Kantenlaenge gedruckter Marker
EDGE_X   = 5.0               # seitlicher Abstand Markerkante -> Papierkante
EDGE_TOP = 5.0               # oberer Abstand
EDGE_BOT = 16.0              # unterer Abstand: viele Drucker haben unten einen
                             # grossen nicht-druckbaren Rand → Marker weiter rein

# IDs den Ecken zuordnen + nominale Top-Left-Position (mm) auf dem Blatt
_CORNERS_MM = {
    0: (EDGE_X,                   EDGE_TOP),                    # oben-links
    1: (PW_MM - EDGE_X - MARK_MM, EDGE_TOP),                    # oben-rechts
    2: (EDGE_X,                   PH_MM - EDGE_BOT - MARK_MM),  # unten-links
    3: (PW_MM - EDGE_X - MARK_MM, PH_MM - EDGE_BOT - MARK_MM),  # unten-rechts
}

_DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)


def _nominal_corners_px(marker_id):
    """4 Ecken (TL,TR,BR,BL) des Markers im Ziel-Raster, in px – gleiche
    Reihenfolge wie cv2.aruco.detectMarkers liefert."""
    x_mm, y_mm = _CORNERS_MM[marker_id]
    pts_mm = [
        (x_mm,            y_mm),             # TL
        (x_mm + MARK_MM,  y_mm),             # TR
        (x_mm + MARK_MM,  y_mm + MARK_MM),   # BR
        (x_mm,            y_mm + MARK_MM),   # BL
    ]
    return [(x * PXMM, y * PXMM) for (x, y) in pts_mm]


def generate_markers(px=300, border_mm=2.0):
    """PNG-DataURLs der 4 Marker inkl. weisser Quiet-Zone (fuer das Template)."""
    out = {}
    border = int(round(px * (border_mm / MARK_MM)))
    for mid in range(4):
        m = cv2.aruco.generateImageMarker(_DICT, mid, px)
        canvas = np.full((px + 2 * border, px + 2 * border), 255, dtype=np.uint8)
        canvas[border:border + px, border:border + px] = m
        ok, buf = cv2.imencode(".png", canvas)
        out[mid] = "data:image/png;base64," + base64.b64encode(buf).decode()
    return out


def warp(in_path, out_path):
    img = cv2.imread(in_path, cv2.IMREAD_COLOR)
    if img is None:
        return {"ok": False, "err": "Bild nicht lesbar"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    params = cv2.aruco.DetectorParameters()
    detector = cv2.aruco.ArucoDetector(_DICT, params)
    corners, ids, _ = detector.detectMarkers(gray)

    if ids is None:
        return {"ok": False, "err": "keine Marker erkannt", "n": 0}

    ids = ids.flatten().tolist()
    src, dst = [], []
    used = []
    task_centers = []   # Aufgaben-Marker (ID >= 11): Mittelpunkt im Originalbild
    for c, mid in zip(corners, ids):
        quad = c.reshape(4, 2)
        if mid in _CORNERS_MM:
            for (sx, sy), (dx, dy) in zip(quad, _nominal_corners_px(mid)):
                src.append([sx, sy]); dst.append([dx, dy])
            used.append(mid)
        elif mid >= 11:   # Aufgaben-Marker, ID = 10 + Aufgabennummer
            task_centers.append((int(mid), float(quad[:, 0].mean()), float(quad[:, 1].mean())))

    if len(used) < 3:
        return {"ok": False, "err": "zu wenige Marker", "n": len(used), "ids": used}

    H, _ = cv2.findHomography(np.array(src, np.float32), np.array(dst, np.float32))
    if H is None:
        return {"ok": False, "err": "Homographie fehlgeschlagen", "n": len(used)}

    warped = cv2.warpPerspective(img, H, (TW, TH), flags=cv2.INTER_LINEAR,
                                 borderValue=(255, 255, 255))
    cv2.imwrite(out_path, warped)

    # Aufgaben-Marker-Mittelpunkte durch dieselbe Homographie ins entzerrte A4-Raster bringen.
    tasks = []
    if task_centers:
        pts = np.array([[cx, cy] for (_, cx, cy) in task_centers], np.float32).reshape(-1, 1, 2)
        tp = cv2.perspectiveTransform(pts, H).reshape(-1, 2)
        for (mid, _, _), (wx, wy) in zip(task_centers, tp):
            tasks.append({"id": mid, "nr": mid - 10, "x": round(float(wx), 1), "y": round(float(wy), 1)})

    return {"ok": True, "n": len(used), "ids": sorted(used), "tasks": tasks}


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "gen":
        print(json.dumps(generate_markers()))
    elif cmd == "warp":
        print(json.dumps(warp(sys.argv[2], sys.argv[3])))
    else:
        print(json.dumps({"ok": False, "err": "usage: gen | warp IN OUT"}))
        sys.exit(1)
