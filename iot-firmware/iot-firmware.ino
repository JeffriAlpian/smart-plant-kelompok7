#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <DNSServer.h>

// =============================
// 🔹 KONFIGURASI ACCESS POINT (AP)
// =============================
const char *apSSID = "SmartPot_Config";
const char *apPASS = NULL; // Tanpa password agar mudah diakses saat setup

// =============================
// 🔹 PIN KONFIGURASI
// =============================
const int sensorPin = A0; // Pin analog Wemos D1 Mini

// =============================
// 🔹 OBJEK SERVER & DNS
// =============================
ESP8266WebServer server(80);
DNSServer dnsServer;

// =============================
// 🔹 STATUS & VARIABEL
// =============================
bool apModeActive = false;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 10000; // Baca & kirim setiap 10 detik

// Variabel Konfigurasi (Akan diisi dari EEPROM)
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

// =========================
// ⚙️ FUNGSI EEPROM
// =========================
void saveToEEPROM(int addr, const String &data) {
  for (unsigned int i = 0; i < data.length(); i++) {
    EEPROM.write(addr + i, data[i]);
  }
  EEPROM.write(addr + data.length(), '\0');
  EEPROM.commit();
}

String readFromEEPROM(int addr) {
  String data = "";
  char ch;
  for (int i = addr; i < addr + 100; i++) {
    ch = EEPROM.read(i);
    if (ch == '\0') break;
    data += ch;
  }
  return data;
}

