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
