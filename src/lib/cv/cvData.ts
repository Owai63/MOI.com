/* ============================================================================
   CV DATA — source of truth for the downloadable CV
   ----------------------------------------------------------------------------
   This mirrors the approved PDF the owner supplied
   (CV_Muhammad_Owais_Iqbal_Embedded_Engineer.pdf) *exactly*, so the generated
   download is byte-for-layout identical every time. It is intentionally kept
   separate from the reframed website content (src/data/content.ts): the CV is
   a fixed document, the website is an editorial presentation.

   Both languages are maintained here. Facts are never invented — the Arabic
   column is a translation of the English CV, nothing more. Technical acronyms
   stay in Latin script, as is standard in Arabic technical CVs.
   ========================================================================== */

export interface CvSkillGroup {
  label: string;
  value: string;
}
export interface CvExperience {
  title: string;
  company: string;
  location: string;
  period: string;
  intro?: string;
  bullets: string[];
}
export interface CvProject {
  name: string;
  org: string;
  intro?: string;
  bullets: string[];
  tech?: string;
}
export interface CvData {
  name: string;
  role: string;
  contact: string[]; // rendered joined by " | "
  labels: {
    summary: string;
    competencies: string;
    skills: string;
    experience: string;
    education: string;
    certifications: string;
    projects: string;
    awards: string;
    technologies: string; // "Technologies:" prefix inside a project
  };
  summary: string;
  competencies: string[];
  skills: CvSkillGroup[];
  experience: CvExperience[];
  education: { line1: string; line2: string };
  certifications: string[];
  projects: CvProject[];
  awards: string[];
}

/* --------------------------------------------------------------------------- */
/* ENGLISH — verbatim from the supplied PDF                                     */
/* --------------------------------------------------------------------------- */
const en: CvData = {
  name: 'MUHAMMAD OWAIS IQBAL',
  role: 'Embedded Engineer',
  contact: [
    '(+966) 539217440',
    'owais1.iqbal@gmail.com',
    'Riyadh, Saudi Arabia',
    'owais-malik63',
  ],
  labels: {
    summary: 'Career Summary',
    competencies: 'Core Competencies',
    skills: 'Technical Skills',
    experience: 'Professional Experience',
    education: 'Education',
    certifications: 'Certifications',
    projects: 'Projects',
    awards: 'Awards & Achievements',
    technologies: 'Technologies',
  },
  summary:
    'Embedded Systems Engineer with 2+ years of experience developing production-grade firmware for IoT and industrial platforms. Proficient in bare-metal and RTOS-based development in C/C++ across ARM Cortex-M microcontrollers including STM32, nRF9160, ATSAME70, and ESP32, with hands-on expertise in BLE GATT, LTE-M/NB-IoT, GPS, XBee, LoRa, and UART/SPI/I2C protocols. Proven track record delivering end-to-end IoT solutions, from hardware bring-up and peripheral driver development to FOTA pipelines, cloud telemetry backends (AWS/GCP), and production database systems. Holds a B.Sc. in Computer Engineering (CGPA 3.59/4.00) from Hitec University and is a dual Gold & Silver University Medalist. AWS AI Practitioner certified with additional credentials in Machine Learning and Embedded C Programming.',
  competencies: [
    'Bare-metal & RTOS-based firmware development (C/C++) on ARM Cortex-M microcontrollers',
    'End-to-end IoT product development from hardware bring-up to cloud-connected deployment',
    'FOTA/OTA pipeline design with integrity checking, rollback protection & version management',
    'Peripheral driver development: UART, SPI, I2C, GPIO, ADC, timers & motor control',
    'BLE GATT service & characteristic design for device provisioning and configuration',
    'Cellular modem integration: LTE-M, NB-IoT, AT command layer & bearer management',
    'GPS/GNSS acquisition, cold/warm-start workflows & duty-cycle optimisation',
    'Memory layout optimisation & low-power state management for field-deployed devices',
    'Custom OTA protocol design over XBee, LoRa & HTTP with ACK/retry logic',
    'AWS/GCP cloud backend integration for IoT telemetry, dashboards & fleet monitoring',
    'Production database design & management for tracker/device operations and reporting',
    'Structured field testing: GPS fix, LTE connectivity, RF range & BLE coverage',
    'Technical documentation system architecture, design specs & deployment guides',
    'Cross-functional collaboration across firmware, backend & operations teams.',
  ],
  skills: [
    { label: 'Programming Languages', value: 'C, C++, Python, MATLAB, Verilog HDL, MySQL, HTML/CSS, JavaScript.' },
    { label: 'Embedded Platforms & Modules', value: 'STM32, nRF9160, ATSAME70, ESP32, EC200U, Arduino, Raspberry Pi, BeagleBone.' },
    { label: 'SDKs & Frameworks', value: 'nRF Connect SDK, Zephyr RTOS, QuecOpen SDK, STM32 HAL/LL, Arduino Framework' },
    { label: 'Wireless & Communication Protocols', value: 'BLE (GATT), LTE-M, NB-IoT, GPS/GNSS, XBee API Mode, LoRa, UART, SPI, I2C, LTE/4G (RAN)' },
    { label: 'Cloud, Server & Infrastructure', value: 'AWS (EC2, S3, IAM), GCP, Linux/Ubuntu, Nginx, WireGuard VPN, Shell Scripting' },
    { label: 'Database & Backend', value: 'MySQL, production device/tracker database management, reporting & inventory systems' },
    { label: 'DevOps & Version Control', value: 'Git, GitHub, CI/CD pipelines, FOTA/OTA update pipelines, firmware versioning' },
    { label: 'Machine Learning & AI', value: 'Python (SVM, KNN), supervised ML, signal processing, real-time biosignal classification' },
    { label: 'Web Development', value: 'HTML5, CSS3, JavaScript, Responsive Design, Flexbox/Grid, Vanilla JS' },
  ],
  experience: [
    {
      title: 'Embedded Engineer',
      company: 'Palmlabs',
      location: 'Riyadh, Saudi Arabia',
      period: 'Nov 2024 – present',
      intro: 'Roles & Responsibilities',
      bullets: [
        'Own end-to-end firmware development across multiple production IoT platforms vehicle/asset trackers and RF target-control systems from hardware bring-up through to field deployment',
        'Architect device-to-cloud systems including FOTA/OTA update pipelines, cross-platform BLE configurators, and AWS/GCP telemetry backends and dashboards',
        'Build and maintain the production-side database for tracker/device operations, inventory, SIM/IMEI records, and service history',
        'Collaborate across firmware, backend, and operations teams to align device behaviour with real deployment and production requirements',
        'Drive memory and power optimisation and run structured field testing for connectivity, GPS acquisition, and RF range under real-world conditions',
      ],
    },
    {
      title: 'System Engineering & Cloud Responsibilities (Concurrent Role)',
      company: 'Palmlabs',
      location: 'Riyadh, Saudi Arabia',
      period: 'Nov 2024 – present',
      intro:
        'I serve as the backbone for our infrastructure operations. I manage a complex environment of AWS and GCP cloud infrastructure, where I:',
      bullets: [
        'Keep the lights on: I monitor system performance and logs 24/7 to catch and fix degradation before it impacts the user.',
        "Build for Scale: I've configured and deployed Linux virtual machines and storage clusters that support real-time IoT data systems.",
        'Ensure Disaster Readiness: I manage database backups, snapshots, and server migrations, ensuring that our data is always recoverable in an emergency.',
        'Bridge Technology: I bridge the gap between embedded devices and the servers they communicate with, ensuring high-speed, reliable data flow via HTTP and MQTT protocols',
      ],
    },
    {
      title: 'IT Engineer',
      company: 'Northern Mountains Contracting',
      location: 'Riyadh, Saudi Arabia',
      period: 'Aug 2024 – Nov 2025',
      intro:
        'During my time here, I was a key player in maintaining the enterprise IT infrastructure. My work included:',
      bullets: [
        'Participated in IT systems assessment and readiness analysis for ERP rollout.',
        'Handled server infrastructure, storage, network capacity and corporate website (front/back-end) including digital platforms like PetroApp, Tawasal, Etimad.',
      ],
    },
    {
      title: 'Web Developer (Intern)',
      company: 'Cedrus Group',
      location: 'Abbottabad, Pakistan',
      period: 'Jun 2023 – Sep 2023',
      bullets: [
        'Developed UI components and full websites using HTML, CSS, JavaScript; built reusable code and libraries.',
        'Learned and applied best practices in coding, design, accessibility, performance optimization; debugged and troubleshot web apps.',
      ],
    },
  ],
  education: {
    line1: "Bachelor's Degree | Computer Engineering | Hitec University          2020 – 2024",
    line2: 'CGPA: 3.59 / 4.00',
  },
  certifications: [
    'AWS Certified AI Practitioner',
    'Supervised Machine Learning: Regression and Classification',
    'Introduction to Git and GitHub',
    'Google AI',
    'Embedded systems using C',
    'Embedded C programming Essentials',
  ],
  projects: [
    {
      name: 'Car Tracker',
      org: 'Palmlabs',
      bullets: [
        'Developed and deployed robust FOTA protocol using QuecOpen SDK for secure firmware updates via HTTP.',
        'Designed and implemented BLE Configurator (PC & mobile) allowing real-time device configuration via custom GATT services.',
        'Integrated BLE, GPS and LTE modules; architected cloud-based dashboard and backend on AWS for monitoring and configuration.',
        'Optimized memory usage and power consumption, improved device stability and longevity.',
        'Field-tested wireless performance and OTA functionality under real-world conditions.',
      ],
      tech: 'C/C++, QuecOpen SDK, BLE GATT, GPS, HTTP, Python, AWS EC2/S3, GCP.',
    },
    {
      name: 'Shooting Range Project',
      org: 'Palmlabs',
      intro:
        'Developed a smart shooting-range target-control platform on ATSAME70 MCU for real-time control and monitoring of multiple target devices.',
      bullets: [
        'Implemented the deployed XBee-based communication version using API-mode packet handling, command queues, ACK/retry logic, host addressing, target ID setup, and remote command responses.',
        'Built the LoRa-based communication version to extend long-range wireless communication and support additional target/device types.',
        'Designed and integrated motor-control workflows for multiple target types, including PWM motor control and relay-based control.',
        'Developed movement-control logic including manual movement, position control, speed control, encoder-based tracking, and limit-switch handling.',
        'Added safety logic for motor operation, including limit detection, stop conditions, direction control, and controlled movement near target positions.',
        'Integrated BLE configuration support for wireless reading and writing of device parameters such as device ID, movement settings, speed values, and network-related configuration.',
        'Developed a custom OTA firmware update protocol for ATSAME70 and ESP32 over XBee and LoRa links.',
        'Developed an automated test firmware that checked each hardware module on the board.',
      ],
      tech: 'C, ATSAME70, LoRa, UART/SPI/I2C, Atmel Studio, Atmel ICE, Oscilloscope/Logic-Analyzer.',
    },
    {
      name: 'Pet Tracker',
      org: 'Palmlabs',
      bullets: [
        'Designed system architecture for GPS-enabled Pet Tracker using Nordic nRF9160 SiP module.',
        'Developed firmware for LTE-M/NB-IoT connectivity via embedded SIM, integrated GPS and cloud transmission.',
        'Delivered design documentation for LTE/GPS initialization and low-power IoT tracking workflows.',
      ],
      tech: 'nRF9160, nRF Connect SDK, LTE-M/NB-IoT, GPS, UART, Nordic Developer Tools.',
    },
    {
      name: 'Brain-Controlled Wheelchair (Gold Medal)',
      org: 'Hitec University',
      bullets: [
        'Developed a mind-controlled wheelchair using ML algorithms (SVM, KNN) and biosignal processing. Integrated Raspberry Pi, Arduino, and motor drivers with real-time interface via Tkinter.',
      ],
    },
  ],
  awards: ['Gold Medalist (University)', 'Silver Medalist (University)'],
};

/* --------------------------------------------------------------------------- */
/* ARABIC — translation of the same CV                                          */
/* --------------------------------------------------------------------------- */
const ar: CvData = {
  name: 'محمد أويس إقبال',
  role: 'مهندس أنظمة مدمجة',
  contact: [
    '(+966) 539217440',
    'owais1.iqbal@gmail.com',
    'الرياض، المملكة العربية السعودية',
    'owais-malik63',
  ],
  labels: {
    summary: 'الملخّص المهني',
    competencies: 'الكفاءات الأساسية',
    skills: 'المهارات التقنية',
    experience: 'الخبرة المهنية',
    education: 'التعليم',
    certifications: 'الشهادات',
    projects: 'المشاريع',
    awards: 'الجوائز والإنجازات',
    technologies: 'التقنيات',
  },
  summary:
    'مهندس أنظمة مدمجة يمتلك أكثر من عامين من الخبرة في تطوير برمجيات ثابتة بمستوى إنتاجي لمنصّات إنترنت الأشياء والمنصّات الصناعية. متمكّن من التطوير على المستوى المباشر (bare-metal) وباستخدام أنظمة التشغيل اللحظية بلغة C/C++ عبر متحكّمات ARM Cortex-M بما في ذلك STM32 وnRF9160 وATSAME70 وESP32، مع خبرة عملية في BLE GATT وLTE-M/NB-IoT وGPS وXBee وLoRa وبروتوكولات UART/SPI/I2C. سجلّ مثبت في تسليم حلول إنترنت أشياء متكاملة، من تشغيل العتاد وتطوير مشغّلات الأطراف إلى خطوط FOTA وخلفيات القياس السحابية (AWS/GCP) وأنظمة قواعد البيانات الإنتاجية. حاصل على بكالوريوس العلوم في هندسة الحاسوب (معدل تراكمي 3.59/4.00) من جامعة Hitec، وحائز على الميداليتين الذهبية والفضية على مستوى الجامعة. حاصل على شهادة AWS AI Practitioner إضافةً إلى شهادات في تعلّم الآلة وبرمجة الأنظمة المدمجة بلغة C.',
  competencies: [
    'تطوير برمجيات ثابتة على المستوى المباشر وباستخدام نظام تشغيل لحظي (C/C++) على متحكّمات ARM Cortex-M',
    'تطوير منتجات إنترنت الأشياء المتكاملة من تشغيل العتاد إلى النشر المتصل بالسحابة',
    'تصميم خطوط FOTA/OTA مع التحقّق من السلامة وحماية التراجع وإدارة الإصدارات',
    'تطوير مشغّلات الأطراف: UART وSPI وI2C وGPIO وADC والمؤقّتات والتحكّم بالمحرّكات',
    'تصميم خدمات وخصائص BLE GATT لتهيئة الأجهزة وإعدادها',
    'دمج المودم الخلوي: LTE-M وNB-IoT وطبقة أوامر AT وإدارة الحوامل',
    'التقاط GPS/GNSS، وسير عمل البدء البارد/الدافئ، وتحسين دورة التشغيل',
    'تحسين تخطيط الذاكرة وإدارة حالات الطاقة المنخفضة للأجهزة الميدانية',
    'تصميم بروتوكول OTA مخصّص عبر XBee وLoRa وHTTP مع منطق ACK/إعادة المحاولة',
    'دمج الخلفية السحابية AWS/GCP لقياسات إنترنت الأشياء ولوحات التحكّم ومراقبة الأسطول',
    'تصميم وإدارة قواعد البيانات الإنتاجية لعمليات أجهزة التتبّع والتقارير',
    'اختبار ميداني منظّم: تثبيت GPS، واتصال LTE، ومدى RF، وتغطية BLE',
    'معمارية أنظمة التوثيق التقني ومواصفات التصميم وأدلّة النشر',
    'التعاون متعدّد الوظائف عبر فرق البرمجيات الثابتة والخلفية والعمليات.',
  ],
  skills: [
    { label: 'لغات البرمجة', value: 'C, C++, Python, MATLAB, Verilog HDL, MySQL, HTML/CSS, JavaScript.' },
    { label: 'المنصّات والوحدات المدمجة', value: 'STM32, nRF9160, ATSAME70, ESP32, EC200U, Arduino, Raspberry Pi, BeagleBone.' },
    { label: 'حزم التطوير والأطر', value: 'nRF Connect SDK, Zephyr RTOS, QuecOpen SDK, STM32 HAL/LL, Arduino Framework' },
    { label: 'البروتوكولات اللاسلكية والاتصالات', value: 'BLE (GATT), LTE-M, NB-IoT, GPS/GNSS, XBee API Mode, LoRa, UART, SPI, I2C, LTE/4G (RAN)' },
    { label: 'السحابة والخوادم والبنية التحتية', value: 'AWS (EC2, S3, IAM), GCP, Linux/Ubuntu, Nginx, WireGuard VPN, Shell Scripting' },
    { label: 'قواعد البيانات والخلفية', value: 'MySQL، إدارة قواعد بيانات الأجهزة/أجهزة التتبّع الإنتاجية، وأنظمة التقارير والمخزون' },
    { label: 'DevOps وإدارة الإصدارات', value: 'Git, GitHub, خطوط CI/CD، خطوط تحديث FOTA/OTA، إدارة إصدارات البرمجيات الثابتة' },
    { label: 'تعلّم الآلة والذكاء الاصطناعي', value: 'Python (SVM, KNN)، تعلّم آلي خاضع للإشراف، معالجة الإشارات، تصنيف الإشارات الحيوية اللحظي' },
    { label: 'تطوير الويب', value: 'HTML5, CSS3, JavaScript، التصميم المتجاوب، Flexbox/Grid، Vanilla JS' },
  ],
  experience: [
    {
      title: 'مهندس أنظمة مدمجة',
      company: 'Palmlabs',
      location: 'الرياض، المملكة العربية السعودية',
      period: 'نوفمبر 2024 – حتى الآن',
      intro: 'الأدوار والمسؤوليات',
      bullets: [
        'امتلاك تطوير البرمجيات الثابتة المتكامل عبر عدّة منصّات إنتاجية لإنترنت الأشياء — أجهزة تتبّع المركبات/الأصول وأنظمة التحكّم بالأهداف عبر RF — من تشغيل العتاد إلى النشر الميداني',
        'تصميم أنظمة من الجهاز إلى السحابة تشمل خطوط تحديث FOTA/OTA، ومُهيّئات BLE متعدّدة المنصّات، وخلفيات ولوحات القياس على AWS/GCP',
        'بناء وصيانة قاعدة بيانات جانب الإنتاج لعمليات أجهزة التتبّع والمخزون وسجلّات SIM/IMEI وتاريخ الخدمة',
        'التعاون عبر فرق البرمجيات الثابتة والخلفية والعمليات لمواءمة سلوك الجهاز مع متطلّبات النشر والإنتاج الفعلية',
        'قيادة تحسين الذاكرة والطاقة وإجراء اختبار ميداني منظّم للاتصال والتقاط GPS ومدى RF في ظروف واقعية',
      ],
    },
    {
      title: 'هندسة الأنظمة والمسؤوليات السحابية (دور متزامن)',
      company: 'Palmlabs',
      location: 'الرياض، المملكة العربية السعودية',
      period: 'نوفمبر 2024 – حتى الآن',
      intro:
        'أعمل بمثابة العمود الفقري لعمليات البنية التحتية لدينا. أدير بيئة معقّدة من البنية السحابية AWS وGCP، حيث:',
      bullets: [
        'أبقي الأنظمة تعمل: أراقب أداء النظام والسجلّات على مدار الساعة لاكتشاف التدهور ومعالجته قبل أن يؤثّر على المستخدم.',
        'أبني للتوسّع: هيّأت ونشرت أجهزة افتراضية على Linux وعناقيد تخزين تدعم أنظمة بيانات إنترنت الأشياء اللحظية.',
        'أضمن الجاهزية للكوارث: أدير نسخ قواعد البيانات الاحتياطية واللقطات وترحيل الخوادم، بما يضمن إمكانية استرداد بياناتنا دائمًا في حالات الطوارئ.',
        'أجسر التقنية: أسدّ الفجوة بين الأجهزة المدمجة والخوادم التي تتواصل معها، بما يضمن تدفّق بيانات سريعًا وموثوقًا عبر بروتوكولي HTTP وMQTT',
      ],
    },
    {
      title: 'مهندس تقنية معلومات',
      company: 'Northern Mountains Contracting',
      location: 'الرياض، المملكة العربية السعودية',
      period: 'أغسطس 2024 – نوفمبر 2025',
      intro:
        'خلال فترة عملي هنا، كنت لاعبًا رئيسيًا في صيانة البنية التحتية لتقنية المعلومات في المؤسسة. شمل عملي:',
      bullets: [
        'المشاركة في تقييم أنظمة تقنية المعلومات وتحليل الجاهزية لإطلاق نظام ERP.',
        'إدارة البنية التحتية للخوادم والتخزين وسعة الشبكة والموقع المؤسسي (الواجهة/الخلفية) بما في ذلك المنصّات الرقمية مثل PetroApp وTawasal وEtimad.',
      ],
    },
    {
      title: 'مطوّر ويب (متدرّب)',
      company: 'Cedrus Group',
      location: 'أبوت آباد، باكستان',
      period: 'يونيو 2023 – سبتمبر 2023',
      bullets: [
        'تطوير مكوّنات واجهة المستخدم ومواقع كاملة باستخدام HTML وCSS وJavaScript؛ وبناء أكواد ومكتبات قابلة لإعادة الاستخدام.',
        'تعلّم وتطبيق أفضل الممارسات في البرمجة والتصميم وإتاحة الوصول وتحسين الأداء؛ وتصحيح وإصلاح تطبيقات الويب.',
      ],
    },
  ],
  education: {
    line1: 'درجة البكالوريوس | هندسة الحاسوب | جامعة Hitec          2020 – 2024',
    line2: 'المعدل التراكمي: 3.59 / 4.00',
  },
  certifications: [
    'AWS Certified AI Practitioner',
    'Supervised Machine Learning: Regression and Classification',
    'Introduction to Git and GitHub',
    'Google AI',
    'Embedded systems using C',
    'Embedded C programming Essentials',
  ],
  projects: [
    {
      name: 'جهاز تتبّع السيارات (Car Tracker)',
      org: 'Palmlabs',
      bullets: [
        'تطوير ونشر بروتوكول FOTA قوي باستخدام QuecOpen SDK لتحديثات برمجية آمنة عبر HTTP.',
        'تصميم وتنفيذ مُهيّئ BLE (للحاسوب والجوّال) يتيح تهيئة الجهاز اللحظية عبر خدمات GATT مخصّصة.',
        'دمج وحدات BLE وGPS وLTE؛ وتصميم لوحة تحكّم وخلفية سحابية على AWS للمراقبة والتهيئة.',
        'تحسين استخدام الذاكرة واستهلاك الطاقة، وتحسين استقرار الجهاز وعمره.',
        'اختبار ميداني للأداء اللاسلكي ووظيفة OTA في ظروف واقعية.',
      ],
      tech: 'C/C++, QuecOpen SDK, BLE GATT, GPS, HTTP, Python, AWS EC2/S3, GCP.',
    },
    {
      name: 'مشروع ميدان الرماية (Shooting Range)',
      org: 'Palmlabs',
      intro:
        'تطوير منصّة تحكّم ذكية بأهداف ميدان الرماية على متحكّم ATSAME70 للتحكّم والمراقبة اللحظية لعدّة أجهزة أهداف.',
      bullets: [
        'تنفيذ إصدار الاتصال المنشور المعتمد على XBee باستخدام معالجة الحزم بوضع API، وطوابير الأوامر، ومنطق ACK/إعادة المحاولة، وعنونة المضيف، وإعداد معرّف الهدف، والاستجابات للأوامر عن بُعد.',
        'بناء إصدار الاتصال المعتمد على LoRa لتوسيع الاتصال اللاسلكي طويل المدى ودعم أنواع أهداف/أجهزة إضافية.',
        'تصميم ودمج سير عمل التحكّم بالمحرّكات لأنواع أهداف متعدّدة، بما في ذلك التحكّم بمحرّك PWM والتحكّم عبر المرحّلات.',
        'تطوير منطق التحكّم بالحركة يشمل الحركة اليدوية والتحكّم بالموضع والتحكّم بالسرعة والتتبّع بالمشفّر ومعالجة مفاتيح الحدّ.',
        'إضافة منطق أمان لتشغيل المحرّك، يشمل كشف الحدود وشروط التوقّف والتحكّم بالاتجاه والحركة المضبوطة قرب مواضع الهدف.',
        'دمج دعم تهيئة BLE للقراءة والكتابة اللاسلكية لمعامل الجهاز مثل معرّف الجهاز وإعدادات الحركة وقيم السرعة والتهيئة المتعلّقة بالشبكة.',
        'تطوير بروتوكول تحديث برمجي OTA مخصّص لـ ATSAME70 وESP32 عبر روابط XBee وLoRa.',
        'تطوير برنامج اختبار تلقائي يفحص كل وحدة عتاد على اللوحة.',
      ],
      tech: 'C, ATSAME70, LoRa, UART/SPI/I2C, Atmel Studio, Atmel ICE, Oscilloscope/Logic-Analyzer.',
    },
    {
      name: 'جهاز تتبّع الحيوانات (Pet Tracker)',
      org: 'Palmlabs',
      bullets: [
        'تصميم معمارية النظام لجهاز تتبّع حيوانات مزوّد بـ GPS باستخدام وحدة Nordic nRF9160 SiP.',
        'تطوير برمجيات ثابتة لاتصال LTE-M/NB-IoT عبر شريحة SIM مدمجة، ودمج GPS والإرسال السحابي.',
        'تسليم وثائق تصميم لتهيئة LTE/GPS وسير عمل التتبّع منخفض الطاقة لإنترنت الأشياء.',
      ],
      tech: 'nRF9160, nRF Connect SDK, LTE-M/NB-IoT, GPS, UART, Nordic Developer Tools.',
    },
    {
      name: 'كرسي متحرّك يُتحكّم به عبر الدماغ (الميدالية الذهبية)',
      org: 'جامعة Hitec',
      bullets: [
        'تطوير كرسي متحرّك يُتحكّم به بالعقل باستخدام خوارزميات تعلّم الآلة (SVM, KNN) ومعالجة الإشارات الحيوية. دمج Raspberry Pi وArduino ومشغّلات المحرّكات مع واجهة لحظية عبر Tkinter.',
      ],
    },
  ],
  awards: ['ميدالية ذهبية (على مستوى الجامعة)', 'ميدالية فضية (على مستوى الجامعة)'],
};

export const cvData: Record<'en' | 'ar', CvData> = { en, ar };
