# Booking Engine Demo

Demonstração funcional de um booking engine (motor de reservas) para hotéis, construída em um único arquivo HTML, sem dependências e sem build. Abra o `index.html` no navegador e tudo funciona.

**[Ver demonstração ao vivo](https://booking-engine-demo.vercel.app)**

## O que a demo faz

### Visão do hóspede
- Busca por datas com validação (check-in a partir de hoje, check-out depois do check-in)
- Dois tipos de quarto com disponibilidade real calculada por noite
- Tarifas dinâmicas: preço base em dias comuns, multiplicador de fim de semana (noites de sexta e sábado) e multiplicador de feriado nacional, com a quebra de preço exibida noite a noite antes do pagamento
- Checkout com Pix (QR Code simulado) ou cartão de crédito, com máscara e validação em todos os campos
- Confirmação com localizador de reserva

### Painel do hotel
- Mapa mensal de disponibilidade por tipo de quarto
- Lista de reservas com canal de origem (site, OTA ou balcão) e cancelamento
- Editor de tarifas (preço base e multiplicadores) com efeito imediato nas cotações
- Bloqueio de datas para manutenção ou uso interno

### Prevenção de overbooking
- Disponibilidade nunca é armazenada: é sempre calculada (total de unidades menos reservas ativas menos bloqueios)
- Confirmação atômica: no momento de gravar, o sistema reconfere todas as noites da estadia; ou grava tudo, ou recusa com mensagem amigável
- Simulação animada de dois hóspedes disputando a última suíte na mesma fração de segundo

### Canais e OTAs (Online Travel Agencies)
Simulação das três estratégias de convivência entre o site do hotel e plataformas como Booking.com:

1. **Channel manager**: estoque compartilhado sincronizado em tempo real
2. **Inventário dividido (allotment)**: cotas fixas por canal, sem risco entre canais
3. **Sincronização iCal**: calendários trocados de tempos em tempos, com a janela de overbooking demonstrada ao vivo, incluindo a detecção do conflito na sincronização

## Como rodar

Não precisa de servidor: baixe e abra o `index.html` em qualquer navegador moderno.

## Testes

A lógica de negócio (tarifas, disponibilidade, confirmação atômica e os três modos de canal) é coberta por 42 testes automatizados:

```bash
node tests/logica.test.js
```

## Limitações intencionais

Isto é uma demonstração de portfólio, não um produto em produção. Os dados vivem na memória da página (recarregar zera as reservas), o pagamento é simulado e não há backend. A arquitetura de produção correspondente (banco de dados com transações, gateway de pagamento com webhooks, notificações) está descrita no roadmap do projeto.

## Stack

HTML, CSS e JavaScript puros, em um único arquivo. Design inspirado nas Human Interface Guidelines da Apple, com paleta de hotel de luxo.

---

Desenvolvido por **ClickWave** · Hotel Horizonte é uma marca fictícia criada para esta demonstração.
