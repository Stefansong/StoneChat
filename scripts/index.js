/* eslint-disable no-undef */
const http = require('http');
const TencentCloudCommon = require('tencentcloud-sdk-nodejs-common');
const CommonClient = TencentCloudCommon.CommonClient;
const path = require('path');

// 直接打印解析的配置文件路径
console.log('Config file path:', path.resolve('./static.js'));

// 定义配置对象
let config = {
    secretId: process.env.SECRET_ID || 'your secret_ID',
    secretKey: process.env.SECRET_KEY || 'your_secret_key',
    appId: process.env.APP_ID || 'your app_id'
};

// 尝试从文件加载配置
try {
    const fileConfig = require('./static');
    console.log('文件中的配置：', fileConfig);
    
    // 如果文件配置有效，则使用文件配置
    if (fileConfig.secretId && fileConfig.secretKey && fileConfig.appId) {
        config = fileConfig;
        console.log('使用文件配置');
    } else {
        console.log('文件配置无效，使用硬编码配置');
    }
} catch (error) {
    console.error('加载配置文件错误：', error);
    console.log('使用硬编码配置');
}

console.log('最终使用的配置：', config);

const server = http.createServer(async (req, res) => {
    // 允许跨域的设置
    const origin = req.headers.origin;
    if (origin === 'http://localhost:9091' || origin === 'http://localhost:9092') {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.url === '/getDemoToken') {
        try {
            console.log('【getDemoToken】---config--->', config);
            const clientConfig = {
                credential: {
                    secretId: config.secretId,
                    secretKey: config.secretKey
                },
                region: 'ap-guangzhou',
                profile: {
                    httpProfile: {
                        endpoint: 'lke.ap-guangzhou.tencentcloudapi.com'
                    }
                }
            };

            const client = new CommonClient(
                'lke.ap-guangzhou.tencentcloudapi.com',
                '2023-11-30',
                clientConfig
            );
            const params = {
                'Type': 5,
                'BotAppKey': config.appId,
                'VisitorBizId': config.appId.substring(0, 5)
            };
            console.log('【getDemoToken】---req--->', params);
            const apiResponse = await client.request('GetWsToken', params);
            console.log('【getDemoToken】---rep--->', apiResponse);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ apiResponse }));
        } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.end();
        }
    } else {
        res.statusCode = 404;
        res.end();
    }
});

const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
