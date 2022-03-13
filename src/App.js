import { useState, useEffect } from "react";
import "./App.css";
import "bootstrap/dist/css/bootstrap.css";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import { v4 as uuidv4 } from "uuid";

import { message } from "antd";

import FileList from "./components/FileList";
import FileSearch from "./components/FileSearch";
import ButtonBtn from "./components/ButtonBtn";
import TabLIst from "./components/TabLIst";

import { flattenArr, objToArr } from "./utils/helper";
import fileHelper from "./utils/file";
import mockFiles from "./utils/defaultFiles";
import useIpcRenderer from "./hooks/useIpcRenderer";
import Loading from "./components/Loading";

const fs = window.require("fs");
const path = window.require("path");
const { ipcRenderer } = window.require("electron");
const basename = window.require("path").basename;
const remote = window.require("@electron/remote");
const Store = window.require("electron-store");

const fileStore = new Store({ name: "Files Data" });
const settingsStore = new Store({ name: "Settings" });

const saveFilesToStore = (files) => {
  // if (!files || !files.length) return;
  // 存文件的store对象：只存文件的id、title、路径
  // 新建、重命名、删除需要加入files
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const { id, path, title, createdAt, isSynced, updatedAt } = file;
    result[id] = {
      id,
      path,
      title,
      createdAt,
      isSynced,
      updatedAt,
    };
    return result;
  }, {});
  fileStore.set("files", filesStoreObj);
};

const isAutoSync = () =>
  ["accessKey", "secretKey", "bucketName", "enableAutoSync"].every(
    (key) => !!settingsStore.get(key)
  );

