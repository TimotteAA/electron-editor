// 主进程
const path = require("path");
const { app, ipcMain, Menu, dialog } = require("electron");
const remote = require("@electron/remote/main");

const AppWindow = require("./src/AppWindow");

const isDev = require("electron-is-dev"); // 主进程
const menuTemplate = require("./menuTemplate");
const Store = require("electron-store");
Store.initRenderer();

const fileStore = new Store({ name: "Files Data" });
const settingsStore = new Store({ name: "Settings" });

const QiniuManager = require("./src/utils/qiniu");
const createManager = () => {
  const accessKey = settingsStore.get("accessKey");
  const secretKey = settingsStore.get("secretKey");
  const bucket = settingsStore.get("bucketName");

  return new QiniuManager(accessKey, secretKey, bucket);
};

let mainWindow;
app.on("ready", () => {
  let url = "";
  if (isDev) {
    url = "http://localhost:3000/";
  }

  mainWindow = new AppWindow(
    {
      width: 1024,
      height: 680,
      webPreferences: {
        // 对应 preload 的文件路径
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: true,
        // https://www.electronjs.org/zh/docs/latest/tutorial/context-isolation
        // 关闭上下文隔离，它会让 preload 里面的内容和 renderer 无法互相访问，默认为 true，设置为 false
        contextIsolation: false,
        enableremotemodule: true,
      },
    },
    url
  );
  mainWindow.webContents.openDevTools();
  require("@electron/remote/main").initialize();
  require("@electron/remote/main").enable(mainWindow.webContents);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 主进程收到这个事件，显示设置窗口
  let settingsWindow;
  ipcMain.on("open-settings-window", () => {
    const settingsWindowConfig = {
      window: 500,
      height: 240,
      parent: mainWindow,
      webPreferences: {
        // 对应 preload 的文件路径
        preload: path.join(__dirname, "./preload.js"),
        nodeIntegration: true,
        // https://www.electronjs.org/zh/docs/latest/tutorial/context-isolation
        // 关闭上下文隔离，它会让 preload 里面的内容和 renderer 无法互相访问，默认为 true，设置为 false
        contextIsolation: false,
        enableremotemodule: true,
      },
    };

    // 本地文件地址
    const url = `file://${path.resolve(__dirname, "./settings/settings.html")}`;
    settingsWindow = new AppWindow(settingsWindowConfig, url);
    settingsWindow.removeMenu();
  });

  // 在主进程中收到打开diglog的提示
  ipcMain.on("open-setting-diglog", (event, arg) => {
    dialog
      .showOpenDialog({
        properties: ["openDirectory"],
        message: "选择文件的存储路径",
        title: "请选择本地存储路径",
      })
      .then((result) => {
        // if (Array.isArray(filePaths) && filePaths.length > 0) {
        //   event.reply("send-saving-position", filePaths[0]);
        //   console.log(event.sender.send);
        // }

        if (!result.canceled) {
          event.sender.send("saved-location", result.filePaths[0]);
          event.returnValue = result.filePaths[0];
        }
      });
  });

  ipcMain.on("config-is-saved", () => {
    settingsWindow.close();
    settingsWindow = null;
  });

  if (settingsWindow) {
    settingsWindow.on("closed", () => {
      settingsWindow = null;
    });
  }

  let menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  ipcMain.on("config-is-changed", () => {
    // mac与windows索引不同
    let qiniMenu =
      process.platform === "darwin" ? menu.items[3] : menu.items[2];
    const changeMenuItemEnabled = (toggle) => {
      [1, 2, 3].forEach((number) => {
        qiniMenu.submenu.items[number].enabled = toggle;
      });
    };
    // 每个都进行了配置
    const qiniuIsConfiged = ["accessKey", "secretKey", "bucketName"].every(
      (key) => !!settingsStore.get(key)
    );
    if (qiniuIsConfiged) {
      changeMenuItemEnabled(true);
    } else {
      changeMenuItemEnabled(false);
    }
  });

  ipcMain.on("upload-file", (e, data) => {
    const manager = createManager();
    manager
      .uploadFile(data.key, data.path)
      .then((data) => {
        console.log(data);
        mainWindow.webContents.send("active-file-uploaded");
      })
      .catch((err) => {
        console.log(err);
        dialog.showErrorBox("同步失败", "请检查七牛云参数配置");
      });
  });

  ipcMain.on("download-file", (e, data) => {
    const manager = createManager();
    const files = fileStore.get("files");
    const { key, path, id } = data;
    manager
      .getStat(data.key)
      .then((res) => {
        console.log(res);
        console.log(files[data.id]);
        const serverUpdatedTime = Math.round(res.putTime / 1000);
        const localUpdatedTime = files[data.id].updatedAt;
        console.log(serverUpdatedTime, localUpdatedTime);
        if (serverUpdatedTime > localUpdatedTime || !localUpdatedTime) {
          console.log(123);
          manager.downloadFile(key, path).then(() => {
            mainWindow.webContents.send("file-downloaded", {
              status: "download success",
              id,
            });
          });
        } else {
          manager.downloadFile(key, path).then(() => {
            mainWindow.webContents.send("file-downloaded", {
              status: "no-new-file",
              id,
            });
          });
        }
      })
      .catch((err) => {
        // 不存在的文件
        console.log(err);
        if (err.statusCode === 612) {
          mainWindow.webContents.send("file-downloaded", {
            status: "no such file",
            id,
          });
        }
      });
  });

  // 全部上传的监听
  ipcMain.on("upload-all-to-qiniu", () => {
    // 告诉渲染进程有网络请求
    mainWindow.webContents.send("loading-status", true);
    // setTimeout(() => {
    //   mainWindow.webContents.send("loading-status", false);
    // }, 2000);
    // 全部上传到七牛云
    const manager = createManager();
    const filesObj = fileStore.get("files") || {};
    const uploadPromiseArr = Object.keys(filesObj).map((key) => {
      const file = filesObj[key];
      return manager.uploadFile(`${file.title}.md`, file.path);
    });

    Promise.all(uploadPromiseArr)
      .then((res) => {
        mainWindow.webContents.send("loading-status", false);
        console.log(res);
        dialog.showMessageBox({
          type: "info",
          title: `成功上传了${res.length}个文件`,
          message: `成功上传了${res.length}个文件`,
        });
        mainWindow.webContents.send("files-loaded");
      })
      .catch((err) => {
        mainWindow.webContents.send("loading-status", false);
      });
  });

  // 监听删除文件
  ipcMain.on("delete-file", (event, data) => {
    const { id, title, path } = data;

    const manager = createManager();
    manager
      .deleteFile(`${title}.md`)
      .then(() => {
        dialog.showMessageBox({
          type: "info",
          title: `成功删除了了${title}.md文件`,
          message: `成功删除了${title}.md文件`,
        });
      })
      .catch((err) => {
        dialog.showErrorBox("删除失败", "请检查七牛云参数配置");
      });
  });

  // 修改文件
  ipcMain.on("rename-file", (e, { title, oldName }) => {
    console.log(title, oldName);
    const manager = createManager();
    manager
      .remameFile(oldName, title)
      .then((res) => {
        dialog.showMessageBox({
          type: "info",
          title: `成功修改${oldName}.md为${title}.md文件`,
          message: `成功修改${oldName}.md为${title}.md文件`,
        });
      })
      .catch((err) => {
        if (err.statusCode === 612) {
          dialog.showErrorBox("文件不存在！", `${title}.md不存在`);
        }
      });
  });

  // 监听从七牛下载所有文件到本地
  ipcMain.on("download-all-files-from-qiniu", () => {
    const manager = createManager();
    manager
      .getAllFiles()
      .then((res) => {
        const items = res.items;
        // 本地
        const filesObj = fileStore.get("files");

        const files = Object.keys(filesObj).map((key) => {
          return filesObj[key];
        });
        // 七牛云中，本地没有的，或者本地比云端老的

        let downPromiseArr = items.filter((item) => {
          // 在本地store中查找
          const local = files.find((file) => file.title === item.key);
          let isNeededDownloaded = false;
          if (!local) {
            // 本地不存在
            isNeededDownloaded = true;
          } else {
            // 云端新
            const remoteTime = Math.round(item.putTime / 1000);
            if (remoteTime > local.updatedAt) {
              isNeededDownloaded = true;
            }
          }
          return isNeededDownloaded;
        });

        const savedLocation =
          settingsStore.get("savedFileLocation") ||
          remote.app.getPath("documents");
        downPromiseArr.map((item) => {
          return manager.downloadFile(
            item.key,
            path.resolve(savedLocation, item.key)
          );
        });
        return Promise.all(downPromiseArr);
      })
      .then((arr) => {
        console.log(arr, "下载后的处理");
      })
      .catch((err) => {
        if (err.statusCode === 631) {
          dialog.showErrorBox("错误", "请检查七牛云参数配置");
        }
      });
  });
});
