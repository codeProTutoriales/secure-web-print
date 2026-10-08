import sys

class PrinterBackend:
    def get_printers(self):
        raise NotImplementedError

    def print_raw(self, printer_name: str, data: bytes, title: str) -> str:
        raise NotImplementedError

    def get_job_status(self, printer_name: str, job_id: str):
        raise NotImplementedError

    def cancel_job(self, printer_name: str, job_id: str):
        raise NotImplementedError

def get_backend():
    if sys.platform == 'win32':
        from platforms.windows.backend import WindowsPrinterBackend
        return WindowsPrinterBackend()
    elif sys.platform in ('linux', 'darwin'):
        try:
            from platforms.posix.backend import CupsPrinterBackend
            return CupsPrinterBackend()
        except ImportError:
            print("pycups no está instalado. Ejecuta: pip install pycups")
            return None
    else:
        raise NotImplementedError(f"Unsupported platform: {sys.platform}")