function App() {
  // const tmp = flattenArr(mockFiles);

  const [files, setFiles] = useState(fileStore.get("files") || {});

  const filesArr = objToArr(files);
  const [searchEdFiles, setSearchEdFiles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFileId, setActiveFileId] = useState("");
  const [openedFileIds, setOpenedFileIds] = useState([]);
  const [unsaveFileIds, setUnsavedFileIds] = useState([]);
  const [isLoading, setIsloading] = useState(false);

  const openedFiles = openedFileIds.map((openId) => {
    return files[openId];
  });
  const activeFile = files[activeFileId];
  let filteredFiles = [];
  if (searchEdFiles.length) {
    filteredFiles = searchEdFiles;
  } else if (!isSearching) {
    filteredFiles = filesArr;
  }

  const savedLocation =
    settingsStore.get("savedFileLocation") || remote.app.getPath("documents");

  // useEffect(() => {
  //   const cb = () => {
  //     console.log("hello from main");
  //   };
  //   ipcRenderer.on("create-new-file", cb);
  // });

  const onFileClick = (fileId) => {
    // 加入编辑
    // 点击文件时，判断是否读取，如果没有，读进来
    setActiveFileId(fileId);
    const currentFile = files[fileId];
    const { id, title, path, isLoaded } = currentFile;

    // 如果点击的文件且自动同步，且没读过，从云端下载
    if (!currentFile.isLoaded) {
      if (isAutoSync()) {
        // 发到主进程，在主进程下载
        ipcRenderer.send("download-file", { key: `${title}.md`, path, id });
      } else {
        fileHelper
          .readFile(currentFile.path)
          .then((value) => {
            const newFile = { ...files[fileId], body: value, isLoaded: true };
            setFiles({ ...files, [fileId]: newFile });
          })
          .catch((err) => {
            remote.dialog.showErrorBox(
              "文件不存在！",
              `${currentFile.path}不存在`
            );
            // console.log(err.message);
            // 删除掉这个文件，包括store里
            const { [fileId]: value, ...remainFiles } = files;
            setFiles({ ...remainFiles });
            // 关掉对应的tab
            saveFilesToStore(remainFiles);
          });
      }
    }
    // 加入已打开的ids
    // 判断是否存在
    if (!openedFileIds.includes(fileId)) {
      setOpenedFileIds([...openedFileIds, fileId]);
    }
  };

  // 点击tab切换Active
  const onTabClick = (fileId) => {
    setActiveFileId(fileId);
  };

  const onTabClose = (fileId) => {
    // 从已打开中的删除
    // console.log(fileId);
    const tabsWithout = openedFileIds.filter((id) => id !== fileId);
    // console.log(tabsWithout);
    // 如果还有，设置第一个为activeId
    if (tabsWithout.length) {
      setActiveFileId(tabsWithout[0]);
    } else {
      setActiveFileId("");
    }
    setOpenedFileIds([...tabsWithout]);
  };

  // 1.unsaveFileId改掉
  // 2.更新files里的body
  const fileChange = (id, value) => {
    if (value !== files[id].body) {
      const newFile = { ...files[id], body: value };
      setFiles({ ...files, [id]: newFile });
      // setFiles(newFiles);
      // 保存到未更新
      if (!unsaveFileIds.includes(id)) {
        setUnsavedFileIds([...unsaveFileIds, id]);
      }
    }
  };

  const deleteFile = (id) => {
    if (files[id].isNew) {
      const { [id]: value, ...afterDelete } = files;
      setFiles({ ...afterDelete });
      return;
    }
    const { title, path } = files[id];
    fileHelper.deleteFile(files[id].path).then(() => {
      const { [id]: value, ...afterDelete } = files;
      setFiles({ ...afterDelete });
      // 关掉对应的tab
      saveFilesToStore(afterDelete);
      onTabClose(id);

      // 已同步再删除
      console.log(files[id].isSynced);
      if (files[id].isSynced) {
        console.log(123);
        ipcRenderer.send("delete-file", { id, title, path });
      }
    });
  };
  // 更新文件名
  const updateName = (id, title, isNew) => {
    // 新文件默认保存在文档路径下
    // 而修改已有文件则保存在之前的路径中
    const oldName = files[id].title;
    const newPath = isNew
      ? path.join(savedLocation, `${title}.md`)
      : path.join(path.dirname(files[id].path), `${title}.md`);
    const modifiedFile = { ...files[id], title, isNew: false, path: newPath };
    const newFiles = { ...files, [id]: modifiedFile };
    if (isNew) {
      // 新建文件
      // 判断是否存在同名文件

      fileHelper.writeFile(newPath, files[id].body).then(() => {
        setFiles(newFiles);
        saveFilesToStore(newFiles);
      });
    } else {
      // 重命名文件
      const oldPath = files[id].path;
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles);
        saveFilesToStore(newFiles);
      });

      // 已同步的情况下，修改七牛云
      console.log(files[id], title);
      if (files[id].isSynced) {
        ipcRenderer.send("rename-file", { title, oldName });
      }
    }
  };

  const onFileSearch = (keyword) => {
    // 从已有files中查
    setIsSearching(true);
    const newFiles = filesArr.filter((file) => {
      return file.title.includes(keyword);
    });
    setSearchEdFiles(newFiles);
  };

  const createNewFile = () => {
    const newId = uuidv4();
    const newFile = {
      id: newId,
      title: "",
      body: "## 开始编辑",
      createdAt: new Date().getTime(),
      isNew: true,
    };
    setFiles({ ...files, [newId]: newFile });
  };

  // 保存当前文件
  const saveCurrentFile = () => {
    if (!activeFile) return;

    const { path, body, title } = activeFile;
    console.log(isAutoSync());
    fileHelper.writeFile(activeFile.path, activeFile.body).then((res) => {
      // 自动同步，自动上传，且所有都配置
      setUnsavedFileIds(unsaveFileIds.filter((id) => id !== activeFile.id));
      if (isAutoSync()) {
        ipcRenderer.send("upload-file", { key: `${title}.md`, path });
      }
    });
  };

  // 导入本地文件
  const importFiles = () => {
    remote.dialog
      .showOpenDialog({
        title: "请选择要导入的本地 markdown文件",
        properties: ["openfile", "multiSelections"],
        filters: [{ name: "Markdown files", extensions: ["md"] }],
      })
      .then(({ canceled, filePaths, bookmarks }) => {
        // 拿到导入文件的路径
        // 保存当documents
        // 同步到fileStore
        if (Array.isArray(filePaths)) {
          // 1.已有的不导入
          const filtererdPaths = filePaths.filter((path) => {
            const alreadyAdded = Object.values(files).find(
              (file) => file.path === path
            );
            return !alreadyAdded;
          });

          // 2.依据路径扩展：id、path、title的对象数组
          const importFilesArr = filtererdPaths.map((path) => {
            return {
              id: uuidv4(),
              title: basename(path, ".md"),
              path,
            };
          });

          // 3. 转换成key-value的对象
          const newFiles = { ...files, ...flattenArr(importFilesArr) };

          // 4.更新到files数组，同步到fileStore中
          setFiles(newFiles);
          saveFilesToStore(newFiles);
          if (importFilesArr.length > 0) {
            remote.dialog.showMessageBox({
              type: "info",
              title: `成功导入了个${importFilesArr.length}文件`,
              message: `成功导入了${importFilesArr.toString()}`,
            });
          }
        }
      });
  };

  const activeFileUploaded = () => {
    const { id } = activeFile;
    const modifiedFile = {
      ...files[id],
      isSynced: true,
      updatedAt: new Date().getTime(),
    };
    const newFiles = { ...files, [id]: modifiedFile };
    setFiles(newFiles);
    saveFilesToStore(newFiles);
  };

  const activeFileDownloaded = (e, msg) => {
    const currentFile = files[msg.id];
    const { id, path } = currentFile;

    fileHelper.readFile(path).then((value) => {
      let newFile;
      if (msg === "download success") {
        newFile = {
          ...files[id],
          body: value,
          isLoaded: true,
          isSynced: true,
          updatedAt: new Date().getTime(),
        };
      } else {
        newFile = { ...files[id], body: value, isLoaded: true };
      }
      const newFiles = { ...files, [id]: newFile };
      setFiles(newFiles);
      saveFilesToStore(newFiles);
    });
  };

  // 全部同步到云端
  const filesUploaded = () => {
    const newFiles = objToArr(files).reduce((res, file) => {
      const currentTime = new Date().getTime();
      res[file.id] = {
        ...files[file.id],
        isSynced: true,
        updatedAt: currentTime,
      };
      return res;
    }, {});
    setFiles(newFiles);
    saveFilesToStore(newFiles);
  };

  useIpcRenderer({
    "create-new-file": createNewFile,
    "import-file": importFiles,
    "save-file": saveCurrentFile,
    "active-file-uploaded": activeFileUploaded,
    "file-downloaded": activeFileDownloaded,
    "loading-status": (message, status) => {
      setIsloading(status);
    },
    "files-loaded": filesUploaded,
  });

  return (
    <div className="App container-fluid px-0">
      {isLoading && <Loading />}
      <div className="row g-0 ">
        <div className="col-4 left">
          <FileSearch
            title="我的云文档"
            onFileSearch={(value) => {
              onFileSearch(value);
            }}
          />
          <FileList
            files={filteredFiles}
            onSaveEdit={(id, value, isNew) => {
              updateName(id, value, isNew);
            }}
            onFileClick={onFileClick}
            onFileDelete={deleteFile}
          />
          <div className="row g-0 btns">
            <div className="col-6 ">
              <ButtonBtn
                title="新增"
                icon={<EditOutlined />}
                type="btn-primary"
                onClick={createNewFile}
              />
            </div>

            <div className="col-6">
              <ButtonBtn
                title="导入"
                icon={<DeleteOutlined />}
                type="btn-warning"
                onClick={importFiles}
              />
            </div>
          </div>
        </div>
        <div className="col-8 right">
          {!activeFile && (
            <div className="start-page">选择或创建新的Markdown文件</div>
          )}
          {activeFile && (
            <>
              <TabLIst
                files={openedFiles}
                onTabClick={(id) => onTabClick(id)}
                activeId={activeFileId}
                unsavedIds={unsaveFileIds}
                onCloseTab={(id) => onTabClose(id)}
              />
              <SimpleMDE
                key={activeFile && activeFile.id}
                value={activeFile.body}
                onChange={(value) => {
                  fileChange(activeFile.id, value);
                }}
                options={{ minHeight: "515px" }}
              />
              {activeFile.isSynced && (
                <span>{`文件更新于：${new Date(
                  activeFile.updatedAt
                ).toString()}`}</span>
              )}
              {/* <ButtonBtn
                title="保存"
                icon={<DeleteOutlined />}
                type="btn-warning"
                onClick={saveCurrentFile}
              /> */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
