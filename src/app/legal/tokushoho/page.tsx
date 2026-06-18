import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | Ehoria",
  description: "Ehoria（エホリア）の特定商取引法に基づく表記です。",
};

export default function TokushohoPage() {
  return (
    <>
      <h1>特定商取引法に基づく表記</h1>
      <p className="legal-updated">最終更新日：2026年6月18日</p>

      <table className="legal-table">
        <tbody>
          <tr>
            <th>販売事業者</th>
            <td>菊地 峻佑</td>
          </tr>
          <tr>
            <th>運営責任者</th>
            <td>菊地 峻佑</td>
          </tr>
          <tr>
            <th>所在地</th>
            <td>請求があれば遅滞なく開示します。</td>
          </tr>
          <tr>
            <th>電話番号</th>
            <td>請求があれば遅滞なく開示します。</td>
          </tr>
          <tr>
            <th>メールアドレス</th>
            <td>Ehoria@gmail.com</td>
          </tr>
          <tr>
            <th>販売価格</th>
            <td>
              各プラン・商品ごとに、お申し込み画面にて表示します。主な価格は以下のとおりです（すべて税込）。
              <ul>
                <li>スタンダードプラン：月額 1,480円</li>
                <li>プレミアムプラン：月額 2,980円</li>
                <li>絵本の単品購入（かんたんカスタム）：1,500円</li>
                <li>絵本の単品購入（Photo Story）：2,000円</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th>商品代金以外の必要料金</th>
            <td>
              本サービスのご利用にあたり発生するインターネット接続料金・通信料金等は、お客様のご負担となります。
            </td>
          </tr>
          <tr>
            <th>支払方法</th>
            <td>クレジットカード決済（決済代行：Stripe, Inc.）</td>
          </tr>
          <tr>
            <th>支払時期</th>
            <td>
              月額プランは、お申し込み時に初回分を決済し、以降は毎月の更新日に自動で決済されます。単品購入は、お申し込み時に決済します。
            </td>
          </tr>
          <tr>
            <th>商品の引渡時期</th>
            <td>
              決済完了後、本サービス上で絵本の生成をご利用いただけます。生成された絵本は、生成処理の完了後すぐに閲覧可能です。
            </td>
          </tr>
          <tr>
            <th>返品・キャンセル・解約について</th>
            <td>
              本サービスはデジタルコンテンツの性質上、絵本の生成後の返金・キャンセルはお受けできません。月額プランはいつでも解約できますが、解約後も当該請求期間の終了日まで利用可能であり、日割りでの返金は行いません。
            </td>
          </tr>
          <tr>
            <th>動作環境</th>
            <td>
              最新版の主要ウェブブラウザ（Google Chrome、Safari、Microsoft Edge 等）でのご利用を推奨します。
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
