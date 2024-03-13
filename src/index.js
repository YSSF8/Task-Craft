const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 600,
        resizable: false,
        icon: `${__dirname}\\image\\icon.ico`,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: `${__dirname}\\preload.js`
        }
    });

    mainWindow.loadFile(`${__dirname}\\index.html`);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('close', () => {
    mainWindow.close();
});

ipcMain.on('move', (event, data) => {
    const currentPosition = mainWindow.getPosition();
    const newPosition = [currentPosition[0] + data.x, currentPosition[1] + data.y];
    mainWindow.setPosition(newPosition[0], newPosition[1]);
});

ipcMain.on('save', (event, data) => {
    dialog.showSaveDialog(mainWindow, {
        title: 'Save File',
        defaultPath: `${app.getPath('documents')}\\Untitled.json`,
        buttonLabel: 'Save',
        filters: [
            {
                name: 'JSON Files',
                extensions: ['json']
            }
        ]
    }).then(result => {
        if (!result.canceled && result.filePath) {
            fs.writeFile(result.filePath, JSON.stringify(data, null, 4), err => {
                if (err) {
                    dialog.showErrorBox('Error', 'An error occured while saving the file.');
                }
            });

            console.log(`File saved to: ${result.filePath}`);
        }
    }).catch(err => {
        console.error(err);
    });
});