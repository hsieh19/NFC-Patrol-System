# Nginx 生产环境配置指南

为了使 PWA 离线功能和 Web NFC 扫码功能正常工作，系统必须运行在 **HTTPS** 安全上下文中。

如果您在内网使用外部 Nginx 进行反向代理，请参考以下配置模版。

## Nginx 配置示例

```nginx
server {
    listen 443 ssl;
    server_name patrol.internal.com; # 您的内网 IP 或域名

    # 证书路径（请替换为您自己的证书路径）
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # 建议的 SSL 安全优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        # 转发到 Docker 映射出来的端口（假设宿主机端口为 3000）
        proxy_pass http://127.0.0.1:3000; 
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 关键配置：告诉 Next.js 原始请求是 HTTPS
        proxy_set_header X-Forwarded-Proto $scheme; 
        
        # 增加超时限制，防止 NFC 同步大数据时中断
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # 可选：将 HTTP 自动重定向到 HTTPS
    error_page 497 https://$host$request_uri;
}

# HTTP 到 HTTPS 重定向端口 80 (可选)
server {
    listen 80;
    server_name patrol.internal.com;
    return 301 https://$host$request_uri;
}
```

## 关键参数说明

1. **`X-Forwarded-Proto $scheme`**: 极其重要。Next.js 和 PWA 脚本会检查这个头。如果缺失，Service Worker 可能认为环境不安全而拒绝注册。
2. **`proxy_pass`**: 这里填写您 Docker 容器映射到宿主机的端口。
3. **域名/IP**: `server_name` 必须与您在 `.env` 中配置的 `NEXT_PUBLIC_BASE_URL` 完全匹配。

---

## 内网 HTTPS 证书方案 (基于 mkcert)

如果您在内网运行且没有备案域名，推荐使用 `mkcert` 工具快速生成受信任的本地证书。

### 1. 生成证书 (在 Nginx 服务器上)

```bash
# 安装 mkcert
apt update && apt install -y libnss3-tools wget
wget -O /usr/local/bin/mkcert https://dl.filippo.io/mkcert/latest?for=linux/amd64
chmod +x /usr/local/bin/mkcert

# 注册本地 CA
mkcert -install

# 生成证书 (列出所有访问 IP 和内网域名)
mkdir -p /etc/nginx/certs
mkcert -key-file /etc/nginx/certs/key.pem -cert-file /etc/nginx/certs/cert.pem \
  192.168.1.100 patrol.internal.com localhost 127.0.0.1
```

### 2. 终端设备加信 (手机/电脑)

自签名证书必须在访问设备上安装并信任“根证书”后，PWA 的离线功能和 NFC 权限才能被激活。

#### 找到根证书文件
在服务器运行指令查看路径：
```bash
mkcert -CAROOT
# 通常在 /root/.local/share/mkcert/rootCA.pem
```

#### Windows 安装
1. 将 `rootCA.pem` 重命名为 `rootCA.crt`。
2. 右键点击“安装证书” -> 选择“本地计算机”。
3. **关键**：选择“将所有的证书都放入下列存储”，浏览并选中 **“受信任的根证书颁发机构”**。
4. 重启浏览器。

#### 手机 (Android/iOS) 安装
1. 通过微信或浏览器将 `rootCA.pem` 下载到手机。
2. **Android**: 进入“设置” -> “安全/加密” -> “安装证书” -> “CA 证书”。
3. **iOS**: 下载描述文件后，在“设置”中完成安装，并到“关于本机”的“证书信任设置”中开启手动开关。

### 3. 注意事项
* **PWA 环境**: 证书必须包含 `SAN (Subject Alternative Name)`。使用 `mkcert` 会自动处理这点，避免 Chrome 报错。
* **刷新机制**: 如果更换了内网 IP，必须重新执行 `mkcert` 生成步骤。
