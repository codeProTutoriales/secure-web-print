import { EscPosBuilder } from './escpos';
export { EscPosBuilder };

export interface PrinterInfo {
    name: string;
    systemName: string;
    isDefault: boolean;
    status: string;
    type: string;
}

export interface PrintOptions {
    printer: string;
    type: 'escpos' | 'raw';
    data: any; 
    title?: string;
}

export interface PrintResult {
    success: boolean;
    status: string;
    jobId?: string;
    message?: string;
    errorCode?: string;
}

type EventCallback = (data: any) => void;

export class Printer {
    private url: string;
    private wsUrl: string;
    private socket: WebSocket | null = null;
    private listeners: { [event: string]: EventCallback[] } = {};

    constructor(url: string = 'http://127.0.0.1:8765') {
        this.url = url;
        this.wsUrl = url.replace(/^http/, 'ws') + '/ws';
    }

    on(event: string, callback: EventCallback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    private emit(event: string, data: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    async connect(): Promise<boolean> {
        try {
            const res = await fetch(`${this.url}/api/health`);
            if (res.ok) {
                const data = await res.json();
                if (data.running) {
                    this.connectWebSocket();
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    private connectWebSocket() {
        this.socket = new WebSocket(this.wsUrl);
        this.socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.event) {
                    this.emit(msg.event, msg);
                }
            } catch (e) {}
        };
    }

    async printDialog(allowedPrinters: string[] = [], maxCopies: number = 1): Promise<void> {
        // Bloquear impresión manual por CSS
        const style = document.createElement('style');
        style.innerHTML = `@media print { body.lock-print { display: none !important; } }`;
        document.head.appendChild(style);
        document.body.classList.remove('lock-print');

        // Tell the agent to start watching the spooler
        await fetch(`${this.url}/api/monitor/start`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowedPrinters, maxCopies })
        });

        // Setup the onafterprint to detect when the dialog closes
        const afterPrintHandler = async () => {
            window.removeEventListener('afterprint', afterPrintHandler);
            document.body.classList.add('lock-print'); // Reactivar bloqueo
            
            // Grace period for the OS to spool the job (25s for PDF saves)
            setTimeout(async () => {
                await fetch(`${this.url}/api/monitor/stop`, { method: 'POST' });
            }, 25000);
        };

        window.addEventListener('afterprint', afterPrintHandler);

        // Open the native print dialog
        window.print();
    }

    async getPrinters(): Promise<PrinterInfo[]> {
        const res = await fetch(`${this.url}/api/printers`);
        if (!res.ok) throw new Error('Failed to fetch printers');
        return await res.json();
    }

    private arrayBufferToBase64(buffer: Uint8Array): string {
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }

    async print(options: PrintOptions): Promise<PrintResult> {
        let base64Data = '';

        if (options.type === 'escpos') {
            if (options.data instanceof Uint8Array) {
                base64Data = this.arrayBufferToBase64(options.data);
            } else if (Array.isArray(options.data?.commands)) {
                // Parse the JSON representation of commands into EscPosBuilder
                const builder = new EscPosBuilder();
                options.data.commands.forEach((cmd: any) => {
                    if (cmd.type === 'text') {
                        builder.text(cmd.value, cmd.align, cmd.bold);
                    } else if (cmd.type === 'separator') {
                        builder.separator();
                    } else if (cmd.type === 'feed') {
                        builder.feed(cmd.lines);
                    } else if (cmd.type === 'cut') {
                        builder.cut();
                    } else if (cmd.type === 'drawer') {
                        builder.drawer();
                    }
                });
                base64Data = this.arrayBufferToBase64(builder.build());
            } else {
                throw new Error("Invalid ESC/POS data format");
            }
        } else {
            // Raw text
            base64Data = btoa(options.data);
        }

        const res = await fetch(`${this.url}/api/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                printer: options.printer,
                type: 'raw',
                data: base64Data,
                title: options.title || 'Universal Printer Job'
            })
        });

        return await res.json();
    }
}
