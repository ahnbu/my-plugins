# message_count_메트릭_분리_및_skip_if_short_기준_조정_계획

> 작성일: 2026-03-10
> 범위: current-session
> 세션: 019cd528-6783-7af0-8966-663004c9b8b8
> 세션 경로: C:/Users/ahnbu/.codex/sessions/2026/03/10/rollout-2026-03-10T09-32-00-019cd528-6783-7af0-8966-663004c9b8b8.jsonl

## 발단: 사용자 요청

사용자는 `extract_session_gaps.js`의 `--skip-if-short` 옵션이 실제로 어떤 기준으로 동작하는지 확인하고자 했다. 이후 `C:\Users\ahnbu\.claude\projects` 아래 Claude 세션 중 `message_count`가 7~9인 사례를 골라 실제로 어느 정도 대화에서 스킵이 발생하는지 점검하도록 요청했다.

검토 과정에서 `b2b46a33-84e1-4cf0-a881-706fa4026eff` 세션은 실제 사용자 입력이 2개뿐인데도 `message_count = 7`로 집계된다는 점이 드러났다. 사용자는 이를 기준으로 "`sessions.message_count`는 당연히 사용자가 입력한 건수라고 생각했는데 실제로는 달랐다. 수정이 필요해 보인다"라고 판단했고, 메트릭 분리와 DB 수정 필요 여부를 추가로 질의했다.

최종적으로 사용자는 다음 결정을 확정했다.

- 기존 `message_count`는 내부 호환 필드로만 유지
- 신규 메트릭 3개 추가
  - `user_entry_count`
  - `user_text_message_count`
  - `tool_result_count`
- `--skip-if-short`와 대시보드 표시는 새 메트릭 기준으로 전환
- `--skip-if-short` short 기준은 `5개 미만`

## 작업 상세내역

이번 세션에서 수행한 비변경 탐색과 확인 내용은 다음과 같다.

1. `extract_session_gaps.js` 구현 확인
   - `--skip-if-short` 옵션이 실제로 존재함을 확인
   - 기존 기준은 `sessions.message_count <= 10`
   - 즉, 스킵 판단은 DB의 `message_count` 컬럼을 직접 참조

2. `C:\Users\ahnbu\.claude\my-claude-plugins\shared` 기반 DB 활용 가능성 확인
   - `SessionDB`가 SQLite 기반 통합 캐시(`sessions.db`)를 사용
   - JSONL 전체 탐색보다 DB 조회가 훨씬 빠르며, 실제 스크립트도 같은 DB를 사용함을 확인

3. `C:\Users\ahnbu\.claude\projects` 아래 `message_count` 7~9 세션 사례 조회
   - 대표 사례 3개를 골라 `message_count` 값, 세션 경로, role 분포를 점검
   - 이 과정에서 `message_count`와 `messages` 테이블 row 수가 다름을 발견

4. `b2b46a33-84e1-4cf0-a881-706fa4026eff` 세션 원인 분석
   - 세션 JSONL에서 `type: "user"` 엔트리 7개를 직접 확인
   - 실제 사용자 텍스트는 2개뿐이었고, 나머지 5개는 `tool_result`가 담긴 user 엔트리였음
   - 따라서 `message_count = 7`은 "실제 사용자 입력 수"가 아니라 "raw user entry 수"라는 사실이 확인됨

5. 집계 로직 확인
   - `session-parser.js`는 `entry.type === "user"`이면 텍스트 유무와 무관하게 `messageCount++`
   - 반면 텍스트 추출 함수는 `text` block만 읽으므로 `tool_result`만 있는 user 엔트리는 빈 텍스트로 남음
   - 이 차이 때문에 "비어 있는 사용자 메시지가 count된 것처럼 보이는" 현상이 발생

6. 영향 범위 탐색
   - `shared/session-db.js`의 `sessions` 스키마와 upsert/row mapping이 `message_count`를 영속 저장함을 확인
   - `my-session-dashboard/index.html`이 `messageCount`를 세션 목록에서 "메시지" 수로 노출함을 확인
   - 따라서 스크립트 단독 수정이 아니라 파서, DB, 대시보드까지 함께 조정해야 한다는 결론에 도달

