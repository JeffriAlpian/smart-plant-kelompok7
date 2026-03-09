#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <DNSServer.h>

// =============================
// 🔹 KONFIGURASI ACCESS POINT (AP) & WEBHOOK
// =============================
const char *apSSID = "SmartPot_Config";
const char *apPASS = NULL;

// ⚠️ MASUKKAN URL GOOGLE SCRIPT KAMU DI SINI:
String googleScriptUrl = "TARUH_URL_GOOGLE_SCRIPT_KAMU_DISINI";

// =============================
// 🔹 PIN KONFIGURASI
// =============================
const int sensorPin = A0;
const int pumpPin = 5;

// =============================
// 🔹 OBJEK GLOBAL
// =============================
ESP8266WebServer server(80);
DNSServer dnsServer;
WiFiClientSecure secureClient;

// =============================
// 🔹 STATUS & VARIABEL
// =============================
bool apModeActive = false;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 10000;

int currentMoisture = 0;
bool autoMode = false;
bool waterCommand = false;
unsigned long lastWaterTimeMillis = 0;
const unsigned long COOLDOWN_TIME = 30000;

// 🔥 Variabel Anti-Spam Notifikasi
bool isNotifSent = false;

String ssid = "";
String password = "";
String projectId = "";
String apiKey = "";
String deviceId = "";

// =========================
// 📦 EEPROM LAYOUT
// =========================
#define EEPROM_SIZE 512
#define ADDR_SSID 0
#define ADDR_PASS 100
#define ADDR_PROJ 200
#define ADDR_API 300
#define ADDR_DEV 400

void saveToEEPROM(int addr, const String &data)
{
  for (unsigned int i = 0; i < data.length(); i++)
    EEPROM.write(addr + i, data[i]);
  EEPROM.write(addr + data.length(), '\0');
  EEPROM.commit();
}

String readFromEEPROM(int addr)
{
  String data = "";
  char ch;
  for (int i = addr; i < addr + 100; i++)
  {
    ch = EEPROM.read(i);
    if (ch == '\0')
      break;
    data += ch;
  }
  return data;
}

// =========================
// 🌐 HALAMAN WEB KONFIGURASI (Disingkat untuk menghemat ruang, sama seperti sebelumnya)
// =========================
void handleRoot()
{
  String html = F("<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{font-family:Arial;padding:20px}input{width:100%;padding:10px;margin:5px 0}input[type='submit']{background:#27ae60;color:#fff}</style></head><body><h2>🌱 Setup Smart Pot</h2><form action='/save' method='POST'><label>SSID:</label><input type='text' name='ssid' value='");
  html += ssid;
  html += F("' required><label>Password:</label><input type='password' name='password' value='");
  html += password;
  html += F("'><label>Project ID:</label><input type='text' name='proj' value='");
  html += projectId;
  html += F("' required><label>API Key:</label><input type='text' name='api' value='");
  html += apiKey;
  html += F("' required><label>Device ID:</label><input type='text' name='dev' value='");
  html += deviceId;
  html += F("' required><input type='submit' value='Simpan & Restart'></form></body></html>");
  server.send(200, "text/html", html);
}

void handleSave()
{
  ssid = server.arg("ssid");
  password = server.arg("password");
  projectId = server.arg("proj");
  apiKey = server.arg("api");
  deviceId = server.arg("dev");
  ssid.trim();
  password.trim();
  projectId.trim();
  apiKey.trim();
  deviceId.trim();
  saveToEEPROM(ADDR_SSID, ssid);
  saveToEEPROM(ADDR_PASS, password);
  saveToEEPROM(ADDR_PROJ, projectId);
  saveToEEPROM(ADDR_API, apiKey);
  saveToEEPROM(ADDR_DEV, deviceId);
  server.send(200, "text/html", F("<h3>✅ Tersimpan! Restarting...</h3>"));
  delay(2000);
  ESP.restart();
}

void startAPConfig()
{
  Serial.println("\n🔧 MODE KONFIGURASI AKTIF!");
  apModeActive = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apSSID, apPASS);
  dnsServer.start(53, "*", WiFi.softAPIP());
  server.on("/", handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.onNotFound(handleRoot);
  server.begin();
}

String getEpochMillis()
{
  time_t now = time(nullptr);
  unsigned long long millisec = (unsigned long long)now * 1000ULL;
  char buffer[32];
  sprintf(buffer, "%llu", millisec);
  return String(buffer);
}

// =============================
// 🚀 FUNGSI FIREBASE & WEBHOOK
// =============================
void sendMoistureToFirestore(int moisture)
{
  String url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/devices/" + deviceId + "?updateMask.fieldPaths=moisture&key=" + apiKey;
  HTTPClient http;
  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<200> doc;
  doc["fields"]["moisture"]["integerValue"] = moisture;
  String requestBody;
  serializeJson(doc, requestBody);
  http.sendRequest("PATCH", requestBody);
  http.end();
}

void readSettingsFromFirestore()
{
  String url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/devices/" + deviceId + "?key=" + apiKey;
  HTTPClient http;
  http.begin(secureClient, url);
  if (http.GET() == 200)
  {
    StaticJsonDocument<1024> doc;
    if (!deserializeJson(doc, http.getString()))
    {
      autoMode = doc["fields"]["autoMode"]["booleanValue"] | false;
      waterCommand = doc["fields"]["waterCommand"]["booleanValue"] | false;
    }
  }
  http.end();
}

