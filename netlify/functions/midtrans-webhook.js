// Notifikasi dari Midtrans. Paket hanya diaktifkan setelah pembayaran terverifikasi.
const crypto = require("crypto");
const { PLAN_DAYS, json, db, account } = require("../lib/common");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Metode tidak diizinkan." });

  let n;
  try { n = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Format tidak valid." }); }

  // Verifikasi tanda tangan agar notifikasi palsu ditolak
  const expected = crypto.createHash("sha512")
    .update(String(n.order_id) + String(n.status_code) + String(n.gross_amount) + process.env.MIDTRANS_SERVER_KEY)
    .digest("hex");
  if (expected !== n.signature_key) return json(403, { error: "Tanda tangan tidak valid." });

  const paid = n.transaction_status === "settlement" ||
    (n.transaction_status === "capture" && n.fraud_status === "accept");
  if (!paid) return json(200, { ok: true });

  const order = await db().get(`order:${n.order_id}`, { type: "json" });
  if (!order || order.status === "paid") return json(200, { ok: true });

  order.status = "paid";
  await db().setJSON(`order:${n.order_id}`, order);

  // Tambah masa aktif jika paket yang sama masih berjalan; jika tidak, mulai dari sekarang
  const acc = await account(order.uid);
  const base = acc.plan === order.plan && acc.planExpires && acc.planExpires > Date.now()
    ? acc.planExpires : Date.now();
  await db().setJSON(`acc:${order.uid}`, {
    plan: order.plan,
    planExpires: base + PLAN_DAYS * 24 * 3600 * 1000,
  });

  return json(200, { ok: true });
};
                                        
