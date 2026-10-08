import { useState, useEffect, useCallback } from 'react';
import { Printer, PrinterInfo, PrintOptions } from '@codepro47/universal-printer';

export function usePrinter(agentUrl: string = 'http://127.0.0.1:8765') {
    const [printer] = useState(() => new Printer(agentUrl));
    const [connected, setConnected] = useState(false);
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [jobs, setJobs] = useState<Record<string, string>>({});

    const [dialogResult, setDialogResult] = useState<string>('');

    useEffect(() => {
        let mounted = true;

        async function init() {
            const isConnected = await printer.connect();
            if (!mounted) return;
            setConnected(isConnected);
        }

        printer.on('print_status', (data) => {
            setJobs(prev => ({
                ...prev,
                [data.jobId]: data.status
            }));
        });

        printer.on('dialog_print_result', (data) => {
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
            setDialogResult(textStatus);
        });

        init();

        return () => { mounted = false; };
    }, [printer]);

    const printDialog = useCallback(async (allowedPrinters: string[] = []) => {
        setDialogResult('Esperando resolución del diálogo...');
        await printer.printDialog(allowedPrinters);
    }, [printer]);

    return { connected, dialogResult, printDialog };
}
