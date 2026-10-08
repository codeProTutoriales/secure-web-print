try:
    import cups
except ImportError:
    cups = None

from ..base import PrinterBackend

class CupsPrinterBackend(PrinterBackend):
    def __init__(self):
        if cups:
            self.conn = cups.Connection()
        else:
            self.conn = None

    def get_printers(self) -> list[dict]:
        if not self.conn:
            return []
        printers = self.conn.getPrinters()
        result = []
        for name, info in printers.items():
            result.append({
                "name": name,
                "isDefault": self.conn.getDefault() == name,
                "status": "Ready" if info.get('printer-state', 3) == 3 else "Error"
            })
        return result

    def print_raw(self, printer_name: str, data: bytes, title: str) -> dict:
        if not self.conn:
            return {"jobId": None, "status": "ERROR"}
        
        # Save bytes to a temporary file, as CUPS prints files
        import tempfile
        import os
        
        try:
            fd, path = tempfile.mkstemp()
            with os.fdopen(fd, 'wb') as f:
                f.write(data)
                
            job_id = self.conn.printFile(printer_name, path, title, {"raw": "True"})
            os.remove(path)
            return {"jobId": str(job_id), "status": "PRINTING"}
        except Exception as e:
            return {"jobId": None, "status": f"ERROR: {str(e)}"}

    def get_job_status(self, printer_name: str, job_id: str) -> dict:
        if not self.conn:
            return {"status": "UNKNOWN"}
        try:
            attrs = self.conn.getJobAttributes(int(job_id))
            state = attrs.get('job-state', 9)
            # 3=Pending, 4=Held, 5=Processing, 6=Stopped, 7=Canceled, 8=Aborted, 9=Completed
            if state in [3, 4, 5]:
                return {"status": "PRINTING"}
            elif state == 9:
                return {"status": "PRINTED"}
            else:
                return {"status": "ERROR"}
        except Exception:
            return {"status": "UNKNOWN"}

backend = CupsPrinterBackend()
