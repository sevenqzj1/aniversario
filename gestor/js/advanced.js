/* Indicadores e agrupamentos avançados. Mantém cálculos fora da camada de UI. */
(function (root) {
  'use strict';

  const monthKey = date => String(date || '').slice(0, 7);
  const monthLabel = key => {
    const [year, month] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', {month: 'short', year: '2-digit'})
      .format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '');
  };
  const recentMonths = (today, total = 6) => {
    const [year, month] = today.split('-').map(Number);
    return Array.from({length: total}, (_, index) => {
      const date = new Date(Date.UTC(year, month - total + index, 1));
      return date.toISOString().slice(0, 7);
    });
  };

  function monthly(state, total = 6) {
    return recentMonths(state.today, total).map(key => {
      const bills = state.bills.filter(bill => monthKey(bill.paidAt || bill.due) === key);
      return {
        key,
        label: monthLabel(key),
        paid: bills.filter(bill => bill.paid).reduce((sum, bill) => sum + bill.amount, 0),
        pending: state.bills.filter(bill => !bill.paid && monthKey(bill.due) === key)
          .reduce((sum, bill) => sum + bill.amount, 0)
      };
    });
  }

  function health(state, rows = state.bills) {
    const active = rows.filter(bill => state.clients.find(client => client.id === bill.clientId)?.active);
    const paid = active.filter(bill => bill.paid);
    const pending = active.filter(bill => !bill.paid && bill.due >= state.today);
    const late = active.filter(bill => !bill.paid && bill.due < state.today);
    const due = active.filter(bill => bill.due <= state.today);
    const delinquency = due.length ? Math.round((late.length / due.length) * 100) : 0;
    return {
      paid, pending, late, delinquency,
      expected: pending.concat(late).reduce((sum, bill) => sum + bill.amount, 0)
    };
  }

  function lateClients(state) {
    return state.clients.map(client => {
      const bills = state.bills.filter(bill => bill.clientId === client.id && !bill.paid && bill.due < state.today);
      return {
        id: client.id,
        name: client.name,
        count: bills.length,
        amount: bills.reduce((sum, bill) => sum + bill.amount, 0),
        days: Math.max(0, ...bills.map(bill => Core.days(state.today, bill.due)))
      };
    }).filter(item => item.count).sort((a, b) => b.days - a.days || b.amount - a.amount || a.name.localeCompare(b.name, 'pt-BR'));
  }

  function calendar(state, month = state.today.slice(0, 7)) {
    const [year, number] = month.split('-').map(Number);
    const first = new Date(Date.UTC(year, number - 1, 1));
    const total = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const leading = first.getUTCDay();
    const byDay = new Map();
    state.bills.filter(bill => monthKey(bill.due) === month).forEach(bill => {
      const day = Number(bill.due.slice(8));
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(bill);
    });
    return {month, label: new Intl.DateTimeFormat('pt-BR', {month: 'long', year: 'numeric'}).format(first), total, leading, byDay};
  }

  function notifications(state) {
    const items = [];
    state.bills.forEach(bill => {
      const client = state.clients.find(item => item.id === bill.clientId);
      if (!client?.active || bill.paid) return;
      if (bill.due < state.today) items.push({level: 'danger', billId: bill.id, title: `${client.name} está em atraso`, detail: `${Core.days(state.today, bill.due)} dia(s) · ${Core.money(bill.amount)}`});
      else if (bill.due === state.today) items.push({level: 'warning', billId: bill.id, title: `${client.name} vence hoje`, detail: Core.money(bill.amount)});
      else if (bill.due === Core.shift(state.today, 1)) items.push({level: 'info', billId: bill.id, title: `${client.name} vence amanhã`, detail: Core.money(bill.amount)});
    });
    if (!state.capabilities.whatsapp) items.push({level: 'info', title: 'WhatsApp ainda não conectado', detail: 'A demonstração não envia mensagens automaticamente.'});
    return items;
  }

  root.Advanced = {monthly, health, lateClients, calendar, notifications};
})(typeof window !== 'undefined' ? window : globalThis);