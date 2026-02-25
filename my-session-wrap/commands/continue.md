---
description: 최신 handoff를 읽고 이전 세션 컨텍스트를 재수립
allowed-tools: Read, Glob, AskUserQuestion
plugin: my-session-wrap
---

# Session Continue (/continue)

이전 세션의 handoff를 자동으로 찾아 읽고, 컨텍스트를 재수립합니다.

## 실행 흐름

1. `handoff/handoff_*.md` Glob으로 검색 → 파일명 기준 최신순 정렬
2. 당일 파일이 2개 이상이면 AskUserQuestion으로 선택, 아니면 최신 1개 자동 선택
3. 선택된 handoff를 Read로 읽기
4. 요약 출력:
   - **작업 목표**: §1에서 추출
   - **현재 상태**: 진행 현황 테이블
   - **시작점**: 다음 세션 시작점
   - **알려진 제약**: §6 환경 스냅샷 (있을 경우)
5. "위 컨텍스트로 시작할까요?" AskUserQuestion 확인
6. 승인 시 handoff의 "다음 세션 시작점"부터 작업 개시
