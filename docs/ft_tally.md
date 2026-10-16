# 【入門】ft\_tally — JavaScriptのメンタルモデルを獲得する

Oct 16, 2026 · @河野 陽日

## Chapter I　序章

JavaScriptは1995年、Webページに少しの動きを加えるための言語として、ごく短期間で設計されました。その出自ゆえに、他言語の常識で書くと思わぬ挙動に出会います。`Number("")` は `0` を返し、`typeof null` は `"object"` を返します。

一方でこの言語は、同じコードがブラウザでもサーバーでも動くという、他の言語がなかなか持てない性質を手に入れました。本課題では、その「癖」と「強み」の両方に正面から向き合います。

## Chapter II　はじめに

本課題では、CSVを集計する小さなツール `ft_tally` を作ります。集計ロジック（コア）は1つだけ書き、それをNode.jsのCLIとブラウザのビューアの両方から利用します。

この課題を通じて、次のことを身につけます。

- 言語仕様（ECMAScript）と実行環境のAPI（`fs`、DOMなど）を区別し、環境に依存しないコードを書く
- プリミティブとオブジェクトの違い、`null` と `undefined`、暗黙の型変換を正しく扱う
- `let` / `const` によるブロックスコープと、関数を値として扱うクロージャ
- `map` / `filter` / `reduce`、分割代入、スプレッド構文による宣言的なデータ処理
- ESモジュールによるコードの分割と再利用
- DOMイベントに反応するUIの構築

他言語の直訳ではなく、JavaScriptらしいコードで書くことが評価の中心です。

## Chapter III　共通の指示

以下のいずれかに違反した場合、評価は0点となります。

- Node.jsはLTS版（v22以上）、ブラウザは最新版のChromeまたはFirefoxで動作すること。
- モジュールはESモジュールのみを使う。`package.json` に `"type": "module"` を指定し、`require` は使わない。
- 外部パッケージは一切使用禁止。`package.json` に `dependencies` / `devDependencies` を書いてはならない。バンドラーやトランスパイラも使わない。
- `var` の使用禁止。`==` と `!=` の使用禁止。
- グローバル変数（モジュールのトップレベルで再代入される `let` を含む）の使用禁止。
- `src/core/` 配下では `for`、`for...in`、`for...of`、`while`、`do...while` を使ってはならない。繰り返しは配列メソッドで表現すること。
- `src/core/` 配下のコードは `process`、`fs`、`document`、`window` などの環境固有APIを参照してはならない。
- 1つの関数は30行以内とする。
- どのような入力に対しても、捕捉されない例外でプログラムが異常終了してはならない。エラー時はメッセージを標準エラー出力に表示し、終了コード1で終了すること。

静的ファイルの配信には任意のローカルサーバー（例: `python3 -m http.server`）を使ってよい。ESモジュールは `file://` から読み込めないためです。サーバーは提出物に含めません。

## Chapter IV　必須パート

| 項目 | 内容 |
| --- | --- |
| プログラム名 | `ft_tally` |
| 提出ファイル | `package.json`, `bin/ft_tally.js`, `src/core/*.js`, `web/index.html`, `web/app.js` |
| 使用可能なAPI | ECMAScript標準の組み込みオブジェクトすべて。CLI層のみ `node:fs`, `node:process`。Web層のみDOM API, `File` |
| 外部パッケージ | なし |
| 概要 | CSVを読み込み、絞り込み・グループ化・集計を行う。同じコアをCLIとブラウザで共有する |

```
ft_tally/
├── package.json
├── bin/ft_tally.js      # CLI層: 引数解析、ファイル読み込み、出力
├── src/core/            # コア: 環境非依存の純粋なロジック
│   ├── csv.js
│   ├── types.js
│   └── query.js
└── web/
    ├── index.html
    └── app.js           # Web層: DOM操作とイベント処理
```

### IV.1　CSVパーサ（`src/core/csv.js`）

`parseCsv(text)` を実装し、`{ header, rows }` を返すこと。`header` は文字列の配列、`rows` は列名をキーとするオブジェクトの配列です。

- 1行目はヘッダとする。区切り文字はカンマ、改行は `\n` と `\r\n` の両方に対応する。
- ダブルクォートで囲まれたフィールドは、カンマや改行を含んでよい。`""` は1つの `"` として扱う。
- 閉じられていないクォートや、列数がヘッダと一致しない行はエラーとし、行番号を含むメッセージを出すこと。

### IV.2　型推論（`src/core/types.js`）

各セルの文字列を、次の規則で値に変換すること。暗黙の型変換に頼った実装は認めません。

