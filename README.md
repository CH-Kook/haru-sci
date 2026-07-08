# 하루사이 (Haru-Sci) — 현대인을 위한 최소한의 과학 교양 앱

모든 학습 데이터를 `data/` 폴더의 JSON으로 두고, 앱은 필요한 것만 `fetch`로
불러옵니다. 모바일·데스크탑 모두에서 동작하는 반응형 웹앱입니다.

## 핵심 개념

- **과목 × 태그**: 물·화·생·지 4과목으로 나누되, 주제마다 복수 태그를 달아
  과목을 가로질러(`#에너지`, `#일상` 등) 약한 개념을 모아볼 수 있습니다.
- **학습 단계(stage)**: 한 주제가 중등(ms)·고등(hs)·학부(ug) 여러 단계의
  콘텐츠를 가질 수 있습니다. 사용자의 현재 단계에 맞는 카드·문제만 출제됩니다.
- **진단 평가**: 과목별 진단으로 시작 단계를 정합니다.
- **해금 이야기**: 학습이 쌓이면 그 수준에서 이해되는 과학 이야기가 열립니다.
- **간격 반복(SRS)**: 틀린 문제는 1→3→7→21일 간격으로 다시 출제됩니다.

## 폴더 구조

```
index.html                      앱 본체 (UI·세션·진단·이야기·SRS·저장·백업)
data/
  index.json                    4과목 메타 + 72개 주제(제목·태그·난이도·단계)
  topics/<id>.json              주제별 카드+문제 (학습 시작 시 로드)
  diagnostics/<subject>.json    과목별 진단 문항 (진단 시작 시 로드)
  stories/
    index.json                  이야기 목록 + 해금조건 (시작 시 로드)
    <id>.json                   이야기 본문 (열 때 로드)
```

현재 콘텐츠가 채워진 주제는 5개(그중 `chem-atom`은 중·고·학부 3단계),
이야기 3편, 4과목 진단이 들어 있습니다. 나머지 주제는 "준비 중"입니다.

## 파일을 더블클릭하면 안 됩니다

`index.html`을 더블클릭해 여는 방식(`file://`)은 브라우저 보안정책(CORS) 때문에
`data/`의 JSON을 불러오지 못합니다. 아래 중 하나로 여세요.

- 로컬 테스트: 이 폴더에서 `python -m http.server 8000` 실행 → `localhost:8000`
- 배포: GitHub Pages 등 웹 호스팅에 폴더째 올리기(`index.html`이 최상위)

## 데이터 형식

### data/index.json
```json
{
  "domains": [{ "id":"physics", "name":"물리", "color":"var(--d-physics)", "desc":"..." }],
  "curriculum": {
    "physics": [{ "id":"p1-motion", "title":"속도와 가속도: 빠르기의 과학",
                  "tags":["운동","일상"], "level":1, "ready":true, "stages":["hs"] }]
  }
}
```
- `level`: 주제 내 난이도(1 입문·2 기본·3 심화)
- `stages`: 이 주제가 제공하는 학습 단계 배열(ms 중등·hs 고등·ug 학부)
- `ready`: true면 학습 가능

### data/topics/<id>.json
```json
{
  "id":"chem-atom", "stages":["ms","hs","ug"],
  "cards": [
    { "id":"ca1", "stage":"hs", "title":"...", "body":"...",
      "fig":"<svg ...>...</svg>", "figcap":"...", "example":"..." }
  ],
  "questions": [
    { "id":"ka1", "card":"ca1", "stage":"hs", "level":1, "type":"ox",
      "q":"...", "answer":true, "ex":"..." },
    { "id":"ka2", "card":"ca1", "stage":"hs", "level":2, "type":"choice",
      "q":"...", "choices":["a","b","c","d"], "answer":1, "ex":"...",
      "fig":"<svg ...>...</svg>", "figcap":"..." }
  ]
}
```
- `stage`: 카드/문제가 속한 단계. 세션은 현재 단계 콘텐츠만 뽑습니다.
- `fig`·`figcap`·`example`은 선택. `type`: ox · choice · misc(오개념 판별).

### data/diagnostics/<subject>.json
```json
{ "subject":"chem", "title":"화학 수준 진단",
  "items":[ { "id":"dc_ms1", "stage":"ms", "type":"choice",
              "q":"...", "choices":["..."], "answer":1, "ex":"..." } ] }
```
- 문항은 자체 완결(주제 파일을 따로 안 불러도 됨). ms→hs→ug 순으로 배치.
- 각 단계 정답률로 시작 단계를 추천합니다(기준: 60% 이상 통과).

### data/stories/index.json
```json
{ "stories":[
  { "id":"stardust", "title":"...", "subject":"chem", "stage":"hs", "teaser":"...",
    "unlock":{ "type":"topicsStarted", "scope":["chem-atom"], "count":1 } }
]}
```
해금 조건 type:
- `topicsStarted`: scope 주제 중 학습을 시작한 개수 >= count
- `correctInTopic`: scope 주제에서 맞힌 문제 수 >= count

본문은 data/stories/<id>.json 에 { id, title, stage, body, fig?, figcap?, footer? }.

## 새 콘텐츠 추가

- 주제: data/topics/<id>.json 추가 -> index.json에서 그 주제 ready를 true로,
  stages에 제공 단계 표기.
- 진단 확장: data/diagnostics/<subject>.json에 문항 추가.
- 이야기: data/stories/<id>.json 본문 추가 -> stories/index.json에 메타+해금조건 등록.
- 앱 코드는 건드릴 필요가 없습니다.

## 진도 저장 / 기기 이동

localStorage에 자동 저장. 기기 이동은 통계 탭 -> "데이터 백업 · 기기 이동"의
내보내기/가져오기로 합니다(서버 없이 수동 동기화).

## 다음에 얹을 것 (예정)

- 파이썬 검증/생성 스크립트: 주제·진단·이야기 JSON 자동 생성 + 오류 검사
  (정답 인덱스 범위, 태그/단계 오타, 카드 참조 누락, 해금 scope 유효성 등)
- IndexedDB 오프라인 캐싱 -> PWA(설치형 웹앱)로 마감

## 폰트

- 본문 글꼴은 **런드리고딕(Laundry Gothic)**을 사용합니다. `fonts/` 폴더에
  woff 파일(Regular·Bold)이 포함되어 있고, `@font-face`로 불러옵니다.
- 상업적 이용이 가능한 폰트이며, 라이선스 전문은 `fonts/LaundryGothic-License.pdf`에
  있습니다. 배포 시 이 라이선스 파일을 함께 두는 것을 권장합니다.
- 숫자(스트릭·통계)는 가독성을 위해 IBM Plex Mono를 함께 씁니다.

## 배포 구조 주의

`index.html`, `data/`, `fonts/`가 모두 저장소(또는 배포 루트) 최상위에 나란히
있어야 합니다. 폰트도 `data/`처럼 상대경로로 불러오므로, 더블클릭(file://)이
아니라 로컬 서버나 웹 호스팅(GitHub Pages·Cloudflare Pages)에서 열어야 합니다.
