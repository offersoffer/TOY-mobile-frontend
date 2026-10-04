import type { Ionicons } from '@expo/vector-icons';

/**
 * The words on the About, Help & Support, Privacy, Terms and Contact screens.
 *
 * A deliberate mirror of the website's `features/pages/content.ts`. Two copies
 * of a privacy policy is not ideal, but the alternative - serving the legal
 * text from the API - means a customer who opens Privacy on a train sees a
 * spinner, and a policy you cannot read offline is a policy you cannot consult
 * before granting a permission. The contact details are the exception: those
 * are fetched from `GET /support/contact` at runtime, with the constants below
 * as the fallback the screen shows first and keeps if the call fails.
 */

export const SUPPORT_EMAIL = 'offersoffersupport@gmail.com';
export const SUPPORT_PHONES = ['+91 7540043503', '+91 7904795700'];

/**
 * When the legal text last changed.
 *
 * A date rather than "today": a policy claiming to have been updated on
 * whatever day you happen to read it tells the reader nothing. Update it when
 * the text below changes, and keep it equal to the website's.
 */
export const POLICY_LAST_UPDATED = '1 September 2026';

export const LEGAL_ENTITY = 'OffersOffer';

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

export interface SupportCategory {
  /** Matches the backend's `CATEGORIES` list exactly. */
  value: string;
  label: string;
  hint: string;
}

/**
 * The twelve things people write in about.
 *
 * "Report an issue" is deliberately two entries: the app lists
 * merchant-submitted content, so "this offer is misleading" and "the app
 * crashed" go to different queues and need different information.
 */
export const SUPPORT_CATEGORIES: SupportCategory[] = [
  { value: 'account', label: 'Account / Login', hint: 'Signing in, verification, password, profile' },
  { value: 'offers', label: 'Offers', hint: 'An offer that looks wrong, missing or out of date' },
  { value: 'services', label: 'Services', hint: 'Service listings, availability and bookings' },
  { value: 'claim', label: 'Claim / Coupon', hint: 'Claiming an offer, or a code that will not appear' },
  { value: 'redemption', label: 'Redemption', hint: 'A code the shop could not accept' },
  { value: 'notifications', label: 'Notifications', hint: 'Alerts you are not getting, or getting too many of' },
  { value: 'location', label: 'Location / Near Me', hint: 'Nearby results, distance or the location picker' },
  { value: 'merchant', label: 'Merchant / Shop Account', hint: 'Running a shop, branches, staff and listings' },
  { value: 'billing', label: 'Subscription / Billing', hint: 'Plans, invoices and payments' },
  { value: 'technical', label: 'Technical problem', hint: 'Errors, blank screens and things that will not load' },
  { value: 'report_problem', label: 'Report a problem', hint: 'Something is broken or behaving badly across the app' },
  {
    value: 'report_content',
    label: 'Report an offer or shop',
    hint: 'Misleading, expired, inappropriate or possibly fraudulent content',
  },
  { value: 'other', label: 'Other', hint: 'Anything that does not fit above' },
];

export interface Faq {
  question: string;
  answer: string;
}

