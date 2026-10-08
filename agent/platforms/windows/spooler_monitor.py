import win32print
import win32event
import asyncio
import time
import threading

class SpoolerMonitor:
    def __init__(self):
        self.monitoring = False
        self.cancelled = False
        self.found_job = None
        self.handles = []
        self.printers = []

    def _get_printer_status(self, printer_name):
        try:
            hprinter = win32print.OpenPrinter(printer_name)
            try:
                info = win32print.GetPrinter(hprinter, 2)
                return info['Status']
            finally:
                win32print.ClosePrinter(hprinter)
        except Exception:
            return 0

    def _cancel_job(self, printer_name, job_id):
        try:
            hprinter = win32print.OpenPrinter(printer_name)
            try:
                win32print.SetJob(hprinter, job_id, 0, None, win32print.JOB_CONTROL_CANCEL)
            finally:
                win32print.ClosePrinter(hprinter)
        except Exception as e:
            pass

    def _get_job_details(self, printer_name, job_id):
        try:
            hprinter = win32print.OpenPrinter(printer_name)
            try:
                # Nivel 2 tiene pDevMode que contiene la configuración elegida en el diálogo
                job_info = win32print.GetJob(hprinter, job_id, 2)
                return job_info
            finally:
                win32print.ClosePrinter(hprinter)
        except Exception:
            return None

    def _get_all_jobs(self):
        jobs = set()
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        for (flags, description, name, comment) in win32print.EnumPrinters(flags):
            try:
                hprinter = win32print.OpenPrinter(name)
                try:
                    printer_jobs = win32print.EnumJobs(hprinter, 0, 999, 1)
                    for job in printer_jobs:
                        jobs.add((name, job['JobId']))
                finally:
                    win32print.ClosePrinter(hprinter)
            except Exception:
                continue
        return jobs

    def _watch(self, timeout_seconds: int, allowed_printers: list, max_copies: int = 1):
        print("\n[+] Iniciando Escáner de Alta Velocidad (Polling 0.1s)...")
        self.initial_jobs = self._get_all_jobs()
        start_time = time.time()
        
        while self.monitoring and (time.time() - start_time) < timeout_seconds:
            time.sleep(0.1) # Polling de altísima velocidad
            current_jobs = self._get_all_jobs()
            new_jobs = current_jobs - self.initial_jobs
            
            if new_jobs:
                printer_name, job_id = list(new_jobs)[0]
                print(f"[!] Trabajo detectado en: {printer_name} (Job ID: {job_id})")
                
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
                    self._cancel_job(printer_name, job_id)
                    self.found_job = {"status": "FRAUD_INVALID_PRINTER", "printer": printer_name, "message": "Impresora no autorizada."}
                    self.monitoring = False
                    return

                # Anti-Fraude: Impresora en Pausa
                status = self._get_printer_status(printer_name)
                if (status & win32print.PRINTER_STATUS_PAUSED) or (status & win32print.PRINTER_STATUS_OFFLINE):
                    self._cancel_job(printer_name, job_id)
                    self.found_job = {"status": "FRAUD_PRINTER_PAUSED", "printer": printer_name, "message": "Pausada"}
                    self.monitoring = False
                    return

                # Anti-Fraude: Copias múltiples
                job_info = self._get_job_details(printer_name, job_id)
                total_pages = 1
                copies = 1

                if job_info:
                    total_pages = job_info.get('TotalPages', 1)
                    if total_pages == 0: 
                        total_pages = 1 # A veces es 0 al inicio
                    
                    devmode = job_info.get('pDevMode')
                    if devmode and hasattr(devmode, 'Copies'):
                        copies = devmode.Copies
                
                if total_pages > max_copies or copies > max_copies:
                    if copies > max_copies:
                        pages_msg = f"{copies} copias"
                    else:
                        pages_msg = f"{total_pages} páginas"
                        
                    self.found_job = {"status": "FRAUD_MULTIPLE_COPIES", "printer": printer_name, "pages": pages_msg}
                    self.monitoring = False
                    return

                # Todo en orden
                self.found_job = {"status": "PRINTED", "printer": printer_name, "jobId": str(job_id), "pages": f"{copies} copia(s)"}
                self.monitoring = False
                return

    async def start_monitoring(self, timeout_seconds: int = 60, allowed_printers: list = None, max_copies: int = 1) -> dict:
        self.monitoring = True
        self.cancelled = False
        self.found_job = None
        
        thread = threading.Thread(target=self._watch, args=(timeout_seconds, allowed_printers or [], max_copies))
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

monitor = SpoolerMonitor()
