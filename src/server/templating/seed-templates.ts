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

// DOSSIER_PLAN.md 11.7.1 — clause library (text kept byte-for-byte).
export const CLAUSES: Record<string, ClauseDef> = {
  parties: {
    titleEn: "Parties",
    titleAr: "الأطراف",
    bodyEn: "{{block.parties}}",
    bodyAr: "{{block.parties}}",
  },
  purpose: {
    titleEn: "Purpose of the Agreement",
    titleAr: "الغرض من العقد",
    bodyEn:
      "This Agreement governs the engagement of the Provider by the Client for the project **{{project.name}}** (Ref. {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.\n\nBy signing this Agreement, each Party confirms that it has the legal capacity and authority to enter into it.",
    bodyAr:
      "ينظّم هذا العقد تعاقد العميل مع المزوّد لتنفيذ مشروع **{{project.name}}** (مرجع {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.\n\nبتوقيع هذا العقد يُقرّ كل طرف بأن لديه الأهلية والصلاحية القانونية للتعاقد.",
  },
  scope: {
    titleEn: "Scope of Work",
    titleAr: "نطاق العمل",
    bodyEn:
      "The Provider shall perform the following services (the **Services**):\n\n> {{contract.scope}}\n\nAny work not expressly described above is outside the scope of this Agreement and is subject to the Change Requests clause.",
    bodyAr:
      "يلتزم المزوّد بتنفيذ الخدمات التالية («الخدمات»):\n\n> {{contract.scope}}\n\nيُعدّ أي عمل غير منصوص عليه صراحةً أعلاه خارج نطاق هذا العقد، ويخضع لبند طلبات التغيير.",
  },
  fees: {
    titleEn: "Fees and Payment",
    titleAr: "الأتعاب والدفع",
    bodyEn:
      "The total fee for the Services is **{{contract.total}}**, comprising a net amount of {{contract.net}} and tax of {{contract.tax}} ({{contract.tax_rate}}), as detailed below.\n\n{{block.pricing_table}}\n\nThe fee shall be paid according to the following payment schedule.\n\n{{block.payment_schedule}}\n\nEach invoice is payable within **{{contract.payment_terms_days}}** days from its issue date, by bank transfer to the account stated on the invoice.\n\nAmounts already paid for work performed are non-refundable unless otherwise agreed in writing.",
    bodyAr:
      "إجمالي أتعاب الخدمات **{{contract.total}}**، ويشمل مبلغاً صافياً قدره {{contract.net}} وضريبة قدرها {{contract.tax}} ({{contract.tax_rate}})، وفق التفصيل الآتي.\n\n{{block.pricing_table}}\n\nتُسدَّد الأتعاب وفق جدول الدفعات الآتي.\n\n{{block.payment_schedule}}\n\nتُستحق كل فاتورة خلال **{{contract.payment_terms_days}}** يوماً من تاريخ إصدارها، ويتم السداد بالتحويل البنكي إلى الحساب المبيّن في الفاتورة.\n\nلا تُسترد المبالغ المدفوعة عن أعمال تم تنفيذها ما لم يُتفق كتابةً على خلاف ذلك.",
  },
  timeline: {
    titleEn: "Term and Timeline",
    titleAr: "المدة والجدول الزمني",
    bodyEn:
      "This Agreement takes effect on **{{contract.start_date}}** and, unless terminated earlier in accordance with its terms, remains in force until **{{contract.end_date}}**.\n\nDelivery dates depend on the Client providing content, approvals and access on time. Delays caused by the Client extend the timeline accordingly.",
    bodyAr:
      "يسري هذا العقد اعتباراً من **{{contract.start_date}}** ويظل نافذاً حتى **{{contract.end_date}}** ما لم يُنهَ قبل ذلك وفق أحكامه.\n\nتعتمد مواعيد التسليم على تزويد العميل بالمحتوى والموافقات والصلاحيات في الوقت المناسب، وأي تأخير ناتج عن العميل يمدّد الجدول الزمني بمقداره.",
  },
  client_obligations: {
    titleEn: "Client Obligations",
    titleAr: "التزامات العميل",
    bodyEn:
      "The Client shall:\n\n- provide all content, materials, credentials and information reasonably required, in a timely manner;\n- appoint a representative authorized to give approvals and feedback;\n- review deliverables and respond within 5 business days of submission;\n- pay all amounts when due.",
    bodyAr:
      "يلتزم العميل بما يلي:\n\n- تزويد المزوّد في الوقت المناسب بالمحتوى والمواد وبيانات الدخول والمعلومات اللازمة؛\n- تعيين ممثل مفوّض بإبداء الموافقات والملاحظات؛\n- مراجعة المخرجات والرد خلال 5 أيام عمل من تسليمها؛\n- سداد المبالغ المستحقة في مواعيدها.",
  },
  provider_obligations: {
    titleEn: "Provider Obligations",
    titleAr: "التزامات المزوّد",
    bodyEn:
      "The Provider shall perform the Services with reasonable skill and care in line with generally accepted professional standards, assign suitably qualified personnel, and keep the Client reasonably informed of progress.",
    bodyAr:
      "يلتزم المزوّد بتنفيذ الخدمات بالعناية والمهارة المعقولتين وفق المعايير المهنية المتعارف عليها، وتكليف كوادر مؤهلة، وإطلاع العميل على سير العمل بصورة معقولة.",
  },
  change_requests: {
    titleEn: "Change Requests",
    titleAr: "طلبات التغيير",
    bodyEn:
      "Either Party may request changes to the Services. No change takes effect until agreed in writing (email is sufficient), stating its effect on fees and timeline.\n\nApproved changes are invoiced as additional work.",
    bodyAr:
      "لأي من الطرفين طلب تعديل الخدمات، ولا يسري أي تعديل إلا بعد الاتفاق عليه كتابةً (ويكفي البريد الإلكتروني) مع بيان أثره على الأتعاب والجدول الزمني.\n\nتُفوتَر التعديلات المعتمدة كأعمال إضافية.",
  },
  acceptance: {
    titleEn: "Delivery and Acceptance",
    titleAr: "التسليم والقبول",
    bodyEn:
      "Upon delivery of each deliverable the Client shall test it and either accept it or give written, reasonable grounds for rejection within 5 business days.\n\nA deliverable is deemed accepted if the Client does not respond within that period or uses it in production.\n\nThe Provider shall correct, free of charge, material non-conformities with the agreed scope.",
    bodyAr:
      "عند تسليم كل مخرَج، يفحصه العميل ويقبله أو يبدي كتابةً أسباباً معقولة للرفض خلال 5 أيام عمل.\n\nيُعدّ المخرَج مقبولاً إذا لم يرد العميل خلال هذه المدة أو استخدمه فعلياً في بيئة التشغيل.\n\nيصحّح المزوّد دون مقابل العيوب الجوهرية المخالفة للنطاق المتفق عليه.",
  },
  third_party_hosting: {
    titleEn: "Third-Party Services and Hosting",
    titleAr: "خدمات الأطراف الثالثة والاستضافة",
    bodyEn:
      "Domains, hosting, software subscriptions, API usage and other third-party services are not included in the fees unless stated in the Scope of Work.\n\nWhere the Provider procures them on the Client's behalf, they are billed at cost and the related accounts remain the Client's property.",
    bodyAr:
      "لا تشمل الأتعاب النطاقات والاستضافة واشتراكات البرمجيات واستهلاك واجهات البرمجة وسائر خدمات الأطراف الثالثة ما لم يرد ذلك في نطاق العمل.\n\nوإذا اشترى المزوّد شيئاً منها نيابةً عن العميل فيُفوتَر بالتكلفة الفعلية وتظل الحسابات المرتبطة به مملوكة للعميل.",
  },
  platform_terms: {
    titleEn: "Third-Party Platforms",
    titleAr: "المنصات الخارجية",
    bodyEn:
      "The deliverables may interact with third-party platforms and APIs. The Client is responsible for complying with those platforms' terms of use.\n\nThe Provider is not responsible for changes, restrictions or suspensions imposed by third-party platforms that affect operation. Adapting the deliverables to such changes is subject to the Change Requests clause.",
    bodyAr:
      "قد تتعامل المخرجات مع منصات وواجهات برمجة تابعة لأطراف ثالثة، ويلتزم العميل بشروط استخدام تلك المنصات.\n\nلا يتحمل المزوّد مسؤولية التغييرات أو القيود أو الإيقاف الذي تفرضه المنصات الخارجية وتتأثر به عملية التشغيل، ويخضع تكييف المخرجات مع هذه التغييرات لبند طلبات التغيير.",
  },
  lawful_use: {
    titleEn: "Lawful Use",
    titleAr: "الاستخدام المشروع",
    bodyEn:
      "The Client shall use the deliverables only for lawful purposes and shall not use them to infringe the rights of others, to send unsolicited messages in breach of law or platform rules, or to access any system without authorization.",
    bodyAr:
      "يلتزم العميل باستخدام المخرجات في أغراض مشروعة فقط، وعدم استخدامها للتعدي على حقوق الغير أو إرسال رسائل غير مرغوب فيها بالمخالفة للقانون أو لقواعد المنصات أو الدخول إلى أي نظام دون تصريح.",
  },
  ip: {
    titleEn: "Intellectual Property",
    titleAr: "الملكية الفكرية",
    bodyEn:
      "Upon receipt of full payment, the Provider assigns to the Client ownership of the custom deliverables created specifically for the Client under this Agreement.\n\nThe Provider retains ownership of its pre-existing tools, libraries, know-how and general methodologies, and grants the Client a non-exclusive, perpetual license to use them as embedded in the deliverables.\n\nThird-party and open-source components remain subject to their own licenses.\n\nThe Provider may reference the project in its portfolio unless the Client objects in writing.",
    bodyAr:
      "بعد سداد كامل الأتعاب، يتنازل المزوّد للعميل عن ملكية المخرجات المُنجزة خصيصاً له بموجب هذا العقد.\n\nيحتفظ المزوّد بملكية أدواته ومكتباته وخبراته ومنهجياته السابقة على العقد، ويمنح العميل ترخيصاً غير حصري ودائماً باستخدامها بالصورة المضمّنة في المخرجات.\n\nتظل المكوّنات الخاصة بأطراف ثالثة والمفتوحة المصدر خاضعة لتراخيصها.\n\nيجوز للمزوّد الإشارة إلى المشروع ضمن أعماله ما لم يعترض العميل كتابةً.",
  },
  confidentiality: {
    titleEn: "Confidentiality",
    titleAr: "السرية",
    bodyEn:
      "Each Party shall keep confidential all non-public information received from the other Party in connection with this Agreement, use it only to perform this Agreement, and disclose it only to personnel and advisers who need it and are bound by equivalent duties.\n\nThis obligation does not apply to information that is public through no fault of the recipient, was already lawfully known to it, or must be disclosed by law or court order.\n\nIt survives for 3 years after termination or expiry of this Agreement.",
    bodyAr:
      "يلتزم كل طرف بالمحافظة على سرية المعلومات غير المعلنة التي يتلقاها من الطرف الآخر بشأن هذا العقد، وعدم استخدامها إلا لتنفيذه، وعدم الإفصاح عنها إلا لمن يحتاجها من العاملين والمستشارين الملزمين بواجبات مماثلة.\n\nلا ينطبق هذا الالتزام على المعلومات التي أصبحت عامة دون تقصير من المتلقي، أو كانت معلومة له بصورة مشروعة، أو وجب الإفصاح عنها بموجب القانون أو أمر قضائي.\n\nويستمر هذا الالتزام 3 سنوات بعد انتهاء هذا العقد أو انقضائه.",
  },
  warranty_support: {
    titleEn: "Warranty and Support",
    titleAr: "الضمان والدعم",
    bodyEn:
      "For 30 days after final acceptance (the **Warranty Period**) the Provider shall fix, free of charge, defects that cause a deliverable to deviate materially from the agreed scope.\n\nThe warranty excludes issues caused by modifications made by third parties, misuse, third-party services, or hosting changes.\n\nSupport beyond the Warranty Period is available under a separate agreement.",
    bodyAr:
      "خلال 30 يوماً من القبول النهائي («مدة الضمان») يصلح المزوّد مجاناً العيوب التي تجعل المخرَج مخالفاً بصورة جوهرية للنطاق المتفق عليه.\n\nيُستثنى من الضمان ما نتج عن تعديلات أجراها أطراف ثالثة، أو سوء الاستخدام، أو خدمات الأطراف الثالثة، أو تغيّر الاستضافة.\n\nيتاح الدعم بعد مدة الضمان بموجب اتفاق منفصل.",
  },
  liability: {
    titleEn: "Limitation of Liability",
    titleAr: "حدود المسؤولية",
    bodyEn:
      "To the maximum extent permitted by law, neither Party is liable for indirect or consequential loss, or for loss of profit, revenue or data.\n\nEach Party's total aggregate liability under this Agreement is limited to the fees paid or payable under it.\n\nNothing in this clause limits liability that cannot be limited by law.",
    bodyAr:
      "إلى أقصى حد يسمح به القانون، لا يتحمل أي من الطرفين مسؤولية عن الخسائر غير المباشرة أو التبعية، ولا عن فقدان الأرباح أو الإيرادات أو البيانات.\n\nيُحدّ إجمالي مسؤولية كل طرف بموجب هذا العقد بقيمة الأتعاب المدفوعة أو المستحقة بموجبه.\n\nلا يُحدّ هذا البند أي مسؤولية لا يجوز تحديدها قانوناً.",
  },
  termination: {
    titleEn: "Termination",
    titleAr: "إنهاء العقد",
    bodyEn:
      "Either Party may terminate this Agreement by written notice if the other Party materially breaches it and does not remedy the breach within 14 days of written notice.\n\nThe Client may terminate without cause on 14 days' written notice, paying for all work performed up to the termination date and any non-cancellable costs.\n\nOn termination the Provider shall deliver the work completed to date, subject to payment.",
    bodyAr:
      "يجوز لأي طرف إنهاء هذا العقد بإشعار كتابي إذا أخلّ الطرف الآخر إخلالاً جوهرياً ولم يعالج الإخلال خلال 14 يوماً من إشعاره كتابةً.\n\nيجوز للعميل الإنهاء دون سبب بإشعار كتابي مدته 14 يوماً، مع سداد قيمة الأعمال المنفّذة حتى تاريخ الإنهاء وأي تكاليف غير قابلة للإلغاء.\n\nعند الإنهاء يسلّم المزوّد الأعمال المنجزة حتى ذلك التاريخ، مقابل سداد المستحقات.",
  },
  force_majeure: {
    titleEn: "Force Majeure",
    titleAr: "القوة القاهرة",
    bodyEn:
      "Neither Party is liable for delay or failure caused by events beyond its reasonable control, such as natural disasters, war, government action, or network and utility outages.\n\nThe affected Party shall notify the other promptly and use reasonable efforts to resume performance. If the event lasts more than 60 days, either Party may terminate by written notice.",
    bodyAr:
      "لا يُسأل أي طرف عن التأخر أو الإخفاق الناتج عن أحداث خارجة عن إرادته المعقولة، كالكوارث الطبيعية والحروب والقرارات الحكومية وانقطاع الشبكات أو المرافق.\n\nيُخطر الطرف المتأثر الآخر فوراً ويبذل جهداً معقولاً لاستئناف التنفيذ. وإذا استمر الحدث أكثر من 60 يوماً جاز لأي طرف الإنهاء بإشعار كتابي.",
  },
  governing_law: {
    titleEn: "Governing Law and Disputes",
    titleAr: "القانون الواجب التطبيق وتسوية النزاعات",
    bodyEn:
      "This Agreement is governed by the laws of **{{contract.governing_law}}**.\n\nThe Parties shall first try to resolve any dispute amicably; failing that, the competent courts of **{{contract.jurisdiction}}** have jurisdiction.",
    bodyAr:
      "يخضع هذا العقد لأحكام **{{contract.governing_law}}**.\n\nيسعى الطرفان أولاً إلى تسوية أي نزاع وديّاً، وإن تعذّر ذلك فيكون الاختصاص للمحاكم المختصة في **{{contract.jurisdiction}}**.",
  },
  notices: {
    titleEn: "Notices",
    titleAr: "الإشعارات",
    bodyEn:
      "Notices under this Agreement must be in writing and sent to the email addresses stated in this Agreement ({{provider.email}} for the Provider and {{client.email}} for the Client), or to any other address notified in writing.\n\nNotices sent by email are deemed received on the next business day.",
    bodyAr:
      "تكون الإشعارات المتعلقة بهذا العقد كتابية وتُرسل إلى البريد الإلكتروني المبيّن في هذا العقد ({{provider.email}} للمزوّد و{{client.email}} للعميل) أو إلى أي عنوان آخر يُخطر به كتابةً.\n\nتُعدّ الإشعارات المرسلة بالبريد الإلكتروني مستلمة في يوم العمل التالي.",
  },
  entire_agreement: {
    titleEn: "Entire Agreement and Amendments",
    titleAr: "الاتفاق الكامل والتعديل",
    bodyEn:
      "This Agreement is the entire agreement between the Parties on its subject and supersedes all prior discussions.\n\nIt may be amended only in writing signed by both Parties.\n\nIf any provision is held invalid, the remaining provisions stay in force. Neither Party may assign this Agreement without the other's written consent.",
    bodyAr:
      "يمثّل هذا العقد الاتفاق الكامل بين الطرفين بشأن موضوعه ويحلّ محل كل ما سبقه من مناقشات.\n\nلا يجوز تعديله إلا كتابةً بتوقيع الطرفين.\n\nإذا ثبت بطلان أي حكم منه بقيت سائر الأحكام نافذة، ولا يجوز لأي طرف التنازل عن هذا العقد دون موافقة كتابية من الطرف الآخر.",
  },
  electronic_signature: {
    titleEn: "Electronic Signature and Counterparts",
    titleAr: "التوقيع الإلكتروني وتعدد النسخ",
    bodyEn:
      "The Parties agree that this Agreement may be executed electronically, and that electronic signatures together with the signing evidence recorded by the platform (timestamps, IP address and email verification) have the same effect as handwritten signatures to the extent permitted by applicable law.\n\nThis Agreement may be signed in counterparts.",
    bodyAr:
      "يتفق الطرفان على جواز إبرام هذا العقد إلكترونياً، وعلى أن التوقيعات الإلكترونية مع أدلة التوقيع التي تسجّلها المنصة (الأوقات وعنوان IP والتحقق عبر البريد الإلكتروني) لها ذات أثر التوقيع بخط اليد بالقدر الذي يسمح به القانون المعمول به.\n\nيجوز توقيع هذا العقد على نسخ متعددة.",
  },
  signatures: {
    titleEn: "Signatures",
    titleAr: "التوقيعات",
    bodyEn: "{{block.signatures}}",
    bodyAr: "{{block.signatures}}",
  },
  // ── maintenance-specific ──
  maint_services: {
    titleEn: "Maintenance and Support Services",
    titleAr: "خدمات الصيانة والدعم",
    bodyEn:
      "The Provider shall provide ongoing maintenance and support for the following systems (the **Systems**):\n\n> {{contract.scope}}\n\nThe Services include bug fixes, security updates, minor adjustments, and technical support through the channels agreed by the Parties.\n\nNew features and major changes are outside the fixed fees and are quoted separately under the Change Requests clause.",
    bodyAr:
      "يقدّم المزوّد خدمات الصيانة والدعم المستمرة للأنظمة التالية («الأنظمة»):\n\n> {{contract.scope}}\n\nتشمل الخدمات إصلاح الأخطاء والتحديثات الأمنية والتعديلات الطفيفة والدعم الفني عبر القنوات المتفق عليها بين الطرفين.\n\nتُعدّ الميزات الجديدة والتغييرات الكبيرة خارج الأتعاب الثابتة وتُسعَّر منفصلةً وفق بند طلبات التغيير.",
  },
  sla: {
    titleEn: "Service Levels",
    titleAr: "مستويات الخدمة",
    bodyEn:
      "Support requests are acknowledged within 1 business day. For critical issues (a system being unavailable) the target first response time is 4 business hours.\n\nBusiness hours are those notified by the Provider to the Client. Response targets are commitments of effort and do not guarantee resolution times.",
    bodyAr:
      "يُقرّ المزوّد باستلام طلبات الدعم خلال يوم عمل واحد، ويكون زمن الاستجابة الأولى المستهدف للحالات الحرجة (تعطّل النظام) 4 ساعات عمل.\n\nساعات العمل هي التي يُبلغ بها المزوّد العميل. وتمثّل أهداف الاستجابة التزاماً ببذل العناية ولا تضمن مدد الحل.",
  },
  // ── NDA-specific ──
  nda_purpose: {
    titleEn: "Purpose",
    titleAr: "الغرض",
    bodyEn:
      "The Parties wish to discuss and evaluate **{{project.name}}** (the **Purpose**) and, for that purpose, may disclose Confidential Information to each other.",
    bodyAr:
      "يرغب الطرفان في بحث وتقييم **{{project.name}}** («الغرض») وقد يفصح كل منهما للآخر عن معلومات سرية لهذا الغرض.",
  },
  nda_definition: {
    titleEn: "Confidential Information",
    titleAr: "المعلومات السرية",
    bodyEn:
      "**Confidential Information** means all non-public information, in any form, disclosed by or on behalf of a Party (the **Disclosing Party**) to the other Party (the **Receiving Party**) in connection with the Purpose, including business plans, source code, designs, data, pricing, customer information and technical know-how, whether or not marked confidential.",
    bodyAr:
      "«المعلومات السرية» هي جميع المعلومات غير المعلنة، بأي شكل، التي يفصح عنها طرف («الطرف المُفصح») أو من ينوب عنه للطرف الآخر («الطرف المتلقي») بشأن الغرض، بما في ذلك الخطط التجارية والشيفرة المصدرية والتصاميم والبيانات والأسعار ومعلومات العملاء والخبرات التقنية، سواء وُسمت بالسرية أم لا.",
  },
  nda_obligations: {
    titleEn: "Obligations of the Receiving Party",
    titleAr: "التزامات الطرف المتلقي",
    bodyEn:
      "The Receiving Party shall:\n\n- use the Confidential Information solely for the Purpose;\n- not disclose it to any third party except to its employees and advisers who need to know it and are bound by equivalent confidentiality duties;\n- protect it with at least the care it uses for its own confidential information, and never less than reasonable care.",
    bodyAr:
      "يلتزم الطرف المتلقي بما يلي:\n\n- استخدام المعلومات السرية للغرض وحده؛\n- عدم الإفصاح عنها لأي طرف ثالث إلا للعاملين والمستشارين الذين يحتاجون إلى معرفتها والملزمين بواجبات سرية مماثلة؛\n- حمايتها بعناية لا تقل عن عنايته بمعلوماته السرية الخاصة، ولا تقل بأي حال عن العناية المعقولة.",
  },
  nda_exclusions: {
    titleEn: "Exclusions",
    titleAr: "الاستثناءات",
    bodyEn:
      "These obligations do not apply to information that:\n\n- is or becomes public through no breach by the Receiving Party;\n- was lawfully known to the Receiving Party before disclosure;\n- is lawfully received from a third party without restriction;\n- is independently developed without use of the Confidential Information.\n\nThe Receiving Party may disclose Confidential Information if required by law or court order, after giving the Disclosing Party prompt notice where lawful.",
    bodyAr:
      "لا تنطبق هذه الالتزامات على المعلومات التي:\n\n- أصبحت عامة دون إخلال من الطرف المتلقي؛\n- كانت معلومة للطرف المتلقي بصورة مشروعة قبل الإفصاح؛\n- تلقاها من طرف ثالث بصورة مشروعة ودون قيود؛\n- طوّرها بصورة مستقلة دون استخدام المعلومات السرية.\n\nيجوز للطرف المتلقي الإفصاح عن المعلومات السرية إذا اقتضى القانون أو أمر قضائي ذلك، بعد إخطار الطرف المُفصح فوراً متى كان ذلك جائزاً قانوناً.",
  },
  nda_term: {
    titleEn: "Term",
    titleAr: "المدة",
    bodyEn:
      "This Agreement applies to disclosures made from **{{contract.start_date}}** until **{{contract.end_date}}**.\n\nThe confidentiality obligations continue for 3 years after that end date and, for trade secrets, for as long as they remain trade secrets.",
    bodyAr:
      "ينطبق هذا العقد على الإفصاحات التي تتم اعتباراً من **{{contract.start_date}}** حتى **{{contract.end_date}}**.\n\nتستمر التزامات السرية 3 سنوات بعد تاريخ الانتهاء المذكور، وبالنسبة للأسرار التجارية طوال مدة بقائها أسراراً تجارية.",
  },
  nda_return: {
    titleEn: "Return or Destruction",
    titleAr: "الإعادة أو الإتلاف",
    bodyEn:
      "On written request, and in any event when the Purpose ends, the Receiving Party shall promptly return or securely destroy all Confidential Information and confirm in writing that it has done so.\n\nCopies that must be kept by law or that sit in routine backups remain subject to this Agreement.",
    bodyAr:
      "بناءً على طلب كتابي، وفي جميع الأحوال عند انتهاء الغرض، يعيد الطرف المتلقي جميع المعلومات السرية أو يتلفها بصورة آمنة فوراً ويؤكد ذلك كتابةً.\n\nتظل النسخ التي يجب الاحتفاظ بها بموجب القانون أو الموجودة في النسخ الاحتياطية الاعتيادية خاضعة لهذا العقد.",
  },
  nda_remedies: {
    titleEn: "Remedies",
    titleAr: "سبل الانتصاف",
    bodyEn:
      "Each Party acknowledges that a breach of this Agreement may cause irreparable harm for which damages alone may be inadequate, and that the Disclosing Party may seek injunctive relief in addition to any other remedy available by law.",
    bodyAr:
      "يُقرّ كل طرف بأن الإخلال بهذا العقد قد يسبب ضرراً جسيماً لا يكفي التعويض وحده لجبره، وبأن للطرف المُفصح طلب التدابير التحفظية أو الوقتية إضافةً إلى سائر سبل الانتصاف المتاحة قانوناً.",
  },
};

