# Nginx 설정 (DigitalOcean 등)

See VAR 앱 앞단에 **nginx**를 두고 배포할 때, 모멘트/댓글 **사진·영상 업로드**가 동작하려면 요청 body 크기 제한을 넉넉히 잡아야 합니다.

---

## 413 Request Entity Too Large

업로드 시 **413 Request Entity Too Large**가 나오면, nginx가 요청 본문 크기를 제한하고 있는 상태입니다.  
앱에서는 **사진·영상 최대 50MB**까지 허용하므로, nginx도 그에 맞춰 설정합니다.

### 설정 방법

nginx 설정 파일(예: `/etc/nginx/sites-available/seevar` 또는 `nginx.conf`)의 **http** 블록 또는 **server** 블록에 다음을 추가합니다.

```nginx
client_max_body_size 50M;
```

- **http** 블록에 넣으면 전역 적용
- **server** 블록에 넣으면 해당 서버(가상 호스트)에만 적용

예시 (server 블록):

```nginx
server {
    listen 80;
    server_name dev.seevar.online;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 적용

설정 변경 후 nginx 재시작 또는 리로드:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 참고

- 앱 내 업로드 제한: `lib/actions/upload-moment-media.ts`의 `MAX_FILE_SIZE_MB` (50MB)
- 이 값보다 `client_max_body_size`를 같거나 크게 두는 것을 권장합니다.
