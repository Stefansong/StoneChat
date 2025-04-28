// 从环境变量中读取敏感信息
const secretId = process.env.SECRET_ID || ''; // 客户的secretId
const secretKey = process.env.SECRET_KEY || ''; // 客户的secretKey
const appId = process.env.APP_ID || ''; // 体验机器人的appkey

module.exports = {
    secretId,
    secretKey,
    appId
};
