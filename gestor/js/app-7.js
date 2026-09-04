"use strict";
async function reload() {
  let delay = setTimeout(() => {
    busy = true;
    $("#content").setAttribute("aria-busy", "true");
    $("#content").innerHTML = loadingLayout();
  }, 200);
  try {
    await Store.load();
    render();
    let seen = false;
    try {
      seen = localStorage.getItem("gestor.tour.v3") === "seen";
    } catch (_) {}
    if (!seen) setTimeout(() => startTour(), 500);
  } catch (e) {
    error(e.message);
    $("#content").innerHTML = btn("Tentar novamente", "reload");
  } finally {
    clearTimeout(delay);
    busy = false;
    $("#content").removeAttribute("aria-busy");
  }
}
document.addEventListener("click", async (e) => {
  const target = e.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const action = target.dataset.action,
    id = target.dataset.id;
  try {
    switch (action) {
      case "menu": {
        let open = $("#app").classList.toggle("menu-open");
        $(".mobile-menu").setAttribute("aria-expanded", String(open));
        syncMenu();
        if (open) $(".sidebar a").focus();
        break;
      }
      case "notifications":
        notificationCenter();
        break;
      case "notification-review":
        $("#dialog").close();
        review(id);
        break;
      case "commands":
        commandPalette();
        break;
      case "run-command":
        closeModal();
        location.hash = id;
        break;
      case "tour":
        startTour();
        break;
      case "tour-prev":
        document
          .querySelectorAll(".tour-highlight")
          .forEach((el) => el.classList.remove("tour-highlight"));
        $("#dialog").close();
        startTour(Math.max(0, tourIndex - 1));
        break;
      case "tour-next":
        if (tourIndex === tour.length - 1) finishTour();
        else {
          document
            .querySelectorAll(".tour-highlight")
            .forEach((el) => el.classList.remove("tour-highlight"));
          $("#dialog").close();
          startTour(tourIndex + 1);
        }
        break;
      case "tour-end":
        finishTour();
        break;
      case "calendar-prev":
        changeMonth(-1);
        break;
      case "calendar-next":
        changeMonth(1);
        break;
      case "calendar-day": {
        if (!id) break;
        let selected = bill(id);
        Filters.reset();
        Filters.set({ from: selected.due, to: selected.due });
        location.hash = "cobrancas";
        break;
      }
      case "bulk-clear":
        selectedBills.clear();
        refreshList();
        break;
      case "bulk-pay":
      case "bulk-reopen": {
        if (!selectedBills.size)
          throw Error("Selecione pelo menos uma cobrança.");
        const paid = action === "bulk-pay";
        openModal(
          paid ? "Confirmar pagamentos" : "Reabrir cobranças",
          `<p>Esta ação altera ${selectedBills.size} cobrança(s). ${paid ? "Confirme somente pagamentos realmente recebidos." : "Elas voltarão às pendências."}</p><div class="form-actions">${btn("Cancelar", "close-modal")}${btn("Confirmar", paid ? "confirm-bulk-pay" : "confirm-bulk-reopen", "", "primary")}</div>`,
        );
        break;
      }
      case "confirm-bulk-pay":
      case "confirm-bulk-reopen": {
        const ids = [...selectedBills],
          paid = action === "confirm-bulk-pay";
        await commit(
          "bulk_paid",
          { ids, paid },
          paid ? "Cobranças marcadas como pagas" : "Cobranças reabertas",
          () => {
            selectedBills.clear();
            render();
          },
        );
        break;
      }
      case "install-app":
        if (installPrompt) {
          await installPrompt.prompt();
          installPrompt = null;
          $("#install-app")?.setAttribute("hidden", "");
        }
        break;
      case "close-modal":
        closeModal();
        break;
      case "close-toast":
        $("#toast").hidden = true;
        break;
      case "render":
        render();
        break;
      case "reload":
        await reload();
        break;
      case "logout":
        if (Store.real) {
          await Store.request("logout");
          location.href = "login.php";
        } else location.href = "./index.html";
        break;
      case "queue":
        Filters.set({ queue: id, status: [] });
        if (!["clientes", "cobrancas"].includes(route))
          location.hash = "cobrancas";
        else render();
        break;
      case "filters":
        filterDialog();
        break;
      case "clear-filters":
        Filters.reset();
        if ($("#dialog").open) closeModal();
        render();
        break;
      case "remove-filter":
        Filters.set({
          [id]: Array.isArray(Filters.get()[id])
            ? []
            : id === "active"
              ? "active"
              : "",
        });
        if (id === "q") $("#search").value = "";
        refreshList();
        break;
      case "save-view":
        viewEditor();
        break;
      case "edit-view":
        viewEditor(id);
        break;
      case "load-view": {
        let v = Store.get().views.find((x) => x.id === id);
        if (v) {
          Filters.reset();
          Filters.set(v.filters);
          render();
        }
        break;
      }
      case "delete-view":
        await commit(
          "views",
          { views: Store.get().views.filter((v) => v.id !== id) },
          "Visão excluída",
        );
        break;
      case "confirm-client":
        await commit("save_client", pendingClient, "Cadastro salvo", () => {
          location.hash = "clientes";
        });
        break;
      case "new-bill":
        newBill(id);
        break;
      case "pay":
      case "reopen": {
        let b = bill(id),
          c = person(b?.clientId);
        if (!b) return;
        openModal(
          action === "pay" ? "Confirmar pagamento" : "Reabrir cobrança",
          `<p>${E(c.name)} · <strong>${C.money(b.amount)}</strong> · ${C.date(b.due)}</p><p>${action === "pay" ? "Confirme somente se o pagamento foi recebido. Outras cobranças deste cliente não serão alteradas." : "Esta cobrança voltará à lista de pendências. Confirme a correção."}</p><div class="form-actions">${btn("Cancelar", "close-modal")}${btn("Confirmar", action === "pay" ? "confirm-pay" : "confirm-reopen", id, "primary")}</div>`,
        );
        break;
      }
      case "confirm-pay":
      case "confirm-reopen":
        await commit(
          "paid",
          { id, paid: action === "confirm-pay" },
          "Cobrança atualizada",
        );
        break;
      case "active": {
        let c = person(id);
        openModal(
          c.active ? "Arquivar cliente" : "Restaurar cliente",
          `<p>${E(c.name)}. ${c.active ? "O histórico será mantido e os lembretes automáticos serão interrompidos." : "O cliente voltará às listas ativas."}</p><div class="form-actions">${btn("Cancelar", "close-modal")}${btn("Confirmar", "confirm-active", id, "primary")}</div>`,
        );
        break;
      }
      case "confirm-active":
        await commit(
          "active",
          { id, active: !person(id).active },
          "Situação do cliente atualizada",
        );
        break;
      case "delete":
        openModal(
          "Excluir cadastro",
          `<p>Excluir <strong>${E(person(id).name)}</strong> e suas cobranças sem pagamentos? Prefira arquivar se precisar do histórico.</p><p class="help">Cadastros com pagamentos não podem ser excluídos.</p><div class="form-actions">${btn("Cancelar", "close-modal")}${btn("Excluir definitivamente", "confirm-delete", id, "danger")}</div>`,
        );
        break;
      case "confirm-delete":
        await commit(
          "delete_client",
          { id },
          "Cadastro excluído",
          () => (location.hash = "clientes"),
        );
        break;
      case "review":
        review(id);
        break;
      case "wa-compose":
        review(id);
        break;
      case "wa-web-open": {
        const opened = window.open(
          "https://web.whatsapp.com/",
          "_blank",
          "noopener,noreferrer",
        );
        toast(
          opened
            ? "WhatsApp Web aberto em uma nova aba."
            : "O navegador bloqueou a nova aba. Permita pop-ups e tente novamente.",
        );
        break;
      }
      case "wa-status-toggle": {
        const current = Store.get().settings.whatsappManual || {};
        await commit(
          "settings",
          {
            whatsappManual: {
              ...current,
              ready: id === "on",
              openedAt: id === "on" ? new Date().toISOString() : "",
            },
          },
          id === "on"
            ? "WhatsApp marcado como pronto"
            : "WhatsApp marcado como desconectado",
        );
        break;
      }
      case "open-wa": {
        let b = bill(id),
          c = person(b?.clientId);
        if (!b || b.paid) throw Error("A cobrança foi paga ou removida.");
        let phone = C.digits(c.whatsapp),
          text = $("#review-text").value.trim();
        if (!/^[1-9]\d{9,14}$/.test(phone) || !text)
          throw Error("Informe um telefone válido e uma mensagem.");
        const link =
          "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
        let opened = window.open(link, "_blank", "noopener,noreferrer");
        await Store.mutate("manual_log", { billId: id, clientId: c.id, text });
        closeModal();
        render();
        toast("Abertura solicitada. Envio e entrega não confirmados.");
        break;
      }
      case "api-review": {
        const r = await Store.request("message_preview", { billId: id });
        openModal(
          "Confirmar envio pela API",
          `<p>${E(r.to)} · ${C.money(r.amount)} · ${C.date(r.due)}</p><div class="chat">${E(r.text)}</div><p class="help">Modelo aprovado: ${E(r.template)}. ${r.allowed ? "Confirme para enviar esta mensagem." : E(r.reason)}</p><div class="form-actions">${btn("Cancelar", "close-modal")}${r.allowed ? btn("Confirmar envio", "api-send", id, "whatsapp") : ""}</div>`,
        );
        break;
      }
      case "api-send":
        await commit(
          "send_message",
          { billId: id },
          "Tentativa registrada. Consulte o status no histórico.",
        );
        break;
      case "new-tag":
        taxonomyForm("tags");
        break;
      case "new-category":
        taxonomyForm("categories");
        break;
      case "edit-tags":
        taxonomyForm("tags", id);
        break;
      case "edit-categories":
        taxonomyForm("categories", id);
        break;
      case "archive-tags":
      case "archive-categories": {
        const kind = action.split("-")[1],
          item = Store.get()[kind].find((t) => t.id === id);
        await commit(
          "taxonomy",
          { kind, item: { ...item, archived: !item.archived } },
          "Classificação atualizada",
        );
        break;
      }
      case "customize":
        customize();
        break;
      case "widget-up":
      case "widget-down":
        editingDashboard = Dashboard.move(
          editingDashboard,
          id,
          action === "widget-up" ? -1 : 1,
        );
        drawCustomize();
        $("#announce").textContent = Dashboard.names[id] + " movido.";
        $(
          '#customize-content [data-action="' +
            action +
            '"][data-id="' +
            id +
            '"]',
        )?.focus();
        break;
      case "reset-dashboard":
        editingDashboard = Dashboard.defaults();
        drawCustomize();
        break;
      case "save-dashboard":
        if (!editingDashboard.widgets.some((w) => w.visible))
          throw Error("Mantenha pelo menos um bloco visível.");
        await commit("dashboard", editingDashboard, "Painel personalizado");
        break;
      case "reset-prefs":
        Preferences.reset();
        render();
        toast("Aparência restaurada.");
        break;
      case "dismiss-suggestion":
        dismissed.add(id);
        render();
        toast("Sugestão descartada nesta sessão.");
        break;
      case "accept-suggestion": {
        let c = person(id),
          t = Store.get().tags.find(
            (t) =>
              C.normalize(t.name) === "acompanhamento especial" && !t.archived,
          );
        if (!t) return;
        lastSuggestion = { client: JSON.parse(JSON.stringify(c)) };
        await Store.mutate("save_client", {
          client: { ...c, tags: [...new Set([...c.tags, t.id])] },
        });
        render();
        toast("Etiqueta adicionada com sua aprovação.", true);
        break;
      }
      case "undo-suggestion":
        if (lastSuggestion) {
          await Store.mutate("save_client", lastSuggestion);
          lastSuggestion = null;
          render();
          toast("Sugestão desfeita.");
        }
        break;
    }
  } catch (err) {
    error(err.message);
  }
});
