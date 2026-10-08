import asyncio
import time
import threading

try:
    import cups
except ImportError:
    cups = None

class CupsSpoolerMonitor:
    def __init__(self):
        self.monitoring = False
        self.cancelled = False
        self.found_job = None
        self.initial_jobs = set()
        if cups:
            self.conn = cups.Connection()
        else:
            self.conn = None

    def _get_all_jobs(self):
        if not self.conn:
            return set()
        jobs = set()
        try:
            # getJobs() returns a dict: {job_id: {'printer_uri': '...', 'job_state': ..., ...}}
            current_jobs = self.conn.getJobs(my_jobs=True)
            for job_id, job_info in current_jobs.items():
                printer_name = job_info.get('job-printer-uri', '').split('/')[-1]
                jobs.add((printer_name, job_id))
        except Exception:
            pass
        return jobs

    def _get_printer_status(self, printer_name):
        if not self.conn:
            return 0 # 0 means OK for our logic
        try:
            printers = self.conn.getPrinters()
            if printer_name in printers:
                state = printers[printer_name].get('printer-state', 3)
                # CUPS Printer States: 3=Idle, 4=Processing, 5=Stopped
                return state
        except Exception:
            return 3
        return 3

    def _cancel_job(self, job_id):
        if not self.conn:
            return
        try:
            self.conn.cancelJob(job_id)
        except Exception as e:
            print("Failed to cancel CUPS job:", e)

    def _watch(self, timeout_seconds: int, allowed_printers: list):
        if not self.conn:
            self.found_job = {"status": "ERROR", "message": "pycups no está instalado o CUPS no está corriendo."}
            self.monitoring = False
            return

        print("\n[+] Iniciando Escáner de Alta Velocidad CUPS (Polling 0.1s)...")
        self.initial_jobs = self._get_all_jobs()
        start_time = time.time()
        
        while self.monitoring and (time.time() - start_time) < timeout_seconds:
            time.sleep(0.1) # Polling de altísima velocidad
            current_jobs = self._get_all_jobs()
            new_jobs = current_jobs - self.initial_jobs
            
            if new_jobs:
                printer_name, job_id = list(new_jobs)[0]
                print(f"[!] Trabajo detectado en CUPS: {printer_name} (Job ID: {job_id})")
                
                # Anti-Fraude: Impresora Falsa (coincidencia parcial)
                is_allowed = False
                if not allowed_printers:
                    is_allowed = True
                else:
                    for ap in allowed_printers:
                        if ap.lower() in printer_name.lower():
                            is_allowed = True
                            break
                            
                if not is_allowed:
                    self._cancel_job(job_id)
                    self.found_job = {"status": "FRAUD_INVALID_PRINTER", "printer": printer_name, "message": "Impresora no autorizada."}
                    self.monitoring = False
                    return

                # Anti-Fraude: Impresora en Pausa
                state = self._get_printer_status(printer_name)
                # CUPS estado 5 = Stopped (Pausada/Offline)
                if state == 5:
                    self._cancel_job(job_id)
                    self.found_job = {"status": "FRAUD_PRINTER_PAUSED", "printer": printer_name, "message": "Pausada"}
                    self.monitoring = False
                    return

                # CUPS no expone 'TotalPages' fácilmente durante Spooling (depende del driver). 
                # Asumimos 1 por ahora o inspeccionamos los atributos del job si están disponibles.
                try:
                    job_attrs = self.conn.getJobAttributes(job_id)
                    total_pages = job_attrs.get('job-media-sheets-completed', 1)
                    if total_pages == 0: total_pages = 1 # Usually 0 while spooling
                except:
                    total_pages = 1
                
                if total_pages > 1:
                    self.found_job = {"status": "FRAUD_MULTIPLE_COPIES", "printer": printer_name, "pages": total_pages}
                    self.monitoring = False
                    return

                # Todo en orden
                self.found_job = {"status": "PRINTED", "printer": printer_name, "jobId": str(job_id), "pages": total_pages}
                self.monitoring = False
                return

    async def start_monitoring(self, timeout_seconds: int = 60, allowed_printers: list = None) -> dict:
        self.monitoring = True
        self.cancelled = False
        self.found_job = None
        
        thread = threading.Thread(target=self._watch, args=(timeout_seconds, allowed_printers or []))
        thread.start()

        while self.monitoring:
            await asyncio.sleep(0.1)
            
        thread.join(timeout=1)

        if self.found_job:
            return self.found_job
        if self.cancelled:
            return {"status": "CANCELLED"}
        return {"status": "TIMEOUT"}

    def stop_monitoring(self):
        self.cancelled = True
        self.monitoring = False

monitor = CupsSpoolerMonitor()