/** Below the form, because the point of it is to make the form unnecessary. */
export const SUPPORT_FAQS: Faq[] = [
  {
    question: 'How do I claim an offer?',
    answer:
      'Open the offer and tap Claim. You will need an account for this step, since the code has to belong to somebody. We generate a unique code and keep it under My Claims until you use it or it expires.',
  },
  {
    question: 'How do I redeem an offer?',
    answer:
      'Show the code, or its QR, to the shop at the counter. Staff scan or type it into their verification screen, which confirms it is genuine and marks it used. A code can only be redeemed once.',
  },
  {
    question: 'What happens when an offer expires?',
    answer:
      'It stops appearing in discovery and can no longer be claimed. A code you claimed before the expiry is valid until its own expiry date, shown on the claim itself — that date, not the offer’s, is the one to go by.',
  },
  {
    question: 'How do I save an offer?',
    answer:
      'Tap the heart on any offer or service. Saved items sit under the Saved tab, and we can remind you before one you saved is about to expire.',
  },
  {
    question: 'How do I enable notifications?',
    answer:
      'Profile → Notification Preferences, where each kind can be switched on or off separately. Your device also has to allow notifications for OffersOffer, which is set in the system settings.',
  },
  {
    question: 'Why can’t I see nearby offers?',
    answer:
      'Usually because location access is off, or because there are no active offers in range yet. You can pick a location manually under Profile → Preferred Location — Near Me does not require sharing your location.',
  },
  {
    question: 'How do I contact a shop?',
    answer:
      'Open the shop page. Phone numbers, branches, addresses and opening hours are listed there, along with everything the shop currently has on offer.',
  },
  {
    question: 'How does merchant verification work?',
    answer:
      'A shop is created and reviewed by our team before its listings go live, and staff are added to it by the shop’s own admin. Only members of a shop can publish or redeem on its behalf.',
  },
  {
    question: 'Do I need an account to browse?',
    answer:
      'No. Offers, Services and Near Me all work without signing in. An account only adds the things that have to know who you are — saving, claiming, following and reminders.',
  },
];

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export interface AboutFeature {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

export const ABOUT_FEATURES: AboutFeature[] = [
  {
    icon: 'pricetags-outline',
    title: 'Discover offers',
    body: 'Find discounts across clothing, food, electronics, jewellery, footwear, beauty and more.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Find services',
    body: 'Discover local services — salons, cleaning, repair, automotive, photography and others.',
  },
  {
    icon: 'location-outline',
    title: 'Find nearby deals',
    body: 'Use location-based discovery to see offers and services around you.',
  },
  {
    icon: 'heart-outline',
    title: 'Save what you like',
    body: 'Save offers and services for later, and get a reminder when a saved offer is about to expire.',
  },
  {
    icon: 'ticket-outline',
    title: 'Claim offers',
    body: 'Claim eligible offers and get a unique code that the shop can verify at the counter.',
  },
  {
    icon: 'eye-outline',
    title: 'Explore without signing up',
    body: 'Browse and discover without creating an account. Login is only needed for personalised features.',
  },
];

// ---------------------------------------------------------------------------
// Legal documents
// ---------------------------------------------------------------------------

export interface LegalSection {
  heading: string;
  /** Paragraphs, rendered in order above the list if there is one. */
  body?: string[];
  list?: string[];
  /** A short highlighted statement — the sentence the section exists for. */
  callout?: string;
}

/**
 * Privacy Policy. A product draft, not legal advice, and the screen says so.
 *
 * It describes only what the app actually does — no payment-processor
 * disclosure, because payments are not live — and never promises absolute
 * security or immediate deletion, because neither is true of any system.
 */
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: 'Information we collect',
    body: [
      'When you create a customer account we collect your name, email address, your password (stored only in hashed form, never as text we can read) and your phone number if you give us one.',
      'When a shop is registered we additionally collect the shop name and address, branch information, business contact details, shop images, and the offers and services the shop publishes.',
    ],
  },
  {
    heading: 'Location information',
    body: [
      'OffersOffer has a Near Me feature, so location deserves saying plainly. Where you allow it, we may use your current location, a location you select yourself, and the coordinates of shops and their branches.',
    ],
    list: [
      'To show nearby offers and services',
      'To calculate distance from you to a shop',
      'For map-based discovery',
      'For location-based recommendations',
    ],
    callout:
      'Location permission is optional. You can browse everything without granting it, and choose a location manually instead.',
  },
  {
    heading: 'Usage information',
    body: [
      'To run the service and improve it, we may record activity such as the offers and services you view, what you save and claim, coupons redeemed, searches, how you interact with notifications, and general app activity. These signals are what personalised recommendations and our own analytics are built from.',
    ],
  },
  {
    heading: 'Device information',
    body: [
      'Where applicable we may record your device type, operating system, app version, and — if you turn on push notifications — the notification token your device gives us.',
    ],
  },
  {
    heading: 'How we use this information',
    list: [
      'To provide and operate OffersOffer',
      'To display offers and services',
      'To provide Near Me and other location features',
      'To personalise recommendations',
      'To send notifications you have asked for',
      'To process claims and redemptions',
      'To manage merchant accounts',
      'To improve performance and reliability',
      'To detect misuse and fraud, and maintain security',
      'To produce aggregate analytics about how the platform is used',
    ],
  },
  {
    heading: 'Saved offers and notifications',
    body: [
      'If you save an offer, we may send you a notification when that offer is approaching its expiry, subject to your notification settings. Optional notifications can be turned off individually under Profile → Notification Preferences, and turning them off does not affect anything else about your account.',
    ],
  },
  {
    heading: 'Claim and redemption data',
    body: [
      'When you claim an offer we record the unique claim code, the date you claimed it, which offer, shop and branch it belongs to, and whether it has been redeemed. This is what makes a coupon verifiable at the counter and is how we prevent the same code being used twice.',
      'Staff at the participating shop can see the information they need to verify your claim, and no more.',
    ],
  },
  {
    heading: 'Location privacy',
    body: [
      'OffersOffer may ask for location permission in order to show nearby offers and services. You can keep using general discovery without granting it, and where location is unavailable you can select a location manually.',
    ],
    callout: 'Your precise location is not exposed to merchants.',
  },
  {
    heading: 'Sharing your information',
    body: [
      'We do not sell your personal information. We share it with service providers only where that is what operating the platform requires, and only in the categories below.',
    ],
    list: [
      'Cloud hosting and database infrastructure',
      'Push notification delivery',
      'Maps and location services',
      'Email delivery',
      'Image and file storage',
      'AI service providers, for the merchant-facing content tools',
    ],
    callout:
      'Payment providers are not on this list because payments are not live yet. This section will be updated before they are.',
  },
  {
    heading: 'Payment information',
    body: [
      'OffersOffer is free for customers. Browsing offers, claiming them and following shops costs nothing, and we never ask a customer for payment details.',
      'Shop owners can subscribe to a paid plan. Those payments are taken on Razorpay\u2019s own checkout page \u2014 Razorpay is an authorised payment service provider \u2014 so a card number, CVV or UPI PIN is entered there and never reaches us.',
      'What we keep against a merchant\u2019s payment is the amount, the plan it paid for, the method used (card, UPI, netbanking or wallet), a short descriptor Razorpay echoes back such as the last four digits, Razorpay\u2019s own reference numbers, and whether the payment succeeded or failed. A merchant\u2019s billing history is built from exactly that and nothing more.',
    ],
  },
  {
    heading: 'Data security',
    body: [
      'We use reasonable technical and organisational measures designed to protect your information. These include encrypted connections (HTTPS), hashed passwords, role-based access controls, secure token handling, database access restrictions, audit logging and monitoring.',
    ],
    callout:
      'No online service can promise perfect security, and we do not make that promise. We can tell you what we do and that we take it seriously.',
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep information for as long as it is needed to provide the service, manage your account, meet legal and business requirements, investigate fraud or security incidents, and produce analytics where appropriate.',
      'Different records have different retention periods. Deleting your account does not delete everything instantly — transaction, audit and business records may need to be kept for longer, and we would rather say so than promise otherwise.',
    ],
  },
  {
    heading: 'Your choices',
    body: ['You can ask us to:'],
    list: [
      'Give you access to the personal information we hold about you',
      'Correct information that is wrong',
      'Delete your account, where that is possible',
      'Withdraw consent you gave for something optional',
      'Change your notification preferences',
      'Change or withdraw location permission',
      'Answer a question about how your information is handled',
    ],
    callout:
      'The quickest route is Help & Support in this app. Notification and location settings can also be changed yourself, in your profile and in your device settings.',
  },
  {
    heading: 'Cookies and website tracking',
    body: [
      'On our website we use cookies and similar technologies to keep you signed in, to protect requests against cross-site forgery, to remember preferences such as your theme and chosen location, and to understand performance. The app uses secure device storage for the same purposes rather than cookies.',
    ],
  },
  {
    heading: 'Children’s privacy',
    body: [
      'OffersOffer is intended for people who are legally permitted to use the service under applicable law. We do not knowingly collect personal information from anyone who is not. If you believe a child has given us personal information, contact us and we will deal with it.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. When we make material changes, the updated policy and a revised date will be published here and on the website.',
    ],
  },
];

