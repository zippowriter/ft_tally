# AGENTS.md

## 課題の規約

実装・テストの変更前に、[課題文](docs/ft_tally.md)の Chapter III「共通の指示」と、Chapter IV の該当する機能仕様を確認する。変更後は、テスト結果とあわせて差分が該当する規約を満たすことを確認する。

### 全体

- Node.js は LTS 版の v22 以上を対象とし、ブラウザは最新版の Chrome または Firefox で動作させる。
- ES モジュールのみを使用し、`package.json` に `"type": "module"` を指定する。`require` は使わない。
- 外部パッケージ、バンドラー、トランスパイラは使わない。`package.json` に `dependencies` や `devDependencies` を記載しない。
- `var`、`==`、`!=`、グローバル変数を使わない。モジュールのトップレベルで再代入される `let` も使わない。
- 1つの関数は30行以内に収める。
- 入力に起因するエラーを捕捉し、未捕捉例外による異常終了を防ぐ。
- 提出ファイル名とディレクトリ構成は Chapter IV に従う。ローカルの静的配信用サーバーは提出物に含めない。

## ディレクトリ別の規約

ルートから作業を始める場合も、変更対象のパスに対応する `AGENTS.md` を編集前に読む。複数のディレクトリを変更する場合は、それぞれの規約を確認する。

- コア：[src/core/AGENTS.md](src/core/AGENTS.md)
- CLI：[bin/AGENTS.md](bin/AGENTS.md)
- Web：[web/AGENTS.md](web/AGENTS.md)
- テスト：[test/AGENTS.md](test/AGENTS.md)
