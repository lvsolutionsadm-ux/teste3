<?php
header('Content-Type: application/json');

$api_token = "zciTuYkHgTftyL50WvaSqcBkdzie7iYKwpiW41PN9vWX5UlpNa8wBkPenlUf"; // mesmo token usado no create_pix.php

if (!isset($_GET['hash'])) {
    echo json_encode(['error' => 'Hash não informado']);
    exit;
}

$hash = $_GET['hash'];
$url = "https://api.nitropagamentos.com/api/public/v1/transactions/$hash?api_token=$api_token";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Accept: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
echo $response;