/**
 * Terms & Conditions. Here for the same reason as on the website: the sign-up
 * form asks people to accept "the terms and conditions", and a checkbox
 * agreeing to a document that does not exist is worse than no checkbox.
 */
export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'About these terms',
    body: [
      'These terms cover your use of OffersOffer — the app, the website and everything reachable through them. By using the service you accept them. If you do not, please do not use the service.',
    ],
  },
  {
    heading: 'Who can use OffersOffer',
    body: [
      'You may browse offers, services and shops without an account. You need an account to save, claim, follow or book, and to receive reminders. You must be legally permitted to use the service under applicable law, and the details you give us when registering must be accurate.',
      'You are responsible for what happens under your account, so keep your password to yourself and tell us if you think somebody else has it.',
    ],
  },
  {
    heading: 'Offers are made by shops, not by us',
    body: [
      'OffersOffer is a discovery platform. The offers, discounts, services, prices, images and descriptions on it are published by the shops themselves, and each shop is responsible for what it publishes and for honouring it.',
      'We take reasonable steps to keep listings accurate, but we cannot guarantee that every listing is correct, current or available. The terms of a specific offer — what it applies to, what it excludes, when it ends — are set by the shop.',
    ],
    callout:
      'If an offer is wrong, misleading or was refused at the counter, report it from Help & Support. Reports are read.',
  },
  {
    heading: 'Claims and coupon codes',
    body: [
      'Claiming an offer generates a unique code tied to your account. A code is for your own use, can be redeemed once, and stops working after its expiry date — which is shown on the claim itself and may differ from the offer’s end date.',
      'Codes must not be sold, transferred or shared. We may cancel a claim, or suspend an account, where a code is being misused or where the claim appears fraudulent.',
    ],
  },
  {
    heading: 'For merchants',
    body: [
      'If you publish a shop, offers or services on OffersOffer, you confirm you are entitled to represent that business and that what you publish is accurate, lawful and yours to publish. You must honour the offers you have listed, on the terms you listed them.',
      'We may decline, edit the visibility of, or remove a listing that breaks these terms, is misleading, or is the subject of substantiated reports.',
    ],
  },
  {
    heading: 'Acceptable use',
    list: [
      'Do not publish false, misleading, unlawful or offensive content',
      'Do not impersonate a person, a business or OffersOffer',
      'Do not attempt to break, overload, scrape or gain unauthorised access to the service',
      'Do not use anyone else’s account, or share your own',
      'Do not use claim codes in any way other than redeeming your own claim at the shop',
    ],
  },
  {
    heading: 'Subscriptions and payment',
    body: [
      'OffersOffer is currently free to use, for customers and for merchants. Paid merchant plans may be introduced later. If they are, the price, what each plan includes and how billing works will be shown before you agree to anything, and nothing will be charged without that.',
    ],
  },
  {
    heading: 'Availability',
    body: [
      'We aim to keep OffersOffer available and working, but we do not promise it will be uninterrupted or error-free. We may change, suspend or withdraw features, and we may carry out maintenance.',
    ],
  },
  {
    heading: 'Your content',
    body: [
      'You keep ownership of what you upload — images, reviews, shop and listing details. By uploading it, you give us permission to host, display and distribute it as part of running OffersOffer, and you confirm you have the right to do so.',
    ],
  },
  {
    heading: 'Ending your use',
    body: [
      'You can stop using OffersOffer and ask us to delete your account at any time. We may suspend or close an account that breaks these terms or is being used fraudulently.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'We may update these terms. When we make material changes, the updated terms and a revised date will be published here and on the website. Continuing to use the service after that means you accept the updated terms.',
    ],
  },
  {
    heading: 'Contact',
    body: [
      'Questions about these terms can be sent to us through Help & Support, or by email to the address below.',
    ],
  },
];
