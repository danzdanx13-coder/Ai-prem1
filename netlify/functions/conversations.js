// Riwayat chat: daftar, buka, dan hapus.
const { json, user, db, removeFromIndex } = require("../lib/common");

exports.handler = async (event, context) => {
  const u = user(context);
  if (!u) return json(401, { error: "Silakan masuk terlebih dahulu.", code: "AUTH" });
  const id = (event.queryStringParameters || {}).id;

  if (event.httpMethod === "GET" && !id) {
    const list = (await db().get(`idx:${u.id}`, { type: "json" })) || [];
    return json(200, { conversations: list });
  }
  if (event.httpMethod === "GET" && id) {
    const conv = await db().get(`conv:${u.id}:${id}`, { type: "json" });
    if (!conv) return json(404, { error: "Riwayat tidak ditemukan." });
    return json(200, conv);
  }
  if (event.httpMethod === "DELETE" && id) {
    await db().delete(`conv:${u.id}:${id}`);
    await removeFromIndex(u.id, id);
    return json(200, { ok: true });
  }
  return json(405, { error: "Metode tidak diizinkan." });
};
