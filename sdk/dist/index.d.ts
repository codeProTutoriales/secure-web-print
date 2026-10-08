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
export declare class Printer {
    private url;
    private wsUrl;
    private socket;
    private listeners;
    constructor(url?: string);
    on(event: string, callback: EventCallback): void;
    private emit;
    connect(): Promise<boolean>;
    private connectWebSocket;
    printDialog(allowedPrinters?: string[], maxCopies?: number): Promise<void>;
    getPrinters(): Promise<PrinterInfo[]>;
    private arrayBufferToBase64;
    print(options: PrintOptions): Promise<PrintResult>;
}
