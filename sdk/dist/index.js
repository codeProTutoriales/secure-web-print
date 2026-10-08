"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Printer = exports.EscPosBuilder = void 0;
const escpos_1 = require("./escpos");
Object.defineProperty(exports, "EscPosBuilder", { enumerable: true, get: function () { return escpos_1.EscPosBuilder; } });
class Printer {
    constructor(url = 'http://127.0.0.1:8765') {
        this.socket = null;
        this.listeners = {};
        this.url = url;
        this.wsUrl = url.replace(/^http/, 'ws') + '/ws';
    }
    on(event, callback) {
        if (!this.listeners[event])
            this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch(`${this.url}/api/health`);
                if (res.ok) {
                    const data = yield res.json();
                    if (data.running) {
                        this.connectWebSocket();
                        return true;
                    }
                }
                return false;
            }
            catch (e) {
                return false;
            }
        });
    }
    connectWebSocket() {
        this.socket = new WebSocket(this.wsUrl);
        this.socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.event) {
                    this.emit(msg.event, msg);
                }
            }
            catch (e) { }
        };
    }
    printDialog() {
        return __awaiter(this, arguments, void 0, function* (allowedPrinters = [], maxCopies = 1) {
            // Bloquear impresión manual por CSS
            const style = document.createElement('style');
            style.innerHTML = `@media print { body.lock-print { display: none !important; } }`;
            document.head.appendChild(style);
            document.body.classList.remove('lock-print');
            // Tell the agent to start watching the spooler
            yield fetch(`${this.url}/api/monitor/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowedPrinters, maxCopies })
            });
            // Setup the onafterprint to detect when the dialog closes
            const afterPrintHandler = () => __awaiter(this, void 0, void 0, function* () {
                window.removeEventListener('afterprint', afterPrintHandler);
                document.body.classList.add('lock-print'); // Reactivar bloqueo
                // Grace period for the OS to spool the job (25s for PDF saves)
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield fetch(`${this.url}/api/monitor/stop`, { method: 'POST' });
                }), 25000);
            });
            window.addEventListener('afterprint', afterPrintHandler);
            // Open the native print dialog
            window.print();
        });
    }
    getPrinters() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.url}/api/printers`);
            if (!res.ok)
                throw new Error('Failed to fetch printers');
            return yield res.json();
        });
    }
    arrayBufferToBase64(buffer) {
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }
    print(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let base64Data = '';
            if (options.type === 'escpos') {
                if (options.data instanceof Uint8Array) {
                    base64Data = this.arrayBufferToBase64(options.data);
                }
                else if (Array.isArray((_a = options.data) === null || _a === void 0 ? void 0 : _a.commands)) {
                    // Parse the JSON representation of commands into EscPosBuilder
                    const builder = new escpos_1.EscPosBuilder();
                    options.data.commands.forEach((cmd) => {
                        if (cmd.type === 'text') {
                            builder.text(cmd.value, cmd.align, cmd.bold);
                        }
                        else if (cmd.type === 'separator') {
                            builder.separator();
                        }
                        else if (cmd.type === 'feed') {
                            builder.feed(cmd.lines);
                        }
                        else if (cmd.type === 'cut') {
                            builder.cut();
                        }
                        else if (cmd.type === 'drawer') {
                            builder.drawer();
                        }
                    });
                    base64Data = this.arrayBufferToBase64(builder.build());
                }
                else {
                    throw new Error("Invalid ESC/POS data format");
                }
            }
            else {
                // Raw text
                base64Data = btoa(options.data);
            }
            const res = yield fetch(`${this.url}/api/print`, {
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
            return yield res.json();
        });
    }
}
exports.Printer = Printer;
