<?php
// create_pix.php

header("Content-Type: application/json; charset=utf-8");

// ⚠️ Ideal: guardar em variável de ambiente
$apiToken = "zciTuYkHgTftyL50WvaSqcBkdzie7iYKwpiW41PN9vWX5UlpNa8wBkPenlUf"; 
$apiUrl = "https://api.nitropagamentos.com/api/public/v1/transactions?api_token={$apiToken}";

// Dados fictícios do cliente (pode vir de $_POST futuramente)
$customerData = [
    "name" => "BOMBA",
    "email" => "usuario@example.com",
    "phone_number" => "11999999999",
    "document" => "84442474133"
];

// Valor (em centavos)
$paymentValue = 2063; // R$20,63

// Corpo da requisição
$body = [
    "amount" => $paymentValue,
    "offer_hash" => "qpqjawq1em",
    "payment_method" => "pix",
    "customer" => $customerData,
    "cart" => [
        [
            "product_hash" => "5goisdx4mh",
            "title" => "BOMBA",
            "price" => $paymentValue,
            "quantity" => 1,
            "operation_type" => 1,
            "tangible" => false
        ]
    ],
    "expire_in_days" => 1,
    "transaction_origin" => "api",
    "installments" => 1,
    "tracking" => [
        "utm_source" => $_GET['utm_source'] ?? null,
        "utm_medium" => $_GET['utm_medium'] ?? null,
        "utm_campaign" => $_GET['utm_campaign'] ?? null,
        "utm_content" => $_GET['utm_content'] ?? null,
        "utm_term" => $_GET['utm_term'] ?? null,
    ],
    "postback_url" => "https://bot.atendimentoagr.shop/u-p-1-raspou-9srz40s"
];

// Enviar requisição com cURL
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    echo json_encode([
        "error" => "Erro na comunicação com a API",
        "details" => curl_error($ch)
    ]);
    curl_close($ch);
    exit;
}

curl_close($ch);

// Decodifica resposta
$data = json_decode($response, true);

// Retorna somente o essencial
echo json_encode([
    "hash" => $data['hash'] ?? null,
    "pix_code" => $data['pix']['pix_qr_code'] ?? null,
    "pix_link" => $data['pix']['pix_link'] ?? null,
    "status" => $data['status'] ?? null
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
