# AGENTS.md

## コアの規約

- `for`、`for...in`、`for...of`、`while`、`do...while` を使わない。繰り返しは `map`、`filter`、`reduce`、`forEach` などの配列メソッドで表現する。
- ECMAScript 標準 API のみを使い、`process`、`fs`、`document`、`window` などの環境固有 API を参照しない。同じコアを Node.js とブラウザで使用する。
- 型推論では暗黙の型変換に頼らない。
- クエリの内部状態はクロージャで保持し、`class` は使わない。各メソッドは新しいクエリを返し、元のクエリや `rows` を変更しない。
