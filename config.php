<?php
/**
 * Configuração da oferta OF1.
 * Só este arquivo muda entre uma oferta e outra.
 */
return array(
    // Sua chave da API BravoPay (começa com bp_live_). Pegue no painel da BravoPay.
    // Ela fica só no servidor; quem visita a página nunca vê.
    'api_key' => 'bp_live_wGUtTMxTp3NhExdVJlQxfMcxj_t6mJvCyfvQxA',

    // Valor do PIX em centavos (R$ 33,60).
    'amount_cents' => 3190,

    // Produto na BravoPay ("Pagamento OF2"), para a UTMify atribuir a venda.
    'product_id' => 'cmw270xtm001e08kwlfj89pot',

    // Para onde a pessoa vai depois que o PIX for pago.
    'redirect_url' => 'https://www.google.com',

    // Validade do PIX em segundos (3600 = 1 hora).
    'expires_in' => 3600,

    'page_title' => 'Pagamento PIX',
    'api_url' => 'https://bravopay.club/api/v1',
);