// DOSSIER_PLAN.md 11.7.2 — template definitions.
export const TEMPLATES: TemplateDef[] = [
  {
    key: "web-development",
    type: "contract",
    nameEn: "Website / Web Application Development Agreement",
    nameAr: "عقد تطوير موقع أو تطبيق ويب",
    descriptionEn:
      "Design and development of a website or web application, with fees, milestones and delivery terms.",
    descriptionAr:
      "تصميم وتطوير موقع أو تطبيق ويب، مع الأتعاب والدفعات وبنود التسليم.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "Website / Web Application Development Agreement",
      titleAr: "عقد تطوير موقع أو تطبيق ويب",
      paymentTermsDays: 14,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Advance upon signing",
            titleAr: "دفعة مقدّمة عند التوقيع",
            percentBp: 4000,
            triggerNoteEn: "Upon signing",
            triggerNoteAr: "عند التوقيع",
          },
          {
            titleEn: "On delivery of the staging version",
            titleAr: "عند تسليم النسخة التجريبية",
            percentBp: 3000,
          },
          {
            titleEn: "On final delivery and acceptance",
            titleAr: "عند التسليم النهائي والقبول",
            percentBp: 3000,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose",
      "scope",
      "fees",
      "timeline",
      "client_obligations",
      "provider_obligations",
      "change_requests",
      "acceptance",
      "third_party_hosting",
      "ip",
      "confidentiality",
      "warranty_support",
      "liability",
      "termination",
      "force_majeure",
      "governing_law",
      "notices",
      "entire_agreement",
      "electronic_signature",
      "signatures",
    ],
  },
  {
    key: "automation-bot-development",
    type: "contract",
    nameEn: "Bot & Automation Development Agreement",
    nameAr: "عقد تطوير بوت وأتمتة",
    descriptionEn:
      "Development of bots and automation workflows, with third-party platform terms.",
    descriptionAr: "تطوير بوتات ومسارات أتمتة، مع بنود المنصات الخارجية.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "Bot & Automation Development Agreement",
      titleAr: "عقد تطوير بوت وأتمتة",
      paymentTermsDays: 14,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Advance upon signing",
            titleAr: "دفعة مقدّمة عند التوقيع",
            percentBp: 5000,
          },
          {
            titleEn: "On delivery and acceptance",
            titleAr: "عند التسليم والقبول",
            percentBp: 5000,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose",
      "scope",
      "fees",
      "timeline",
      "client_obligations",
      "provider_obligations",
      "change_requests",
      "acceptance",
      "platform_terms",
      "lawful_use",
      "ip",
      "confidentiality",
      "warranty_support",
      "liability",
      "termination",
      "force_majeure",
      "governing_law",
      "notices",
      "entire_agreement",
      "electronic_signature",
      "signatures",
    ],
  },
  {
    key: "maintenance-support",
    type: "contract",
    nameEn: "Maintenance & Support Agreement",
    nameAr: "عقد صيانة ودعم فني",
    descriptionEn:
      "Ongoing maintenance and support with quarterly milestones and service levels.",
    descriptionAr: "صيانة ودعم مستمران مع دفعات ربع سنوية ومستويات خدمة.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: true,
      titleEn: "Maintenance & Support Agreement",
      titleAr: "عقد صيانة ودعم فني",
      paymentTermsDays: 7,
      milestonePreset: {
        mode: "percent",
        rows: [
          {
            titleEn: "Quarter 1 fee",
            titleAr: "رسوم الربع الأول",
            percentBp: 2500,
          },
          {
            titleEn: "Quarter 2 fee",
            titleAr: "رسوم الربع الثاني",
            percentBp: 2500,
          },
          {
            titleEn: "Quarter 3 fee",
            titleAr: "رسوم الربع الثالث",
            percentBp: 2500,
          },
          {
            titleEn: "Quarter 4 fee",
            titleAr: "رسوم الربع الرابع",
            percentBp: 2500,
          },
        ],
      },
    },
    clauseKeys: [
      "parties",
      "purpose",
      "maint_services",
      "sla",
      "fees",
      "timeline",
      "client_obligations",
      "provider_obligations",
      "change_requests",
      "ip",
      "confidentiality",
      "liability",
      "termination",
      "force_majeure",
      "governing_law",
      "notices",
      "entire_agreement",
      "electronic_signature",
      "signatures",
    ],
  },
  {
    key: "nda",
    type: "nda",
    nameEn: "Mutual Non-Disclosure Agreement",
    nameAr: "اتفاقية عدم إفصاح متبادلة",
    descriptionEn:
      "Mutual non-disclosure agreement for evaluating a project before engagement.",
    descriptionAr: "اتفاقية عدم إفصاح متبادلة لتقييم مشروع قبل التعاقد.",
    defaultLanguageMode: "bilingual",
    defaults: {
      hasFees: false,
      titleEn: "Mutual Non-Disclosure Agreement",
      titleAr: "اتفاقية عدم إفصاح متبادلة",
    },
    clauseKeys: [
      "parties",
      "nda_purpose",
      "nda_definition",
      "nda_obligations",
      "nda_exclusions",
      "nda_term",
      "nda_return",
      "nda_remedies",
      "governing_law",
      "notices",
      "entire_agreement",
      "electronic_signature",
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
