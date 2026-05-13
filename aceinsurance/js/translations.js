/**
 * Ace Insurance & Retirement Services — Translation Strings
 *
 * HOW TO UPDATE KOREAN TEXT:
 *   1. Find the key under  ko: { ... }
 *   2. Change the string value (the text in quotes)
 *   3. Save the file and re-upload to Hostinger
 *
 * HOW TO ADD A NEW STRING:
 *   1. Add  yourKey: "English text"  under  en: { section: { ... } }
 *   2. Add  yourKey: "한국어 텍스트"  under  ko: { section: { ... } }
 *   3. In the HTML add  data-i18n="section.yourKey"  to the element
 */

const TRANSLATIONS = {

  /* ============================================================
     ENGLISH
     ============================================================ */
  en: {
    nav: {
      home:      "Home",
      about:     "About Us",
      services:  "Services",
      locations: "Locations",
      contact:   "Contact"
    },

    hero: {
      eyebrow:   "Licensed Insurance Agency — Washington State",
      title:     "Protecting What Matters Most",
      subtitle:  "Serving the Korean-American and multicultural community in Washington State since 2013. Honest advice. Affordable coverage.",
      cta_quote: "Get a Free Quote",
      cta_learn: "Our Services"
    },

    trust: {
      licensed:  "Licensed in Washington State",
      since:     "Serving Clients Since 2013",
      bilingual: "English & Korean Service"
    },

    services_home: {
      title:    "Our Insurance Services",
      subtitle: "Comprehensive coverage solutions tailored to your life, your family, and your business.",
      learn:    "Learn More",
      auto:        "Auto Insurance",
      auto_desc:   "Protect your vehicle with comprehensive, collision, and liability coverage at competitive rates.",
      home:        "Home Insurance",
      home_desc:   "Safeguard your home and belongings against fire, theft, weather damage, and more.",
      business:    "Business Insurance",
      business_desc: "Keep your business protected with general liability, commercial property, and workers' comp.",
      life:        "Life Insurance",
      life_desc:   "Provide financial security for your family with term, whole, and universal life policies.",
      health:      "Health Insurance",
      health_desc: "ACA / ObamaCare enrollment, group health plans, and individual coverage options.",
      ltc:         "Long-Term Care",
      ltc_desc:    "Plan ahead for assisted living, nursing home, or in-home care expenses.",
      medicare:    "Medicare & Retirement",
      medicare_desc: "Medicare enrollment guidance and retirement planning to secure your future."
    },

    about_home: {
      title:   "About Ace Insurance",
      text1:   "Founded in 2013 by Danny Kim, Ace Insurance & Retirement Services has been a trusted partner for Washington State families and businesses. We specialize in serving the Korean-American and multicultural community with bilingual, personalized service.",
      text2:   "As an independent agency, we work with multiple top-rated carriers to find you the best coverage at the best price — not a one-size-fits-all policy.",
      cta:     "Read Our Story"
    },

    locations_home: {
      title:   "Our Offices",
      phone:   "Phone",
      hours:   "Mon – Fri: 9:00 AM – 6:00 PM",
      maps:    "Get Directions"
    },

    cta_banner: {
      title:    "Ready to Get Covered?",
      subtitle: "Call us today for a free, no-obligation quote. We speak English and Korean.",
      or:       "or send us a message"
    },

    /* ── About Page ── */
    about: {
      page_title:  "About Us",
      page_sub:    "Your trusted insurance partner since 2013",
      story_title: "Our Story",
      story_p1:    "Ace Insurance & Retirement Services, Inc. was founded in 2013 by Danny Kim with a clear mission: to provide honest, affordable insurance and retirement solutions to the Korean-American and multicultural communities in Washington State.",
      story_p2:    "Starting from a single office, we have grown to serve clients across Lynnwood, Federal Way, Tacoma, and beyond. Our independence means we work for you — not for one insurance company. We compare quotes across multiple A-rated carriers to find the right fit for your needs and budget.",
      story_p3:    "We offer consultations by video call, text, email, or in-person — whatever is most convenient for you. Our team speaks both English and Korean fluently.",
      founder_label: "Danny Kim",
      founder_title: "Founder & Principal Agent",
      community_title: "Our Community Commitment",
      community_p1: "We are proud to serve the Korean-American community and all multicultural families in Western Washington. Insurance can be confusing — navigating it in a second language is even harder. That is why we provide fully bilingual service in English and Korean, ensuring every client understands their coverage completely.",
      community_p2: "We believe everyone deserves access to quality insurance and sound retirement planning, regardless of background or language.",
      values_title: "Our Values",
      val1_title:   "Trust",
      val1_desc:    "We give you honest advice, even when it means recommending a lower-priced option. Your trust is our most valued asset.",
      val2_title:   "Experience",
      val2_desc:    "Over 10 years serving Washington State families and businesses. We know the local market inside and out.",
      val3_title:   "Community",
      val3_desc:    "We are part of the communities we serve. Giving back and building lasting relationships is at the core of what we do."
    },

    /* ── Services Page ── */
    services: {
      page_title:  "Our Services",
      page_sub:    "Comprehensive insurance and retirement planning solutions",
      intro:       "As an independent agency, we represent multiple top-rated insurance companies so we can find the right coverage at the right price for you.",

      auto_title:   "Auto Insurance",
      auto_p1:      "Whether you drive a sedan, SUV, truck, or commercial vehicle, we will find the right auto insurance policy to protect you on the road.",
      auto_p2:      "Coverage options include liability, collision, comprehensive, uninsured/underinsured motorist, medical payments, and roadside assistance.",

      home_title:   "Home Insurance",
      home_p1:      "Your home is likely your most valuable asset. Our homeowners insurance policies protect your dwelling, personal property, and liability.",
      home_p2:      "We also offer renters insurance, condo insurance, and landlord policies for investment properties.",

      biz_title:    "Business Insurance",
      biz_p1:       "Protect your business from the unexpected. We offer general liability, commercial property, business owner policies (BOP), workers' compensation, and commercial auto.",
      biz_p2:       "Whether you are a sole proprietor or a growing small business, we will tailor a policy to your specific industry and risk profile.",

      life_title:   "Life Insurance",
      life_p1:      "Life insurance is the foundation of a solid financial plan. We offer term life, whole life, universal life, and indexed universal life policies.",
      life_p2:      "We will help you determine the right type and amount of coverage to protect your family and meet your long-term financial goals.",

      health_title: "Health Insurance",
      health_p1:    "We assist individuals, families, and small businesses with health insurance enrollment, including ACA / ObamaCare marketplace plans, short-term health plans, and group health coverage.",
      health_p2:    "Our agents are certified to guide you through open enrollment and special enrollment periods to find the most cost-effective plan.",

      ltc_title:    "Long-Term Care Insurance",
      ltc_p1:       "Long-term care insurance helps cover the cost of assisted living, nursing home care, or in-home care services — costs that are not covered by health insurance or Medicare.",
      ltc_p2:       "Planning ahead while you are healthy can protect your savings and give your family peace of mind.",

      medicare_title: "Medicare & Retirement Planning",
      medicare_p1:    "Navigating Medicare can be complex. We provide clear, unbiased guidance on Medicare Supplement (Medigap), Medicare Advantage, and Part D prescription drug plans.",
      medicare_p2:    "We also offer retirement income planning to help you make the most of your Social Security, IRA, and annuity options.",

      cta_title: "Questions About Coverage?",
      cta_sub:   "We are here to help — in English and Korean. Contact us today for a free, no-obligation consultation."
    },

    /* ── Locations Page ── */
    locations: {
      page_title:  "Our Locations",
      page_sub:    "Three convenient offices in the greater Seattle–Tacoma area",
      phone_label: "Phone",
      hours_label: "Hours",
      hours_value: "Monday – Friday: 9:00 AM – 6:00 PM",
      closed:      "Closed Saturday & Sunday",
      directions:  "Get Directions",
      lynnwood:    "Lynnwood Office",
      federal_way: "Federal Way Office",
      tacoma:      "Tacoma / Lakewood Office"
    },

    /* ── Contact Page ── */
    contact: {
      page_title:    "Contact Us",
      page_sub:      "We are here to help — reach out anytime",
      info_title:    "Get In Touch",
      phone_label:   "Phone",
      hours_label:   "Office Hours",
      hours_value:   "Monday – Friday: 9:00 AM – 6:00 PM",
      form_title:    "Send Us a Message",
      name_label:    "Full Name",
      name_ph:       "Your full name",
      email_label:   "Email Address",
      email_ph:      "your@email.com",
      phone_fl:      "Phone Number",
      phone_ph:      "Your phone number",
      office_label:  "Preferred Office",
      office_any:    "Any Office",
      office_lw:     "Lynnwood",
      office_fw:     "Federal Way",
      office_ta:     "Tacoma / Lakewood",
      service_label: "Service Interested In",
      service_any:   "Select a service",
      service_auto:  "Auto Insurance",
      service_home:  "Home Insurance",
      service_biz:   "Business Insurance",
      service_life:  "Life Insurance",
      service_health:"Health Insurance / ACA",
      service_ltc:   "Long-Term Care Insurance",
      service_med:   "Medicare & Retirement",
      msg_label:     "Message",
      msg_ph:        "How can we help you?",
      submit:        "Send Message",
      success:       "Thank you! We will get back to you shortly.",
      note:          "We respond within 1 business day. All inquiries are confidential."
    },

    /* ── Footer ── */
    footer: {
      tagline:      "Your trusted insurance partner in Washington State",
      quick_links:  "Quick Links",
      contact_us:   "Contact Us",
      hours:        "Mon – Fri: 9:00 AM – 6:00 PM",
      copyright:    "© 2025 Ace Insurance & Retirement Services, Inc. All rights reserved."
    }
  },


  /* ============================================================
     KOREAN  /  한국어
     ============================================================ */
  ko: {
    nav: {
      home:      "홈",
      about:     "회사 소개",
      services:  "서비스",
      locations: "오시는 길",
      contact:   "문의하기"
    },

    hero: {
      eyebrow:   "워싱턴주 공인 보험 대리점",
      title:     "소중한 것을 보호합니다",
      subtitle:  "2013년부터 워싱턴주 한인 및 다문화 커뮤니티를 성실히 섬기고 있습니다. 정직한 상담, 합리적인 보험료.",
      cta_quote: "무료 견적 받기",
      cta_learn: "서비스 보기"
    },

    trust: {
      licensed:  "워싱턴주 공인 보험 대리점",
      since:     "2013년부터 고객 서비스",
      bilingual: "영어·한국어 이중 언어 서비스"
    },

    services_home: {
      title:    "보험 서비스",
      subtitle: "가정, 가족, 그리고 사업을 위한 맞춤형 보험 솔루션을 제공합니다.",
      learn:    "자세히 보기",
      auto:        "자동차 보험",
      auto_desc:   "경쟁력 있는 가격으로 종합, 충돌, 책임 보험을 제공합니다.",
      home:        "주택 보험",
      home_desc:   "화재, 도난, 자연재해 등으로부터 가정과 재산을 보호합니다.",
      business:    "사업체 보험",
      business_desc: "일반 배상 책임, 상업용 재산, 근로자 보상 보험으로 사업을 보호합니다.",
      life:        "생명 보험",
      life_desc:   "정기, 종신, 유니버설 라이프 플랜으로 가족의 경제적 안전을 보장합니다.",
      health:      "건강 보험",
      health_desc: "ACA / 오바마케어 가입, 단체 건강보험, 개인 보험 플랜을 안내합니다.",
      ltc:         "장기 요양 보험",
      ltc_desc:    "노인 요양원, 재택 간호 등 장기 요양 비용에 대비하는 보험입니다.",
      medicare:    "메디케어 & 은퇴 플랜",
      medicare_desc: "메디케어 가입 안내와 은퇴 후 안정적인 생활을 위한 재무 계획을 도와드립니다."
    },

    about_home: {
      title:   "에이스 보험 소개",
      text1:   "2013년 김대니 대표가 설립한 에이스 보험 & 은퇴 서비스는 워싱턴주 가정과 사업체를 위한 신뢰할 수 있는 보험 파트너입니다. 한인 및 다문화 커뮤니티를 위한 이중 언어 맞춤형 서비스를 전문으로 합니다.",
      text2:   "독립 대리점으로서 여러 최고 등급 보험사와 계약을 맺고 있어, 획일적인 상품이 아닌 고객 맞춤형 최적의 보험을 찾아드립니다.",
      cta:     "자세한 이야기 보기"
    },

    locations_home: {
      title:   "지점 안내",
      phone:   "전화번호",
      hours:   "월 – 금: 오전 9시 – 오후 6시",
      maps:    "길 찾기"
    },

    cta_banner: {
      title:    "보험 가입을 원하시나요?",
      subtitle: "지금 바로 연락하시면 무료 상담을 받으실 수 있습니다. 영어·한국어 모두 가능합니다.",
      or:       "또는 메시지 보내기"
    },

    /* ── About Page ── */
    about: {
      page_title:  "회사 소개",
      page_sub:    "2013년부터 신뢰받는 보험 파트너",
      story_title: "설립 스토리",
      story_p1:    "에이스 보험 & 은퇴 서비스(Ace Insurance & Retirement Services, Inc.)는 2013년 김대니 대표에 의해 설립되었습니다. 설립 목표는 명확했습니다: 워싱턴주의 한인 및 다문화 커뮤니티에게 정직하고 합리적인 보험과 은퇴 솔루션을 제공하는 것입니다.",
      story_p2:    "하나의 사무실로 시작하여 린우드, 페더럴 웨이, 타코마 등지로 서비스 범위를 넓혀왔습니다. 저희는 독립 대리점으로서 특정 보험사가 아닌 고객을 위해 일합니다. 여러 A등급 보험사의 견적을 비교하여 고객의 필요와 예산에 가장 적합한 보험을 찾아드립니다.",
      story_p3:    "화상 통화, 문자, 이메일, 방문 상담 등 고객에게 가장 편리한 방법으로 상담을 제공합니다. 저희 팀은 영어와 한국어를 모두 능통하게 구사합니다.",
      founder_label: "김 대니",
      founder_title: "설립자 & 수석 보험 에이전트",
      community_title: "커뮤니티에 대한 헌신",
      community_p1: "저희는 워싱턴 서부 지역의 한인 커뮤니티와 모든 다문화 가족을 섬기는 것에 자부심을 느낍니다. 보험은 복잡한 분야이며, 제2외국어로 이를 이해하는 것은 더욱 어렵습니다. 그래서 저희는 영어와 한국어로 완벽한 이중 언어 서비스를 제공하여 모든 고객이 보험 내용을 완전히 이해할 수 있도록 돕습니다.",
      community_p2: "저희는 모든 분이 배경이나 언어에 관계없이 양질의 보험과 은퇴 계획을 누릴 자격이 있다고 믿습니다.",
      values_title: "핵심 가치",
      val1_title:   "신뢰",
      val1_desc:    "저렴한 옵션을 권해야 할 때도 정직한 조언을 드립니다. 고객의 신뢰가 저희의 가장 소중한 자산입니다.",
      val2_title:   "경험",
      val2_desc:    "10년 이상 워싱턴주 가정과 사업체를 지원해왔습니다. 지역 시장을 누구보다 잘 알고 있습니다.",
      val3_title:   "커뮤니티",
      val3_desc:    "저희는 섬기는 커뮤니티의 일원입니다. 지역 사회에 기여하고 지속적인 관계를 구축하는 것이 저희의 핵심입니다."
    },

    /* ── Services Page ── */
    services: {
      page_title:  "서비스 안내",
      page_sub:    "종합 보험 및 은퇴 계획 솔루션",
      intro:       "독립 대리점으로서 여러 최고 등급 보험사를 대표하고 있어, 고객에게 적합한 보험을 최적의 가격으로 찾아드릴 수 있습니다.",

      auto_title:   "자동차 보험",
      auto_p1:      "승용차, SUV, 트럭, 상업용 차량 등 어떤 차량이든 도로 위에서 안전하게 보호받을 수 있는 최적의 자동차 보험을 찾아드립니다.",
      auto_p2:      "책임 보험, 충돌 보험, 종합 보험, 무보험/저보험 운전자 보험, 의료비 보험, 긴급출동 서비스 등 다양한 보장 옵션을 제공합니다.",

      home_title:   "주택 보험",
      home_p1:      "주택은 가장 소중한 자산입니다. 저희의 주택 소유자 보험은 건물, 개인 재산, 책임을 보호합니다.",
      home_p2:      "세입자 보험, 콘도 보험, 투자용 부동산을 위한 임대인 보험도 제공합니다.",

      biz_title:    "사업체 보험",
      biz_p1:       "예상치 못한 상황으로부터 사업을 보호하세요. 일반 배상 책임, 상업용 재산, 사업주 보험(BOP), 근로자 보상, 상업용 자동차 보험을 제공합니다.",
      biz_p2:       "1인 사업자부터 성장하는 중소기업까지, 귀사의 업종과 리스크에 맞는 맞춤형 보험을 설계해드립니다.",

      life_title:   "생명 보험",
      life_p1:      "생명 보험은 안정적인 재무 계획의 기초입니다. 정기 생명 보험, 종신 보험, 유니버설 라이프, 인덱스 유니버설 라이프 상품을 제공합니다.",
      life_p2:      "가족을 보호하고 장기적인 재무 목표를 달성하기 위한 적절한 보험 유형과 보장 금액을 찾아드립니다.",

      health_title: "건강 보험",
      health_p1:    "개인, 가족, 소규모 사업체의 건강보험 가입을 지원합니다. ACA / 오바마케어 마켓플레이스 플랜, 단기 건강 플랜, 단체 건강 보험을 안내합니다.",
      health_p2:    "공인 에이전트가 정기 가입 기간 및 특별 가입 기간을 안내하여 가장 비용 효율적인 플랜을 찾아드립니다.",

      ltc_title:    "장기 요양 보험",
      ltc_p1:       "장기 요양 보험은 건강 보험이나 메디케어가 보장하지 않는 요양원, 생활 보조 시설 또는 재택 간호 비용을 지원합니다.",
      ltc_p2:       "건강할 때 미리 준비하면 저축을 보호하고 가족에게 평안함을 드릴 수 있습니다.",

      medicare_title: "메디케어 & 은퇴 계획",
      medicare_p1:    "메디케어 체계는 복잡합니다. 메디케어 보충 보험(Medigap), 메디케어 어드밴티지, Part D 처방약 플랜에 대한 명확하고 공정한 안내를 제공합니다.",
      medicare_p2:    "소셜 시큐리티, IRA, 연금 옵션을 최대한 활용할 수 있도록 은퇴 수입 계획도 지원합니다.",

      cta_title: "보험에 대해 궁금하신가요?",
      cta_sub:   "영어와 한국어로 도움을 드립니다. 지금 바로 무료 상담 예약을 하세요."
    },

    /* ── Locations Page ── */
    locations: {
      page_title:  "오시는 길",
      page_sub:    "시애틀-타코마 광역권의 3개 편리한 지점",
      phone_label: "전화",
      hours_label: "영업 시간",
      hours_value: "월요일 – 금요일: 오전 9시 – 오후 6시",
      closed:      "토·일요일 휴무",
      directions:  "길 찾기",
      lynnwood:    "린우드 지점",
      federal_way: "페더럴 웨이 지점",
      tacoma:      "타코마 / 레이크우드 지점"
    },

    /* ── Contact Page ── */
    contact: {
      page_title:    "문의하기",
      page_sub:      "언제든지 연락 주세요",
      info_title:    "연락처",
      phone_label:   "전화",
      hours_label:   "영업 시간",
      hours_value:   "월요일 – 금요일: 오전 9시 – 오후 6시",
      form_title:    "메시지 보내기",
      name_label:    "성명",
      name_ph:       "성명을 입력해주세요",
      email_label:   "이메일",
      email_ph:      "이메일을 입력해주세요",
      phone_fl:      "전화번호",
      phone_ph:      "전화번호를 입력해주세요",
      office_label:  "희망 지점",
      office_any:    "모든 지점",
      office_lw:     "린우드",
      office_fw:     "페더럴 웨이",
      office_ta:     "타코마 / 레이크우드",
      service_label: "관심 서비스",
      service_any:   "서비스를 선택해주세요",
      service_auto:  "자동차 보험",
      service_home:  "주택 보험",
      service_biz:   "사업체 보험",
      service_life:  "생명 보험",
      service_health:"건강 보험 / ACA",
      service_ltc:   "장기 요양 보험",
      service_med:   "메디케어 & 은퇴 플랜",
      msg_label:     "메시지",
      msg_ph:        "어떻게 도와드릴까요?",
      submit:        "메시지 보내기",
      success:       "감사합니다! 곧 연락 드리겠습니다.",
      note:          "영업일 기준 1일 이내에 답변 드립니다. 모든 문의는 비밀이 보장됩니다."
    },

    /* ── Footer ── */
    footer: {
      tagline:      "워싱턴주에서 신뢰받는 보험 파트너",
      quick_links:  "빠른 링크",
      contact_us:   "연락처",
      hours:        "월 – 금: 오전 9시 – 오후 6시",
      copyright:    "© 2025 에이스 보험 & 은퇴 서비스 주식회사. 모든 권리 보유."
    }
  },


  /* ============================================================
     SPANISH  /  Español
     ============================================================ */
  es: {
    nav: {
      home:      "Inicio",
      about:     "Nosotros",
      services:  "Servicios",
      locations: "Ubicaciones",
      contact:   "Contacto"
    },

    hero: {
      eyebrow:   "Agencia de Seguros Licenciada — Estado de Washington",
      title:     "Protegiendo Lo Que Más Importa",
      subtitle:  "Sirviendo a la comunidad coreano-americana y multicultural en Washington desde 2013. Asesoría honesta. Cobertura asequible.",
      cta_quote: "Obtener Cotización Gratis",
      cta_learn: "Nuestros Servicios"
    },

    trust: {
      licensed:  "Licenciados en el Estado de Washington",
      since:     "Sirviendo Clientes Desde 2013",
      bilingual: "Servicio en Inglés y Coreano"
    },

    services_home: {
      title:    "Nuestros Servicios de Seguro",
      subtitle: "Soluciones de cobertura adaptadas a su vida, familia y negocio.",
      learn:    "Más Información",
      auto:        "Seguro de Auto",
      auto_desc:   "Proteja su vehículo con cobertura integral, de colisión y responsabilidad a tarifas competitivas.",
      home:        "Seguro de Hogar",
      home_desc:   "Proteja su hogar y pertenencias contra incendios, robos, daños por el clima y más.",
      business:    "Seguro Comercial",
      business_desc: "Mantenga su negocio protegido con responsabilidad general, propiedad comercial y compensación laboral.",
      life:        "Seguro de Vida",
      life_desc:   "Brinde seguridad financiera a su familia con pólizas de vida a término, entera y universal.",
      health:      "Seguro de Salud",
      health_desc: "Inscripción en ACA / ObamaCare, planes de salud grupales y opciones de cobertura individual.",
      ltc:         "Cuidado a Largo Plazo",
      ltc_desc:    "Planifique con anticipación los gastos de vida asistida, hogar de ancianos o atención en el hogar.",
      medicare:    "Medicare y Jubilación",
      medicare_desc: "Orientación para inscribirse en Medicare y planificación de jubilación para asegurar su futuro."
    },

    about_home: {
      title:   "Sobre Ace Insurance",
      text1:   "Fundada en 2013 por Danny Kim, Ace Insurance & Retirement Services ha sido un socio de confianza para familias y negocios en Washington.",
      text2:   "Como agencia independiente, trabajamos con múltiples aseguradoras para encontrar la mejor cobertura al mejor precio.",
      cta:     "Nuestra Historia"
    },

    locations_home: {
      title:   "Nuestras Oficinas",
      phone:   "Teléfono",
      hours:   "Lun – Vie: 9:00 AM – 6:00 PM",
      maps:    "Cómo Llegar"
    },

    cta_banner: {
      title:    "¿Listo para Asegurarse?",
      subtitle: "Llámenos hoy para una cotización gratuita sin compromiso. Hablamos inglés y coreano.",
      or:       "o envíenos un mensaje"
    },

    about: {
      page_title:  "Nosotros",
      page_sub:    "Su socio de seguros de confianza desde 2013",
      story_title: "Nuestra Historia",
      story_p1:    "Ace Insurance & Retirement Services, Inc. fue fundada en 2013 por Danny Kim con una misión clara: proveer soluciones honestas y asequibles de seguros y jubilación.",
      story_p2:    "Crecimos para servir a clientes en Lynnwood, Federal Way, Tacoma y más. Nuestra independencia significa que trabajamos para usted.",
      story_p3:    "Ofrecemos consultas por videollamada, texto, correo electrónico o en persona. Nuestro equipo habla inglés y coreano con fluidez.",
      founder_label: "Danny Kim",
      founder_title: "Fundador y Agente Principal",
      community_title: "Compromiso con la Comunidad",
      community_p1: "Estamos orgullosos de servir a la comunidad coreano-americana y a todas las familias multiculturales en Washington occidental.",
      community_p2: "Creemos que todos merecen acceso a seguros de calidad y planificación de jubilación sólida.",
      values_title: "Nuestros Valores",
      val1_title:   "Confianza",
      val1_desc:    "Le damos consejos honestos, incluso cuando eso significa recomendar una opción de menor precio.",
      val2_title:   "Experiencia",
      val2_desc:    "Más de 10 años sirviendo a familias y negocios en Washington. Conocemos el mercado local.",
      val3_title:   "Comunidad",
      val3_desc:    "Somos parte de las comunidades a las que servimos. Devolver y construir relaciones duraderas es fundamental."
    },

    services: {
      page_title:  "Nuestros Servicios",
      page_sub:    "Soluciones integrales de seguro y planificación de jubilación",
      intro:       "Como agencia independiente, representamos múltiples compañías de seguros para encontrar la cobertura adecuada al precio correcto.",
      auto_title:   "Seguro de Auto",
      auto_p1:      "Ya sea que maneje un sedán, SUV, camioneta o vehículo comercial, encontraremos la póliza correcta para protegerle.",
      auto_p2:      "Las opciones incluyen responsabilidad, colisión, cobertura integral y asistencia en carretera.",
      home_title:   "Seguro de Hogar",
      home_p1:      "Su hogar probablemente es su activo más valioso. Nuestras pólizas protegen su vivienda, bienes y responsabilidad.",
      home_p2:      "También ofrecemos seguros para inquilinos, condominios y propietarios de inmuebles de inversión.",
      biz_title:    "Seguro Comercial",
      biz_p1:       "Proteja su negocio de lo inesperado con responsabilidad general, propiedad comercial y más.",
      biz_p2:       "Ya sea propietario único o pequeña empresa en crecimiento, adaptaremos la póliza a su industria.",
      life_title:   "Seguro de Vida",
      life_p1:      "El seguro de vida es la base de un plan financiero sólido. Ofrecemos pólizas de vida a término, entera y universal.",
      life_p2:      "Le ayudaremos a determinar el tipo y monto correcto de cobertura para su familia.",
      health_title: "Seguro de Salud",
      health_p1:    "Asistimos a individuos, familias y pequeñas empresas con inscripción en seguro de salud.",
      health_p2:    "Nuestros agentes están certificados para guiarle durante los períodos de inscripción.",
      ltc_title:    "Seguro de Cuidado a Largo Plazo",
      ltc_p1:       "El seguro de cuidado a largo plazo ayuda a cubrir costos de vida asistida o atención en el hogar.",
      ltc_p2:       "Planificar con anticipación puede proteger sus ahorros y dar tranquilidad a su familia.",
      medicare_title: "Medicare y Planificación de Jubilación",
      medicare_p1:    "Navegar Medicare puede ser complejo. Brindamos orientación clara sobre Medicare Supplement y Medicare Advantage.",
      medicare_p2:    "También ofrecemos planificación de ingresos de jubilación para maximizar su Seguro Social, IRA y anualidades.",
      cta_title: "¿Preguntas sobre Cobertura?",
      cta_sub:   "Estamos aquí para ayudar — en inglés y coreano. Contáctenos para una consulta gratuita."
    },

    locations: {
      page_title:  "Nuestras Ubicaciones",
      page_sub:    "Tres oficinas convenientes en el área de Seattle–Tacoma",
      phone_label: "Teléfono",
      hours_label: "Horario",
      hours_value: "Lunes – Viernes: 9:00 AM – 6:00 PM",
      closed:      "Cerrado Sábado y Domingo",
      directions:  "Cómo Llegar",
      lynnwood:    "Oficina Lynnwood",
      federal_way: "Oficina Federal Way",
      tacoma:      "Oficina Tacoma / Lakewood"
    },

    contact: {
      page_title:    "Contáctenos",
      page_sub:      "Estamos aquí para ayudar — contáctenos en cualquier momento",
      info_title:    "Comuníquese con Nosotros",
      phone_label:   "Teléfono",
      hours_label:   "Horario de Oficina",
      hours_value:   "Lunes – Viernes: 9:00 AM – 6:00 PM",
      form_title:    "Envíenos un Mensaje",
      name_label:    "Nombre Completo",
      name_ph:       "Su nombre completo",
      email_label:   "Correo Electrónico",
      email_ph:      "su@correo.com",
      phone_fl:      "Número de Teléfono",
      phone_ph:      "Su número de teléfono",
      office_label:  "Oficina Preferida",
      office_any:    "Cualquier Oficina",
      office_lw:     "Lynnwood",
      office_fw:     "Federal Way",
      office_ta:     "Tacoma / Lakewood",
      service_label: "Servicio de Interés",
      service_any:   "Seleccione un servicio",
      service_auto:  "Seguro de Auto",
      service_home:  "Seguro de Hogar",
      service_biz:   "Seguro Comercial",
      service_life:  "Seguro de Vida",
      service_health:"Seguro de Salud / ACA",
      service_ltc:   "Seguro de Cuidado a Largo Plazo",
      service_med:   "Medicare y Jubilación",
      msg_label:     "Mensaje",
      msg_ph:        "¿Cómo podemos ayudarle?",
      submit:        "Enviar Mensaje",
      success:       "¡Gracias! Nos comunicaremos con usted pronto.",
      note:          "Respondemos dentro de 1 día hábil. Todas las consultas son confidenciales."
    },

    footer: {
      tagline:      "Su socio de seguros de confianza en Washington",
      quick_links:  "Enlaces Rápidos",
      contact_us:   "Contáctenos",
      hours:        "Lun – Vie: 9:00 AM – 6:00 PM",
      copyright:    "© 2025 Ace Insurance & Retirement Services, Inc. Todos los derechos reservados."
    }
  },


  /* ============================================================
     CHINESE (SIMPLIFIED)  /  简体中文
     ============================================================ */
  zh: {
    nav: {
      home:      "首页",
      about:     "关于我们",
      services:  "服务项目",
      locations: "办公地点",
      contact:   "联系我们"
    },

    hero: {
      eyebrow:   "华盛顿州持牌保险机构",
      title:     "保护您最重要的一切",
      subtitle:  "自2013年起服务韩裔美国人及多元文化社区。诚实建议，实惠保障。",
      cta_quote: "免费获取报价",
      cta_learn: "我们的服务"
    },

    trust: {
      licensed:  "华盛顿州持牌保险机构",
      since:     "自2013年起服务客户",
      bilingual: "英语与韩语双语服务"
    },

    services_home: {
      title:    "我们的保险服务",
      subtitle: "为您的生活、家庭和企业量身定制全面保障方案。",
      learn:    "了解更多",
      auto:        "汽车保险",
      auto_desc:   "以具竞争力的价格为您的车辆提供全面险、碰撞险和责任险。",
      home:        "房屋保险",
      home_desc:   "保护您的住宅和财物免受火灾、盗窃、天气损害等风险。",
      business:    "商业保险",
      business_desc: "为您的企业提供综合责任险、商业财产险和工伤赔偿险。",
      life:        "人寿保险",
      life_desc:   "通过定期寿险、终身寿险和万能寿险为家人提供财务保障。",
      health:      "健康保险",
      health_desc: "ACA / 奥巴马医改注册、团体健康计划和个人保险方案。",
      ltc:         "长期护理保险",
      ltc_desc:    "提前规划辅助生活、护理院或居家护理费用。",
      medicare:    "医疗保险与退休规划",
      medicare_desc: "医疗保险注册指导和退休规划，保障您的未来。"
    },

    about_home: {
      title:   "关于 Ace Insurance",
      text1:   "Ace Insurance & Retirement Services 由 Danny Kim 于2013年创立，多年来一直是华盛顿州家庭和企业的可信赖合作伙伴。",
      text2:   "作为独立机构，我们与多家顶级保险公司合作，为您寻找最优价格的最佳保障。",
      cta:     "了解我们的故事"
    },

    locations_home: {
      title:   "我们的办公室",
      phone:   "电话",
      hours:   "周一至周五：上午9时至下午6时",
      maps:    "获取路线"
    },

    cta_banner: {
      title:    "准备好获得保障了吗？",
      subtitle: "今天致电我们获取免费报价。我们提供英语和韩语服务。",
      or:       "或发送消息给我们"
    },

    about: {
      page_title:  "关于我们",
      page_sub:    "自2013年起您值得信赖的保险合作伙伴",
      story_title: "我们的故事",
      story_p1:    "Ace Insurance & Retirement Services, Inc. 由 Danny Kim 于2013年创立，使命清晰：为华盛顿州的韩裔美国人和多元文化社区提供诚实、实惠的保险和退休解决方案。",
      story_p2:    "我们从一间办公室起步，现已发展为服务林伍德、联邦路、塔科马等地区的客户。我们的独立性意味着我们为您工作。",
      story_p3:    "我们提供视频通话、短信、电子邮件或面对面咨询。我们的团队流利使用英语和韩语。",
      founder_label: "Danny Kim",
      founder_title: "创始人兼首席代理人",
      community_title: "我们对社区的承诺",
      community_p1: "我们自豪地服务于韩裔美国社区和华盛顿西部所有多元文化家庭。",
      community_p2: "我们相信每个人都应该获得优质保险和完善退休规划，无论背景或语言如何。",
      values_title: "我们的价值观",
      val1_title:   "诚信",
      val1_desc:    "我们给您诚实的建议，即使这意味着推荐价格更低的选项。",
      val2_title:   "经验",
      val2_desc:    "服务华盛顿州家庭和企业超过10年，我们深知当地市场。",
      val3_title:   "社区",
      val3_desc:    "我们是所服务社区的一部分，回馈社区和建立持久关系是我们的核心。"
    },

    services: {
      page_title:  "我们的服务",
      page_sub:    "全面的保险和退休规划解决方案",
      intro:       "作为独立机构，我们代理多家顶级保险公司，为您找到合适的保障和价格。",
      auto_title:   "汽车保险",
      auto_p1:      "无论您驾驶轿车、SUV、卡车还是商用车，我们将为您找到合适的汽车保险。",
      auto_p2:      "保险选项包括责任险、碰撞险、全面险、无保险驾驶人险和道路救援。",
      home_title:   "房屋保险",
      home_p1:      "您的房屋可能是您最有价值的资产。我们的房主保险保护您的住所、个人财产和责任。",
      home_p2:      "我们还提供租房者保险、公寓保险和投资物业房东保险。",
      biz_title:    "商业保险",
      biz_p1:       "保护您的企业免受意外风险。我们提供综合责任险、商业财产险、企业主保单和工伤赔偿险。",
      biz_p2:       "无论您是个体经营者还是成长中的小企业，我们将根据您的行业定制保险方案。",
      life_title:   "人寿保险",
      life_p1:      "人寿保险是稳健财务计划的基础。我们提供定期寿险、终身寿险和万能寿险。",
      life_p2:      "我们将帮助您确定正确的保险类型和金额，以保护您的家人并实现长期财务目标。",
      health_title: "健康保险",
      health_p1:    "我们协助个人、家庭和小企业办理健康保险注册，包括ACA市场计划和团体健康保险。",
      health_p2:    "我们的代理人获得认证，可在开放注册和特别注册期间为您提供指导。",
      ltc_title:    "长期护理保险",
      ltc_p1:       "长期护理保险有助于支付辅助生活、护理院或居家护理服务的费用。",
      ltc_p2:       "在健康时提前规划可以保护您的储蓄，让家人安心。",
      medicare_title: "医疗保险与退休规划",
      medicare_p1:    "了解医疗保险可能很复杂。我们提供关于医疗补充险和医疗优势计划的清晰、公正的指导。",
      medicare_p2:    "我们还提供退休收入规划，帮助您充分利用社会保障、IRA和年金选项。",
      cta_title: "对保障有疑问？",
      cta_sub:   "我们随时为您提供英语和韩语帮助。立即联系我们获取免费咨询。"
    },

    locations: {
      page_title:  "我们的办公地点",
      page_sub:    "在大西雅图-塔科马地区的三个便利办公室",
      phone_label: "电话",
      hours_label: "营业时间",
      hours_value: "周一至周五：上午9时至下午6时",
      closed:      "周六和周日休息",
      directions:  "获取路线",
      lynnwood:    "林伍德办公室",
      federal_way: "联邦路办公室",
      tacoma:      "塔科马/莱克伍德办公室"
    },

    contact: {
      page_title:    "联系我们",
      page_sub:      "我们随时为您提供帮助",
      info_title:    "与我们联系",
      phone_label:   "电话",
      hours_label:   "办公时间",
      hours_value:   "周一至周五：上午9时至下午6时",
      form_title:    "给我们发消息",
      name_label:    "全名",
      name_ph:       "您的全名",
      email_label:   "电子邮件地址",
      email_ph:      "您的电子邮件",
      phone_fl:      "电话号码",
      phone_ph:      "您的电话号码",
      office_label:  "首选办公室",
      office_any:    "任何办公室",
      office_lw:     "林伍德",
      office_fw:     "联邦路",
      office_ta:     "塔科马/莱克伍德",
      service_label: "感兴趣的服务",
      service_any:   "选择服务",
      service_auto:  "汽车保险",
      service_home:  "房屋保险",
      service_biz:   "商业保险",
      service_life:  "人寿保险",
      service_health:"健康保险 / ACA",
      service_ltc:   "长期护理保险",
      service_med:   "医疗保险与退休",
      msg_label:     "留言",
      msg_ph:        "我们能如何帮助您？",
      submit:        "发送消息",
      success:       "谢谢！我们将尽快回复您。",
      note:          "我们在1个工作日内回复。所有咨询均保密。"
    },

    footer: {
      tagline:      "华盛顿州值得信赖的保险合作伙伴",
      quick_links:  "快速链接",
      contact_us:   "联系我们",
      hours:        "周一至周五：上午9时至下午6时",
      copyright:    "© 2025 Ace Insurance & Retirement Services, Inc. 版权所有。"
    }
  }

};
