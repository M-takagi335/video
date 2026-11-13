# Motion Studio

ブラウザでMVを制作する編集ツールです。現在は第1段階の基本エディタです。

## PCで起動する

1. Node.js 22 と npm が使える環境を用意します。
2. PowerShellで、この README と package.json がある motion-studio フォルダを開きます。
3. 次のコマンドを実行します。

```powershell
npm.cmd install
npm.cmd run dev
```

ターミナルに表示された Local のURLをブラウザで開きます。終了するときはターミナルで Ctrl+C を押します。Macなどでは npm.cmd の代わりに npm を使います。

## 基本操作

- 起動時のサンプルを編集するか、左側からテキストや図形を追加します。
- キャンバスでドラッグして移動し、四隅のハンドルでサイズを変えます。上の丸いハンドルで回転します。Shift + クリックで複数選択できます。
- 右側のプロパティで位置・回転・色・文字を編集します。数値やテキストは入力欄の外をクリックすると反映されます。キャンバスタブで比率、背景色、尺を設定できます。
- タイムラインの目盛りをドラッグして時刻を移動します。クリップ中央で移動、両端で開始・終了を調整します。上端をドラッグすると高さが変わり、見出しボタンで折りたためます。
- Ctrl+Zで元に戻す、Ctrl+Shift+Zでやり直す、Ctrl+Dで複製、Ctrl+C / Ctrl+Vでコピー・貼り付け、Deleteで削除、左右キーで1フレームずつ移動できます。

変更は開いているセッション内で保持します。再読み込みするとサンプルに戻ります。アニメーション、音声、テンプレート、保存、動画出力は今後の段階で追加します。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| index.html | ブラウザが最初に読み込むページ |
| package.json / package-lock.json | 利用するパッケージと起動・検証・ビルドコマンド |
| vite.config.ts / tsconfig.json | 開発サーバー、ビルド、型チェックの設定 |
| vercel.json / .gitignore | Vercelのビルド設定とGitに含めないファイル |
| src/main.tsx / src/App.tsx | Reactの起動と編集画面全体 |
| src/Canvas.tsx / src/Inspector.tsx / src/Timeline.tsx | キャンバス、設定パネル、タイムライン |
| src/model.ts / src/editor.ts | プロジェクトデータと画面に依存しない編集処理 |
| src/useProject.ts / src/styles.css | 編集履歴を管理するReactフックと画面のスタイル |
| 開発仕様書.md | 段階別計画と将来のWindows版の方針 |

## ビルド

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

ビルド結果は dist フォルダに作成されます。preview はこの結果を確認するためのローカルサーバーです。

## GitHubからVercelへ公開する

1. GitHub Desktopで新規リポジトリを作り、このフォルダの中身をルートに配置します。既にリポジトリがある場合は、その作業フォルダに配置します。package.json がルートにあることを確認してください。
2. GitHub Desktopで変更をコミットし、GitHubへ Publish repository または Push origin で反映します。.gitignore で node_modules と dist は除外されます。
3. Vercelで新しいプロジェクトを作成し、GitHubリポジトリをインポートします。Framework Presetは Vite、Build Commandは npm run build、Output Directoryは dist です。リポジトリ内に motion-studio をサブフォルダとして置いた場合は Root Directory に指定します。
4. Deployを実行し、発行されたURLで確認します。サーバー側の環境変数やデータベースは不要です。

Windows版は、Web版完成後にユーザーが制作を明示的に依頼した時点で開始します。今後追加する保存と読み込みは独立モジュールにし、プロジェクト形式と編集処理を両環境で共用できるようにします。
