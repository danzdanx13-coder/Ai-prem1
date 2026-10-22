// Membuat transaksi Midtrans Snap untuk paket yang dipilih.
const crypto = require("crypto");
const { PLANS, json, user, db } = require("../lib/common");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Metode tidak diizinkan." });
  const u = user(context);
  if (!u) return json(401, { error: "Silakan masuk terlebih dahulu.", code: "AUTH" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Permintaan tidak valid." }); }
  const plan = PLANS[body.plan] && body.plan !== "gratis" ? body.plan : null;
  if (!plan) return json(400, { error: "Paket tidak valid." });

  const amount = PLANS[plan].price;
  const orderId = `DZ-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  await db().setJSON(`order:${orderId}`, { uid: u.id, plan, amount, status: "pending" });

  const base = process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";

  try {
    const res = await fetch(`${base}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        item_details: [{ id: plan, price: amount, quantity: 1, name: `damz ai ${PLANS[plan].name} 30 hari` }],
        customer_details: { email: u.email },
        callbacks: { finish: `${process.env.URL}/?paid=1` },
      }),
    });
    const out = await res.json();
    if (!res.ok || !out.redirect_url) return json(502, { error: "Pembayaran belum bisa dibuka. Coba lagi." });
    return json(200, { redirect_url: out.redirect_url });
  } catch {
    return json(502, { error: "Tidak bisa terhubung ke layanan pembayaran." });
  }
};
                      
