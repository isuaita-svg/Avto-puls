import crypto from "node:crypto";

const PASS_2 = "DQvG71mUqD9qawC3V0wC";
const FS_PROJECT = "vodniyuhta";
const FS_API_KEY = "AIzaSyATMVgWBe34jYISjKF_eG8-BbFAdIfr0rA";

export default async function handler(req, res) {
  const data = req.method === "POST" ? (req.body || {}) : req.query;
  const outSum = String(data.OutSum || "");
  const invId = String(data.InvId || "");
  const sig = String(data.SignatureValue || "").toLowerCase();
  const shpDays = parseInt(data.Shp_days || "1", 10);
  const shpPhone = String(data.Shp_phone || "").trim();

  const expected = crypto
    .createHash("md5")
    .update(`${outSum}:${invId}:${PASS_2}:Shp_days=${shpDays}:Shp_phone=${shpPhone}`)
    .digest("hex")
    .toLowerCase();

  if (sig !== expected) return res.status(400).send("bad sign");

  const fsBase = `https://googleapis.com{FS_PROJECT}/databases/(default)/documents/drivers`;
  const listRes = await fetch(`${fsBase}?pageSize=100&key=${FS_API_KEY}`);
  const listData = await listRes.json();
  const found = (listData.documents || []).find(d => d.fields?.phone?.stringValue?.trim() === shpPhone);
  const addMs = shpDays * 24 * 60 * 60 * 1000;

  if (found) {
    const docId = found.name.split("/").pop();
    const curExp = Number(found.fields?.expiresAt?.integerValue || 0);
    const newExp = Math.max(Date.now(), curExp) + addMs;
    await fetch(`${fsBase}/${docId}?updateMask.fieldPaths=expiresAt&updateMask.fieldPaths=trialUsed&key=${FS_API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { expiresAt: { integerValue: String(newExp) }, trialUsed: { stringValue: "yes" } } })
    });
  } else {
    const pin = shpPhone.replace(/\D/g, "").slice(-4) || "1234";
    await fetch(`${fsBase}?key=${FS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          phone: { stringValue: shpPhone },
          pin: { stringValue: pin },
          trialUsed: { stringValue: "yes" },
          expiresAt: { integerValue: String(Date.now() + addMs) }
        }
      })
    });
  }

  res.status(200).send(`OK${invId}`);
}
