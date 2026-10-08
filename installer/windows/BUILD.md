# Build Script for Windows Agent

1. Install PyInstaller:
`pip install pyinstaller`

2. Build the executable:
`pyinstaller --name "UniversalPrinter" --noconfirm --onedir --windowed --add-data "../../agent;agent" ../../agent/main.py`

3. The generated executable will be in the `dist/UniversalPrinter` folder.

## Creating the Windows Service

To run this as a true background service, you can use NSSM (Non-Sucking Service Manager).

1. Download NSSM.
2. Run `nssm install UniversalPrinter`
3. Select the `UniversalPrinter.exe` generated in the `dist` folder.
4. Start the service.

Alternatively, use InnoSetup to create a `setup.exe` that bundles the executable and NSSM to install it automatically.
