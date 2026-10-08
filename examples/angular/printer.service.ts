import { Injectable, NgZone } from '@angular/core';
import { Printer, PrinterInfo, PrintOptions, PrintResult } from '@codepro47/universal-printer';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PrinterService {
  private printer: Printer;
  
  private connectedSub = new BehaviorSubject<boolean>(false);
  connected$ = this.connectedSub.asObservable();

  private dialogResultSub = new BehaviorSubject<string>('');
  dialogResult$ = this.dialogResultSub.asObservable();

  constructor(private zone: NgZone) {
    this.printer = new Printer('http://127.0.0.1:8765');
    
    this.printer.on('dialog_print_result', (data) => {
      this.zone.run(() => {
          let textStatus = data.result.status;
          if (textStatus === 'PRINTED') {
              textStatus = `✓ Impresión confirmada (Páginas: ${data.result.pages})`;
          } else if (textStatus === 'CANCELLED') {
              textStatus = '✕ Diálogo cancelado';
          } else if (textStatus === 'FRAUD_INVALID_PRINTER') {
              textStatus = `🚨 FRAUDE: Impresora no autorizada (${data.result.printer}).`;
          } else if (textStatus === 'FRAUD_PRINTER_PAUSED') {
              textStatus = `🚨 ALERTA: Impresora pausada/offline.`;
          } else if (textStatus === 'FRAUD_MULTIPLE_COPIES') {
              textStatus = `🚨 FRAUDE: Intento de copias múltiples (Páginas: ${data.result.pages}).`;
          }
          this.dialogResultSub.next(textStatus);
      });
    });
  }

  async connect() {
    const isConnected = await this.printer.connect();
    this.connectedSub.next(isConnected);
  }

  async printDialog(allowedPrinters: string[] = []) {
    this.dialogResultSub.next('Esperando resolución del diálogo...');
    await this.printer.printDialog(allowedPrinters);
  }
}
