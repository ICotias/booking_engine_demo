// Testes da lógica de negócio do booking engine.
// Roda com Node, sem dependências: node tests/logica.test.js
// O script da página é extraído do index.html e executado com um DOM falso.

const fs = require("fs");
const path = require("path");

function fakeEl() {
  return {
    value: "", min: "", innerHTML: "", textContent: "", style: {}, disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, appendChild() {}, scrollTop: 0, scrollHeight: 0, className: ""
  };
}
const els = {};
global.document = {
  getElementById(id) { if (!els[id]) els[id] = fakeEl(); return els[id]; },
  querySelectorAll() { return []; },
  createElement() { return fakeEl(); },
};
global.window = { scrollTo() {} };
global.confirm = () => true;

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const js = html.match(/<script>([\s\S]*)<\/script>/)[1]
  .replace('"use strict";', "")
  .replace("const estado =", "var estado ="); // torna o estado acessível aos testes
(0, eval)(js); // eval indireto: declarações viram globais

let falhas = 0;
function assert(cond, msg) {
  if (cond) console.log("PASS:", msg);
  else { falhas++; console.log("FAIL:", msg); }
}

// ===== 1. Classificação de noites =====
assert(classificarNoite("2026-12-25") === "feriado", "Natal é feriado");
assert(classificarNoite("2026-07-10") === "fds", "10/07/2026 (sexta) é fim de semana");
assert(classificarNoite("2026-07-11") === "fds", "11/07/2026 (sábado) é fim de semana");
assert(classificarNoite("2026-07-12") === "comum", "12/07/2026 (domingo à noite) é dia comum");
assert(classificarNoite("2026-07-08") === "comum", "08/07/2026 (quarta) é dia comum");
assert(classificarNoite("2026-09-07") === "feriado", "7 de setembro é feriado (segunda)");

// ===== 2. Preços =====
assert(precoNoite("std", "2026-07-08") === 280, "Standard dia comum = 280");
assert(precoNoite("std", "2026-07-10") === Math.round(280 * 1.3), "Standard fim de semana = 364");
assert(precoNoite("std", "2026-12-25") === Math.round(280 * 1.5), "Standard feriado = 420");
assert(precoNoite("mst", "2026-07-08") === 450, "Master dia comum = 450");
const cot = cotarEstadia("std", "2026-07-09", "2026-07-12"); // qui, sex, sab
assert(cot.itens.length === 3, "3 noites entre 09 e 12");
assert(cot.total === 280 + 364 + 364, "Total qui+sex+sab = 1008, obtido " + cot.total);

// ===== 3. Disponibilidade calculada =====
estado.reservas.length = 0; estado.bloqueios.length = 0;
assert(unidadesLivres("mst", "2026-08-10") === 2, "Master começa com 2 livres");
const r1 = tentarConfirmarReserva({ tipo: "mst", checkin: "2026-08-10", checkout: "2026-08-12", hospedes: 2, nome: "Teste Um", telefone: "(74) 99999-0001", email: "t1@t.com", obs: "", total: 900, pagamento: "pix" });
assert(r1.ok, "Primeira reserva master aceita");
assert(unidadesLivres("mst", "2026-08-10") === 1, "1 livre após primeira reserva");
assert(unidadesLivres("mst", "2026-08-12") === 2, "Noite do checkout não conta como ocupada");

// ===== 4. Corrida pela última unidade =====
const r2 = tentarConfirmarReserva({ tipo: "mst", checkin: "2026-08-11", checkout: "2026-08-12", hospedes: 2, nome: "Teste Dois", telefone: "(74) 99999-0002", email: "t2@t.com", obs: "", total: 450, pagamento: "pix" });
assert(r2.ok, "Segunda reserva ocupa a última unidade");
const r3 = tentarConfirmarReserva({ tipo: "mst", checkin: "2026-08-11", checkout: "2026-08-12", hospedes: 2, nome: "Teste Tres", telefone: "(74) 99999-0003", email: "t3@t.com", obs: "", total: 450, pagamento: "pix" });
assert(!r3.ok, "Terceira reserva na mesma noite é recusada (overbooking evitado)");
assert(unidadesLivres("mst", "2026-08-11") === 0, "0 livres na noite cheia");

// ===== 5. Cancelamento libera unidade =====
estado.reservas.find(r => r.nome === "Teste Dois").status = "cancelada";
assert(unidadesLivres("mst", "2026-08-11") === 1, "Cancelamento devolve a unidade");

// ===== 6. Bloqueios reduzem disponibilidade =====
estado.bloqueios.push({ id: 1, tipo: "std", inicio: "2026-08-20", fim: "2026-08-21", unidades: 2 });
assert(unidadesLivres("std", "2026-08-20") === 3, "Bloqueio de 2 unidades: 5-2=3");
assert(unidadesLivres("std", "2026-08-22") === 5, "Fora do bloqueio: 5 livres");

