#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "config.h"

// Mantém a simulação de limpeza de cinco segundos do bkp/tcc.ino.
// Não aciona motores, válvulas ou bomba; integrar o hardware separadamente.
const int VOLTAGE_PIN = 33;
const float DIVIDER_RATIO = 5.54;
String state = "idle";
String ack = "idle";
unsigned long cleaningStarted = 0;
unsigned long lastHeartbeat = 0;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void heartbeat() {
  if (WiFi.status() != WL_CONNECTED || time(nullptr) < 1700000000) return;
  WiFiClientSecure client;
  client.setCACert(ROOT_CA);
  HTTPClient http;
  http.setConnectTimeout(10000);
  http.setTimeout(15000);
  if (!http.begin(client, API_HEARTBEAT_URL)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_API_KEY);
  JsonDocument payload;
  payload["power"] = analogReadMilliVolts(VOLTAGE_PIN) / 1000.0f * DIVIDER_RATIO;
  payload["status"] = state;
  payload["ack"] = ack;
  String body;
  serializeJson(payload, body);
  const int code = http.POST(body);
  if (code == 200) {
    JsonDocument response;
    if (!deserializeJson(response, http.getString())) {
      String command = response["command"] | "idle";
      if (state == "doneCleaning" && command == "idle") {
        state = "idle"; ack = "done cleaning";
      } else if (state == "idle" && command == "clean") {
        state = "nowCleaning"; ack = "clean acknowledged";
        cleaningStarted = millis();
      }
    }
  } else {
    Serial.printf("Falha no heartbeat: %d\n", code);
  }
  http.end();
}

void loop() {
  if (state == "nowCleaning" && millis() - cleaningStarted >= 5000) {
    state = "doneCleaning";
  }
  if (millis() - lastHeartbeat >= 2000) {
    heartbeat(); lastHeartbeat = millis();
  }
  delay(10);
}
