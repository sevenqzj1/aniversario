"use strict";
function changeMonth(delta) {
  const [y, m] = (calendarMonth || Store.get().today.slice(0, 7))
      .split("-")
      .map(Number),
    d = new Date(Date.UTC(y, m - 1 + delta, 1));
  calendarMonth = d.toISOString().slice(0, 7);
  render();
}
function notificationCenter() {
  const items = Advanced.notifications(Store.get());
  openModal(
    "Central de notificações",
    `<p class="help">Alertas calculados com o estado atual das cobranças.</p>${items.map((n) => `<div class="notification-item"><i class="notification-level ${n.level}"></i><div><strong>${E(n.title)}</strong><p class="help">${E(n.detail)}</p>${n.billId ? btn("Revisar cobrança", "notification-review", n.billId, "small") : ""}</div></div>`).join("") || '<div class="empty"><h3>Tudo em ordem</h3><p>Nenhuma notificação pendente.</p></div>'}`,
  );
}
const commands = [
  ["Dashboard", "dashboard"],
  ["Novo cliente", "novo"],
  ["Clientes", "clientes"],
  ["Cobranças", "cobrancas"],
  ["WhatsApp", "whatsapp"],
  ["Lembretes", "lembretes"],
  ["Mensagens", "mensagens"],
  ["Configurações", "configuracoes"],
];
function commandPalette() {
  openModal(
    "Localizar uma função",
    `<div class="field"><label for="command-search">O que você quer fazer?</label><input id="command-search" type="search" placeholder="Ex.: novo cliente ou cobranças" autocomplete="off"></div><div class="command-list" id="command-list">${commandItems("")}</div><p class="help">Atalho: Ctrl + K (ou Command + K).</p>`,
  );
}
function commandItems(q) {
  const value = C.normalize(q);
  return (
    commands
      .filter(([label]) => C.normalize(label).includes(value))
      .map(
        ([label, target]) =>
          `<button class="command-item" data-action="run-command" data-id="${target}"><span>${E(label)}</span><kbd>Enter</kbd></button>`,
      )
      .join("") || '<p class="muted">Nenhuma função encontrada.</p>'
  );
}
const tour = [
  [
    "Seu resumo diário",
    "Os indicadores mostram clientes ativos, vencimentos e atrasos.",
    "dashboard",
    ".metrics",
  ],
  [
    "Painel do seu jeito",
    "Mostre, esconda, redimensione e reordene até dez blocos.",
    "dashboard",
    "[data-action=customize]",
  ],
  [
    "Encontre qualquer coisa",
    "Use a busca de comandos ou pressione Ctrl + K.",
    "dashboard",
    "[data-action=commands]",
  ],
  [
    "Cobranças com segurança",
    "Selecione várias cobranças para marcar como pagas ou reabrir.",
    "cobrancas",
    ".filter-bar",
  ],
  [
    "WhatsApp manual",
    "Abra o WhatsApp oficial e revise cada cobrança antes de enviar.",
    "whatsapp",
    ".wa-connect",
  ],
  [
    "Aparência confortável",
    "Escolha claro, escuro, sistema ou alto contraste nas configurações.",
    "configuracoes",
    "[data-pref=theme]",
  ],
];
function startTour(index = 0) {
  tourIndex = index;
  showTour();
}
function showTour() {
  document
    .querySelectorAll(".tour-highlight")
    .forEach((el) => el.classList.remove("tour-highlight"));
  const [title, text, target, selector] = tour[tourIndex];
  if (route !== target) {
    location.hash = target;
    setTimeout(showTour, 0);
    return;
  }
  document.querySelector(selector)?.classList.add("tour-highlight");
  openModal(
    `Tour · ${tourIndex + 1} de ${tour.length}`,
    `<div class="tour-visual" aria-hidden="true">${tourIndex + 1}</div><h3>${E(title)}</h3><p>${E(text)}</p><div class="tour-progress" aria-hidden="true">${tour.map((_, i) => `<span class="${i <= tourIndex ? "active" : ""}"></span>`).join("")}</div><div class="form-actions">${tourIndex ? btn("Voltar", "tour-prev") : ""}${btn("Encerrar", "tour-end")}${btn(tourIndex === tour.length - 1 ? "Concluir" : "Próximo", "tour-next", "", "primary")}</div>`,
  );
}
function finishTour() {
  try {
    localStorage.setItem("gestor.tour.v3", "seen");
  } catch (_) {}
  document
    .querySelectorAll(".tour-highlight")
    .forEach((el) => el.classList.remove("tour-highlight"));
  closeModal();
}
function animateCounts() {
  if (
    Preferences.get().motion === "none" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  $$("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target) || target > 999) return;
    const begin = performance.now(),
      duration = 450;
    const tick = (now) => {
      el.textContent = String(
        Math.round(target * Math.min(1, (now - begin) / duration)),
      );
      if (now - begin < duration) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function updateChrome() {
  const s = Store.get(),
    profile = s.profile || { company: "Gestor", initials: "G", accent: "blue" };
  document.documentElement.dataset.accent = ["blue", "indigo", "teal"].includes(
    profile.accent,
  )
    ? profile.accent
    : "blue";
  $(".brand-mark").textContent = (profile.initials || "G")
    .slice(0, 3)
    .toUpperCase();
  $(".brand-text").firstChild.textContent = profile.company || "Gestor";
  const count = Advanced.notifications(s).filter((item) => item.billId).length;
  $("#notification-count").textContent = String(Math.min(count, 99));
  $("#notification-count").hidden = !count;
  updateConnection();
  animateCounts();
}
function updateConnection(syncing = false) {
  const el = $("#sync-state");
  if (!el) return;
  const online = navigator.onLine;
  el.className =
    "sync-state " + (syncing ? "syncing" : online ? "" : "offline");
  el.lastElementChild.textContent = syncing
    ? "Sincronizando…"
    : online
      ? "Online e sincronizado"
      : "Sem internet";
}
function profilePanel() {
  const p = Store.get().profile || {
    name: "Administrador",
    company: "Gestor",
    initials: "G",
    accent: "blue",
  };
  return `<section class="panel"><div class="panel-head"><h2>Perfil e identidade visual</h2></div><form id="profile-form" class="panel-body"><div class="profile-preview"><span class="brand-avatar">${E((p.initials || "G").toUpperCase())}</span><div><strong>${E(p.company || "Gestor")}</strong><p class="help">${E(p.name || "Administrador")}</p></div></div><div class="form-grid section-gap">${field("profile-name", "Nome do gestor *", p.name, "text", 'required maxlength="80" placeholder="Seu nome"')}${field("profile-company", "Nome exibido *", p.company, "text", 'required maxlength="50" placeholder="Minha empresa"')}${field("profile-initials", "Iniciais da marca *", p.initials, "text", 'required maxlength="3" pattern="[A-Za-zÀ-ÿ0-9]{1,3}" placeholder="GC"')}<fieldset class="span-all"><legend>Cor principal</legend><div class="accent-options">${[
    ["blue", "Azul"],
    ["indigo", "Índigo"],
    ["teal", "Verde-azulado"],
  ]
    .map(
      ([value, label]) =>
        `<label class="accent-option"><input type="radio" name="accent" value="${value}" ${p.accent === value ? "checked" : ""}><span class="accent-swatch ${value}">${label}</span></label>`,
    )
    .join(
      "",
    )}</div></fieldset></div><div class="form-actions"><button class="btn primary" type="submit">Salvar identidade</button></div></form></section>`;
}
function loadingLayout() {
  const name = location.hash.slice(1).split(/[/?]/)[0] || "dashboard";
  let body = '<i class="skeleton-row"></i><i class="skeleton-row"></i>';
  if (name === "dashboard")
    body =
      '<div class="skeleton-grid"><i class="skeleton-row"></i><i class="skeleton-row"></i><i class="skeleton-row"></i></div>' +
      body;
  else if (["clientes", "cobrancas", "mensagens", "whatsapp"].includes(name))
    body = Array.from({ length: 5 }, () => '<i class="skeleton-row"></i>').join(
      "",
    );
  else
    body =
      '<div class="skeleton-grid"><i class="skeleton-row"></i><i class="skeleton-row"></i></div>';
  return `<div class="skeleton-page" aria-hidden="true"><i class="skeleton-row hero"></i>${body}</div><p role="status">Carregando ${E(name)}…</p>`;
}
function shell() {
  const nav = [
    ["Visão geral", [["dashboard", "Dashboard", "grid"]]],
    [
      "Gestão",
      [
        ["clientes", "Clientes", "users"],
        ["cobrancas", "Cobranças", "bill"],
      ],
    ],
    [
      "Comunicação",
      [
        ["whatsapp", "WhatsApp", "chat"],
        ["lembretes", "Lembretes", "clock"],
        ["mensagens", "Mensagens", "chat"],
      ],
    ],
    ["Preferências", [["configuracoes", "Configurações", "settings"]]],
  ];
  $("#app").innerHTML =
    `<button class="mobile-scrim" data-action="menu" aria-label="Fechar menu"></button><aside class="sidebar" id="sidebar"><a class="brand" href="#dashboard"><span class="brand-mark">G</span><span class="brand-text">Gestor<small>CLIENTES &amp; COBRANÇAS</small></span></a><nav aria-label="Menu principal">${nav.map(([group, links]) => `<div class="nav-group">${group.toUpperCase()}</div>${links.map(([id, label, ic]) => `<a href="#${id}" aria-label="${label}" data-route="${id}">${icon(ic)}<span class="nav-text">${label}</span></a>`).join("")}`).join("")}</nav><div class="sidebar-bottom">Seu espaço de gestão<small>${Store.real ? "Conta autenticada" : "Ambiente de demonstração"}</small><p>${btn("Sair", "logout", "", "small")}</p></div></aside><div class="workspace"><header class="topbar"><div class="actions">${btn(icon("menu"), "menu", "", "mobile-menu")}<span class="breadcrumb" id="breadcrumb">Visão de gestão</span></div><div class="utility-actions"><span class="sync-state" id="sync-state" role="status"><i class="sync-dot"></i><span>Sincronizado</span></span><button class="btn small utility-button" data-action="notifications" aria-label="Abrir notificações">${icon("bill")}<span class="button-label"> Alertas</span><span class="notification-count" id="notification-count">0</span></button><button class="btn small" data-action="commands" aria-label="Localizar função">${icon("search")}<span class="button-label"> Buscar</span></button><button class="btn small" id="install-app" data-action="install-app" hidden>Instalar app</button><button class="btn small" data-action="tour" aria-label="Abrir tour explicativo">?</button></div><div class="theme-control"><label for="header-theme">Aparência</label><select id="header-theme" data-pref="theme">${opt("system", "Usar sistema", Preferences.get().theme)}${opt("light", "Claro", Preferences.get().theme)}${opt("dark", "Escuro", Preferences.get().theme)}${opt("contrast", "Alto contraste", Preferences.get().theme)}</select></div></header><main id="main"><div id="page-error" class="error" role="alert" tabindex="-1" hidden></div><div id="mode-note" class="notice"></div><div id="content"></div></main><footer class="app-footer"><span>Gestor de Clientes e Cobranças</span><span>${Store.real ? "Dados protegidos por sessão" : "Versão 3.7 · Dados salvos neste navegador"}</span></footer></div>`;
  $(".mobile-menu").setAttribute("aria-label", "Abrir menu");
  $(".mobile-menu").setAttribute("aria-expanded", "false");
  $(".mobile-menu").setAttribute("aria-controls", "sidebar");
}
