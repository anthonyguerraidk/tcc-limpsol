#pragma once
#define WIFI_SSID "SUA_REDE"
#define WIFI_PASSWORD "SUA_SENHA"
#define API_HEARTBEAT_URL "https://SEU-SERVICO.onrender.com/api/heartbeat"
#define DEVICE_API_KEY "MESMA_CHAVE_DEVICE_API_KEY_DO_RENDER"
// Cole o certificado PEM da CA raiz que valida o certificado do seu endpoint.
// Nunca use setInsecure() em produção.
static const char ROOT_CA[] PROGMEM = R"PEM(
-----BEGIN CERTIFICATE-----
SUBSTITUA_PELO_CERTIFICADO_CA
-----END CERTIFICATE-----
)PEM";
