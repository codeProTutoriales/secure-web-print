# Universal POS Printer & Secure Web Print 🖨️🔒

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

*Lea esto en [Español](#español) | Read this in [English](#english)*

---

<a name="español"></a>
## 🇪🇸 Español

**Universal POS Printer** es un agente local y SDK de alta seguridad que actúa como puente definitivo entre las Aplicaciones Web modernas (React, Angular, Vue, Svelte, .NET Blazor) e impresoras físicas (térmicas de punto de venta, láser o de red) a través de entornos **Windows, macOS y Linux**.

### 🚨 El Problema (Caja Negra del Navegador)
En el desarrollo web moderno, la API de impresión nativa (`window.print()`) es una caja negra aislada. Por razones estrictas de privacidad, los navegadores bloquean intencionalmente cualquier intento del desarrollador web de saber si un usuario realmente hizo clic en "Imprimir", si hizo clic en "Cancelar" o qué impresora seleccionó.

Para sistemas de Punto de Venta (POS) y facturación contable, esto representa una vulnerabilidad crítica y un agujero masivo de fraude:
- Los empleados pueden elegir una impresora virtual como "Guardar como PDF" y engañar al sistema haciéndole creer que entregaron un recibo físico.
- Pueden modificar el número de copias manualmente para entregar una factura al cliente y quedarse con duplicados idénticos para manipular la caja.
- Pueden pausar la impresora desde el panel de control del sistema operativo para simular impresiones fantasma.

### 💡 La Solución Definitiva (Arquitectura Híbrida)
Este proyecto evade y destruye las limitaciones del *sandbox* del navegador mediante una arquitectura en dos capas:
Ejecuta un **Agente Ligero en Python** en segundo plano (`127.0.0.1:8765`) dentro de la máquina del cajero. Cuando la aplicación web web abre el diálogo de impresión a través de nuestro SDK, el agente utiliza un **Escáner de Alta Velocidad (Polling cada 0.1s)** que se conecta directamente al *Spooler* de impresión de Windows (`win32print`) o de Linux/macOS (`CUPS`).

El Agente intercepta el trabajo físico de bajo nivel en el milisegundo exacto en que nace en el núcleo del Sistema Operativo, lee sus metadatos internos y lo juzga antes de que llegue a la impresora.

### ✨ Funciones Anti-Fraude Activas
- **Resultados Determinísticos Garantizados:** Devuelve de forma matemática los estados `PRINTED` o `CANCELLED` a la web a través de WebSockets.
- **Destrucción de Impresoras Falsas:** Al llamar al SDK, defines una "Lista Blanca" (`["EPSON TM", "BIXOLON"]`). Si el usuario intenta imprimir a un PDF o impresora no autorizada, el agente le inyecta el comando destructor `JOB_CONTROL_CANCEL` al núcleo del sistema y aniquila el trabajo en milisegundos.
- **Auditoría de Pausas (Limbo):** Aborta el trabajo y lanza alertas si detecta que la impresora de destino tiene flags de `PAUSED` u `OFFLINE`.
- **Límite de Copias Dinámico:** Inspecciona la estructura binaria profunda (`pDevMode.Copies` y `TotalPages`) enviada por el navegador. Si el empleado solicita más copias de las autorizadas explícitamente en el código web (ej. `maxCopies = 1`), el trabajo se clasifica como Fraude y se reporta.
- **Bloqueo de Interfaz CSS:** Inyecta código para inhabilitar la tecla `CTRL+P`. Si alguien intenta imprimir saltándose el sistema, la hoja saldrá totalmente en blanco.

### 🌐 Compatibilidad Total de Frontend
El Agente es 100% agnóstico. El SDK de TypeScript / Vanilla JS incluido se puede importar e integrar fácilmente en cualquier ecosistema moderno:
- **Frameworks JS:** React, Angular, Vue, Svelte.
- **Frameworks de Backend/Híbridos:** Funciona perfectamente con **.NET Blazor** (WebAssembly o Server) a través de JSInterop estándar, invocando la orden desde tus botones en C#.

---

### 🛠️ Guía de Instalación y Uso

**Requisitos Previos:**
- Asegúrate de tener **Python 3.10 o superior** instalado en el sistema operativo del cliente/cajero.
- Node.js (solo si vas a modificar o compilar el SDK de frontend).

#### 1. Ejecutar el Agente Local en la Máquina del Cajero
```bash
cd agent
pip install -r requirements.txt

# NOTA: Si estás en Linux o macOS, instala también el adaptador universal de CUPS:
# pip install pycups

python main.py
```
*El Agente detectará la plataforma automáticamente y levantará un servidor local silencioso en `http://127.0.0.1:8765`.*

#### 2. Implementar el SDK en tu Código Web (Ejemplo TypeScript/React/Angular)
```typescript
import { Printer } from '@codepro47/universal-printer';

// 1. Conectarse al Agente Local
const printer = new Printer('http://127.0.0.1:8765');

// 2. Suscribirse a los eventos de Seguridad
printer.on('dialog_print_result', (data) => {
    switch(data.result.status) {
        case 'PRINTED':
            console.log(`¡Éxito! Páginas validadas: ${data.result.pages}`);
            break;
        case 'CANCELLED':
            console.log("El usuario cerró la ventana nativa.");
            break;
        case 'FRAUD_INVALID_PRINTER':
            console.error(`FRAUDE: Intento de usar impresora ilegal (${data.result.printer}). Trabajo destruido.`);
            break;
        case 'FRAUD_MULTIPLE_COPIES':
            console.error(`FRAUDE: Exceso de copias solicitado. Trabajo abortado.`);
            break;
    }
});

// 3. Disparar el diálogo con la Lista Blanca y Límite de Copias
const impresorasPermitidas = ["EPSON TM-T20III", "BIXOLON", "POS-80"];
const maxCopiasPermitidas = 1; 

await printer.printDialog(impresorasPermitidas, maxCopiasPermitidas);
```

#### Ejemplo de Integración en .NET Blazor (C#)
Simplemente enlaza el SDK de Javascript en tu `index.html` e invócalo desde C#:
```csharp
@inject IJSRuntime JSRuntime

<button class="btn btn-success" @onclick="ImprimirSeguro">Imprimir Ticket</button>

@code {
    private async Task ImprimirSeguro()
    {
        string[] impresorasPermitidas = new[] { "EPSON TM", "BIXOLON" };
        int maxCopias = 1;
        
        await JSRuntime.InvokeVoidAsync("printer.printDialog", impresorasPermitidas, maxCopias);
    }
}
```

---
---

<a name="english"></a>
## 🇬🇧 English

**Universal POS Printer** is a highly secure, local print agent and SDK that bridges the gap between modern Web Applications (React, Angular, Vue, Svelte, .NET Blazor) and physical thermal/network printers across **Windows, macOS, and Linux**. 

### 🚨 The Problem
In web development, the native `window.print()` dialog is an isolated black box. Browsers intentionally block developers from knowing if a user clicked "Print", "Cancel", or which printer they chose. For Point of Sale (POS) systems, this is a massive security flaw. Cashiers can easily commit fraud by printing to a PDF, modifying the number of copies, or pausing the printer to trick the accounting software.

### 💡 The Solution (The "Magic")
This project bypasses browser sandbox limitations by running a lightweight Python Agent in the background (`127.0.0.1:8765`). When the web app triggers a print dialog, the agent uses **High-Speed OS Polling (0.1s)** on the Windows Spooler (`win32print`) or Unix `CUPS` to intercept the physical print job exactly as it is created by the OS Kernel.

### ✨ Key Anti-Fraud Features
- **Deterministic Print Results:** Accurately returns `PRINTED` or `CANCELLED` to the web app, defeating the `window.print()` black box.
- **Unauthorized Printer Destruction:** If a user tries to print to a virtual printer (e.g., "Microsoft Print to PDF") instead of the authorized physical POS printer, the agent instantly sends a `JOB_CONTROL_CANCEL` command to the OS, destroying the job in milliseconds.
- **Hardware Status Checks:** Aborts the job if the user attempts to print while the printer is manually Paused or Offline.
- **Dynamic Copies Detection:** Inspects the deep binary payload (`pDevMode.Copies` & `TotalPages`) to detect if the cashier exceeded the dynamically permitted copy limit (e.g., trying to print 3 copies when `maxCopies = 1` is authorized) to prevent duplicate receipt fraud.
- **CSS Lockout:** Prevents unauthorized manual printing via `CTRL+P` by turning the page blank unless triggered by the official system SDK.

### 🛠️ Installation & Usage

**Prerequisites:**
- Make sure you have **Python 3.10+** installed on the client machine.
- Node.js (for compiling the frontend SDK).

**1. Run the Local Agent (Python)**
```bash
cd agent
pip install -r requirements.txt

# If you are on Linux or macOS, you also need to install the CUPS adapter:
# pip install pycups

python main.py
```
*The agent will auto-detect your OS (Windows/Linux/Mac) and run on `http://127.0.0.1:8765`.*

**2. Use the SDK in your Frontend (React/Angular/JS/Blazor)**
```typescript
import { Printer } from '@codepro47/universal-printer';

const printer = new Printer('http://127.0.0.1:8765');

// Listen for secure events
printer.on('dialog_print_result', (data) => {
    if (data.result.status === 'PRINTED') {
        console.log("Success! Pages:", data.result.pages);
    } else if (data.result.status === 'FRAUD_INVALID_PRINTER') {
        console.error("FRAUD: Job destroyed! Unauthorized printer.");
    }
});

// Trigger the print dialog with an authorized whitelist and maximum allowed copies
const allowedPrinters = ["EPSON TM-T20III", "BIXOLON", "POS-80"];
const maxCopies = 1; 

await printer.printDialog(allowedPrinters, maxCopies);
```

---
*Built to revolutionize POS and Accounting software on the Web.*
