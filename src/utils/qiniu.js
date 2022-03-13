const qiniu = require("qiniu");
const axios = require("axios");
const fs = require("fs");

class QiniuManager {
  constructor(accessKey, secretKey, bucket) {
    // 凭证
    this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    this.bucket = bucket;

    this.config = new qiniu.conf.Config();
    this.config.zone = qiniu.zone.Zone_z0;
    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

    this.bucketDomain = null;
  }

  uploadFile(key, localFilePath) {
    const options = {
      scope: this.bucket + ":" + key,
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const uploadToken = putPolicy.uploadToken(this.mac);

    const formUploader = new qiniu.form_up.FormUploader(this.config);
    const putExtra = new qiniu.form_up.PutExtra();

    return new Promise((resolve, reject) => {
      formUploader.putFile(
        uploadToken,
        key,
        localFilePath,
        putExtra,
        this._handleCallback(resolve, reject)
      );
    });
  }

  // key是文件名
  deleteFile(key) {
    return new Promise((resolve, reject) => {
      this.bucketManager.delete(
        this.bucket,
        key,
        this._handleCallback(resolve, reject)
      );
    });
  }

  // 获得bucket对应的url
  getBucketDomain() {
    const reqUrl = `http://uc.qbox.me/v2/domains?tbl=${this.bucket}`;
    // 访问token
    const digest = qiniu.util.generateAccessToken(this.mac, reqUrl);
    return new Promise((resolve, reject) => {
      qiniu.rpc.postWithoutForm(
        reqUrl,
        digest,
        this._handleCallback(resolve, reject)
      );
    });
  }

  // 修改文件名
  remameFile(oldTitle, newTitle) {
    return new Promise((resolve, reject) => {
      this.bucketManager.move(
        this.bucket,
        `${oldTitle}.md`,
        this.bucket,
        `${newTitle}.md`,
        { force: true },
        this._handleCallback(resolve, reject)
      );
    });
  }

  // 获取bucket中所有文件
  getAllFiles() {
    return new Promise((resolve, reject) => {
      this.bucketManager.listPrefix(
        this.bucket,
        {},
        this._handleCallback(resolve, reject)
      );
    });
  }

  // 下载文件的流程
  // 1. 获得下载链接
  // 2. 利用axios去下载
  // 3. 写入到本地文件系统中
  generateDownloadLink(key) {
    // 先判断域名是否得到了
    const domainPromise = this.publicBucketDomain
      ? Promise.resolve([this.publicBucketDomain])
      : this.getBucketDomain();
    return domainPromise.then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        const pattern = /^https?/;
        this.publicBucketDomain = pattern.test(data[0])
          ? data[0]
          : `http://${data[0]}`;
        return this.bucketManager.publicDownloadUrl(
          this.publicBucketDomain,
          key
        );
      } else {
        throw Error("域名未找到，请查看存储空间是否已经过期");
      }
    });
  }

  downloadFile(key, downloadPath) {
    return this.generateDownloadLink(key).then((res) => {
      // 利用时间戳，不让浏览器缓存
      const timeStamp = new Date().getTime();
      const url = `${res}?timestamp=${timeStamp}`;
      // axios 下载
      axios({
        url: url,
        method: "GET",
        responseType: "stream",
        // 禁止浏览器缓存
        headers: { "Cache-Control": "no-cache" },
      })
        .then((res) => {
          // 返回流
          const writeStream = fs.createWriteStream(downloadPath);
          res.data.pipe(writeStream);
          return new Promise((resolve, reject) => {
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
          });
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    });

    // 创建可写流、可读流，
  }

  getStat(key) {
    return new Promise((resolve, reject) => {
      this.bucketManager.stat(
        this.bucket,
        key,
        this._handleCallback(resolve, reject)
      );
    });
  }

  _handleCallback(resolve, reject) {
    return function (respErr, respBody, respInfo) {
      if (respErr) {
        reject(respErr);
      }
      if (respInfo.statusCode === 200) {
        resolve(respBody);
      } else {
        reject({
          statusCode: respInfo.statusCode,
          body: respBody,
        });
      }
    };
  }
}

module.exports = QiniuManager;
