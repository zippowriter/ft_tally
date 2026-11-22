# AGENTS.md

## Web の規約

- DOM API と `File` の使用は Web 層に限る。`app.js` は `<script type="module">` で読み込み、`src/core/` のモジュールをそのままインポートする。
- CSV の値を DOM に挿入するときは `textContent` を使い、`innerHTML` は使わない。
- 表の見出しのクリックは、表に1つだけリスナーを登録して処理する（イベント委譲）。
- パースエラーなどはページ上に表示し、コンソールに未捕捉例外を出さない。
