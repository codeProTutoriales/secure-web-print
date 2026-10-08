import { Component, OnInit } from '@angular/core';
import { PrinterService } from './printer.service';
import { PrinterInfo } from '@codepro47/universal-printer';

@Component({
  selector: 'app-printer-demo',
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Universal Printer - Angular</h1>
      
      <div [ngStyle]="{'background': (connected$ | async) ? '#d4edda' : '#f8d7da', 'padding': '10px'}">
        Status: {{ (connected$ | async) ? 'Connected' : 'Disconnected' }}
      </div>

      <div *ngIf="connected$ | async" style="margin-top: 20px;">
        <button (click)="printDialog()" style="background-color: #28a745; color: white; padding: 15px; font-size: 16px; width: 100%; border: none; border-radius: 5px; cursor: pointer;">
          MODO A: Imprimir con Diálogo Nativo
        </button>
      </div>

      <div style="margin-top: 20px;">
        <h3>Resultado del diálogo:</h3>
        <pre>{{ dialogResult$ | async }}</pre>
      </div>
    </div>
  `
})
export class PrinterDemoComponent implements OnInit {
  connected$ = this.printerService.connected$;
  dialogResult$ = this.printerService.dialogResult$;

  constructor(private printerService: PrinterService) {}

  ngOnInit() {
    this.printerService.connect();
  }

  printDialog() {
    this.printerService.printDialog(["EPSON TM", "POS-80", "HP-CIGITECO"]);
  }
}
