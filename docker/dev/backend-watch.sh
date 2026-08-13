#!/bin/bash
# バックエンドのソース(backend/src)を監視し、変更があるたびに再コンパイルするスクリプト。
# Spring Boot DevTools が target/classes の変化を検知して、アプリを自動で再起動してくれる。
# 使い方: make backend-dev (このスクリプトを呼び出す)

set -e
cd "$(dirname "$0")/../../backend"

echo "[backend-watch] Spring Bootアプリを起動します..."
mvn spring-boot:run &
SPRING_PID=$!

cleanup() {
  echo "[backend-watch] 終了します..."
  kill "$SPRING_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[backend-watch] src配下の変更を監視中... (Ctrl+Cで終了)"
while inotifywait -r -e modify,create,delete,move src >/dev/null 2>&1; do
  echo "[backend-watch] 変更を検知、再コンパイルします..."
  mvn -q compile || echo "[backend-watch] コンパイルエラーが発生しました。修正して保存してください。"
done

wait "$SPRING_PID"