// ===== 7. Estadia atravessando noite cheia é recusada inteira =====
const r4 = tentarConfirmarReserva({ tipo: "mst", checkin: "2026-08-09", checkout: "2026-08-13", hospedes: 2, nome: "Teste Quatro", telefone: "(74) 99999-0004", email: "t4@t.com", obs: "", total: 1800, pagamento: "pix" });
assert(r4.ok === true, "4 noites com 1 unidade livre em todas: aceita");
const r5 = tentarConfirmarReserva({ tipo: "mst", checkin: "2026-08-09", checkout: "2026-08-13", hospedes: 2, nome: "Teste Cinco", telefone: "(74) 99999-0005", email: "t5@t.com", obs: "", total: 1800, pagamento: "pix" });
assert(!r5.ok, "Sem unidade em todas as noites: recusada por inteiro");

// ===== 8. Validação de cartão =====
assert(validarValidade("12/27") === true, "Validade 12/27 ok");
assert(validarValidade("13/27") === false, "Mês 13 inválido");
assert(validarValidade("01/20") === false, "Cartão vencido");

// ===== 9. Modos de canal =====
function reservar(tipo, checkin, checkout, canal) {
  return tentarConfirmarReserva({ tipo, checkin, checkout, hospedes: 2, nome: "Canal Teste", telefone: "(74) 90000-0000", email: "c@t.com", obs: "", total: 100, pagamento: "pix", canal });
}

// 9a. Channel manager (padrão): pool compartilhado
estado.reservas.length = 0; estado.bloqueios.length = 0;
estado.canal.modo = "cm"; estado.canal.pendentes = []; estado.canal.log = [];
assert(estado.canal.modo === "cm", "Modo padrão é channel manager");
reservar("mst", "2026-09-10", "2026-09-11", "ota");
assert(unidadesLivres("mst", "2026-09-10") === 1, "cm: reserva de OTA reduz a visão do site na hora");
assert(unidadesLivresOta("mst", "2026-09-10") === 1, "cm: OTA e site veem o mesmo número");

// 9b. Inventário dividido
estado.reservas.length = 0;
estado.canal.modo = "allot";
estado.canal.allot = { std: { site: 3, ota: 2 }, mst: { site: 1, ota: 1 } };
assert(unidadesLivres("std", "2026-09-10") === 3, "allot: site vê só a cota dele (3)");
assert(unidadesLivresOta("std", "2026-09-10") === 2, "allot: OTA vê só a cota dela (2)");
reservar("std", "2026-09-10", "2026-09-11", "site");
reservar("std", "2026-09-10", "2026-09-11", "site");
reservar("std", "2026-09-10", "2026-09-11", "site");
assert(unidadesLivres("std", "2026-09-10") === 0, "allot: cota do site esgotada com 3 vendas");
assert(unidadesLivresOta("std", "2026-09-10") === 2, "allot: cota da OTA intacta mesmo com site esgotado");
const rAllot = reservar("std", "2026-09-10", "2026-09-11", "site");
assert(!rAllot.ok, "allot: site não vende além da própria cota");

// 9c. iCal: a janela de risco
estado.reservas.length = 0;
estado.canal.modo = "ical";
estado.canal.ultimaSync = new Date().toISOString();
estado.canal.pendentes = [];
const rSite = reservar("mst", "2026-09-20", "2026-09-21", "site");
estado.reservas.find(r => r.id === rSite.reserva.id).criadaEm = new Date(Date.now() + 5000).toISOString();
reservar("mst", "2026-09-20", "2026-09-21", "site");
estado.reservas[estado.reservas.length - 1].criadaEm = new Date(Date.now() + 5000).toISOString();
assert(unidadesLivres("mst", "2026-09-20") === 0, "ical: site sabe que esgotou");
assert(unidadesLivresOta("mst", "2026-09-20") === 2, "ical: OTA ainda vê 2 livres (visão defasada, a janela de risco)");
estado.canal.pendentes.push({ tipo: "mst", checkin: "2026-09-20", checkout: "2026-09-21", nome: "Pendente Ota", total: 450 });
assert(unidadesLivresOta("mst", "2026-09-20") === 1, "ical: OTA desconta a própria venda pendente");
assert(unidadesLivres("mst", "2026-09-20") === 0, "ical: site continua sem ver a venda pendente da OTA");
sincronizarIcal();
const conflito = estado.reservas.find(r => r.status === "conflito");
assert(!!conflito, "ical: sincronização detecta e marca o conflito (overbooking)");
assert(estado.canal.pendentes.length === 0, "ical: fila de pendentes esvaziada após sync");
assert(unidadesLivres("mst", "2026-09-20") === 0, "ical: reserva em conflito não ocupa unidade");

// 9d. De volta ao channel manager, comportamento original preservado
estado.reservas.length = 0; estado.canal.modo = "cm";
assert(unidadesLivres("std", "2026-09-10") === 5, "cm: visão volta ao pool completo");

console.log(falhas === 0 ? "\nTODOS OS TESTES PASSARAM" : "\n" + falhas + " FALHAS");
process.exit(falhas === 0 ? 0 : 1);
