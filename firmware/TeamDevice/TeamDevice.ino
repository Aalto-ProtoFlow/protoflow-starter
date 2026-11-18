/*
 * TeamDevice.ino - Starting point for one of your team's ESP32 boards.
 *
 * Connects to your team server and registers the modules declared below, so that Node-RED and
 * your web app see them and can control them. As it comes, it has one Grove LED on GPIO 33,
 * which html/index.html and html/controller.html can switch on and off.
 *
 * Add a module: look it up in docs/components.md, under "In a sketch". Copy its #include and
 * its declaration below, change the pin to where the module is wired, and add its calls in the
 * places marked ADD. Install the Arduino library it needs, if any (Tools > Manage Libraries).
 * Use modules only through their component classes, never with digitalWrite() or analogRead()
 * on their pins: otherwise Node-RED and the web app never see them.
 *
 * Several boards: copy this folder, give the folder and the .ino file the same new name, and
 * give each board its own DEVICE_NAME.
 *
 * SETUP: create config.h from config.example.h (TEAM-GUIDE.md, part 2). It holds your WiFi
 * password, so .gitignore keeps it out of git.
 */

#include <ProtoFlow.h>
#include "config.h"

// The name this board shows in Node-RED and the web app
#define DEVICE_NAME "Team device"

// ---------------------------------------------------------------------------------------------
// Modules. ADD: the #include and the declaration of each module (docs/components.md)
// ---------------------------------------------------------------------------------------------
#include <components/GroveLED.h>

//              name   pin  inverted
GroveLED led = {"led", 33, false};

void setup() {
    Serial.begin(115200);
    delay(1000);

    ProtoFlow.configureDevice(DEVICE_NAME, "ESP32");

    // ADD: <module>.setup(); for every module
    led.setup();

    ProtoFlow.configureWiFi(WIFI_SSID, WIFI_PASSWORD);
    ProtoFlow.configureWebSocket(WEBSOCKET_URL, ROOT_CA_CERT);

    ProtoFlow.onConnect([]() {
        ProtoFlow.sendDeviceRegistration();
    });

    ProtoFlow.onRegistration([](bool accepted, String message) {
        if (accepted) {
            // ADD: <sensor>.sendInitial(); for every sensor (components.md says which have it)
        } else {
            PF_ERROR("Registration failed: " + message);
        }
    });

    ProtoFlow.begin();
}

void loop() {
    // Must run often: it keeps the connection alive and delivers commands to the modules
    ProtoFlow.update();

    if (!ProtoFlow.isOperational()) {
        delay(10);
        return;
    }

    // ADD: <module>.loop(); for every module
    led.loop();
}
