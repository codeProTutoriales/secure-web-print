import win32print
import win32api
import uuid
from platforms.base import PrinterBackend

class WindowsPrinterBackend(PrinterBackend):
    def get_printers(self):
        printers = []
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        for (flags, description, name, comment) in win32print.EnumPrinters(flags):
            default = win32print.GetDefaultPrinter() == name
            # Simplified status mapping for now
            printers.append({
                "name": name,
                "systemName": name,
                "isDefault": default,
                "status": "ready",
                "type": "unknown"
            })
        return printers

    def print_raw(self, printer_name: str, data: bytes, title: str) -> str:
        job_id = str(uuid.uuid4())
        try:
            hprinter = win32print.OpenPrinter(printer_name)
            try:
                hjob = win32print.StartDocPrinter(hprinter, 1, (title, None, "RAW"))
                try:
                    win32print.StartPagePrinter(hprinter)
                    win32print.WritePrinter(hprinter, data)
                    win32print.EndPagePrinter(hprinter)
                finally:
                    win32print.EndDocPrinter(hprinter)
            finally:
                win32print.ClosePrinter(hprinter)
            return job_id
        except Exception as e:
            raise Exception(f"Failed to print: {e}")

    def get_job_status(self, printer_name: str, job_id: str):
        # Full job status monitoring would go here using EnumJobs
        return {"status": "printed", "jobId": job_id}

    def cancel_job(self, printer_name: str, job_id: str):
        # Cancel logic using SetJob would go here
        pass
