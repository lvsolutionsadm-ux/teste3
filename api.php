<?php
/**
 * API do PIX (BravoPay).
 *   POST api.php?action=create   corpo JSON: { "idempotencyKey": "...", "utm": { ... } }
 *   GET  api.php?action=status&id=ID_DA_COBRANCA
 *
 * O valor e o produto vêm do config.php: quem visita a página não consegue mudar.
 * A resposta traz só os dados do PIX, nunca os dados do cliente.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$config = require __DIR__ . '/config.php';

function pix_respond($status, $data)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pix_friendly_error($json, $status)
{
    $friendly = array(
        'unauthorized' => 'A chave da BravoPay no config.php é inválida ou expirou.',
        'forbidden' => 'A chave da BravoPay não tem permissão para esta ação.',
        'rate_limited' => 'Muitas cobranças em pouco tempo. Aguarde um minuto e tente de novo.',
        'acquirer_error' => 'A operadora do PIX não respondeu. Tente novamente em instantes.',
        'internal_error' => 'A BravoPay teve um erro interno. Tente novamente.',
        'not_found' => 'Cobrança não encontrada.',
        'product_not_found' => 'O produto do config.php não existe nesta conta BravoPay.',
        'product_inactive' => 'O produto do config.php está desativado na BravoPay.',
    );
    $err = (is_array($json) && isset($json['error']) && is_array($json['error'])) ? $json['error'] : array();
    if (!empty($err['code']) && isset($friendly[$err['code']])) {
        return $friendly[$err['code']];
    }
    if (!empty($err['message']) && is_string($err['message'])) {
        return $err['message'];
    }
    return 'Falha na BravoPay (' . $status . ').';
}

function pix_bravo($config, $method, $path, $body = null, $extraHeaders = array())
{
    $key = isset($config['api_key']) ? trim($config['api_key']) : '';
    if ($key === '' || strpos($key, 'COLE_') === 0) {
        pix_respond(500, array('error' => 'Coloque a sua chave da BravoPay no arquivo config.php.'));
    }

    $headers = array(
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
        'Accept: application/json',
    );
    foreach ($extraHeaders as $name => $value) {
        $headers[] = $name . ': ' . $value;
    }

    $url = rtrim($config['api_url'], '/') . $path;
    $payload = $body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
    $status = 0;
    $curlError = '';

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 25,
        ));
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
    } else {
        // Sem cURL: usa o cliente HTTP nativo do PHP (precisa da extensão openssl).
        $opts = array('http' => array(
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'timeout' => 25,
            'ignore_errors' => true,
        ));
        if ($payload !== null) {
            $opts['http']['content'] = $payload;
        }
        $raw = @file_get_contents($url, false, stream_context_create($opts));
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $line) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                    $status = (int) $m[1];
                }
            }
        }
        if ($raw === false) {
            $e = error_get_last();
            $curlError = $e ? $e['message'] : 'sem resposta';
        }
    }

    if ($raw === false) {
        error_log('BravoPay sem resposta ' . $path . ': ' . $curlError);
        pix_respond(502, array('error' => 'Não foi possível falar com a BravoPay. Tente novamente.'));
    }
    $json = json_decode($raw, true);
    if ($status < 200 || $status >= 300) {
        error_log('BravoPay erro [' . $status . '] ' . $path . ': ' . $raw);
        pix_respond(502, array('error' => pix_friendly_error($json, $status)));
    }
    return is_array($json) ? $json : array();
}

/** Só os campos que a página precisa. */
function pix_to_charge($tx)
{
    $pix = (isset($tx['pix']) && is_array($tx['pix'])) ? $tx['pix'] : array();
    return array(
        'id' => isset($tx['id']) ? (string) $tx['id'] : '',
        'status' => isset($tx['status']) ? (string) $tx['status'] : 'PENDING',
        'amountCents' => isset($tx['amount_cents']) ? (int) $tx['amount_cents'] : 0,
        'copyPaste' => isset($pix['copy_paste']) ? (string) $pix['copy_paste'] : '',
        'expiresAt' => isset($pix['expires_at']) ? $pix['expires_at'] : null,
        'paidAt' => isset($tx['paid_at']) ? $tx['paid_at'] : null,
    );
}

/** Aceita só os parâmetros de rastreio conhecidos. */
function pix_clean_utm($input)
{
    $allowed = array('source', 'medium', 'campaign', 'content', 'term', 'fbclid', 'gclid', 'ttclid');
    $utm = array();
    if (!is_array($input)) {
        return $utm;
    }
    foreach ($allowed as $field) {
        if (isset($input[$field]) && is_string($input[$field])) {
            $value = trim($input[$field]);
            if ($value !== '') {
                $utm[$field] = substr($value, 0, 500);
            }
        }
    }
    return $utm;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $key = (is_array($input) && isset($input['idempotencyKey'])) ? (string) $input['idempotencyKey'] : '';
    if (!preg_match('/^[A-Za-z0-9_-]{8,100}$/', $key)) {
        pix_respond(400, array('error' => 'Pedido inválido.'));
    }
    $body = array(
        'amount_cents' => (int) $config['amount_cents'],
        'method' => 'pix',
        'product_id' => $config['product_id'],
        'expires_in' => (int) $config['expires_in'],
    );
    $utm = pix_clean_utm(isset($input['utm']) ? $input['utm'] : null);
    if (!empty($utm)) {
        $body['utm'] = $utm;
    }
    // Mesmo código de pedido = mesma cobrança: recarregar a página não cria outro PIX.
    $tx = pix_bravo($config, 'POST', '/transactions', $body, array('Idempotency-Key' => $config['product_id'] . '-' . $key));
    pix_respond(200, pix_to_charge($tx));
}

if ($action === 'status' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = isset($_GET['id']) ? (string) $_GET['id'] : '';
    if (!preg_match('/^[A-Za-z0-9_-]{4,64}$/', $id)) {
        pix_respond(400, array('error' => 'Cobrança inválida.'));
    }
    $tx = pix_bravo($config, 'GET', '/transactions/' . $id);
    pix_respond(200, pix_to_charge($tx));
}

pix_respond(404, array('error' => 'Ação não encontrada.'));
