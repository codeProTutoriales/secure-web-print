from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from typing import List

from platforms.base import get_backend
from websocket.server import manager

app = FastAPI(title="Universal Printer Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to localhost or specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

backend = get_backend()

class PrintJobRequest(BaseModel):
    printer: str
    type: str = "raw"
    data: str  # Base64 encoded for RAW
    title: str = "Universal Printer Job"

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Can handle incoming WS commands if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "running": True}

@app.get("/api/status")
def get_status():
    import sys
    return {
        "running": True,
        "version": "1.0.0",
        "platform": sys.platform
    }

@app.get("/api/printers")
def list_printers():
    return backend.get_printers()

@app.post("/api/print")
async def print_job(request: PrintJobRequest):
    try:
        raw_data = base64.b64decode(request.data)
        job_id = backend.print_raw(request.printer, raw_data, request.title)
        
        # Broadcast event
        await manager.broadcast({
            "event": "print_status",
            "jobId": job_id,
            "status": "queued"
        })
        
        return {"success": True, "status": "queued", "jobId": job_id}
    except Exception as e:
        return {"success": False, "status": "error", "message": str(e)}

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, printer: str):
    return backend.get_job_status(printer, job_id)

import sys
if sys.platform == 'win32':
    from platforms.windows.spooler_monitor import monitor
else:
    # Linux and macOS (Darwin) use CUPS
    from platforms.posix.cups_monitor import monitor

class StartMonitorRequest(BaseModel):
    allowedPrinters: List[str] = []
    maxCopies: int = 1

@app.post("/api/monitor/start")
async def start_monitor(req: StartMonitorRequest):
    if not monitor:
        return {"status": "unsupported"}
    
    async def watch_spooler():
        result = await monitor.start_monitoring(timeout_seconds=60, allowed_printers=req.allowedPrinters, max_copies=req.maxCopies)
        await manager.broadcast({
            "event": "dialog_print_result",
            "result": result
        })
    
    import asyncio
    asyncio.create_task(watch_spooler())
    return {"success": True, "status": "monitoring_started"}

@app.post("/api/monitor/stop")
async def stop_monitor():
    if monitor:
        monitor.stop_monitoring()
    return {"success": True, "status": "monitoring_stopped"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
