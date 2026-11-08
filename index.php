<?php
$config = require __DIR__ . '/config.php';
$valor = 'R$ ' . number_format(((int) $config['amount_cents']) / 100, 2, ',', '.');
$pageConfig = array(
    'amountCents' => (int) $config['amount_cents'],
    'storageKey' => 'pix-' . $config['product_id'],
    'redirectUrl' => $config['redirect_url'],
    'redirectDelayMs' => 2500,
);
function e($text) { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
?><!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title><?= e($config['page_title'] . ' — ' . $valor) ?></title>
  <meta name="description" content="<?= e('Escaneie o QR code ou use o PIX copia e cola para pagar ' . $valor . '.') ?>">
  <link rel="icon" href="assets/favicon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="assets/style.css?v=1">
  <!-- UTMify: mantém os UTMs na página -->
  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" data-utmify-prevent-xcod-sck data-utmify-prevent-subids async defer></script>
</head>
<body>
  <div class="page">
    <header class="top">
      <div class="brand">
        <img src="assets/logo.png" alt="Logo">
        <span class="sep"></span>
        <span class="brand-text">Pagamento via PIX</span>
      </div>
      <span class="secure"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Ambiente seguro</span>
    </header>

    <main class="grid">
      <section class="left rise">
        <p class="eyebrow" id="title">Total a pagar</p>
        <p class="amount"><?= e($valor) ?></p>
        <div class="status-wrap" id="status"></div>
        <div class="visual-mobile" id="visual-mobile"></div>
        <div class="actions" id="actions"></div>
        <p class="trust">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          Transação protegida · Pagamento instantâneo via PIX
        </p>
      </section>
      <section class="right">
        <div class="halo"></div>
        <div class="dots"></div>
        <div class="visual-desktop rise delay" id="visual-desktop"></div>
      </section>
    </main>
  </div>
  <div class="toast" id="toast" role="status"></div>

  <script>window.PIX_CONFIG = <?= json_encode($pageConfig, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
  <script src="assets/qrcode.js"></script>
  <script src="assets/app.js?v=1"></script>
</body>
</html>