// =========================
// 🌐 HALAMAN WEB KONFIGURASI
// =========================
void handleRoot() {
  String html = F(R"(
<!DOCTYPE html>
<html>
<head>
 <title>Konfigurasi Smart Pot</title>
 <meta name='viewport' content='width=device-width, initial-scale=1'>
 <style>
  body { font-family: Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }
  .container { background-color: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
  h2 { text-align: center; color: #2c3e50; }
  label { display: block; margin-top: 15px; margin-bottom: 5px; color: #555; font-weight: bold; font-size: 14px; }
  input[type='text'], input[type='password'] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
  input[type='submit'] { width: 100%; background-color: #27ae60; color: white; padding: 12px; margin-top: 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
  input[type='submit']:hover { background-color: #219150; }
 </style>
</head>
<body>
 <div class='container'>
  <h2>🌱 Smart Pot Setup</h2>
  <form action='/save' method='POST'>
   <label>SSID WiFi:</label>
   <input type='text' name='ssid' value=')"); html += ssid; html += F(R"(' required>
   
   <label>Password WiFi:</label>
   <input type='password' name='password' value=')"); html += password; html += F(R"('>
   
   <label>Firebase Project ID:</label>
   <input type='text' name='proj' value=')"); html += projectId; html += F(R"(' required>
   
   <label>Firebase Web API Key:</label>
   <input type='text' name='api' value=')"); html += apiKey; html += F(R"(' required>
   
   <label>Device ID (Contoh: POT-01):</label>
   <input type='text' name='dev' value=')"); html += deviceId; html += F(R"(' required>
   
   <input type='submit' value='Simpan & Restart'>
  </form>
 </div>
</body>
</html>)");

  server.send(200, "text/html", html);
}

void handleSave() {
  ssid = server.arg("ssid");
  password = server.arg("password");
  projectId = server.arg("proj");
  apiKey = server.arg("api");
  deviceId = server.arg("dev");

  ssid.trim(); password.trim(); projectId.trim(); apiKey.trim(); deviceId.trim();

  saveToEEPROM(ADDR_SSID, ssid);
  saveToEEPROM(ADDR_PASS, password);
  saveToEEPROM(ADDR_PROJ, projectId);
  saveToEEPROM(ADDR_API, apiKey);
  saveToEEPROM(ADDR_DEV, deviceId);

  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <title>Tersimpan!</title>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <meta http-equiv='refresh' content='3;url=http://192.168.4.1'>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f7f6; }
    .card { background: white; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    h3 { color: #27ae60; }
  </style>
</head>
<body>
  <div class='card'>
    <h3>✅ Konfigurasi Tersimpan!</h3>
    <p>Smart Pot akan restart dalam 3 detik...</p>
  </div>
</body>
</html>)";

  server.send(200, "text/html", html);
  delay(2000);
  ESP.restart();
}

// =======================
// 📡 MASUK MODE AP
// =======================
void startAPConfig() {
  Serial.println("\n🔧 MODE KONFIGURASI AKTIF!");
  apModeActive = true;

  WiFi.mode(WIFI_AP);
  delay(100);
  WiFi.softAP(apSSID, apPASS);
  
  IPAddress IP = WiFi.softAPIP();
  Serial.print("Sambungkan ke WiFi: "); Serial.println(apSSID);
  Serial.print("Buka browser ke: http://"); Serial.println(IP);

  dnsServer.start(53, "*", IP);
  server.on("/", handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.onNotFound(handleRoot); // Redirect Captive Portal
  server.begin();
}

// =============================
// ⏱️ FUNGSI WAKTU NTP
// =============================
String getCurrentTime() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// =============================
// 🚀 FUNGSI FIREBASE
// =============================
void sendToFirestore(int moisture) {
  WiFiClientSecure client;
  client.setInsecure(); // Abaikan SSL untuk ESP8266 agar cepat

  // 1. URL Patch (Update Status Terkini)
  String firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + projectId + 
                        "/databases/(default)/documents/devices/" + deviceId + 
                        "?updateMask.fieldPaths=moisture&key=" + apiKey;

  HTTPClient http;
  http.begin(client, firestoreUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  JsonObject fields = doc.createNestedObject("fields");
  JsonObject moistureField = fields.createNestedObject("moisture");
  moistureField["integerValue"] = moisture;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.sendRequest("PATCH", requestBody);
  Serial.printf("Status Update Response: %d\n", httpCode);
  http.end();

  // 2. URL Post (Simpan Riwayat di sub-collection readings)
  if (httpCode > 0) {
    String historyUrl = "https://firestore.googleapis.com/v1/projects/" + projectId + 
                        "/databases/(default)/documents/devices/" + deviceId + 
                        "/readings?key=" + apiKey;

    http.begin(client, historyUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> histDoc;
    JsonObject histFields = histDoc.createNestedObject("fields");
    
    JsonObject histMoisture = histFields.createNestedObject("moisture");
    histMoisture["integerValue"] = moisture;
    
    JsonObject histTime = histFields.createNestedObject("timestamp");
    histTime["timestampValue"] = getCurrentTime();

    String histBody;
    serializeJson(histDoc, histBody);

    int histCode = http.POST(histBody);
    Serial.printf("History Saved Response: %d\n", histCode);
    http.end();
  }
}

// =============================
// ⚙️ SETUP UTAMA
// =============================
void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);
  delay(1000);

  // Baca Konfigurasi dari EEPROM
  ssid = readFromEEPROM(ADDR_SSID);
  password = readFromEEPROM(ADDR_PASS);
  projectId = readFromEEPROM(ADDR_PROJ);
  apiKey = readFromEEPROM(ADDR_API);
  deviceId = readFromEEPROM(ADDR_DEV);

  ssid.trim(); password.trim(); projectId.trim(); apiKey.trim(); deviceId.trim();

  Serial.println("\n--- Memuat Konfigurasi ---");
  Serial.println("SSID: " + ssid);
  Serial.println("Device: " + deviceId);

  // Jika SSID atau parameter krusial kosong, paksa masuk Mode AP
  if (ssid == "" || projectId == "" || apiKey == "" || deviceId == "") {
    startAPConfig();
  } else {
    // Coba hubungkan ke WiFi
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());
    
    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) { // Timeout 15 detik
      delay(500);
      Serial.print(".");
      attempts++;
    }

    // Jika gagal terhubung ke WiFi, masuk ke Mode AP untuk konfigurasi ulang
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\n❌ WiFi Gagal terhubung. Beralih ke AP Mode.");
      startAPConfig();
    } else {
      Serial.println("\n✅ WiFi Connected!");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());

      // Sinkronisasi Waktu (NTP)
      Serial.print("Syncing time...");
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      time_t now = time(nullptr);
      while (now < 24 * 3600) {
        delay(500);
        Serial.print(".");
        now = time(nullptr);
      }
      Serial.println("\n✅ Time synced!");
    }
  }
}

// =============================
// 🔁 LOOP UTAMA
// =============================
void loop() {
  // 1. JIKA DI MODE AP (KONFIGURASI)
  if (apModeActive) {
    dnsServer.processNextRequest();
    server.handleClient();
    return; // Berhenti di sini, tidak perlu baca sensor/Firebase
  }

  // 2. JIKA NORMAL (KIRIM DATA)
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long currentMillis = millis();
    
    // Gunakan interval millis() sebagai pengganti delay()
    if (currentMillis - lastSensorRead >= SENSOR_INTERVAL) {
      lastSensorRead = currentMillis;

      // Baca & Petakan Nilai Sensor
      int rawValue = analogRead(sensorPin);
      int moisture = map(rawValue, 1023, 400, 0, 100);
      moisture = constrain(moisture, 0, 100);

      Serial.printf("\n🌱 Raw: %d | Kelembaban: %d%%\n", rawValue, moisture);
      
      // Kirim Data
      sendToFirestore(moisture);
    }
  }
}