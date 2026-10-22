// Status akun: paket, masa aktif, pemakaian hari ini, dan daftar paket.
const { PLANS, PLAN_DAYS, json, user, account, currentPlan, usageToday } = require("../lib/common");

exports.handler = async (event, context) => {
  const u = user(context);
  if (!u) return json(401, { error: "Silakan masuk terlebih dahulu.", code: "AUTH" });
  const plan = await currentPlan(u.id);
  const acc = await account(u.id);
  return json(200, {
    email: u.email,
    plan,
    planName: PLANS[plan].name,
    planExpires: plan === "gratis" ? null : acc.planExpires,
    used: await usageToday(u.id),
    limit: PLANS[plan].daily,
    modes: PLANS[plan].modes,
    plans: Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, { name: p.name, price: p.price, daily: p.daily, modes: p.modes }])),
    planDays: PLAN_DAYS,
  });
};
