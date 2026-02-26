# 플러그인 중복 호출 문제 해결 - example-skills

**일자:** 2026-02-26
**상태:** 해결 완료

---

## 문제 증상

Claude Code의 스킬 목록(`/`)에 동일한 스킬이 두 번씩 표시됨:

```
/webapp-testing    (document-skills) Toolkit for interacting with local web...
/webapp-testing    (example-skills)  Toolkit for interacting with local web...
/web-artifacts-builder  (document-skills) ...
/web-artifacts-builder  (example-skills) ...
```

---

## 원인 분석

### 설치 상태

`anthropics/skills` 레포에서 두 플러그인을 각각 설치:
- `document-skills@anthropic-agent-skills`
- `example-skills@anthropic-agent-skills`

### 레포 구조

```
https://github.com/anthropics/skills
└── .claude-plugin/
│   └── marketplace.json  ← 1개 파일에 2개 플러그인 선언
└── skills/               ← 16개 스킬 폴더 (구분 없이 한곳에)
    ├── docx, pdf, pptx, xlsx          (document-skills 소속)
    └── algorithmic-art, webapp-testing, ... (example-skills 소속)
```

### marketplace.json 구조

```json
{
  "name": "anthropic-agent-skills",
  "plugins": [
    {
      "name": "document-skills",
      "source": "./",
      "skills": ["./skills/xlsx", "./skills/docx", "./skills/pptx", "./skills/pdf"]
    },
    {
      "name": "example-skills",
      "source": "./",
      "skills": ["./skills/algorithmic-art", ..., "./skills/webapp-testing"]
    }
  ]
}
```

### 중복 발생 메커니즘

설치 시 레포 전체가 각 플러그인 폴더에 복사됨:
- `cache/anthropic-agent-skills/document-skills/.../` → skills/ 폴더에 4개만 존재
- `cache/anthropic-agent-skills/example-skills/.../` → skills/ 폴더에 12개만 존재

그런데 **marketplace.json은 양쪽 모두 동일** (2개 플러그인 전부 선언).
→ Claude Code가 각 설치본의 marketplace.json을 읽을 때 16개씩 등록
→ 두 설치본 합산 **32개 등록** (실제 16개의 2배)

### Anthropic이 2개로 분리한 이유

라이선스가 다름:
| 플러그인 | 라이선스 |
|---|---|
| `document-skills` (docx/pdf/pptx/xlsx) | **Proprietary** (© Anthropic, All rights reserved) |
| `example-skills` (나머지 12개) | **Apache 2.0** (오픈소스) |

문서 처리 스킬은 상업적 가치 보호, 나머지는 커뮤니티 참고용으로 공개.

---

## 핵심 발견

**어느 한쪽만 활성화해도 16개 스킬 전부 사용 가능.**

이유: marketplace.json의 `"source": "./"` 설정으로 각 설치본이 상대 플러그인의 스킬도 선언함.
실제 파일 존재 여부와 무관하게 marketplace.json 기준으로 스킬을 등록하는 Claude Code 동작 방식.

---

## 해결 방법

**`example-skills`를 disable**

```
/plugin → example-skills → Disable
```

결과: `document-skills` 하나로 16개 스킬 전부 정상 작동 확인.

---

## 검증

- `example-skills` disable 후 `/` 목록에서 중복 항목 사라짐
- `document-skills:web-artifacts-builder` (원래 example-skills 소속) → 정상 발동 확인
- `document-skills:docx` (원래 소속 스킬) → 정상 발동 확인

---

## 주의사항

- `/plugin update` 시 marketplace.json이 원본으로 복원되더라도, **disable 상태는 별도 설정으로 유지될 가능성이 높음** (플러그인 캐시와 활성화 상태가 분리 관리됨)
- `example-skills`를 **uninstall하지 않아도 됨** (disable만으로 충분)
- 만약 `example-skills`를 re-enable하면 중복 문제 재발

---

## 관련 파일 경로

```
캐시 위치:
C:\Users\ahnbu\.claude\plugins\cache\anthropic-agent-skills\
├── document-skills\1ed29a03dc85\
│   ├── .claude-plugin\marketplace.json
│   └── skills\ (docx, pdf, pptx, xlsx)
└── example-skills\1ed29a03dc85\
    ├── .claude-plugin\marketplace.json
    └── skills\ (algorithmic-art, brand-guidelines, ..., webapp-testing)

플러그인 설치 정보:
C:\Users\ahnbu\.claude\plugins\installed_plugins.json
```
