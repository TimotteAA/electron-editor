const qiniu = require("qiniu");
const path = require("path");

// 鉴权对象
var accessKey = "qKkZFPSW1gQDnY0lXcNH0dpP1qNT3jJ3FjSt9kFf";
var secretKey = "pynz4veFBU8gzGvLAUJvYBxUfl-GbvTd0-8UeDt5";
var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

// 品证
var options = {
  scope: "mdbucket11",
};
var putPolicy = new qiniu.rs.PutPolicy(options);
var uploadToken = putPolicy.uploadToken(mac);

// 构建配置类
var config = new qiniu.conf.Config();
// 空间对应的机房
config.zone = qiniu.zone.Zone_z0;
// 是否使用https域名
//config.useHttpsDomain = true;
// 上传是否使用cdn加速
//config.useCdnDomain = true;

var localFile = "D://96422961_p0.jpg";
var formUploader = new qiniu.form_up.FormUploader(config);
var putExtra = new qiniu.form_up.PutExtra();
// 上次名
var key = "test.jpg";
// 文件上传
// formUploader.putFile(key, uploadToken).then((res) => {
//   console.log(res);
// });

const qiniuUploader = require("../src/utils/qiniu");

// // qinieUploader.uploadFile("test2.jpg", "D://96422961_p0.jpg");
// qiniuUploader
//   .deleteFile("test2.jpg")
//   .then((res) => {
//     console.log(res);
//   })
//   .catch((err) => {
//     console.log(err);
//   });
// qiniuUploader.uploadFile("test3.jpg", "D://96422961_p0.jpg").then((res) => {
//   console.log(res);
// });

qiniuUploader
  .generateDownloadLink("test3.jpg")
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });

key = "test2.jpg";
qiniuUploader
  .downloadFile(key, path.resolve(__dirname, key))
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });
