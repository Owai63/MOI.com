/* ============================================================================
   knowledge.mjs — grounding facts for the assistant
   ----------------------------------------------------------------------------
   A compact, factual brief about Muhammad Owais Iqbal, assembled from his CV
   and portfolio. The assistant answers ONLY from this — it must not invent
   employers, dates, metrics, or technologies. Keep this in sync with
   src/data/content.ts and src/lib/cv/cvData.ts when facts change.
   ========================================================================== */

export const KNOWLEDGE = `
# PROFILE
Name: Muhammad Owais Iqbal (Malik). Title: Embedded Systems & IoT Engineer / Embedded Engineer.
Location: Riyadh, Saudi Arabia. Availability: Available for relevant opportunities.
Email: owais1.iqbal@gmail.com. Phone: +966 539217440.
LinkedIn: owais-malik63. GitHub: owai63.
2+ years of experience building production-grade firmware for IoT and industrial platforms.

# CORE EXPERTISE
- Bare-metal and RTOS firmware in C/C++ on ARM Cortex-M (STM32, nRF9160, ATSAME70, ESP32, EC200U).
- Wireless: BLE (GATT), LTE-M, NB-IoT, GPS/GNSS, XBee API mode, LoRa, UART/SPI/I2C, LTE/4G RAN.
- Device-to-cloud: FOTA/OTA pipelines (HTTP, XBee/LoRa) with integrity checking & rollback; cross-platform BLE configurators; AWS EC2/S3/IAM; GCP telemetry; REST/HTTP/MQTT; fleet dashboards.
- Production infrastructure: MySQL production databases (device/tracker records, SIM/IMEI), Linux/Ubuntu, Nginx, WireGuard VPN, TLS, monitoring.
- Testing & deployment: structured hardware bring-up, GPS/connectivity/RF-range field testing, integrity-checked OTA with rollback.
- SDKs/frameworks: nRF Connect SDK, Zephyr RTOS, QuecOpen SDK, STM32 HAL/LL, Arduino.
- Also: Python (SVM, KNN, supervised ML, signal processing), Verilog HDL, web (HTML/CSS/JS).

# EXPERIENCE
1. Embedded Systems Engineer — Palmlabs, Riyadh (Nov 2024 – Present).
   Owns end-to-end firmware across production IoT platforms (vehicle/asset trackers, RF target-control systems) from bring-up to field deployment. Architects device-to-cloud systems (FOTA/OTA, BLE configurators, AWS/GCP backends & dashboards). Builds/maintains the production database (tracker operations, inventory, SIM/IMEI, service history). Drives memory/power optimisation and structured field testing.
2. Systems Administrator (concurrent) — Palmlabs, Riyadh (Nov 2024 – Present).
   Owns the AWS stack (EC2, S3, IAM) behind production IoT backends; manages GCP telemetry ingestion/storage/analytics; hardens Ubuntu servers (Nginx, firewalls, WireGuard, TLS); maintains deployment pipelines and monitoring.
3. IT Engineer — Northern Mountains Contracting, Riyadh (Aug 2024 – Nov 2024/2025).
   IT systems assessment & readiness audit ahead of ERP migration; managed servers/storage/network and the corporate website; administered Saudi platforms PetroApp, Tawasal, Etimad.
4. Freelance Embedded Systems Developer & Web Designer (Feb 2022 – Mar 2024).
   Custom firmware/prototype hardware on STM32/ESP32/Arduino; sensor integration, motor control, BLE/Wi-Fi, data logging; end-to-end IoT prototypes.
5. Network Engineer Intern — Huawei Technologies, RSC Dept, Pakistan (Jul 2021 – Oct 2021).
   Network planning, RAN configuration/testing, LTE/4G fundamentals, RF planning.
6. Web Developer Intern — Cedrus Group, Abbottabad, Pakistan (Jun 2023 – Sep 2023).

# PROJECTS
- MYMO2 Vehicle Tracking Platform (Palmlabs, deployed): production vehicle tracker on Quectel EC200U with QuecOpen SDK. HTTP FOTA with integrity checking & rollback; cross-platform BLE configurator; integrated BLE/GPS/LTE; AWS EC2/S3 dashboard & backend. Field-tested wireless/OTA. Tech: C/C++, QuecOpen SDK, EC200U, BLE GATT, GPS, HTTP/FOTA, Python, AWS, GCP.
- Shooting Range Target-Control Platform (Palmlabs): smart target control on ATSAME70 for real-time control/monitoring of multiple targets. XBee API-mode packet handling (command queues, ACK/retry, host addressing, target IDs); LoRa long-range version; PWM & relay motor control; movement control (manual, position, speed, encoder tracking, limit switches); motor safety logic; BLE configuration; custom OTA over XBee/LoRa for ATSAME70 & ESP32; automated hardware self-test firmware. Tech: C, ATSAME70, LoRa, UART/SPI/I2C, Atmel Studio, Atmel ICE.
- Pet Tracker (Palmlabs): GPS-enabled tracker on Nordic nRF9160 SiP; LTE-M/NB-IoT via embedded SIM; GPS + cloud transmission; low-power tracking workflows. Tech: nRF9160, nRF Connect SDK, LTE-M/NB-IoT, GPS.
- Brain-Controlled Wheelchair (Gold Medal, Hitec University): mind-controlled wheelchair using ML (SVM, KNN) and biosignal processing; Raspberry Pi + Arduino + motor drivers; real-time Tkinter interface.
- Additional builds: Pet Tracker (NB-IoT/LTE-M), Hand-Gesture Controlled Car (Arduino), FSM 4-Lane Traffic Light Controller (Verilog), Bank Management System (C++/OOP), Online Food Ordering System (PHP/MySQL).

# EDUCATION
B.Sc. in Computer Engineering, Hitec University (2020–2024). CGPA 3.59/4.00.
Gold Medalist (Final Year Project distinction) and Silver Medalist (Academic Excellence).

# CERTIFICATIONS
AWS Certified AI Practitioner; Supervised Machine Learning: Regression and Classification (Coursera/DeepLearning.AI); Google AI Essentials; Introduction to Git and GitHub; Embedded Systems using C; Embedded C Programming Essentials.

# ENGINEERING PHILOSOPHY
"A demo proves an idea. A system has to survive the field." Tests against real conditions; every OTA path carries integrity checking and rollback; owns the whole vertical from chip register to database row; keeps the database matching real device behaviour.
`.trim();