## 의사결정 기록

### 메트릭 정의 비교

| 메트릭 | 정의 | 용도 |
| --- | --- | --- |
| `message_count` | 기존 legacy 값. raw `user` entry count | 내부 호환 유지 |
| `user_entry_count` | `type === "user"` 엔트리 총수 | 원본 구조 분석 |
| `user_text_message_count` | 실제 사용자 텍스트가 존재하는 user 엔트리 수 | UI 표시, short 판정 |
| `tool_result_count` | user 엔트리 내부 `tool_result` block 수 | 원인 분석, 보조 지표 |

### 검토한 옵션

| 옵션 | 내용 | 판단 |
| --- | --- | --- |
| 기존 `message_count`만 유지 | 구현량은 작지만 의미 왜곡이 계속됨 | 기각 |
| `message_count` 재정의 | UX는 개선되지만 기존 조회/비교 의미가 바뀜 | 기각 |
| `message_count` 호환 유지 + 신규 3개 추가 | 호환성과 정확성을 동시에 확보 가능 | 채택 |

- 결정: `message_count`는 내부 호환 필드로 유지하고, 신규 3개 메트릭을 추가한다.
- 결정: `--skip-if-short`와 대시보드 표시는 `user_text_message_count` 기준으로 전환한다.
- 결정: short 기준은 기존 `message_count <= 10`이 아니라 `user_text_message_count < 5`로 변경한다.
- 근거:
  - 사용자가 기대한 "실제 입력 수"와 시스템의 현재 정의가 다르다.
  - 기존 필드를 삭제하거나 재정의하면 과거 데이터/기존 코드와의 호환성이 깨질 수 있다.
  - 신규 메트릭 분리는 raw 구조 보존과 사용자 의미 정합성을 동시에 만족한다.
- 트레이드오프:
  - DB 스키마 변경과 재동기화가 필요하다.
  - 한동안 legacy 메트릭과 신규 메트릭이 공존해 코드 복잡도가 약간 증가한다.

## 실행 및 검증

현재 세션은 계획 수립과 원인 분석 중심으로 진행되었으며, repo-tracked 상태를 변경하는 구현은 수행하지 않았다.

- 수행한 확인
  - `extract_session_gaps.js` 옵션/조건 정적 분석
  - `shared/session-db.js`, `shared/session-parser.js` 구조 확인
  - `sessions.db` 스키마 및 실제 조회 결과 확인
  - 대표 세션 3건 조회
  - `b2b46a33-84e1-4cf0-a881-706fa4026eff` JSONL 직접 분석
  - 대시보드의 `messageCount` 사용 위치 확인
- 미실행 항목
  - DB 스키마 변경
  - 파서 수정
  - 대시보드 수정
  - `--skip-if-short` 기준 변경 구현
  - 테스트 및 재동기화 검증

## 리스크 및 미해결 이슈

- 기존 `sessions.db`는 신규 컬럼이 없으므로, 자동 `ALTER TABLE` 또는 재생성/재동기화 전략이 필요하다.
- `message_count`를 계속 노출하는 소비 코드가 대시보드 외에 더 있을 수 있다.
- Codex 세션 파서도 메타데이터 shape를 맞출지 여부는 구현 시 동일하게 정리해야 한다.
- 문서/주석/대시보드 라벨에서 "메시지 수" 표현을 그대로 두면 다시 오해가 발생할 수 있다.

## 다음 액션

- `shared/session-parser.js`에서 신규 3개 메트릭 계산 로직 추가
- `shared/session-db.js`에서 `sessions` 스키마, upsert, row mapping 확장
- `sessions.db` 마이그레이션 또는 자동 보강 로직 추가
- `extract_session_gaps.js`의 short 기준을 `user_text_message_count < 5`로 전환
- `my-session-dashboard` 표시를 `user_text_message_count` 중심으로 변경
- 대표 사례 세션으로 파서 결과와 short 판정 회귀 검증
