import type { TemplateDefaults } from "@/lib/validation/template";
import type { TEMPLATE_TYPES } from "@/lib/constants";

export type ClauseDef = {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export type TemplateDef = {
  key: string;
  type: (typeof TEMPLATE_TYPES)[number];
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  defaultLanguageMode: "bilingual";
  defaults: TemplateDefaults;
  clauseKeys: string[];
};

export const CLAUSES: Record<string, ClauseDef> = {
  // --- المشتركة (Shared Core) ---
  parties: {
    titleEn: "Parties",
    titleAr: "الأطراف",
    bodyEn: "{{block.parties}}",
    bodyAr: "{{block.parties}}",
  },
  fees: {
    titleEn: "Fees & Payment Schedule",
    titleAr: "الأتعاب وجدول السداد",
    bodyEn:
      "The total fee under this Agreement is **{{contract.total}}** (Net: {{contract.net}}, VAT: {{contract.tax}} at {{contract.tax_rate}}).\n\n{{block.pricing_table}}\n\nFees shall be settled in accordance with the milestone schedule below:\n\n{{block.payment_schedule}}\n\nEach invoice is payable within **{{contract.payment_terms_days}}** days from its issue date by bank transfer to the Provider's designated account. Amounts paid for executed work are non-refundable.",
    bodyAr:
      "إجمالي أتعاب هذا العقد **{{contract.total}}** (المبلغ الصافي: {{contract.net}}، وضريبة القيمة المضافة: {{contract.tax}} بنسبة {{contract.tax_rate}}).\n\n{{block.pricing_table}}\n\nتسدد الأتعاب وفق جدول الدفعات والمراحل الآتي:\n\n{{block.payment_schedule}}\n\nتستحق كل فاتورة خلال **{{contract.payment_terms_days}}** يوما من تاريخ إصدارها بالتحويل إلى الحساب البنكي المعتمد للمزود، وتعد المبالغ المدفوعة عن أعمال منفذة نهائية وغير قابلة للاسترداد.",
  },
  timeline: {
    titleEn: "Term & Timeline",
    titleAr: "المدة والجدول الزمني",
    bodyEn:
      "This Agreement takes effect on **{{contract.start_date}}** and remains in force until **{{contract.end_date}}**.\n\nDelivery milestones depend on the Client providing required materials, credentials, and approvals on time. Delays caused by the Client shall extend the timeline accordingly.",
    bodyAr:
      "يسري هذا العقد اعتبارا من **{{contract.start_date}}** ويظل نافذا حتى **{{contract.end_date}}**.\n\nيرتبط الالتزام بمواعيد التسليم بتزويد العميل بكافة المتطلبات والموافقات وصلاحيات الوصول في مواعيدها، ويترتب على أي تأخير من العميل تمديد الجدول الزمني بمقداره.",
  },
  client_obligations: {
    titleEn: "Client Obligations",
    titleAr: "التزامات العميل",
    bodyEn:
      "The Client shall:\n\n- Provide all necessary content, credentials, and technical information in a timely manner;\n- Appoint an authorized representative for approvals and communications;\n- Review deliverables and submit feedback within 5 business days of receipt;\n- Settle all due milestone payments on schedule.",
    bodyAr:
      "يلتزم العميل بما يلي:\n\n- تزويد المزود بكافة البيانات والمحتوى وصلاحيات الوصول اللازمة في الوقت المناسب؛\n- تعيين ممثل مفوض باعتماد المخرجات وإبداء الملاحظات؛\n- مراجعة المخرجات والرد خلال 5 أيام عمل من تاريخ تسليمها؛\n- سداد الدفعات المستحقة في مواعيد استحقاقها المحددة.",
  },
  provider_obligations: {
    titleEn: "Provider Commitments",
    titleAr: "التزامات المزود وجودة العمل",
    bodyEn:
      "The Provider shall perform the services with professional skill and care following modern software engineering practices, assign qualified team members, and keep the Client informed of progress regularly.",
    bodyAr:
      "يلتزم المزود بتنفيذ الخدمات بالعناية والمهارة المهنية ووفق أفضل الممارسات الهندسية والبرمجية المعمول بها، وتكليف كوادر مؤهلة، وإحاطة العميل بمستجدات سير العمل دوريا.",
  },
  change_requests: {
    titleEn: "Change Requests",
    titleAr: "طلبات التعديل والأعمال الإضافية",
    bodyEn:
      "Either Party may request modifications to the scope of work. No change takes effect until agreed in writing, detailing its impact on fees and timeline.\n\nApproved additions shall be invoiced as separate work orders.",
    bodyAr:
      "يحق لأي من الطرفين طلب تعديل نطاق العمل، ولا يسري أي تعديل إلا بعد الاتفاق عليه كتابة مع بيان أثره على الأتعاب والجدول الزمني.\n\nتفوتر الأعمال الإضافية المعتمدة بموجب أوامر عمل مستقلة.",
  },
  acceptance: {
    titleEn: "Inspection & Acceptance",
    titleAr: "الفحص والتسليم النهائي",
    bodyEn:
      "Upon delivery of each milestone or version, the Client shall test it and either accept it or submit written, objective notes within 5 business days.\n\nA deliverable is deemed accepted if no response is received within that period or if deployed to live production.",
    bodyAr:
      "عند تسليم كل مخرج أو مرحلة، يفحص العميل العمل ويعتمده أو يقدم ملاحظات كتابية محددة خلال 5 أيام عمل.\n\nيعد المخرج معتمدا ومقبولا في حال انقضاء المدة دون ملاحظات أو عند استخدامه فعليا في بيئة الإنتاج والتشغيل.",
  },
  ip: {
    titleEn: "Intellectual Property Rights",
    titleAr: "حقوق الملكية الفكرية",
    bodyEn:
      "Upon full settlement of all due fees, ownership of the custom code, designs, and deliverables created specifically for the Client shall transfer to the Client.\n\nThe Provider retains ownership of its pre-existing tools, libraries, and frameworks, granting the Client a perpetual license for their embedded use.",
    bodyAr:
      "تؤول ملكية البرمجيات والأكواد والتصاميم المخصصة المنفذة لصالح العميل إليه فور سداد كامل الأتعاب المستحقة.\n\nيحتفظ المزود بملكية أدواته ومكتباته المسبقة، مع منح العميل ترخيصا دائما غير حصري لاستخدامها بصورتها المضمنة في المخرجات.",
  },
  confidentiality: {
    titleEn: "Confidentiality & Data Protection",
    titleAr: "السرية وحماية المعلومات",
    bodyEn:
      "Both Parties agree to maintain strict confidentiality regarding all non-public technical, commercial, and operational information exchanged under this Agreement.\n\nThis obligation survives for 2 years following contract termination or expiry.",
    bodyAr:
      "يلتزم الطرفان بالمحافظة التامة على سرية كافة المعلومات والبيانات الفنية والتجارية والتشغيلية غير المعلنة المتبادلة بموجب هذا العقد وعدم إفشائها لأي طرف ثالث.\n\nيظل هذا الالتزام ساريا طوال مدة العقد ولمدة سنتين بعد انتهائه.",
  },
  warranty: {
    titleEn: "Warranty & Defect Correction",
    titleAr: "الضمان ومعالجة الأعطال",
    bodyEn:
      "The Provider warrants the deliverables for 30 days following final acceptance to fix any technical bugs or non-conformity with the agreed scope at no extra charge.\n\nThe warranty excludes issues caused by third-party modifications, client misuse, or external hosting changes.",
    bodyAr:
      "يقدم المزود ضمانا لمدة 30 يوما من تاريخ الاعتماد النهائي لمعالجة أي خلل برمجي أو عيب في النطاق المتفق عليه دون أتعاب إضافية.\n\nيستثنى من الضمان الأعطال الناتجة عن تعديل طرف ثالث، أو سوء الاستخدام، أو تغيير بيئة الاستضافة الخارجية.",
  },
  termination: {
    titleEn: "Termination & Settlement",
    titleAr: "الإنهاء وتسوية المستحقات",
    bodyEn:
      "Either Party may terminate this Agreement upon 14 days' written notice if the other Party commits a material breach and fails to remedy it within that period.\n\nUpon termination, the Client shall pay for all work performed up to the termination date, and the Provider shall deliver completed work accordingly.",
    bodyAr:
      "يحق لأي من الطرفين إنهاء العقد بإشعار كتابي مدته 14 يوما في حال إخلال الطرف الآخر بالتزام جوهري دون معالجته خلال تلك المدة.\n\nعند الإنهاء، يسدد العميل قيمة الأعمال المنجزة حتى تاريخه، ويسلم المزود المخرجات المكتملة تبعا لذلك.",
  },
  governing_law: {
    titleEn: "Governing Law & Jurisdiction",
    titleAr: "النظام الحاكم وتسوية النزاعات",
    bodyEn:
      "This Agreement is governed by and construed in accordance with the laws of **{{contract.governing_law}}**.\n\nThe Parties shall endeavor to settle disputes amicably; failing that, the competent courts of **{{contract.jurisdiction}}** hold jurisdiction.",
    bodyAr:
      "يخضع هذا العقد ويفسر وفقا للأنظمة المعمول بها في **{{contract.governing_law}}**.\n\nيسعى الطرفان إلى حل أي خلاف وديا، وفي حال تعذر ذلك تختص المحاكم في **{{contract.jurisdiction}}** بالفصل فيه حصرا.",
  },
  signatures: {
    titleEn: "Signatures",
    titleAr: "التوقيع والإقرار",
    bodyEn: "{{block.signatures}}",
    bodyAr: "{{block.signatures}}",
  },

  // --- 1. تطوير تطبيقات الويب (Web App Development) ---
  purpose_web: {
    titleEn: "Purpose & Web Engagement",
    titleAr: "موضوع العقد وتطوير الويب",
    bodyEn:
      "This Agreement governs the engagement of the Provider by the Client to build, develop, and deploy the web application or digital platform for project **{{project.name}}** (Ref: {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.",
    bodyAr:
      "ينظم هذا العقد تكليف العميل للمزود بتطوير وبرمجة وتدشين تطبيق الويب أو المنصة الرقمية لمشروع **{{project.name}}** (مرجع: {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.",
  },
  scope_web: {
    titleEn: "Scope of Web Development",
    titleAr: "نطاق عمل تطوير الويب",
    bodyEn:
      "The Provider shall deliver web development services according to the specifications below:\n\n> {{contract.scope}}\n\nThird-party domain names, cloud hosting servers, and external paid service subscriptions are excluded from the fees unless expressly stated otherwise in the scope.",
    bodyAr:
      "يلتزم المزود بتنفيذ خدمات تطوير تطبيق الويب وفق المواصفات المحددة أدناه:\n\n> {{contract.scope}}\n\nلا تشمل الأتعاب تكاليف النطاقات، أو الخوادم السحابية، أو اشتراكات الخدمات الخارجية المدفوعة ما لم ينص نطاق العمل أعلاه على خلاف ذلك صراحة.",
  },

  // --- 2. تطوير تطبيقات الجوال (Mobile App Development) ---
  purpose_mobile: {
    titleEn: "Purpose & Mobile Engagement",
    titleAr: "موضوع العقد وتطوير تطبيقات الجوال",
    bodyEn:
      "This Agreement governs the development and delivery of a cross-platform mobile application for Android and iOS for project **{{project.name}}** (Ref: {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.",
    bodyAr:
      "ينظم هذا العقد تطوير وبرمجة وتسليم تطبيق جوال متعدد المنصات (Android و iOS) لمشروع **{{project.name}}** (مرجع: {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.",
  },
  scope_mobile: {
    titleEn: "Scope of Mobile App Development",
    titleAr: "نطاق عمل تطبيق الجوال",
    bodyEn:
      "The Provider shall design, code, and build the mobile application according to the specifications below:\n\n> {{contract.scope}}\n\nWork includes frontend mobile interfaces, API communication, local data caching, and release builds for testing and app stores.",
    bodyAr:
      "يلتزم المزود بتنفيذ وتطوير تطبيق الجوال وفق المواصفات المحددة أدناه:\n\n> {{contract.scope}}\n\nيشمل العمل بناء واجهات الجوال، والربط بالواجهات البرمجية، وتجهيز الحزم التشغيلية لبيئة الاختبار والمتاجر.",
  },
  store_publishing: {
    titleEn: "App Store Publishing & Accounts",
    titleAr: "النشر في المتاجر وحسابات المطورين",
    bodyEn:
      "The Client shall maintain active Apple Developer and Google Play developer accounts and is responsible for all associated store fees.\n\nThe Provider shall prepare store assets, build packages, and assist with store submission. Store review times and approval policies are governed solely by Apple and Google.",
    bodyAr:
      "يلتزم العميل بتوفير حسابات مطورين نشطة في متجري Apple و Google ويتحمل رسومها بشكل مستقل.\n\nيتولى المزود تجهيز حزم الإطلاق ومساعدة العميل في رفع التطبيق للمراجعة. وتخضع مواعيد وسياسات القبول لسياسات المتجرين المستقلة.",
  },

  // --- 3. تطوير تطبيقات سطح المكتب (Desktop Software) ---
  purpose_desktop: {
    titleEn: "Purpose & Desktop Engagement",
    titleAr: "موضوع العقد وتطبيقات سطح المكتب",
    bodyEn:
      "This Agreement governs the design, engineering, and delivery of a custom desktop software application for project **{{project.name}}** (Ref: {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.",
    bodyAr:
      "ينظم هذا العقد تطوير وهندسة وتسليم برنامج سطح مكتب مخصص لمشروع **{{project.name}}** (مرجع: {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.",
  },
  scope_desktop: {
    titleEn: "Scope of Desktop Application",
    titleAr: "نطاق عمل برنامج سطح المكتب",
    bodyEn:
      "The Provider shall build custom desktop software according to the specifications below:\n\n> {{contract.scope}}\n\nDeliverables include executable installers for the agreed operating systems (Windows, macOS, or Linux) and installation documentation.",
    bodyAr:
      "يلتزم المزود بتطوير برنامج سطح المكتب وفق المواصفات المحددة أدناه:\n\n> {{contract.scope}}\n\nتشمل المخرجات حزم التثبيت القابلة للتشغيل للأنظمة المتفق عليها (Windows أو macOS أو Linux) ودليل التشغيل.",
  },
  os_compatibility: {
    titleEn: "Operating System Compatibility",
    titleAr: "توافق أنظمة التشغيل والبيئة",
    bodyEn:
      "The desktop software is developed to run on standard modern operating system versions agreed in the scope. Hardware drivers, specialized peripherals, and code-signing certificates are outside the scope unless explicitly quoted.",
    bodyAr:
      "يطور البرنامج ليعمل على إصدارات أنظمة التشغيل الحديثة المتفق عليها في النطاق. وتعد تعريفات العتاد الخاص وشهادات توقيع الأكواد الرقمية (Code Signing) خارج النطاق ما لم يتفق عليها صراحة.",
  },

  // --- 4. الواجهات والتكاملات (APIs & Integrations) ---
  purpose_apis: {
    titleEn: "Purpose & API Integration",
    titleAr: "موضوع العقد والواجهات البرمجية",
    bodyEn:
      "This Agreement governs the backend development, API integrations, and data synchronization services for project **{{project.name}}** (Ref: {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.",
    bodyAr:
      "ينظم هذا العقد تطوير الأنظمة الخلفية والواجهات البرمجية والتكامل التلقائي للبيانات لمشروع **{{project.name}}** (مرجع: {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.",
  },
  scope_apis: {
    titleEn: "Scope of APIs & Integrations",
    titleAr: "نطاق الواجهات البرمجية والربط",
    bodyEn:
      "The Provider shall architect and implement secure APIs and integration pipelines according to the specifications below:\n\n> {{contract.scope}}\n\nWork includes API endpoint development, webhook handlers, automated scrapers or connectors, and technical integration documentation.",
    bodyAr:
      "يلتزم المزود ببناء وتطوير الواجهات البرمجية ومسارات تكامل البيانات وفق المواصفات التالية:\n\n> {{contract.scope}}\n\nيشمل العمل تطوير نقاط الاتصال (Endpoints)، ومعالجات Webhooks، وأدوات الربط أو السحب التلقائي، وتوثيق الواجهة الفنية.",
  },
  api_security: {
    titleEn: "Security & API Rate Limits",
    titleAr: "الأمان ومعدلات الاستهلاك البرمجي",
    bodyEn:
      "APIs shall incorporate authentication protocols (such as OAuth 2.0 or secure API keys) and validation controls. The Client is responsible for paying any usage or consumption fees charged by connected third-party APIs.",
    bodyAr:
      "تبنى الواجهات البرمجية بضوابط تحقق وأمان موثوقة (مثل OAuth 2.0 ومفاتيح API الآمنة). ويتحمل العميل أي رسوم استهلاك تفرضها الخدمات الخارجية المرتبطة.",
  },

  // --- 5. البوتات والأتمتة (Bots & Automation) ---
  purpose_bots: {
    titleEn: "Purpose & Automation Engagement",
    titleAr: "موضوع العقد وتطوير البوتات",
    bodyEn:
      "This Agreement governs the programming and deployment of intelligent bots and automation workflows for project **{{project.name}}** (Ref: {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.",
    bodyAr:
      "ينظم هذا العقد تطوير وبرمجة وتدشين البوتات الذكية ومسارات الأتمتة لمشروع **{{project.name}}** (مرجع: {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.",
  },
  scope_bots: {
    titleEn: "Scope of Bots & Automation",
    titleAr: "نطاق البوتات والأتمتة",
    bodyEn:
      "The Provider shall create bots and automation routines according to the specifications below:\n\n> {{contract.scope}}\n\nWork covers bot logic, commands, database storage, and integration with target communication platforms (such as Telegram, Discord, or WhatsApp).",
    bodyAr:
      "يلتزم المزود بتطوير وتدشين البوتات والأتمتة وفق المواصفات المحددة أدناه:\n\n> {{contract.scope}}\n\nيشمل العمل منطق البوت، والأوامر البرمجية، وتخزين البيانات، والربط بالمنصات المستهدفة (مثل تيليجرام أو ديسكورد أو واتساب).",
  },
  platform_rules: {
    titleEn: "Third-Party Platform Compliance",
    titleAr: "الامتثال لسياسات المنصات الخارجية",
    bodyEn:
      "The Client shall maintain valid platform accounts and ensure bot usage complies with each platform's developer terms. The Provider is not responsible for bans or API restrictions resulting from changes in external platform rules.",
    bodyAr:
      "يلتزم العميل بامتلاك حسابات صالحة والتأكد من توافق استخدام البوت مع شروط المنصات، ولا يتحمل المزود مسؤولية أي حظر أو قيود ناتجة عن تعديل سياسات المنصات الخارجية.",
  },

  // --- 6. البنية التحتية و DevOps (DevOps & Infrastructure) ---
  purpose_devops: {
    titleEn: "Purpose & DevOps Services",
    titleAr: "موضوع العقد والبنية التحتية",
    bodyEn:
      "This Agreement governs server setup, Linux administration, Docker containerization, and ongoing DevOps monitoring for project **{{project.name}}** (Ref: {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.",
    bodyAr:
      "ينظم هذا العقد تهيئة وإدارة الخوادم، وحاويات Docker، وإعدادات Nginx ومراقبة البنية التحتية لمشروع **{{project.name}}** (مرجع: {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.",
  },
  scope_devops: {
    titleEn: "Scope of DevOps & Infrastructure",
    titleAr: "نطاق خدمات البنية التحتية و DevOps",
    bodyEn:
      "The Provider shall deliver infrastructure engineering and management services detailed below:\n\n> {{contract.scope}}\n\nServices cover server hardening, reverse proxy configuration (Nginx), SSL lifecycle, CI/CD automation, automated backups, and uptime monitoring.",
    bodyAr:
      "يقدم المزود خدمات هندسة وإدارة البنية التحتية المحددة أدناه:\n\n> {{contract.scope}}\n\nتشمل الخدمات حماية الخوادم، وإعداد Nginx، وشهادات SSL، ومسارات النشر التلقائي (CI/CD)، والنسخ الاحتياطي التلقائي ومراقبة التوفر المستمر.",
  },
  infrastructure_accounts: {
    titleEn: "Cloud Accounts & Hosting Costs",
    titleAr: "حسابات السحابة وتكاليف الاستضافة",
    bodyEn:
      "Server hardware and cloud provider costs (e.g., Hetzner, AWS, DigitalOcean) are paid directly by the Client to the respective hosting vendor. The Provider acts as authorized technical administrator.",
    bodyAr:
      "تكون تكاليف الخوادم والاشتراكات السحابية (مثل Hetzner أو AWS) مدفوعة مباشرة من العميل لمزود الخدمة، وتقتصر مسؤولية المزود على الإدارة والتشغيل الفني.",
  },

  // --- 7. اتفاقية السرية وعدم الإفصاح (Mutual NDA) ---
  nda_purpose: {
    titleEn: "Purpose of Disclosure",
    titleAr: "الغرض من الإفصاح",
    bodyEn:
      "The Parties wish to disclose certain confidential and technical information solely for evaluating or executing project **{{project.name}}** (Ref: {{project.code}}) (the **Purpose**).",
    bodyAr:
      "يرغب الطرفان في تبادل معلومات فنية وتجارية سرية بهدف دراسة أو تنفيذ مشروع **{{project.name}}** (مرجع: {{project.code}}) («الغرض»)، ويقتصر استخدامها على هذا الغرض حصرا.",
  },
  nda_definition: {
    titleEn: "Confidential Information Defined",
    titleAr: "تعريف ونطاق المعلومات السرية",
    bodyEn:
      "**Confidential Information** means all non-public technical, commercial, financial, and code assets disclosed by either Party, whether written, oral, or electronic, clearly marked or reasonably understood to be confidential.",
    bodyAr:
      "تشمل «المعلومات السرية» كافة البيانات والمعلومات الفنية والبرمجية والمالية والتجارية غير المعلنة المتبادلة بين الطرفين بأي وسيلة كانت، متى كانت تحمل طابع السرية بحكم طبيعتها.",
  },
  nda_obligations: {
    titleEn: "Protection Obligations",
    titleAr: "التزامات المحافظة على السرية",
    bodyEn:
      "The Receiving Party shall protect disclosed information with reasonable care, restrict access solely to essential personnel under equivalent confidentiality terms, and refrain from copying or unauthorized disclosure.",
    bodyAr:
      "يلتزم الطرف المتلقي بحماية المعلومات السرية بدرجة العناية اللازمة، وقصر الاطلاع عليها على العاملين المعنيين مباشرة، والامتناع عن نسخها أو إفشائها دون موافقة كتابية مسبقة.",
  },
  nda_exclusions: {
    titleEn: "Standard Exclusions",
    titleAr: "استثناءات السرية النظامية",
    bodyEn:
      "Confidentiality obligations do not apply to information that becomes public without breach, was independently developed without reference to disclosed data, or must be disclosed by lawful judicial order.",
    bodyAr:
      "لا تسري التزامات السرية على المعلومات المتاحة للعموم دون خطأ، أو المطورة ذاتيا بصورة مستقلة، أو الواجب الإفصاح عنها بموجب أمر قضائي أو نظامي ملزم.",
  },
  nda_term: {
    titleEn: "Term & Survival",
    titleAr: "مدة الاتفاقية وسريان الالتزام",
    bodyEn:
      "This Agreement covers disclosures made from **{{contract.start_date}}** to **{{contract.end_date}}**. Confidentiality duties survive for 3 years following expiration, and indefinitely for trade secrets.",
    bodyAr:
      "تسري هذه الاتفاقية على الإفصاحات المتبادلة من **{{contract.start_date}}** حتى **{{contract.end_date}}**، وتظل التزامات السرية ملزمة لمدة 3 سنوات بعد انتهائها، ودائمة بالنسبة للأسرار التجارية.",
  },
  nda_return: {
    titleEn: "Return or Destruction",
    titleAr: "إعادة أو إتلاف المعلومات",
    bodyEn:
      "Upon written request, the Receiving Party shall promptly return or securely delete all confidential materials, retaining only archival records required by statutory law.",
    bodyAr:
      "بناء على طلب كتابي، يتلف الطرف المتلقي بصورة آمنة أو يعيد كافة الوثائق والبيانات السرية فورا، باستثناء ما تفرضه القوانين من أرشفة نظامية داخلية.",
  },
};

export const TEMPLATES: TemplateDef[] = [
  {
    key: "web-development",
    type: "contract",
    nameEn: "Web Application Development Agreement",
    nameAr: "عقد تطوير تطبيقات الويب",
    descriptionEn:
      "Fast, scalable, and secure web applications tailored to business needs, from landing pages to dashboards and complex systems.",
    descriptionAr:
      "تطوير تطبيقات ويب سريعة وقابلة للتوسع، مع التركيز على الأداء والأمان وتجربة مستخدم سلسة، من المواقع إلى المنصات ولوحات التحكم.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "Web Application Development Agreement",
      titleAr: "عقد تطوير تطبيقات الويب",
      paymentTermsDays: 14,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Advance payment upon contract signing",
            titleAr: "دفعة مقدمة عند توقيع العقد",
            percentBp: 4000,
            triggerNoteEn: "Upon signing",
            triggerNoteAr: "عند التوقيع",
          },
          {
            titleEn: "Upon delivery of staging preview version",
            titleAr: "عند تسليم النسخة التجريبية للمعاينة",
            percentBp: 3000,
          },
          {
            titleEn: "Upon final launch delivery and acceptance",
            titleAr: "عند التسليم النهائي والاعتماد للتدشين",
            percentBp: 3000,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose_web",
      "scope_web",
      "fees",
      "timeline",
      "client_obligations",
      "provider_obligations",
      "change_requests",
      "acceptance",
      "ip",
      "confidentiality",
      "warranty",
      "termination",
      "governing_law",
      "signatures",
    ],
  },
  {
    key: "mobile-development",
    type: "contract",
    nameEn: "Mobile App Development Agreement",
    nameAr: "عقد تطوير تطبيقات الجوال",
    descriptionEn:
      "Cross-platform mobile applications for Android and iOS with high performance, smooth UI, and scalable architecture.",
    descriptionAr:
      "تطبيقات جوال متعددة المنصات لأندرويد وآيفون، بأداء عالٍ وواجهات سلسة وبنية برمجية قابلة للتوسع.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "Mobile App Development Agreement",
      titleAr: "عقد تطوير تطبيقات الجوال",
      paymentTermsDays: 14,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Advance payment upon architecture and UI approval",
            titleAr: "دفعة مقدمة عند اعتماد الهيكلية والواجهات",
            percentBp: 4000,
            triggerNoteEn: "Upon kickoff",
            triggerNoteAr: "عند بدء المشروع",
          },
          {
            titleEn: "Upon test build delivery (TestFlight / APK)",
            titleAr: "عند تسليم نسخة الاختبار (TestFlight / APK)",
            percentBp: 3000,
          },
          {
            titleEn: "Upon final app store build submission and handover",
            titleAr: "عند اكتمال التطبيق والتجهيز لمتاجر التطبيقات",
            percentBp: 3000,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose_mobile",
      "scope_mobile",
      "fees",
      "timeline",
      "store_publishing",
      "client_obligations",
      "change_requests",
      "acceptance",
      "ip",
      "confidentiality",
      "warranty",
      "termination",
      "governing_law",
      "signatures",
    ],
  },
  {
    key: "desktop-development",
    type: "contract",
    nameEn: "Desktop Application Development Agreement",
    nameAr: "عقد تطوير تطبيقات سطح المكتب",
    descriptionEn:
      "Custom desktop applications for Windows, Linux, and macOS designed for productivity, automation, and business operations.",
    descriptionAr:
      "برمجيات وتطبيقات سطح مكتب مخصصة لأنظمة ويندوز ولينكس وماك، مصممة للإنتاجية والأتمتة وإدارة الأعمال.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "Desktop Application Development Agreement",
      titleAr: "عقد تطوير تطبيقات سطح المكتب",
      paymentTermsDays: 14,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Advance payment upon project kickoff",
            titleAr: "دفعة مقدمة لبدء مرحلة التطوير",
            percentBp: 5000,
            triggerNoteEn: "Upon kickoff",
            triggerNoteAr: "عند بدء العمل",
          },
          {
            titleEn: "Upon delivery of installable release package and verification",
            titleAr: "عند تسليم حزم التثبيت النهائية واختبارها",
            percentBp: 5000,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose_desktop",
      "scope_desktop",
      "fees",
      "timeline",
      "os_compatibility",
      "client_obligations",
      "change_requests",
      "acceptance",
      "ip",
      "confidentiality",
      "warranty",
      "termination",
      "governing_law",
      "signatures",
    ],
  },
  {
    key: "api-integrations",
    type: "contract",
    nameEn: "APIs & Integrations Agreement",
    nameAr: "عقد الواجهات البرمجية والتكاملات",
    descriptionEn:
      "Secure and scalable backend systems, APIs, scrapers, and webhooks ensuring reliable data flow and system integrations.",
    descriptionAr:
      "أنظمة خلفية وواجهات برمجية آمنة وقابلة للتوسع، تشغل التطبيقات وتضمن تكاملاً موثوقاً للبيانات والربط بالأنظمة.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "APIs & Integrations Agreement",
      titleAr: "عقد الواجهات البرمجية والتكاملات",
      paymentTermsDays: 14,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Advance payment upon schema and architecture design",
            titleAr: "دفعة مقدمة عند اعتماد هيكلية ومخطط الواجهات",
            percentBp: 5000,
            triggerNoteEn: "Upon kickoff",
            triggerNoteAr: "عند بدء المشروع",
          },
          {
            titleEn: "Upon integration tests, documentation, and live handover",
            titleAr: "عند اجتياز الاختبارات وتوثيق الواجهات والتسليم",
            percentBp: 5000,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose_apis",
      "scope_apis",
      "fees",
      "timeline",
      "api_security",
      "client_obligations",
      "change_requests",
      "acceptance",
      "ip",
      "confidentiality",
      "warranty",
      "termination",
      "governing_law",
      "signatures",
    ],
  },
  {
    key: "automation-bot-development",
    type: "contract",
    nameEn: "Bots & Automation Agreement",
    nameAr: "عقد البوتات وأنظمة الأتمتة",
    descriptionEn:
      "Intelligent bots and automated workflows that streamline operations and integrate with platforms like Telegram, Discord, and WhatsApp.",
    descriptionAr:
      "تطوير بوتات وأنظمة أتمتة ذكية لتسهيل العمليات وإدارة المهام والتكامل مع منصات مثل تيليجرام وديسكورد وواتساب.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "Bots & Automation Agreement",
      titleAr: "عقد البوتات وأنظمة الأتمتة",
      paymentTermsDays: 14,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Advance payment upon bot kickoff",
            titleAr: "دفعة مقدمة لبدء تطوير البوت والربط",
            percentBp: 5000,
            triggerNoteEn: "Upon kickoff",
            triggerNoteAr: "عند بدء العمل",
          },
          {
            titleEn: "Upon bot deployment, verification, and handover",
            titleAr: "عند تدشين البوت واختباره واعتماده النهائي",
            percentBp: 5000,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose_bots",
      "scope_bots",
      "fees",
      "timeline",
      "platform_rules",
      "client_obligations",
      "change_requests",
      "acceptance",
      "ip",
      "confidentiality",
      "warranty",
      "termination",
      "governing_law",
      "signatures",
    ],
  },
  {
    key: "devops-infrastructure",
    type: "contract",
    nameEn: "DevOps & Infrastructure Agreement",
    nameAr: "عقد البنية التحتية و DevOps",
    descriptionEn:
      "Stable and secure infrastructure on Linux: Docker, Nginx, CI/CD, and continuous monitoring to keep services available 24/7.",
    descriptionAr:
      "بنية تحتية مستقرة وآمنة على لينكس: حاويات Docker وNginx وCI/CD ومراقبة مستمرة لإبقاء خدماتكم متاحة وموثوقة دائماً.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "DevOps & Infrastructure Agreement",
      titleAr: "عقد البنية التحتية و DevOps",
      paymentTermsDays: 7,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Quarter 1 retainer fee",
            titleAr: "رسوم الربع الأول للتشغيل والدعم",
            percentBp: 2500,
          },
          {
            titleEn: "Quarter 2 retainer fee",
            titleAr: "رسوم الربع الثاني للتشغيل والدعم",
            percentBp: 2500,
          },
          {
            titleEn: "Quarter 3 retainer fee",
            titleAr: "رسوم الربع الثالث للتشغيل والدعم",
            percentBp: 2500,
          },
          {
            titleEn: "Quarter 4 retainer fee",
            titleAr: "رسوم الربع الرابع للتشغيل والدعم",
            percentBp: 2500,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose_devops",
      "scope_devops",
      "fees",
      "timeline",
      "infrastructure_accounts",
      "client_obligations",
      "provider_obligations",
      "change_requests",
      "confidentiality",
      "warranty",
      "termination",
      "governing_law",
      "signatures",
    ],
  },
  {
    key: "nda",
    type: "nda",
    nameEn: "Mutual Non-Disclosure Agreement",
    nameAr: "اتفاقية السرية وعدم الإفصاح المتبادلة",
    descriptionEn:
      "Mutual protection of confidential technical, commercial, and proprietary information between parties.",
    descriptionAr:
      "حماية متبادلة للمعلومات السرية والبيانات الفنية والتجارية لتقييم أو تنفيذ المشاريع.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: false,
      titleEn: "Mutual Non-Disclosure Agreement",
      titleAr: "اتفاقية السرية وعدم الإفصاح المتبادلة",
    },
    clauseKeys: [
      "parties",
      "nda_purpose",
      "nda_definition",
      "nda_obligations",
      "nda_exclusions",
      "nda_term",
      "nda_return",
      "governing_law",
      "signatures",
    ],
  },
];

export function clauseDefsFor(template: TemplateDef): ClauseDef[] {
  return template.clauseKeys.map((key) => {
    const clause = CLAUSES[key];
    if (!clause) {
      throw new Error(`Unknown clause key in template ${template.key}: ${key}`);
    }
    return clause;
  });
}