| 入力 | 変換後 |
| --- | --- |
| 空文字列、空白のみ | `null`（欠損値。`0` にしてはならない） |
| `42`, `-3.5`, `7`, `1e3` | 数値 |
| `NaN`, `Infinity`, `0x1F`, `12abc` | 文字列のまま |
| `true`, `false` | 真偽値 |
| それ以外 | 文字列 |

ある列のすべての非欠損値が数値であるとき、その列を数値列とみなします。

### IV.3　クエリ（`src/core/query.js`）

`createQuery(rows)` を実装すること。戻り値はメソッドチェーンで条件を組み立てられるオブジェクトです。

```js
const result = createQuery(rows)
  .where((row) => row.device === "tv")
  .groupBy("genre")
  .aggregate({ total: ["sum", "minutes"], n: ["count"] })
  .sortBy("total", "desc")
  .limit(5)
  .run();
```

- 各メソッドは新しいクエリオブジェクトを返し、元のクエリと `rows` を一切変更してはならない。同じクエリから異なる分岐を作っても、互いに影響しないこと。
- クエリの内部状態はクロージャで保持し、外部から直接書き換えられないこと。`class` は使わない。
- 集計関数は `count`, `sum`, `avg`, `min`, `max` を実装する。`null` は集計から除外する。
- 数値でない列に `sum` などを指定した場合は、列名を含むエラーにする。

### IV.4　CLI（`bin/ft_tally.js`）

```
node bin/ft_tally.js <file.csv> [--where col=value]... [--group-by col]
  [--count] [--sum col] [--avg col] [--min col] [--max col]
  [--sort col:asc|desc] [--limit n] [--format table|json]
```

- `--where` は複数指定でき、すべてを満たす行に絞り込む。値の比較は型推論後の値で行う。
- `--format table`（既定）は列幅を揃えた表、`--format json` は `JSON.stringify` による整形済みJSONを出力する。
- 存在しないファイル、未知の列名、不正なオプションはすべてエラーとして扱う。

```
$ node bin/ft_tally.js views.csv --group-by genre --sum minutes --sort sum_minutes:desc --limit 3
genre    sum_minutes
anime         18230
drama         12004
news           3310
```

### IV.5　ブラウザビューア（`web/`）

`web/app.js` は `<script type="module">` として読み込まれ、`src/core/` のモジュールを書き換えずにそのままimportすること。

- `<input type="file">` でCSVを選択すると、ヘッダを元にグループ化列と集計列のセレクトボックスを動的に生成する。
- 条件を変更するたびに、ページを再読み込みせず結果の表を再描画する。
- 結果の表の見出しをクリックすると、その列で昇順・降順を切り替えて並べ替える。リスナーは見出しごとではなく表に1つだけ登録すること（イベント委譲）。
- CSVの値をDOMに挿入するときは `textContent` を使い、`innerHTML` を使ってはならない。
- パースエラーなどはページ上に表示し、コンソールに捕捉されない例外を出さないこと。

## Chapter V　ボーナスパート

ボーナスパートは、必須パートが完璧である場合にのみ評価されます。必須パートに1つでも不備があれば、ボーナスは評価しません。

- 複数列でのグループ化（`--group-by genre,device`）と、集計結果に対する絞り込み（`--having "sum_minutes>1000"`）。
- ISO 8601形式の日時列を `Date` として扱い、`--bucket day|month` で期間ごとに集計する。タイムゾーンの扱いを `--tz` で指定できること。
- ブラウザビューアの状態（選択中の列、並び順）を `URLSearchParams` でURLに反映し、リロードやURL共有で同じ表示を再現する。
- ドラッグ＆ドロップによるCSVの読み込み。

## Chapter VI　提出とピア評価

提出は指定のGitリポジトリで行います。評価はリポジトリ内のファイルのみを対象とし、ファイル名とディレクトリ構成が指定どおりであることを確認してください。

評価者は動作確認に加え、被評価者に以下を口頭で説明させます。説明できない項目がある場合、その項目に関連する機能は動作していても不合格とします。

1. `Number("")`、`Number(" ")`、`parseInt("12abc")` がそれぞれ何を返すか。そのうえで、IV.2の規則をどう実装したか。
2. `typeof null` と `typeof undefined` の結果、および欠損値に `null` を選んだ理由。
3. `const` で宣言したオブジェクトの中身は変更できるか。クエリの不変性をどう保証したか。
4. `createQuery` の内部状態が外から書き換えられない理由を、クロージャの観点で説明する。
5. `src/core/` がNode.jsとブラウザの両方で動くのはなぜか。`fs` を1行でもimportしたら何が起きるか。
6. イベント委譲の仕組みと、`innerHTML` を避けた理由。

評価者は、その場で小さな変更を依頼することがあります（例: 集計関数 `median` の追加、`--where` に `!=` を追加）。
