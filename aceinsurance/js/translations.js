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
      tacoma:      "Tacoma Office"
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
      office_ta:     "Tacoma",
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
      tacoma:      "타코마 지점"
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
      office_ta:     "타코마",
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
  }

};
