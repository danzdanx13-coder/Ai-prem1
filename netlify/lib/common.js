// Bersama: paket, kuota harian, akun, dan penyimpanan (Netlify Blobs).
const { getStore } = require("@netlify/blobs");

const ALL_MODES = ["cepat", "belajar", "cerdas"];
const PLANS = {
  gratis:  { name: "Gratis",  price: 0,      daily: 10,   modes: ["cepat"] },
  pro:     { name: "Pro",     price: 49000,  daily: 100,  modes: ["cepat", "belajar"] },
  premium: { name: "Premium", price: 99000,  daily: 300,  modes: ALL_MODES },
  max:     { name: "Max",     price: 199000, daily: 1000, modes: ALL_MODES },
};
const PLAN_DAYS = 30;

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Pengguna dari token Netlify Identity (sudah diverifikasi oleh Netlify)
const user = (context) => {
  const u = context.clientContext && context.clientContext.user;
  return u ? { id: u.sub, email: u.email } : null;
};

const db = () => getStore("damz-ai");
const today = () => new Date().toISOString().slice(0, 10);

async function account(id) {
  return (await db().get(`acc:${id}`, { type: "json" })) || { plan: "gratis", planExpires: null };
}

// Paket berbayar yang sudah lewat masa aktif kembali menjadi Gratis
async function currentPlan(id) {
  const a = await account(id);
  if (a.plan !== "gratis" && a.planExpires && Date.now() > a.planExpires) return "gratis";
  return PLANS[a.plan] ? a.plan : "gratis";
}

async function useQuota(id, plan) {
  const key = `usage:${id}:${today()}`;
  const n = (await db().get(key, { type: "json" })) || 0;
  if (n >= PLANS[plan].daily) return { ok: false, used: n };
  await db().setJSON(key, n + 1);
  return { ok: true, used: n + 1 };
}

async function usageToday(id) {
  return (await db().get(`usage:${id}:${today()}`, { type: "json" })) || 0;
}

async function updateIndex(uid, entry) {
  const k = `idx:${uid}`;
  let list = (await db().get(k, { type: "json" })) || [];
  list = [entry, ...list.filter((x) => x.id !== entry.id)].slice(0, 200);
  await db().setJSON(k, list);
}

async function removeFromIndex(uid, id) {
  const k = `idx:${uid}`;
  const list = (await db().get(k, { type: "json" })) || [];
  await db().setJSON(k, list.filter((x) => x.id !== id));
}

module.exports = {
  PLANS, PLAN_DAYS, json, user, db, account, currentPlan,
  useQuota, usageToday, updateIndex, removeFromIndex,
};
                             
