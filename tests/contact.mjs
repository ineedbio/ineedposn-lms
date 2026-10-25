// Contact / slip channels (round 7x): Facebook (main), IG, LINE as settings with defaults, saved by admins only,
// empty = the defaults (on the web and in emails), and every email footer. Runs on its own throwaway local database.
import assert from "node:assert";
import fs from "node:fs";

export async function run({ BASE, OUTBOX, makeAdmin }) {
  const outbox = () => fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const call = async (action, data, token, device_id = "dev") =>
    (await fetch(BASE + "api/ib", { method: "POST", body: JSON.stringify({ action, data: data || {}, token, device_id, device_info: "Test" }) })).json();
  const ok = (r) => { if (!r.ok) throw new Error(r.error + ": " + r.message); return r.data; };
  let n = 0;
  const t = async (name, fn) => { await fn(); n++; console.log("✓ contact:", name); };
  const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const base = { photo: { mime: "image/png", base64: PNG }, accept_data: true, accept_terms: true, password: "secret123", school: "ร.ร.", grade: "ม.6", dream_faculty: "แพทย์", dream_university: "มหิดล", birthday: "2008-01-01", line_id: "x" };
  let ph = 10;
  const reg = async (email) => {
    ok(await call("register.start", { ...base, phone: "08200000" + ph++, email, first_name: "ก", last_name: "ข", nickname: email.split("@")[0] }));
    const otp = outbox().filter((x) => x.to === email && /^\d{6} /.test(x.subject)).pop().subject.slice(0, 6);
    return ok(await call("register.verify", { email, otp }, null, email));
  };
  const FB = "https://www.facebook.com/profile.php?id=61575435968083", LINE = "https://lin.ee/t3jbjtN";

  await t("config: Facebook / IG / LINE defaults", async () => {
    const c = ok(await call("config"));
    assert.equal(c.contact_fb, FB); assert.equal(c.contact_ig, "ineedbio.official"); assert.equal(c.contact_line, LINE); assert.equal(c.contact_email, "ineedbio1803@gmail.com");
  });
  const S = await reg("stu@x.com");
  await t("every email footer: Facebook INeedBio first, then IG and LINE, links open in a new tab", async () => {
    const h = outbox().filter((x) => x.to === "stu@x.com").pop().html;
    const fb = h.indexOf(FB), ig = h.indexOf("instagram.com/ineedbio.official"), ln = h.indexOf(LINE);
    assert.ok(fb > 0 && ig > fb && ln > ig, "order Facebook → IG → LINE");
    assert.match(h, /มีคำถามหรือแจ้งสลิป ทัก <a [^>]*>Facebook INeedBio<\/a>/);
    assert.ok(!/ineedbiochem|ทัก IG/.test(h));
    assert.equal((h.match(/target="_blank" rel="noopener"/g) || []).length, 3);
  });
  await reg("ad@x.com"); makeAdmin("ad@x.com");
  const adm = ok(await call("login", { email: "ad@x.com", password: "secret123" }, null, "ad@x.com")).token;
  await t("admins save contact_fb / contact_line · students can't · empty = defaults on the web and in emails", async () => {
    assert.equal((await call("admin.settings.save", { contact_fb: "https://x" }, S.token, "stu@x.com")).error, "FORBIDDEN");
    ok(await call("admin.settings.save", { contact_fb: "https://www.facebook.com/test", contact_line: "https://lin.ee/test", contact_ig: "@newig" }, adm, "ad@x.com"));
    let c = ok(await call("config"));
    assert.equal(c.contact_fb, "https://www.facebook.com/test"); assert.equal(c.contact_line, "https://lin.ee/test");
    await new Promise((r) => setTimeout(r, 61000)); // one code a minute per email (the sign-up one went just now)
    ok(await call("password.forgot", { email: "stu@x.com" }));
    let h = outbox().filter((x) => x.to === "stu@x.com").pop().html;
    assert.ok(h.includes("https://www.facebook.com/test") && h.includes("https://lin.ee/test") && h.includes("instagram.com/newig"));
    ok(await call("admin.settings.save", { contact_fb: "", contact_line: " ", contact_ig: "" }, adm, "ad@x.com"));
    c = ok(await call("config"));
    assert.equal(c.contact_fb, FB); assert.equal(c.contact_line, LINE); assert.equal(c.contact_ig, "ineedbio.official");
    await new Promise((r) => setTimeout(r, 61000)); // the reset email can go out once a minute
    ok(await call("password.forgot", { email: "stu@x.com" }));
    h = outbox().filter((x) => x.to === "stu@x.com").pop().html;
    assert.ok(h.includes(FB) && h.includes(LINE) && h.includes("instagram.com/ineedbio.official"));
  });
  console.log(`\n${n} contact tests passed`);
}
