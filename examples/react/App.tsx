import React, { useState } from 'react';
import { usePrinter } from './usePrinter';

export default function App() {
    const { connected, dialogResult, printDialog } = usePrinter();

    return (
        <div style={{ padding: 20 }}>
            <h1>Universal Printer - React</h1>
            
            <div style={{ padding: 10, background: connected ? '#d4edda' : '#f8d7da' }}>
                Status: {connected ? 'Connected' : 'Disconnected'}
            </div>

            {connected && (
                <div style={{ marginTop: 20 }}>
                    <button 
                        onClick={() => printDialog(["EPSON TM", "POS-80", "HP-CIGITECO"])} 
                        style={{ 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            padding: '15px', 
                            fontSize: '16px', 
                            width: '100%', 
                            border: 'none', 
                            borderRadius: '5px', 
                            cursor: 'pointer' 
                        }}
                    >
                        MODO A: Imprimir con Diálogo Nativo
                    </button>
                </div>
            )}

            <div style={{ marginTop: 20 }}>
                <h3>Resultado del diálogo:</h3>
                <pre>{dialogResult || "Ninguno"}</pre>
            </div>
        </div>
    );
}