void recordWateringEvent()
{
  String url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/devices/" + deviceId + "?updateMask.fieldPaths=waterCommand&updateMask.fieldPaths=lastWaterTime&key=" + apiKey;
  HTTPClient http;
  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<256> doc;
  doc["fields"]["waterCommand"]["booleanValue"] = false;
  doc["fields"]["lastWaterTime"]["integerValue"] = getEpochMillis();
  String requestBody;
  serializeJson(doc, requestBody);
  http.sendRequest("PATCH", requestBody);
  http.end();
}

// 🔔 FUNGSI KIRIM NOTIFIKASI KE GOOGLE SCRIPT
void triggerNotifWebhook()
{
  if (googleScriptUrl == "https://script.google.com/macros/s/AKfycbwUo4ivzssJyugOwJV4OH7KK1oLomjpLLHg1fOleV0LjgditQ5bb89x13sGD2a6wogU/exec")
  {
    Serial.println("⚠️ URL Webhook belum diisi! Lewati kirim notif.");
    return;
  }

  Serial.println("🔔 Mengirim perintah Notifikasi ke Google Script...");
  HTTPClient http;
  http.begin(secureClient, googleScriptUrl);

  // Script Google selalu mengalihkan URL (Redirect), jadi kita harus izinkan Wemos mengikutinya
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  int httpCode = http.GET();
  if (httpCode > 0)
  {
    Serial.printf("✅ Notifikasi sukses ditembak! (Code: %d)\n", httpCode);
  }
  else
  {
    Serial.printf("❌ Gagal menembak Webhook: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// =============================
// 💦 FUNGSI POMPA AIR
// =============================
void activatePump()
{
  Serial.println("💦 MEMULAI PENYIRAMAN...");
  digitalWrite(pumpPin, HIGH);
  delay(3000);
  digitalWrite(pumpPin, LOW);
  lastWaterTimeMillis = millis();
  recordWateringEvent();

  int rawValue = analogRead(sensorPin);
  currentMoisture = constrain(map(rawValue, 1023, 400, 0, 100), 0, 100);
  sendMoistureToFirestore(currentMoisture);

  Serial.println("✅ Penyiraman selesai & Data diupdate!");
}

// =============================
// ⚙️ SETUP UTAMA
// =============================
void setup()
{
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);
  pinMode(pumpPin, OUTPUT);
  digitalWrite(pumpPin, LOW);
  secureClient.setInsecure();

  ssid = readFromEEPROM(ADDR_SSID);
  password = readFromEEPROM(ADDR_PASS);
  projectId = readFromEEPROM(ADDR_PROJ);
  apiKey = readFromEEPROM(ADDR_API);
  deviceId = readFromEEPROM(ADDR_DEV);
  ssid.trim();
  password.trim();
  projectId.trim();
  apiKey.trim();
  deviceId.trim();

  if (ssid == "" || projectId == "" || deviceId == "")
    startAPConfig();
  else
  {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30)
    {
      delay(500);
      attempts++;
    }
    if (WiFi.status() != WL_CONNECTED)
      startAPConfig();
    else
    {
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      time_t now = time(nullptr);
      while (now < 24 * 3600)
      {
        delay(500);
        now = time(nullptr);
      }
    }
  }
}

// =============================
// 🔁 LOOP UTAMA
// =============================
void loop()
{
  if (apModeActive)
  {
    dnsServer.processNextRequest();
    server.handleClient();
    return;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    unsigned long currentMillis = millis();

    // 1. RUTINITAS SETIAP 10 DETIK
    if (currentMillis - lastSensorRead >= SENSOR_INTERVAL)
    {
      lastSensorRead = currentMillis;

      int rawValue = analogRead(sensorPin);
      currentMoisture = constrain(map(rawValue, 1023, 400, 0, 100), 0, 100);
      Serial.printf("\n🌱 Kelembaban: %d%%\n", currentMoisture);

      sendMoistureToFirestore(currentMoisture);
      readSettingsFromFirestore();

      // 🔥 LOGIKA TRIGGER NOTIFIKASI
      if (currentMoisture < 30)
      {
        // Jika tanah kering (< 30%) dan notifikasi belum pernah dikirim
        if (!isNotifSent)
        {
          triggerNotifWebhook(); // Panggil Google Script
          isNotifSent = true;    // Kunci agar tidak spam tiap 10 detik
        }
      }
      else
      {
        // Jika tanah sudah basah (>= 30%), buka kembali kunci notifikasinya
        if (isNotifSent)
        {
          Serial.println("💧 Tanah sudah basah, mereset sistem notifikasi...");
          isNotifSent = false;
        }
      }
    }

    // 2. LOGIKA PENYIRAMAN
    bool isCooldown = (currentMillis - lastWaterTimeMillis) < COOLDOWN_TIME;

    if (waterCommand)
    {
      waterCommand = false;
      activatePump();
    }
    else if (autoMode && currentMoisture < 30 && !isCooldown)
    {
      Serial.println("⚠️ Auto Pilot bekerja...");
      activatePump();
    }
  }
}