# 외부 크롤러 API 사용 가이드 (External API Guide)

이 문서는 See VAR 시스템의 데이터를 외부 크롤러 또는 자동화 도구에서 동기화하기 위한 API 명세를 설명합니다.

## 1. 인증 (Authentication)

모든 API 요청은 환경변수 `CRAWLER_API_KEY`에 설정된 비밀키를 헤더에 포함해야 합니다.

- **방법 1**: `Authorization: Bearer <YOUR_API_KEY>`
- **방법 2**: `x-crawler-api-key: <YOUR_API_KEY>`

---

## 2. 정보 조회 및 매핑 API

크롤러가 가지고 있는 텍스트 데이터(팀명, 심판명)를 시스템의 내부 ID와 매칭하기 위해 사용합니다.

### 2.1 경기 일정 조회
- **Endpoint**: `GET /api/schedule`
- **Query Parameters**:
  - `year`: 시즌 연도 (예: `2026`)
  - `league`: 리그 Slug (예: `kleague1`, `kleague2`)
- **Response 예시**:
  ```json
  {
    "ok": true,
    "count": 1,
    "matches": [
      {
        "id": "cm1234567890",
        "year": 2026,
        "leagueSlug": "kleague1",
        "homeTeamName": "울산 HD FC",
        "awayTeamName": "전북 현대 모터스",
        "playedAt": "2026-03-01T05:00:00.000Z",
        "status": "SCHEDULED",
        "scoreHome": 0,
        "scoreAway": 0
      }
    ]
  }
  ```

### 2.2 심판 검색
- **Endpoint**: `GET /api/referees/search`
- **Query Parameters**:
  - `name`: 검색할 심판 이름
- **Response 예시**:
  ```json
  {
    "ok": true,
    "referees": [
      {
        "id": "ref-cuid-123",
        "name": "김우성",
        "slug": "kim-useong",
        "link": "https://namu.wiki/w/..."
      }
    ]
  }
  ```

### 2.3 팀 검색
- **Endpoint**: `GET /api/teams/search`
- **Query Parameters**:
  - `name`: 검색할 팀 이름
- **Response 예시**:
  ```json
  {
    "ok": true,
    "teams": [
      {
        "id": "team-cuid-456",
        "name": "FC 서울",
        "slug": "fc-seoul",
        "emblemPath": "/images/emblems/seoul.png"
      }
    ]
  }
  ```

### 2.4 신규 심판 등록
- **Endpoint**: `POST /api/referees`
- **Request Body**:
  ```json
  {
    "name": "홍길동",
    "link": "https://namu.wiki/..."
  }
  ```
- **Response 예시**:
  ```json
  {
    "ok": true,
    "referee": {
      "id": "ref-new-789",
      "name": "홍길동",
      "slug": "hong-gildong",
      "link": "https://namu.wiki/..."
    }
  }
  ```

---

## 3. 라운드 및 경기 상태 관리 API

### 3.1 포커스 라운드 변경
- **Endpoint**: `POST /api/rounds/focus`
- **Request Body** (ID 기반):
  ```json
  { "roundId": "clx12345..." }
  ```
- **Response 예시**:
  ```json
  {
    "ok": true,
    "message": "Round clx12345... is now the focus round."
  }
  ```

### 3.2 경기 상태 업데이트
- **Endpoint**: `PATCH /api/matches/{matchId}/status`
- **Request Body**:
  ```json
  { "status": "LIVE" } 
  ```
- **Response 예시**:
  ```json
  {
    "ok": true,
    "match": {
      "id": "cm12345...",
      "status": "LIVE",
      "updatedAt": "2026-04-12T10:00:00Z"
    }
  }
  ```

---

## 4. 경기 상세 데이터 동기화 API

### 4.1 심판 배정
- **Endpoint**: `POST /api/matches/{matchId}/referees`
- **Request Body**:
  ```json
  {
    "referees": [
      { "id": "ref-id-1", "role": "MAIN" },
      { "id": "ref-id-2", "role": "ASSISTANT" },
      { "id": "ref-id-3", "role": "VAR" }
    ]
  }
  ```
- **Response 예시**:
  ```json
  {
    "ok": true,
    "message": "Successfully assigned 3 referees to match cm12345..."
  }
  ```

### 4.2 경기 결과 업데이트
- **Endpoint**: `PATCH /api/matches/{matchId}/result`
- **Request Body**:
  ```json
  {
    "scoreHome": 2,
    "scoreAway": 1,
    "firstHalfExtraTime": 3,
    "secondHalfExtraTime": 5
  }
  ```
- **Response 예시**:
  ```json
  {
    "ok": true,
    "match": {
      "id": "cm12345...",
      "scoreHome": 2,
      "scoreAway": 1,
      "firstHalfExtraTime": 3,
      "secondHalfExtraTime": 5
    }
  }
  ```

### 4.3 카드 정보 업데이트
- **Endpoint**: `PATCH /api/matches/{matchId}/cards`
- **Request Body**:
  ```json
  {
    "homeYellowCards": 2,
    "homeRedCards": 0,
    "awayYellowCards": 1,
    "awayRedCards": 1
  }
  ```
- **Response 예시**:
  ```json
  {
    "ok": true,
    "matchReferee": {
      "id": "mr-id-123",
      "matchId": "cm12345...",
      "role": "MAIN",
      "homeYellowCards": 2,
      "homeRedCards": 0,
      "awayYellowCards": 1,
      "awayRedCards": 1
    }
  }
  ```
  > [!NOTE]
  > 카드 데이터는 해당 경기의 **주심(MAIN) 레코드**에 업데이트됩니다. 배정된 주심이 없을 경우 404 에러가 반환됩니다.
