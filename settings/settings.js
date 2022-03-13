const { ipcRenderer } = require("electron");

const Store = require("electron-store");
const settingsStore = new Store({ name: "Settings" });

// 要存的七牛云参数
const qiniuConfigArr = [
  "#savedFileLocation",
  "#accessKey",
  "#secretKey",
  "#bucketName",
];

const $ = (selector) => {
  const result = document.querySelectorAll(selector);
  return result.length > 1 ? result : result[0];
};

document.addEventListener("DOMContentLoaded", () => {
  let savedLocation = settingsStore.get("savedFileLocation");
  if (savedLocation) {
    $("#savedFileLocation").value = savedLocation;
  }
  // get the saved config data and fill in the inputs
  qiniuConfigArr.forEach((selector) => {
    const savedValue = settingsStore.get(selector.slice(1));
    if (savedValue) {
      $(selector).value = savedValue;
    }
  });

  $("#select-new-location").addEventListener("click", () => {
    ipcRenderer.sendSync("open-setting-diglog");
  });

  ipcRenderer.on("saved-location", (e, path) => {
    $("#savedFileLocation").value = path;
    savedLocation = path;
  });

  $("#settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    qiniuConfigArr.forEach((selector) => {
      if ($(selector)) {
        let { id, value } = $(selector);
        settingsStore.set(id, value ? value : "");
      }
    });

    // 当配置项改变时，告知到主进程
    ipcRenderer.sendSync("config-is-saved");
  });
  $(".nav-tabs").addEventListener("click", (e) => {
    e.preventDefault();
    // 去掉之前的active
    $(".nav-link").forEach((element) => {
      element.classList.remove("active");
    });
    e.target.classList.add("active");
    $(".config-area").forEach((element) => {
      element.style.display = "none";
    });
    $(e.target.dataset.tab).style.display = "block";
  });
});
