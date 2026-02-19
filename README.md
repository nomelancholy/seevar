# See VAR

Rails 8 앱. PostgreSQL, Solid Cache, Solid Queue 사용.

## 요구사항

- Ruby 4.0+
- PostgreSQL (로컬 소켓 또는 `localhost:5432`)

## 셋업

```bash
# 의존성 (프로젝트 내 vendor/bundle 사용)
bundle config set --local path 'vendor/bundle'
bundle install

# PostgreSQL 서버가 실행 중인지 확인 후 DB 생성
bundle exec rails db:create
bundle exec rails db:prepare   # 가능하면 스키마 적용
# db/schema.rb 가 없으면 Solid 스키마가 안 올라갈 수 있음 → 아래 실행
bundle exec rails db:load_solid_schemas

# 서버 실행 (Tailwind 단독 빌드 후)
bundle exec rails tailwindcss:build
bundle exec rails server

# 또는 Rails + Tailwind watch 동시 실행 (foreman 필요)
./bin/dev
```

PostgreSQL이 다른 호스트/포트를 쓰면 `config/database.yml`에서 `host`/`port`를 설정하거나 `DATABASE_URL` 환경 변수를 사용하세요.
