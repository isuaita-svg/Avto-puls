import crypto from "node:crypto";

const MERCHANT_LOGIN = "avtopulse_uhta";
const PASS_1 = "LEAGQv0O0fj33Zu8YJFg";

export default function handler(req, res) {
  const phone = String(req.query.phone || "").trim();
  const days = parseInt(req.query.days || "1", 10);
  const sum = String(req.query.sum || "300").trim();
  const invId = Math.floor(Date.now() / 1000);
  const desc = `Доступ к информационному сервису АвтоПульс (${days} дн.)`;
  const receipt = JSON.stringify({
    sno: "patent",
    items: [{ name: desc, quantity: 1, sum: Number(sum), payment_method: "full_prepayment", payment_object: "service", tax: "none" }]
  });
  const sig = crypto
    .createHash("md5")
    .update(`${MERCHANT_LOGIN}:${sum}:${invId}:${receipt}:${PASS_1}:Shp_days=${days}:Shp_phone=${phone}`)
    .digest("hex");

  const rkUrl = new URL("https://robokassa.ru");
  rkUrl.searchParams.set("MerchantLogin", MERCHANT_LOGIN);
  rkUrl.searchParams.set("OutSum", sum);
  rkUrl.searchParams.set("InvId", String(invId));
  rkUrl.searchParams.set("Description", desc);
  rkUrl.searchParams.set("Receipt", receipt);
  rkUrl.searchParams.set("SignatureValue", sig);
  rkUrl.searchParams.set("Shp_days", String(days));
  rkUrl.searchParams.set("Shp_phone", phone);

  res.redirect(302, rkUrl.toString());
}
