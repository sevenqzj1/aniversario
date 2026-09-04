/* Demonstração: dados persistidos no localStorage deste navegador. Servidor: persistência após confirmação da API. */
(function () {
  "use strict";
  const real = Boolean(window.GESTOR_CONFIG?.api),
    C = Core;
  const DEMO_KEY = "gestor.demo.state.v1",
    LEGACY_WORKSPACE_KEY = "gestor.workspace.v2";
  const ids = () =>
    window.crypto?.randomUUID?.() ||
    "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  const templates = {
    before:
      "Olá {nome}, passando para lembrar que seu {plano} no valor de {valor} vence amanhã ({vencimento}).",
    today:
      "Olá {nome}, seu {plano} no valor de {valor} vence hoje ({vencimento}).",
    after:
      "Olá {nome}, seu {plano} no valor de {valor} venceu em {vencimento}. Podemos ajudar?",
  };
  function seed() {
    const t = C.today();
    return {
      today: t,
      clients: [],
      bills: [],
      tags: [
        { id: "t1", name: "Renovação", archived: false },
        { id: "t2", name: "Acompanhamento especial", archived: false },
      ],
      categories: [
        { id: "k1", name: "Serviços", parent: "", archived: false },
        { id: "k2", name: "Premium", parent: "k1", archived: false },
      ],
      messages: [],
      settings: {
        timezone: "America/Sao_Paulo",
        skipPaid: true,
        whatsappManual: { ready: false, openedAt: "" },
        rules: [
          { key: "before", offset: -1, time: "09:00", enabled: true },
          { key: "today", offset: 0, time: "08:30", enabled: true },
          { key: "after", offset: 1, time: "10:00", enabled: true },
        ],
        templates,
      },
      preferences: {},
      profile: {
        name: "Administrador",
        company: "Gestor",
        initials: "G",
        accent: "blue",
      },
      views: [],
      dashboard: null,
      capabilities: { whatsapp: false },
      updated: new Date().toISOString(),
    };
  }
  let state = seed(),
    csrf = "",
    writeChain = Promise.resolve();
  async function request(action, data = {}) {
    let timer;
    const controller = new AbortController();
    try {
      timer = setTimeout(() => controller.abort(), 15000);
      let r = await fetch(
        window.GESTOR_CONFIG.api + "?action=" + encodeURIComponent(action),
        {
          method: action === "state" ? "GET" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body:
            action === "state"
              ? undefined
              : JSON.stringify({ ...data, _revision: state.revision }),
          signal: controller.signal,
        },
      );
      let obj = await r.json();
      if (r.status === 401) {
        window.location.href = "login.php";
        throw new Error("Sessão encerrada. Entre novamente.");
      }
      if (!r.ok) throw new Error(obj.error || "Não foi possível concluir.");
      if (obj.csrf) csrf = obj.csrf;
      return obj;
    } catch (e) {
      if (e.name === "AbortError")
        throw new Error(
          "A operação demorou. Atualize os dados antes de tentar novamente.",
        );
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  function demo(action, d) {
    const next = JSON.parse(JSON.stringify(state));
    switch (action) {
      case "save_client": {
        let c = { ...d.client, id: d.client.id || ids() };
        let i = next.clients.findIndex((x) => x.id === c.id);
        if (i < 0) next.clients.push(c);
        else next.clients[i] = c;
        if (d.bill)
          next.bills.push({
            ...d.bill,
            id: ids(),
            clientId: c.id,
            paid: false,
          });
        break;
      }
      case "save_bill":
        next.bills.push({ ...d, id: ids(), paid: false });
        break;
      case "paid": {
        let b = next.bills.find((x) => x.id === d.id);
        if (!b) throw Error("Cobrança não encontrada.");
        b.paid = d.paid;
        b.paidAt = d.paid ? next.today : null;
        break;
      }
      case "bulk_paid": {
        if (!Array.isArray(d.ids) || !d.ids.length || d.ids.length > 100)
          throw Error("Seleção inválida.");
        d.ids.forEach((id) => {
          let b = next.bills.find((x) => x.id === id);
          if (!b) throw Error("Cobrança não encontrada.");
          b.paid = d.paid;
          b.paidAt = d.paid ? next.today : null;
        });
        break;
      }
      case "active":
        next.clients.find((x) => x.id === d.id).active = d.active;
        break;
      case "delete_client": {
        if (next.bills.some((b) => b.clientId === d.id && b.paid))
          throw Error(
            "Este cliente possui pagamentos. Arquive o cadastro para preservar o histórico.",
          );
        next.clients = next.clients.filter((x) => x.id !== d.id);
        next.bills = next.bills.filter((x) => x.clientId !== d.id);
        next.messages = next.messages.filter((x) => x.clientId !== d.id);
        break;
      }
      case "taxonomy": {
        const list = d.kind === "tags" ? next.tags : next.categories;
        const item = { ...d.item, id: d.item.id || ids() };
        if (
          list.some(
            (x) =>
              x.id !== item.id &&
              C.normalize(x.name) === C.normalize(item.name),
          )
        )
          throw Error("Este nome já existe.");
        if (
          d.kind === "categories" &&
          !C.validParent(item.id, item.parent, list)
        )
          throw Error("Máximo de três níveis; ciclos não são permitidos.");
        let i = list.findIndex((x) => x.id === item.id);
        if (i < 0) list.push(item);
        else list[i] = item;
        break;
      }
      case "settings":
        next.settings = { ...next.settings, ...d };
        next.today = C.today(next.settings.timezone);
        break;
      case "views":
        next.views = d.views;
        break;
      case "dashboard":
        next.dashboard = d;
        break;
      case "preferences":
        next.preferences = d;
        break;
      case "profile":
        next.profile = { ...next.profile, ...d };
        break;
      case "manual_log": {
        if (!next.bills.some((b) => b.id === d.billId && !b.paid))
          throw Error("Cobrança já paga ou removida.");
        next.messages.unshift({
          id: ids(),
          clientId: d.clientId,
          billId: d.billId,
          text: d.text,
          status: "opened",
          at: new Date().toISOString(),
        });
        break;
      }
      default:
        throw Error("Ação indisponível na demonstração.");
    }
    next.updated = new Date().toISOString();
    state = next;
    return state;
  }
  function persistDemo() {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(state));
      return true;
    } catch (_) {
      return false;
    }
  }
  function hydrateDemo(saved) {
    const base = seed();
    if (!saved || typeof saved !== "object") return base;
    const array = (v, fallback = []) => (Array.isArray(v) ? v : fallback);
    return {
      ...base,
      ...saved,
      clients: array(saved.clients),
      bills: array(saved.bills),
      tags: array(saved.tags, base.tags),
      categories: array(saved.categories, base.categories),
      messages: array(saved.messages),
      views: array(saved.views),
      settings: {
        ...base.settings,
        ...(saved.settings || {}),
        templates: {
          ...base.settings.templates,
          ...(saved.settings?.templates || {}),
        },
        rules: array(saved.settings?.rules, base.settings.rules),
      },
      preferences: { ...base.preferences, ...(saved.preferences || {}) },
      profile: { ...base.profile, ...(saved.profile || {}) },
      capabilities: { ...base.capabilities, ...(saved.capabilities || {}) },
      today: C.today(saved.settings?.timezone || base.settings.timezone),
    };
  }
  async function load() {
    if (real) {
      const r = await request("state");
      state = r.state;
      if (state.preferences?.theme) Preferences.set(state.preferences, false);
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
        if (saved) {
          state = hydrateDemo(saved);
        } else {
          const legacy = JSON.parse(
            localStorage.getItem(LEGACY_WORKSPACE_KEY) || "{}",
          );
          state.views = legacy.views || [];
          state.dashboard = legacy.dashboard || null;
          state.profile = { ...state.profile, ...legacy.profile };
          persistDemo();
        }
      } catch (_) {
        state = seed();
      }
    }
    return state;
  }
  function mutate(action, data) {
    const run = async () => {
      if (real) {
        const r = await request(action, data);
        if (r.state) state = r.state;
        return r;
      }
      const before = state;
      let result = demo(action, data);
      if (!persistDemo()) {
        state = before;
        throw Error(
          "Não foi possível salvar no navegador. Verifique se o armazenamento local está permitido e tente novamente.",
        );
      }
      try {
        localStorage.removeItem(LEGACY_WORKSPACE_KEY);
      } catch (_) {}
      return result;
    };
    const job = writeChain.then(run);
    writeChain = job.catch(() => {});
    return job;
  }
  window.Store = { real, load, mutate, request, get: () => state, id: ids };
})();
